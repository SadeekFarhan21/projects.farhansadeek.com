#!/usr/bin/env bash
set -euo pipefail

# Portable macOS installer for Farhan's Zsh setup.
# Run with: bash install-zsh-setup.sh

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it from https://brew.sh, then rerun this script."
  exit 1
fi

eval "$(brew shellenv)"

brew install \
  antidote \
  fzf \
  fzf-tab \
  powerlevel10k \
  zoxide \
  zsh-autopair \
  zsh-autosuggestions \
  zsh-completions \
  zsh-history-substring-search \
  zsh-syntax-highlighting

zshrc="$HOME/.zshrc"
marker_start="# >>> farhan-zsh-setup >>>"
marker_end="# <<< farhan-zsh-setup <<<"

if [[ -f "$zshrc" ]] && grep -Fq "$marker_start" "$zshrc"; then
  echo "Zsh plugin setup is already present in $zshrc"
  exit 0
fi

if [[ -f "$zshrc" ]]; then
  cp "$zshrc" "$zshrc.backup.$(date +%Y%m%d%H%M%S)"
fi

cat >> "$zshrc" <<'ZSH_CONFIG'

# >>> farhan-zsh-setup >>>
FPATH="$(brew --prefix)/share/zsh-completions:$FPATH"
autoload -Uz compinit
compinit

source "$(brew --prefix)/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
source "$(brew --prefix)/opt/fzf-tab/share/fzf-tab/fzf-tab.zsh"
source "$(brew --prefix)/share/zsh-history-substring-search/zsh-history-substring-search.zsh"
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down
# Make Option+Backspace delete the previous word in macOS terminals.
bindkey '^[^?' backward-kill-word
bindkey '^[^H' backward-kill-word
eval "$(zoxide init zsh)"
source "$(brew --prefix)/share/zsh-autopair/autopair.zsh"
source "$(brew --prefix)/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
source "$(brew --prefix)/share/powerlevel10k/powerlevel10k.zsh-theme"
# <<< farhan-zsh-setup <<<
ZSH_CONFIG

echo "Installed Zsh setup. Start a new terminal, then run 'p10k configure' if desired."
