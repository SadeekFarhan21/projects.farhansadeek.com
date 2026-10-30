#!/usr/bin/env bash

# Complete disaster-recovery bootstrap for this competitive-programming
# workspace on macOS. The script is deliberately idempotent: running it again
# checks existing components and only installs or updates what is missing.
#
# What the default run handles:
#   1. Apple Command Line Tools (Git, clang, clangd, and system SDKs)
#   2. Repository cloning and remote validation
#   3. Git author identity and GitHub CLI authentication
#   4. Homebrew plus development and command-line tools
#   5. Oh My Zsh with Powerlevel10k and productivity plugins
#   6. VSCodium, Orion Browser, GeistMono Nerd Font, and workspace extensions
#   7. Machine-specific compiler/include path synchronization
#   8. A real GCC + PBDS compile/run test and configuration validation
#   9. Opening the correct VSCodium workspace
#
# Credentials and API keys are never embedded in this file or committed.
# Run from inside the repository:
#   ./setup.sh
# Or download this one file on a fresh Mac; it will clone the repository too.
# This form automatically avoids opening VSCodium.
#   /bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/SadeekFarhan21/Competitive-Programming/main/setup.sh)"
#
# A read-only health check is also available:
#   ./setup.sh --check

set -Eeuo pipefail
IFS=$'\n\t'

readonly BOOTSTRAP_SOURCE="${BASH_SOURCE[0]:-$0}"
RUNNING_FROM_COMMAND_STRING=false
if [[ -z "${BASH_SOURCE[0]:-}" ]]; then
    RUNNING_FROM_COMMAND_STRING=true
fi
readonly RUNNING_FROM_COMMAND_STRING
SCRIPT_DIR="$(cd "$(dirname "$BOOTSTRAP_SOURCE")" && pwd)"
readonly SCRIPT_DIR
readonly REPOSITORY_URL="https://github.com/SadeekFarhan21/Competitive-Programming.git"
readonly DEFAULT_REPO_DIR="${HOME}/Documents/Competitive-Programming"
readonly GIT_AUTHOR_NAME="Farhan Sadeek"
readonly GIT_AUTHOR_EMAIL="farhan@farhansadeek.com"
readonly MINIMUM_FREE_DISK_MB=2048
readonly CPH_NG_VERSION="0.7.11"
readonly CPH_NG_SHA256="7b3d132c8c2c05bde1e2e3619b1abb4b7680895fd8a64ea4c64d03e7506e5a72"
readonly CPH_NG_VSIX_URL="https://github.com/langningchen/cph-ng/releases/download/v${CPH_NG_VERSION}/cph-ng-${CPH_NG_VERSION}.vsix"

REPO_DIR=""
WORKSPACE_FILE=""

MODE="install"
FAILURES=0
BREW=""
CODIUM=""
GH=""
TEMP_DIR=""
OPEN_EDITOR=true

if [[ "$RUNNING_FROM_COMMAND_STRING" == "true" ]]; then
    OPEN_EDITOR=false
fi

readonly -a FORMULAE=(
    gh
    gcc
    binutils
    boost
    clang-format
    python
    ripgrep
    fzf
    jq
    tree
    shellcheck
    zsh-autosuggestions
    zsh-syntax-highlighting
    cmake
    ninja
    git-lfs
    vim
    tmux
    uv
    fd
    bat
    eza
)

readonly -a CASKS=(
    vscodium
    orion
    font-geist-mono-nerd-font
)

# Package policy for this bootstrap. These casks must never be added to CASKS.
readonly -a FORBIDDEN_CASKS=(
    brave-browser
)

# These reproduce the VSCodium setup used by this repository.
readonly -a EXTENSIONS=(
    formulahendry.code-runner
    langningchen.cph-ng
    llvm-vs-code-extensions.vscode-clangd
    pkief.material-icon-theme
    pkief.material-product-icons
    vscodevim.vim
    wakatime.vscode-wakatime
    xaver.clang-format
    zhuangtongfa.material-theme
)

readonly -a DEVELOPER_COMMANDS=(
    cmake
    ninja
    git-lfs
    vim
    tmux
    uv
    fd
    bat
    eza
)

usage() {
    printf '%s\n' \
        "Usage: ./setup.sh [options]" \
        "" \
        "With no option, installs and configures the complete workspace." \
        "Apple Command Line Tools and GitHub login may require interaction." \
        "" \
        "Options:" \
        "  --check              Verify everything without changing anything." \
        "  --no-open            Do not open VSCodium after a successful setup." \
        "  -h, --help           Show this help message."
}

log() {
    printf '\n\033[1;34m==>\033[0m %s\n' "$*"
}

ok() {
    printf '    \033[1;32mOK\033[0m  %s\n' "$*"
}

warn() {
    printf '    \033[1;33mWARN\033[0m %s\n' "$*" >&2
}

missing() {
    printf '    \033[1;31mMISSING\033[0m %s\n' "$*" >&2
    FAILURES=$((FAILURES + 1))
}

die() {
    printf '\n\033[1;31mError:\033[0m %s\n' "$*" >&2
    exit 1
}

cleanup() {
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        case "$TEMP_DIR" in
            "${TMPDIR:-/tmp}"/cp-setup.*|/tmp/cp-setup.*)
                /bin/rm -rf -- "$TEMP_DIR"
                ;;
            *)
                warn "Refusing to remove unexpected temporary path: $TEMP_DIR"
                ;;
        esac
    fi
}

on_error() {
    local exit_code="$1"
    local line_number="$2"
    local command_text="$3"

    printf '\n\033[1;31mSetup stopped unexpectedly.\033[0m\n' >&2
    printf '    Exit code: %s\n' "$exit_code" >&2
    printf '    Line:      %s\n' "$line_number" >&2
    printf '    Command:   %s\n' "$command_text" >&2
    printf 'Re-run ./setup.sh after correcting the issue; completed steps are safe to repeat.\n' >&2
    exit "$exit_code"
}

trap cleanup EXIT
trap 'on_error "$?" "$LINENO" "$BASH_COMMAND"' ERR

find_brew() {
    if command -v brew >/dev/null 2>&1; then
        command -v brew
    elif [[ -x /opt/homebrew/bin/brew ]]; then
        printf '%s\n' /opt/homebrew/bin/brew
    elif [[ -x /usr/local/bin/brew ]]; then
        printf '%s\n' /usr/local/bin/brew
    else
        return 1
    fi
}

