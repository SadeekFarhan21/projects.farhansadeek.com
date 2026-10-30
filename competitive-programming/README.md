# Competitive Programming

Competitive-programming solutions and a reproducible macOS development workspace using GCC, C++23, clangd, clang-format, Boost, CPH-NG, and VSCodium.

## Repository layout

Solutions are grouped by the judge they were submitted to:

| Folder | Judge |
| --- | --- |
| `Codeforces/` | Codeforces (numbered subfolders are contest IDs, including Gym) |
| `CodeChef/` | CodeChef |
| `AtCoder/` | AtCoder |
| `CSES/` | CSES Problem Set |
| `Kattis/` | Open Kattis |
| `USACO/` | USACO |
| `UVa/` | UVa Online Judge |
| `SPOJ/`, `LightOJ/`, `POJ/`, `Toph/`, `Aizu/`, `Beecrowd/`, `HackerRank/`, `Library-Checker/`, `Meta-Hacker-Cup/` | Other judges |
| `LeetCode/`, `GeeksForGeeks/` | Interview-style practice |
| `VJudge/` | Virtual Judge contest problems |
| `Unsorted/` | Solutions whose source judge could not be determined |

CPH test cases live in each folder's `.cph/` directory.

## Fresh Mac setup

The bootstrap installs the required tools, clones this repository when necessary, configures the workspace for the current Homebrew/GCC paths, authenticates GitHub securely, runs a real compiler test, and opens the workspace.

```bash
/bin/bash -c "$(/usr/bin/curl -fsSL https://raw.githubusercontent.com/SadeekFarhan21/Competitive-Programming/main/setup.sh)"
```

You can review or download the script from the repository's [setup page](index.html) before running it.

If the repository is already cloned:

```bash
cd Competitive-Programming
./setup.sh
```

The setup installs:

- Apple Command Line Tools and Homebrew
- Homebrew GCC, Boost, clang-format, Python, and GitHub CLI
- Ripgrep, fzf, jq, tree, and ShellCheck command-line tools
- CMake, Ninja, Git LFS, Vim, tmux, uv, fd, bat, and eza
- Zsh autosuggestions and syntax highlighting
- VSCodium and the workspace extensions
- Codex, Orion Browser, and Geist Mono
- C++23 compiler, clangd, formatter, snippets, Code Runner, CPH, and CPH-NG settings

The bootstrap explicitly excludes the `brave-browser` Homebrew cask from its managed package list. It does not control software installed manually outside the bootstrap.

## Verify the environment

Run the read-only health check at any time:

```bash
./setup.sh --check
```

It verifies package installation, GitHub authentication, extensions, compiler paths, C++23 configuration, formatting, ligatures, snippets, and a GCC compile/run test using `bits/stdc++.h` and PBDS.

Useful options:

```text
--no-open            Complete setup without opening VSCodium
--skip-github-auth   Skip the interactive GitHub login
--help               Show all options
```

## Build and run

- Build the active C++ file with the default VSCodium build task.
- Run the active file with Code Runner or CPH-NG.
- All workspace consumers use Homebrew GCC and `-std=c++23`.
- Formatting runs on type and save using the repository's `.clang-format` rules.

## Manual follow-up

- Run `codex` and sign in with ChatGPT the first time you use it.
- Sign in to WakaTime inside VSCodium if you use it.
- Install the Competitive Companion browser extension if you parse problems from contest sites.
- LaTeX is not installed automatically because a TeX distribution is several gigabytes.

The bootstrap supports Apple Silicon and Intel Macs and is safe to run repeatedly.

## WakaTime heartbeat

Send a heartbeat for this repository:

```sh
make heartbeat
```

To associate the heartbeat with a specific file and mark it as a write:

```sh
make heartbeat FILE=Planets_and_Kingdoms.cpp
```

The command uses `wakatime-cli` from `PATH`, or the CLI installed under
`~/.wakatime` by the WakaTime VS Code extension.