ensure_macos_preflight() {
    log "Running macOS preflight checks"

    local architecture
    local os_version
    local available_kb
    local available_mb

    [[ "$(uname -s)" == "Darwin" ]] || die "This setup supports macOS only."

    architecture="$(uname -m)"
    case "$architecture" in
        arm64|x86_64)
            ok "Architecture: $architecture"
            ;;
        *)
            die "Unsupported Mac architecture: $architecture"
            ;;
    esac

    os_version="$(/usr/bin/sw_vers -productVersion)"
    ok "macOS $os_version"

    [[ -x /usr/bin/curl ]] || die "macOS curl is missing from /usr/bin/curl."
    ok "System curl"

    available_kb="$(/bin/df -Pk "${HOME}" | /usr/bin/awk 'NR == 2 { print $4 }')"
    available_mb=$((available_kb / 1024))
    if ((available_mb < MINIMUM_FREE_DISK_MB)); then
        die "At least ${MINIMUM_FREE_DISK_MB} MB of free disk space is required; ${available_mb} MB is available."
    fi
    ok "Free disk space: ${available_mb} MB"
}

configure_homebrew_shell() {
    [[ "$MODE" == "install" ]] || return 0

    local profile_file="${HOME}/.zprofile"
    local shellenv_line="eval \"\$(${BREW} shellenv)\""
    /usr/bin/touch "$profile_file"
    if ! /usr/bin/grep -Fqx "$shellenv_line" "$profile_file"; then
        printf '\n%s\n' "$shellenv_line" >> "$profile_file"
    fi
}

ensure_command_line_tools() {
    log "Checking Apple Command Line Tools"

    if /usr/bin/xcode-select -p >/dev/null 2>&1; then
        ok "Apple Command Line Tools"
        return
    fi

    if [[ "$MODE" == "check" ]]; then
        missing "Apple Command Line Tools"
        return
    fi

    if [[ ! -t 0 ]]; then
        die "Apple Command Line Tools are missing and their installer requires an interactive terminal."
    fi

    warn "Apple requires its installer dialog for the Command Line Tools."
    /usr/bin/xcode-select --install >/dev/null 2>&1 || true

    until /usr/bin/xcode-select -p >/dev/null 2>&1; do
        printf 'Complete the Apple installer, then press Return to continue: '
        read -r _
    done

    ok "Apple Command Line Tools"
}

ensure_repository() {
    log "Checking competitive-programming repository"

    local adjacent_workspace="${SCRIPT_DIR}/competitive-programming.code-workspace"
    local default_workspace="${DEFAULT_REPO_DIR}/competitive-programming.code-workspace"

    if [[ -f "$adjacent_workspace" ]]; then
        REPO_DIR="$SCRIPT_DIR"
    elif [[ -f "$default_workspace" ]]; then
        REPO_DIR="$DEFAULT_REPO_DIR"
    elif [[ "$MODE" == "check" ]]; then
        missing "Repository clone at ${DEFAULT_REPO_DIR}"
        return
    else
        if [[ -e "$DEFAULT_REPO_DIR" ]]; then
            die "${DEFAULT_REPO_DIR} already exists but is not a complete repository clone. Move it aside, then rerun setup.sh."
        fi

        /bin/mkdir -p "$(dirname "$DEFAULT_REPO_DIR")"
        GIT_TERMINAL_PROMPT=0 /usr/bin/git clone "$REPOSITORY_URL" "$DEFAULT_REPO_DIR"
        REPO_DIR="$DEFAULT_REPO_DIR"
    fi

    WORKSPACE_FILE="${REPO_DIR}/competitive-programming.code-workspace"
    [[ -f "$WORKSPACE_FILE" ]] || die "The repository clone is missing its workspace file."

    if ! /usr/bin/git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        die "${REPO_DIR} contains workspace files but is not a Git repository. Use the standalone installer so it can create a proper clone."
    fi

    local origin_url
    origin_url="$(/usr/bin/git -C "$REPO_DIR" remote get-url origin 2>/dev/null || true)"
    if [[ -z "$origin_url" ]]; then
        if [[ "$MODE" == "install" ]]; then
            /usr/bin/git -C "$REPO_DIR" remote add origin "$REPOSITORY_URL"
            origin_url="$REPOSITORY_URL"
        else
            missing "Git remote named origin"
        fi
    fi

    case "$origin_url" in
        "$REPOSITORY_URL"|git@github.com:SadeekFarhan21/Competitive-Programming.git)
            ok "Git remote: $origin_url"
            ;;
        "")
            ;;
        *)
            warn "Repository origin differs from the bootstrap source: $origin_url"
            ;;
    esac

    ok "$REPO_DIR"
}

ensure_git_identity() {
    log "Checking Git author identity"

    local current_name
    local current_email
    current_name="$(/usr/bin/git config --global --get user.name || true)"
    current_email="$(/usr/bin/git config --global --get user.email || true)"

    if [[ "$MODE" == "install" ]]; then
        if [[ "$current_name" != "$GIT_AUTHOR_NAME" ]]; then
            /usr/bin/git config --global user.name "$GIT_AUTHOR_NAME"
        fi
        if [[ "$current_email" != "$GIT_AUTHOR_EMAIL" ]]; then
            /usr/bin/git config --global user.email "$GIT_AUTHOR_EMAIL"
        fi
        current_name="$GIT_AUTHOR_NAME"
        current_email="$GIT_AUTHOR_EMAIL"
    fi

    if [[ "$current_name" == "$GIT_AUTHOR_NAME" && "$current_email" == "$GIT_AUTHOR_EMAIL" ]]; then
        ok "${GIT_AUTHOR_NAME} <${GIT_AUTHOR_EMAIL}>"
    else
        missing "Git author: ${GIT_AUTHOR_NAME} <${GIT_AUTHOR_EMAIL}>"
    fi
}

ensure_homebrew() {
    log "Checking Homebrew"

    BREW="$(find_brew || true)"
    if [[ -n "$BREW" ]]; then
        configure_homebrew_shell
        ok "$($BREW --version | /usr/bin/head -n 1)"
        return
    fi

    if [[ "$MODE" == "check" ]]; then
        missing "Homebrew"
        return
    fi

    log "Installing Homebrew"
    NONINTERACTIVE=1 /bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    BREW="$(find_brew || true)"
    [[ -n "$BREW" ]] || die "Homebrew installed, but its executable could not be found."

    # Make brew available in future zsh sessions as well as this script.
    configure_homebrew_shell

    ok "$($BREW --version | /usr/bin/head -n 1)"
}

ensure_formula() {
    local formula="$1"

    if "$BREW" list --formula "$formula" >/dev/null 2>&1; then
        ok "Homebrew formula: $formula"
    elif [[ "$MODE" == "check" ]]; then
        missing "Homebrew formula: $formula"
    else
        NONINTERACTIVE=1 "$BREW" install "$formula"
        ok "Homebrew formula: $formula"
    fi
}

ensure_cask() {
    local cask="$1"

    if "$BREW" list --cask "$cask" >/dev/null 2>&1; then
        ok "Homebrew cask: $cask"
    elif [[ "$MODE" == "check" ]]; then
        missing "Homebrew cask: $cask"
    else
        NONINTERACTIVE=1 "$BREW" install --cask "$cask"
        ok "Homebrew cask: $cask"
    fi
}

geist_mono_nerd_font_is_installed() {
    [[ -d "${HOME}/Library/Fonts" ]] && \
        /usr/bin/find "${HOME}/Library/Fonts" -maxdepth 1 \
            \( -name 'GeistMonoNerdFontMono-Regular.otf' -o -name 'GeistMonoNerdFontMono-Regular.ttf' \) \
            -print -quit 2>/dev/null | /usr/bin/grep -q .
}

ensure_geist_mono_font() {
    log "Checking the macOS GeistMono Nerd Font installation"

    if ! geist_mono_nerd_font_is_installed && [[ "$MODE" == "install" ]]; then
        warn "Homebrew has no usable GeistMono Nerd Font Mono; reinstalling the font cask."
        NONINTERACTIVE=1 "$BREW" reinstall --cask font-geist-mono-nerd-font
    fi

    if geist_mono_nerd_font_is_installed; then
        ok "GeistMono Nerd Font Mono is installed in ${HOME}/Library/Fonts"
    else
        missing "GeistMono Nerd Font Mono in ${HOME}/Library/Fonts"
    fi
}

configure_macos_terminal_font() {
    log "Checking macOS Terminal font for Powerlevel10k"

    local terminal_profile
    terminal_profile="$(/usr/bin/defaults read com.apple.Terminal 'Default Window Settings' 2>/dev/null || printf 'Basic')"

    if [[ "$MODE" == "install" ]]; then
        /usr/bin/osascript -e \
            "tell application \"Terminal\" to set font name of settings set \"${terminal_profile}\" to \"GeistMonoNFM\"" \
            >/dev/null
    fi

    local configured_font
    configured_font="$(/usr/bin/osascript -e \
        "tell application \"Terminal\" to get font name of settings set \"${terminal_profile}\"" \
        2>/dev/null || true)"
    if [[ "$configured_font" == "GeistMonoNFM" ]]; then
        ok "Terminal profile '${terminal_profile}' uses GeistMono Nerd Font"
    else
        warn "Terminal must be quit and reopened before it can select the newly installed GeistMono Nerd Font (currently ${configured_font:-unknown})."
    fi
}

validate_cask_policy() {
    log "Checking browser package policy"

    local forbidden
    local managed
    for forbidden in "${FORBIDDEN_CASKS[@]}"; do
        for managed in "${CASKS[@]}"; do
            if [[ "$managed" == "$forbidden" ]]; then
                die "Forbidden cask '${forbidden}' is present in the managed CASKS list."
            fi
        done
        ok "Blocked from bootstrap: $forbidden"
    done
}

configure_zsh_plugins() {
    log "Checking Zsh productivity plugins"

    local brew_prefix
    local zshrc_file="${HOME}/.zshrc"
    local suggestions_file
    local highlighting_file
    local suggestions_line
    local highlighting_line
    local suggestions_number
    local highlighting_number

    brew_prefix="$($BREW --prefix)"
    suggestions_file="${brew_prefix}/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
    highlighting_file="${brew_prefix}/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
    suggestions_line="source ${suggestions_file}"
    highlighting_line="source ${highlighting_file}"

    [[ -f "$suggestions_file" ]] || missing "Zsh autosuggestions plugin file: $suggestions_file"
    [[ -f "$highlighting_file" ]] || missing "Zsh syntax-highlighting plugin file: $highlighting_file"

    if [[ "$MODE" == "install" ]]; then
        /usr/bin/touch "$zshrc_file"
        # Reappend these on every run so they remain after Oh My Zsh, with
        # syntax highlighting last among the interactive plugins.
        /usr/bin/sed -i '' "\|^${suggestions_line}$|d" "$zshrc_file"
        /usr/bin/sed -i '' "\|^${highlighting_line}$|d" "$zshrc_file"
        printf '\n%s\n%s\n' "$suggestions_line" "$highlighting_line" >> "$zshrc_file"
    fi

    if /usr/bin/grep -Fqx "$suggestions_line" "$zshrc_file" 2>/dev/null; then
        ok "Zsh autosuggestions enabled"
    else
        missing "Zsh autosuggestions source line in ${zshrc_file}"
    fi

    if /usr/bin/grep -Fqx "$highlighting_line" "$zshrc_file" 2>/dev/null; then
        ok "Zsh syntax highlighting enabled"
    else
        missing "Zsh syntax-highlighting source line in ${zshrc_file}"
    fi

    suggestions_number="$(/usr/bin/grep -nF "$suggestions_line" "$zshrc_file" 2>/dev/null | /usr/bin/head -n 1 | /usr/bin/cut -d: -f1 || true)"
    highlighting_number="$(/usr/bin/grep -nF "$highlighting_line" "$zshrc_file" 2>/dev/null | /usr/bin/head -n 1 | /usr/bin/cut -d: -f1 || true)"
    if [[ -n "$suggestions_number" && -n "$highlighting_number" ]] && \
        ((suggestions_number < highlighting_number)); then
        ok "Zsh plugin load order"
    else
        missing "Zsh syntax highlighting must load after autosuggestions"
    fi
}

ensure_oh_my_zsh() {
    log "Checking Oh My Zsh and Powerlevel10k"

    local oh_my_zsh_dir="${HOME}/.oh-my-zsh"
    local powerlevel10k_dir="${HOME}/.oh-my-zsh/custom/themes/powerlevel10k"
    local powerlevel10k_config="${HOME}/.p10k.zsh"
    local zshrc_file="${HOME}/.zshrc"
    local theme_line='ZSH_THEME="powerlevel10k/powerlevel10k"'
    # Keep $HOME literal because this is the line written to .zshrc.
    # shellcheck disable=SC2016
    local source_line='source "$HOME/.oh-my-zsh/oh-my-zsh.sh"'
    # shellcheck disable=SC2016
    local config_source_line='[[ ! -f "$HOME/.p10k.zsh" ]] || source "$HOME/.p10k.zsh"'
    local zshrc_temp

    if [[ ! -f "${oh_my_zsh_dir}/oh-my-zsh.sh" ]]; then
        if [[ "$MODE" == "check" ]]; then
            missing "Oh My Zsh: ${oh_my_zsh_dir}"
        else
            log "Installing Oh My Zsh"
            ZSH="$oh_my_zsh_dir" RUNZSH=no CHSH=no KEEP_ZSHRC=yes \
                /bin/sh -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
        fi
    fi

    if [[ ! -f "${powerlevel10k_dir}/powerlevel10k.zsh-theme" ]]; then
        if [[ "$MODE" == "check" ]]; then
            missing "Powerlevel10k theme: ${powerlevel10k_dir}"
        else
            log "Installing Powerlevel10k"
            /usr/bin/git clone --depth=1 \
                https://github.com/romkatv/powerlevel10k.git \
                "$powerlevel10k_dir"
        fi
    fi

    if [[ "$MODE" == "install" && ! -f "$powerlevel10k_config" ]]; then
        /bin/cp "${powerlevel10k_dir}/config/p10k-classic.zsh" "$powerlevel10k_config"
    fi

    if [[ "$MODE" == "install" ]]; then
        /usr/bin/touch "$zshrc_file"

        # Normalize every active theme assignment so a later setting cannot
        # override Powerlevel10k before Oh My Zsh is loaded.
        if /usr/bin/grep -Eq '^[[:space:]]*ZSH_THEME=' "$zshrc_file"; then
            /usr/bin/sed -i '' -E 's#^[[:space:]]*ZSH_THEME=.*#ZSH_THEME="powerlevel10k/powerlevel10k"#' "$zshrc_file"
        else
            zshrc_temp="$(/usr/bin/mktemp "${TMPDIR:-/tmp}/cp-zshrc.XXXXXX")"
            printf '%s\n' "$theme_line" > "$zshrc_temp"
            /bin/cat "$zshrc_file" >> "$zshrc_temp"
            /bin/mv "$zshrc_temp" "$zshrc_file"
        fi

        # Normalize a standard Oh My Zsh source line to one that works even
        # when an existing .zshrc does not define $ZSH.
        # shellcheck disable=SC2016
        if /usr/bin/grep -Eq '^[[:space:]]*(source|\.)[[:space:]]+("?\$ZSH/oh-my-zsh\.sh"?|"?\$HOME/\.oh-my-zsh/oh-my-zsh\.sh"?)[[:space:]]*$' "$zshrc_file"; then
            # shellcheck disable=SC2016
            /usr/bin/sed -i '' -E 's#^[[:space:]]*(source|\.)[[:space:]]+("?\$ZSH/oh-my-zsh\.sh"?|"?\$HOME/\.oh-my-zsh/oh-my-zsh\.sh"?)[[:space:]]*$#source "$HOME/.oh-my-zsh/oh-my-zsh.sh"#' "$zshrc_file"
        else
            printf '\n%s\n' "$source_line" >> "$zshrc_file"
        fi

        if ! /usr/bin/grep -Fqx "$config_source_line" "$zshrc_file"; then
            printf '%s\n' "$config_source_line" >> "$zshrc_file"
        fi
    fi

    if [[ -f "${oh_my_zsh_dir}/oh-my-zsh.sh" ]]; then
        ok "Oh My Zsh: ${oh_my_zsh_dir}"
    else
        missing "Oh My Zsh entry point: ${oh_my_zsh_dir}/oh-my-zsh.sh"
    fi

    if /usr/bin/grep -Fqx "$theme_line" "$zshrc_file" 2>/dev/null; then
        ok "Oh My Zsh theme: Powerlevel10k"
    else
        missing "Powerlevel10k theme setting in ${zshrc_file}"
    fi

    if [[ -f "${powerlevel10k_dir}/powerlevel10k.zsh-theme" && -f "$powerlevel10k_config" ]]; then
        ok "Powerlevel10k theme and classic configuration"
    else
        missing "Powerlevel10k installation/configuration"
    fi

    if /usr/bin/grep -Fqx "$source_line" "$zshrc_file" 2>/dev/null; then
        ok "Oh My Zsh enabled in ${zshrc_file}"
    else
        missing "Oh My Zsh source line in ${zshrc_file}"
    fi
}

configure_brew_command_policy() {
    log "Checking local Homebrew command policy"

    local zshrc_file="${HOME}/.zshrc"
    local policy_marker="# Competitive Programming setup: block Brave Browser"

    if [[ "$MODE" == "install" ]] && \
        ! /usr/bin/grep -Fqx "$policy_marker" "$zshrc_file" 2>/dev/null; then
        # The variables below are intentionally written literally to .zshrc.
        # shellcheck disable=SC2016
        printf '%s\n' \
            '' \
            "$policy_marker" \
            'brew() {' \
            '    local argument' \
            '    local installing=false' \
            '    local brave_requested=false' \
            '' \
            '    for argument in "$@"; do' \
            '        [[ "$argument" == "install" || "$argument" == "reinstall" ]] && installing=true' \
            '        [[ "$argument" == "brave-browser" ]] && brave_requested=true' \
            '    done' \
            '' \
            '    if [[ "$installing" == "true" && "$brave_requested" == "true" ]]; then' \
            '        print -u2 "Error: Installation of brave-browser is blocked on this Mac."' \
            '        return 1' \
            '    fi' \
            '' \
            '    command brew "$@"' \
            '}' >> "$zshrc_file"
    fi

    if /usr/bin/grep -Fqx "$policy_marker" "$zshrc_file" 2>/dev/null; then
        ok "brew install brave-browser is blocked in Zsh"
    else
        missing "Brave Browser Homebrew command policy in ${zshrc_file}"
    fi
}

find_brew_command() {
    local command_name="$1"
    local brew_prefix
    brew_prefix="$($BREW --prefix)"

    if [[ -x "${brew_prefix}/bin/${command_name}" ]]; then
        printf '%s\n' "${brew_prefix}/bin/${command_name}"
    elif command -v "$command_name" >/dev/null 2>&1; then
        command -v "$command_name"
    else
        return 1
    fi
}

find_codex_cli() {
    if command -v codex >/dev/null 2>&1; then
        command -v codex
    elif [[ -x "${HOME}/.local/bin/codex" ]]; then
        printf '%s\n' "${HOME}/.local/bin/codex"
    else
        return 1
    fi
}

ensure_codex_cli() {
    log "Checking Codex CLI"

    local codex_cli
    codex_cli="$(find_codex_cli || true)"
    if [[ -z "$codex_cli" && "$MODE" == "install" ]]; then
        log "Installing Codex CLI"
        /bin/sh -c "$(/usr/bin/curl -fsSL https://chatgpt.com/codex/install.sh)"
        codex_cli="$(find_codex_cli || true)"
    fi

    if [[ -n "$codex_cli" ]]; then
        ok "Codex CLI: $($codex_cli --version | /usr/bin/head -n 1)"
    else
        missing "Codex CLI executable"
    fi
}

verify_developer_tools() {
    log "Checking general developer workstation tools"

    local command_name
    local command_path
    local git_lfs
    local version_text
    for command_name in "${DEVELOPER_COMMANDS[@]}"; do
        command_path="$(find_brew_command "$command_name" || true)"
        if [[ -z "$command_path" ]]; then
            missing "Developer command: $command_name"
            continue
        fi

        case "$command_name" in
            tmux)
                version_text="$("$command_path" -V 2>/dev/null | /usr/bin/head -n 1 || true)"
                ;;
            *)
                version_text="$("$command_path" --version 2>/dev/null | /usr/bin/head -n 1 || true)"
                ;;
        esac
        ok "${command_name}: ${version_text:-$command_path}"
    done

    git_lfs="$(find_brew_command git-lfs || true)"
    if [[ "$MODE" == "install" && -n "$git_lfs" ]]; then
        "$git_lfs" install --skip-repo >/dev/null
    fi

    if [[ -n "$git_lfs" ]] && \
        /usr/bin/git config --global --get filter.lfs.process 2>/dev/null | \
            /usr/bin/grep -Fq 'git-lfs'; then
        ok "Git LFS integration"
    else
        missing "Git LFS integration"
    fi
}

find_gh() {
    local brew_prefix
    brew_prefix="$($BREW --prefix)"

    if command -v gh >/dev/null 2>&1; then
        command -v gh
    elif [[ -x "${brew_prefix}/bin/gh" ]]; then
        printf '%s\n' "${brew_prefix}/bin/gh"
    else
        return 1
    fi
}

ensure_github_auth() {
    log "Checking GitHub authentication"

    GH="$(find_gh || true)"
    if [[ -z "$GH" ]]; then
        missing "GitHub CLI executable"
        return
    fi

    ok "$($GH --version | /usr/bin/head -n 1)"

    if ! "$GH" auth status --hostname github.com >/dev/null 2>&1; then
        if [[ "$MODE" == "check" ]]; then
            missing "Authenticated GitHub CLI session"
            return
        fi

        if [[ ! -t 0 ]]; then
            missing "Interactive terminal required for secure GitHub login"
            return
        fi

        printf '%s\n' \
            "GitHub will now open a secure browser/device login." \
            "The bootstrap never reads or stores your password or token."
        "$GH" auth login --hostname github.com --git-protocol https --web
    fi

    if "$GH" auth status --hostname github.com >/dev/null 2>&1; then
        local login
        local permission
        login="$($GH api user --jq .login 2>/dev/null || true)"
        # `--check` promises to be read-only. `gh auth setup-git` writes Git
        # credential-helper configuration, so only run it during installation.
        if [[ "$MODE" == "install" ]]; then
            "$GH" auth setup-git >/dev/null
        fi
        ok "GitHub account: ${login:-authenticated}"

        permission="$($GH repo view SadeekFarhan21/Competitive-Programming --json viewerPermission --jq .viewerPermission 2>/dev/null || true)"
        case "$permission" in
            ADMIN|MAINTAIN|WRITE)
                ok "Repository permission: $permission"
                ;;
            READ|TRIAGE)
                warn "The authenticated GitHub account has $permission permission and cannot push directly."
                ;;
            "")
                warn "Could not verify GitHub repository permission; network access may be unavailable."
                ;;
            *)
                warn "GitHub reported repository permission: $permission"
                ;;
        esac
    else
        missing "Authenticated GitHub CLI session"
    fi
}

find_codium() {
    local brew_prefix
    brew_prefix="$($BREW --prefix)"

    if command -v codium >/dev/null 2>&1; then
        command -v codium
    elif [[ -x "${brew_prefix}/bin/codium" ]]; then
        printf '%s\n' "${brew_prefix}/bin/codium"
    elif [[ -x /Applications/VSCodium.app/Contents/Resources/app/bin/codium ]]; then
        printf '%s\n' /Applications/VSCodium.app/Contents/Resources/app/bin/codium
    else
        return 1
    fi
}

ensure_extensions() {
    log "Checking VSCodium extensions"

    CODIUM="$(find_codium || true)"
    if [[ -z "$CODIUM" ]]; then
        missing "VSCodium command-line launcher"
        return
    fi

    local installed_extensions
    installed_extensions="$($CODIUM --list-extensions 2>/dev/null || true)"

    local extension
    for extension in "${EXTENSIONS[@]}"; do
        if [[ "$extension" == "langningchen.cph-ng" ]]; then
            ensure_cph_ng_extension "$installed_extensions"
        elif printf '%s\n' "$installed_extensions" | /usr/bin/grep -Fiqx "$extension"; then
            ok "VSCodium extension: $extension"
        elif [[ "$MODE" == "check" ]]; then
            missing "VSCodium extension: $extension"
        elif "$CODIUM" --install-extension "$extension"; then
            ok "VSCodium extension: $extension"
        else
            missing "VSCodium extension: $extension"
        fi
    done
}

ensure_cph_ng_extension() {
    local installed_extensions="$1"
    local extension="langningchen.cph-ng"

    if printf '%s\n' "$installed_extensions" | /usr/bin/grep -Fiqx "$extension"; then
        ok "VSCodium extension: ${extension} (official VSIX installed)"
        return
    fi

    if [[ "$MODE" == "check" ]]; then
        missing "VSCodium extension: $extension"
        return
    fi

    TEMP_DIR="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cp-setup.XXXXXX")"
    local vsix_file="${TEMP_DIR}/cph-ng-${CPH_NG_VERSION}.vsix"
    local actual_sha256

    log "Installing CPH-NG ${CPH_NG_VERSION} from its official GitHub release"
    /usr/bin/curl -fL --retry 3 --connect-timeout 15 \
        "$CPH_NG_VSIX_URL" -o "$vsix_file"
    actual_sha256="$(/usr/bin/shasum -a 256 "$vsix_file" | /usr/bin/awk '{ print $1 }')"
    if [[ "$actual_sha256" != "$CPH_NG_SHA256" ]]; then
        die "CPH-NG VSIX checksum mismatch; refusing to install it."
    fi

    if "$CODIUM" --install-extension "$vsix_file"; then
        ok "VSCodium extension: ${extension} ${CPH_NG_VERSION} (checksum verified)"
    else
        missing "VSCodium extension installation: $extension"
    fi

    /bin/rm -rf -- "$TEMP_DIR"
    TEMP_DIR=""
}

find_gpp() {
    local gcc_prefix="$1"
    local candidate
    local version
    local best_version=-1
    local best_path=""

    for candidate in "${gcc_prefix}"/bin/g++-[0-9]*; do
        [[ -x "$candidate" ]] || continue
        version="${candidate##*-}"
        [[ "$version" =~ ^[0-9]+$ ]] || continue
        if ((version > best_version)); then
            best_version="$version"
            best_path="$candidate"
        fi
    done

    [[ -n "$best_path" ]] || return 1
    printf '%s\n' "$best_path"
}

sync_workspace_paths() {
    log "Synchronizing workspace tool paths"

    local gcc_prefix
    local boost_prefix
    local binutils_prefix
    local format_prefix
    local gpp
    local gcc_version
    local gcc_target
    local gcc_include_base
    local gcc_target_include
    local boost_include
    local gobjcopy
    local clang_format
    local intellisense_mode

    gcc_prefix="$($BREW --prefix gcc)"
    boost_prefix="$($BREW --prefix boost)"
    binutils_prefix="$($BREW --prefix binutils)"
    format_prefix="$($BREW --prefix clang-format)"
    gpp="$(find_gpp "$gcc_prefix" || true)"

    [[ -n "$gpp" ]] || die "Could not find Homebrew's versioned g++ executable."

    gcc_version="${gpp##*-}"
    gcc_target="$($gpp -dumpmachine)"
    gcc_include_base="${gcc_prefix}/include/c++/${gcc_version}"
    gcc_target_include="${gcc_include_base}/${gcc_target}"
    boost_include="${boost_prefix}/include"
    gobjcopy="${binutils_prefix}/bin/gobjcopy"
    clang_format="${format_prefix}/bin/clang-format"

    case "$(uname -m)" in
        arm64)
            intellisense_mode="macos-gcc-arm64"
            ;;
        x86_64)
            intellisense_mode="macos-gcc-x64"
            ;;
        *)
            die "Unsupported architecture while configuring IntelliSense."
            ;;
    esac

    [[ -x "$clang_format" ]] || die "clang-format was installed but is not executable at ${clang_format}."
    [[ -d "$gcc_include_base" ]] || die "GCC C++ headers were not found at ${gcc_include_base}."
    [[ -d "$boost_include" ]] || die "Boost headers were not found at ${boost_include}."
    [[ -x "$gobjcopy" ]] || die "GNU objcopy was not found at ${gobjcopy}."

    if [[ ! -f "${REPO_DIR}/.clangd" ]]; then
        if [[ "$MODE" == "check" ]]; then
            missing "${REPO_DIR}/.clangd"
        else
            printf '%s\n' \
                'CompileFlags:' \
                "  Compiler: ${gpp}" \
                '  Add:' \
                '    - -std=c++23' \
                "    - -I${boost_include}" > "${REPO_DIR}/.clangd"
            ok "Created repository clangd configuration"
        fi
    fi

    local -a config_files=()
    local file
    for file in \
        "${REPO_DIR}/.vscode/settings.json" \
        "${REPO_DIR}/.vscode/tasks.json" \
        "${REPO_DIR}/.vscode/c_cpp_properties.json" \
        "${REPO_DIR}/.clangd" \
        "${REPO_DIR}/compile_flags.txt"; do
        [[ -f "$file" ]] && config_files+=("$file")
    done

    if [[ "$MODE" == "install" ]]; then
        CP_GPP="$gpp" \
        CP_GCC_VERSION="$gcc_version" \
        CP_GCC_INCLUDE_BASE="$gcc_include_base" \
        CP_GCC_TARGET_INCLUDE="$gcc_target_include" \
        CP_BOOST_INCLUDE="$boost_include" \
        CP_GOBJCOPY="$gobjcopy" \
        CP_CLANG_FORMAT="$clang_format" \
        CP_INTELLISENSE_MODE="$intellisense_mode" \
        /usr/bin/perl -0pi -e '
            s{/(?:opt/homebrew|usr/local)/opt/gcc/bin/g\+\+-[0-9]+}{$ENV{CP_GPP}}g;
            s{/(?:opt/homebrew|usr/local)/opt/gcc/include/c\+\+/[0-9]+/(?:aarch64|x86_64)-apple-darwin[0-9]+}{$ENV{CP_GCC_TARGET_INCLUDE}}g;
            s{/(?:opt/homebrew|usr/local)/opt/gcc/include/c\+\+/[0-9]+/backward}{$ENV{CP_GCC_INCLUDE_BASE}/backward}g;
            s{/(?:opt/homebrew|usr/local)/opt/gcc/include/c\+\+/[0-9]+}{$ENV{CP_GCC_INCLUDE_BASE}}g;
            s{/(?:opt/homebrew|usr/local)/opt/boost/include}{$ENV{CP_BOOST_INCLUDE}}g;
            s{/(?:opt/homebrew|usr/local)/opt/binutils/bin/gobjcopy}{$ENV{CP_GOBJCOPY}}g;
            s{/(?:opt/homebrew|usr/local)/(?:Cellar/clang-format/[^/"\s]+|opt/clang-format)/bin/clang-format}{$ENV{CP_CLANG_FORMAT}}g;
            s{(?:C/C\+\+|C\+\+): g\+\+-[0-9]+ build active file}{C++: g++-$ENV{CP_GCC_VERSION} build active file}g;
            s{"C_Cpp\.default\.cppStandard"\s*:\s*"(?:c\+\+|gnu\+\+)[^"]+"}{"C_Cpp.default.cppStandard": "c++23"}g;
            s{"cppStandard"\s*:\s*"(?:c\+\+|gnu\+\+)[^"]+"}{"cppStandard": "c++23"}g;
            s{"C_Cpp\.default\.intelliSenseMode"\s*:\s*"macos-gcc-(?:arm64|x64)"}{"C_Cpp.default.intelliSenseMode": "$ENV{CP_INTELLISENSE_MODE}"}g;
            s{"intelliSenseMode"\s*:\s*"macos-gcc-(?:arm64|x64)"}{"intelliSenseMode": "$ENV{CP_INTELLISENSE_MODE}"}g;
            s{-std=(?:c\+\+|gnu\+\+)(?:[0-9]+|[12][a-z])}{-std=c++23}g;
        ' "${config_files[@]}"
    fi

    local all_config
    all_config="$(/bin/cat "${config_files[@]}")"

    if printf '%s' "$all_config" | /usr/bin/grep -Fq "$gpp"; then
        ok "GNU compiler path: $gpp"
    else
        missing "Workspace references current GNU compiler: $gpp"
    fi

    if printf '%s' "$all_config" | /usr/bin/grep -Fq "$clang_format"; then
        ok "clang-format path: $clang_format"
    else
        missing "Workspace references current clang-format: $clang_format"
    fi

    if printf '%s' "$all_config" | /usr/bin/grep -Fq "$boost_include"; then
        ok "Boost include path: $boost_include"
    else
        missing "Workspace references current Boost headers: $boost_include"
    fi

    if printf '%s' "$all_config" | /usr/bin/grep -Fq "$gobjcopy"; then
        ok "CPH-NG GNU objcopy path: $gobjcopy"
    else
        missing "CPH-NG references GNU objcopy: $gobjcopy"
    fi

    if printf '%s' "$all_config" | /usr/bin/grep -Fq "$intellisense_mode"; then
        ok "IntelliSense architecture: $intellisense_mode"
    else
        missing "Workspace IntelliSense architecture: $intellisense_mode"
    fi

    local configured_std_flags
    configured_std_flags="$(printf '%s' "$all_config" | \
        /usr/bin/grep -Eo -- '-std=(c\+\+|gnu\+\+)[[:alnum:]]+' | \
        /usr/bin/sort -u || true)"
    if [[ "$configured_std_flags" == "-std=c++23" ]]; then
        ok "C++ standard: C++23"
    else
        missing "Workspace standard flags must only contain -std=c++23; found: ${configured_std_flags:-none}"
    fi

    local tasks_file="${REPO_DIR}/.vscode/tasks.json"
    if [[ -f "$tasks_file" ]] && \
        /usr/bin/grep -Fq '"type": "shell"' "$tasks_file" && \
        /usr/bin/grep -Fq "\"label\": \"C++: g++-${gcc_version} build active file\"" "$tasks_file" && \
        /usr/bin/grep -Fq "\"command\": \"${gpp}\"" "$tasks_file" && \
        /usr/bin/grep -Fq "\"-I${boost_include}\"" "$tasks_file" && \
        /usr/bin/grep -Fq '"-std=c++23"' "$tasks_file"; then
        ok "Default shell build task: GCC ${gcc_version}, C++23, and Boost"
    else
        missing "Default shell build task must use ${gpp}, identify GCC ${gcc_version}, and compile as C++23 with Boost"
    fi

    local settings_file="${REPO_DIR}/.vscode/settings.json"
    if /usr/bin/grep -Fq '"cph-ng.languages.cppCompiler": "'"$gpp"'"' "$settings_file" && \
        /usr/bin/grep -Fq '"cph-ng.languages.cppCompilerArgs": "-O2 -std=c++23 -Wall -DCPH -I'"$boost_include"'"' "$settings_file" && \
        /usr/bin/grep -Fq '"cph-ng.languages.cppObjcopy": "'"$gobjcopy"'"' "$settings_file"; then
        ok "CPH-NG uses Homebrew GCC, C++23, Boost, and GNU objcopy"
    else
        missing "Complete CPH-NG C++ toolchain settings"
    fi
}

configure_gcc_command() {
    log "Configuring the default g++ command for CPH-NG"

    local gcc_prefix
    local gpp
    local local_bin="${HOME}/bin"
    local gpp_link="${local_bin}/g++"
    local path_line='export PATH="$HOME/bin:$PATH"'

    gcc_prefix="$($BREW --prefix gcc)"
    gpp="$(find_gpp "$gcc_prefix" || true)"
    [[ -n "$gpp" ]] || die "Could not find Homebrew g++ for the default command shim."

    if [[ -e "$gpp_link" && ! -L "$gpp_link" ]]; then
        die "Cannot configure ${gpp_link}: a non-symlink already exists there."
    fi

    if [[ "$MODE" == "install" ]]; then
        /bin/mkdir -p "$local_bin"
        /bin/ln -sfn "$gpp" "$gpp_link"

        local zprofile_file="${HOME}/.zprofile"
        /usr/bin/touch "$zprofile_file"
        if ! /usr/bin/grep -Fqx "$path_line" "$zprofile_file"; then
            printf '\n%s\n' "$path_line" >> "$zprofile_file"
        fi
    fi

    if [[ -L "$gpp_link" && "$(/usr/bin/readlink "$gpp_link")" == "$gpp" ]]; then
        ok "Default g++ command: ${gpp_link} -> ${gpp}"
    else
        missing "Default g++ command shim: ${gpp_link} -> ${gpp}"
    fi
}

verify_workspace() {
    log "Running C++ toolchain smoke test"

    local gcc_prefix
    local boost_prefix
    local gpp
    local source_file
    local output_file

    gcc_prefix="$($BREW --prefix gcc)"
    boost_prefix="$($BREW --prefix boost)"
    gpp="$(find_gpp "$gcc_prefix" || true)"
    [[ -n "$gpp" ]] || die "Could not find Homebrew g++."

    TEMP_DIR="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/cp-setup.XXXXXX")"
    source_file="${TEMP_DIR}/smoke.cpp"
    output_file="${TEMP_DIR}/smoke"

    printf '%s\n' \
        '#include <bits/stdc++.h>' \
        '#include <boost/container/flat_set.hpp>' \
        '#include <ext/pb_ds/assoc_container.hpp>' \
        '#include <ext/pb_ds/tree_policy.hpp>' \
        'using namespace __gnu_pbds;' \
        'static_assert(__cplusplus >= 202100L, "C++23 mode is required");' \
        'int main() {' \
        '    tree<int, null_type, std::less<int>, rb_tree_tag, tree_order_statistics_node_update> values;' \
        '    boost::container::flat_set<int> boosted_values;' \
        '    values.insert(7);' \
        '    boosted_values.insert(11);' \
        '    return values.order_of_key(8) == 1 && boosted_values.contains(11) ? 0 : 1;' \
        '}' > "$source_file"

    if "$gpp" -O2 -std=c++23 -Wall -DCPH -I"${boost_prefix}/include" \
        "$source_file" -o "$output_file" && "$output_file"; then
        ok "GCC C++23, bits/stdc++.h, Boost, and PBDS"
    else
        missing "GCC/Boost/PBDS smoke test"
    fi

    if "$($BREW --prefix clang-format)/bin/clang-format" \
        --style=file \
        --assume-filename="${REPO_DIR}/smoke.cpp" \
        "$source_file" >/dev/null; then
        ok "clang-format and repository style"
    else
        missing "clang-format smoke test"
    fi

    /bin/rm -rf -- "$TEMP_DIR"
    TEMP_DIR=""

    if [[ -s "${REPO_DIR}/.vscode/cpp.json.code-snippets" ]]; then
        ok "C++ workspace snippets"
    else
        missing "${REPO_DIR}/.vscode/cpp.json.code-snippets"
    fi

    if [[ -s "${REPO_DIR}/.clang-format" ]]; then
        local configured_column_limit
        configured_column_limit="$("$($BREW --prefix clang-format)/bin/clang-format" \
            --style="file:${REPO_DIR}/.clang-format" \
            --dump-config 2>/dev/null | /usr/bin/awk '/^ColumnLimit:/ { print $2; exit }')"
        if [[ "$configured_column_limit" == "0" ]]; then
            ok "Repository clang-format rules (no forced line wrapping)"
        else
            missing "clang-format ColumnLimit: expected 0, found ${configured_column_limit:-unknown}"
        fi
    else
        missing "${REPO_DIR}/.clang-format"
    fi

    if [[ -x /usr/bin/clangd ]]; then
        ok "Apple clangd: $(/usr/bin/clangd --version | /usr/bin/head -n 1)"
    else
        missing "Apple clangd"
    fi

    if [[ -x "${REPO_DIR}/setup.sh" ]]; then
        ok "Bootstrap script is executable"
    else
        missing "Executable permission on ${REPO_DIR}/setup.sh"
    fi

    local shellcheck_bin
    shellcheck_bin="$($BREW --prefix shellcheck)/bin/shellcheck"
    if [[ -x "$shellcheck_bin" ]] && "$shellcheck_bin" -x "${REPO_DIR}/setup.sh"; then
        ok "Bootstrap script passes ShellCheck"
    else
        missing "ShellCheck validation for ${REPO_DIR}/setup.sh"
    fi

    if /usr/bin/grep -Fq '"editor.fontFamily": "'"'"'GeistMono Nerd Font Mono' "${REPO_DIR}/.vscode/settings.json" && \
        /usr/bin/grep -Fq '"terminal.integrated.fontFamily": "'"'"'GeistMono Nerd Font Mono' "${REPO_DIR}/.vscode/settings.json" && \
        /usr/bin/grep -Fq '"debug.console.fontFamily": "'"'"'GeistMono Nerd Font Mono' "${REPO_DIR}/.vscode/settings.json" && \
        /usr/bin/grep -Fq '"editor.inlineSuggest.fontFamily": "'"'"'GeistMono Nerd Font Mono' "${REPO_DIR}/.vscode/settings.json" && \
        /usr/bin/grep -Fq '"editor.fontLigatures": "'"'"'ss11'"'"'"' "${REPO_DIR}/.vscode/settings.json"; then
        ok "VSCodium uses GeistMono Nerd Font Mono throughout"
    else
        missing "Complete GeistMono Nerd Font VSCodium settings"
    fi

    if /usr/bin/git -C "$REPO_DIR" check-ignore --no-index -q .cph-ng/setup-test.bin; then
        ok "Generated CPH-NG binaries are ignored"
    else
        missing ".cph-ng/*.bin rule in .gitignore"
    fi
}

print_summary() {
    local gcc_prefix
    local gpp
    local github_account

    gcc_prefix="$($BREW --prefix gcc)"
    gpp="$(find_gpp "$gcc_prefix" || true)"
    github_account=""
    if [[ -n "$GH" ]] && "$GH" auth status --hostname github.com >/dev/null 2>&1; then
        github_account="$($GH api user --jq .login 2>/dev/null || true)"
    fi

    log "Installation summary"
    printf '    %-20s %s\n' \
        "Repository" "$REPO_DIR" \
        "Workspace" "$WORKSPACE_FILE" \
        "Git author" "${GIT_AUTHOR_NAME} <${GIT_AUTHOR_EMAIL}>" \
        "GitHub account" "${github_account:-not authenticated/skipped}" \
        "Homebrew" "$BREW" \
        "GNU C++" "${gpp:-missing}" \
        "clangd" "/usr/bin/clangd" \
        "clang-format" "$($BREW --prefix clang-format)/bin/clang-format" \
        "VSCodium" "${CODIUM:-missing}" \
        "Browser" "Orion" \
        "Codex CLI" "$(find_codex_cli || printf 'missing')" \
        "CLI tools" "ripgrep, fzf, jq, tree, shellcheck" \
        "Dev tools" "CMake, Ninja, Git LFS, Vim, tmux, uv, fd, bat, eza" \
        "Zsh" "Oh My Zsh + Powerlevel10k + productivity plugins" \
        "Font" "GeistMono Nerd Font Mono (ss11 ligatures)"

    printf '\n%s\n' \
        "Manual, security-sensitive follow-up:" \
        "  - Run codex and sign in with ChatGPT the first time you use it." \
        "  - Sign into WakaTime inside VSCodium if you use it." \
        "  - Install the Competitive Companion browser extension if you parse problems from a browser." \
        "  - LaTeX tooling is intentionally not installed because a TeX distribution is several gigabytes."
}

main() {
    while (($# > 0)); do
        case "$1" in
            --check)
                MODE="check"
                OPEN_EDITOR=false
                ;;
            --no-open)
                OPEN_EDITOR=false
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                usage >&2
                die "Unknown option: $1"
                ;;
        esac
        shift
    done

    ensure_macos_preflight
    ensure_command_line_tools
    ensure_repository

    if [[ -z "$REPO_DIR" ]]; then
        printf '\nSetup check found %d missing component(s).\n' "$FAILURES"
        exit 1
    fi

    ensure_git_identity
    ensure_homebrew

    if [[ -z "$BREW" ]]; then
        printf '\nSetup check found %d missing component(s).\n' "$FAILURES"
        exit 1
    fi

    validate_cask_policy

    log "Checking Homebrew packages"
    local item
    for item in "${FORMULAE[@]}"; do
        ensure_formula "$item"
    done
    for item in "${CASKS[@]}"; do
        ensure_cask "$item"
    done
    ensure_geist_mono_font
    configure_macos_terminal_font

    ensure_oh_my_zsh
    configure_brew_command_policy
    configure_zsh_plugins
    ensure_codex_cli
    verify_developer_tools
    ensure_extensions

    # Only inspect paths when their packages are available.
    if "$BREW" list --formula gcc boost clang-format >/dev/null 2>&1; then
        configure_gcc_command
        sync_workspace_paths
        verify_workspace
    fi

    # Keep the mandatory interactive GitHub login as the final setup action.
    ensure_github_auth

    if ((FAILURES > 0)); then
        printf '\n\033[1;31mSetup found %d problem(s).\033[0m\n' "$FAILURES" >&2
        printf 'Run ./setup.sh to install missing components, or inspect the messages above.\n' >&2
        exit 1
    fi

    print_summary

    if [[ "$MODE" == "check" ]]; then
        printf '\n\033[1;32mEverything is installed and configured.\033[0m\n'
        exit 0
    fi

    log "Setup complete"
    printf '%s\n' \
        "The compiler, Boost, clangd, clang-format, GeistMono Nerd Font, snippets," \
        "VSCodium, and workspace extensions are ready."
    if [[ "$OPEN_EDITOR" == "true" ]]; then
        log "Opening the competitive-programming workspace"
        "$CODIUM" "$WORKSPACE_FILE" >/dev/null 2>&1 &
    else
        ok "VSCodium launch skipped"
    fi
}

main "$@"
