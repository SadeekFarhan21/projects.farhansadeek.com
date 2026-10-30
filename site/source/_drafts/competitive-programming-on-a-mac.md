---
layout: post
title: "Four Years of Competitive Programming, and a Mac Where g++ Is Clang"
tab_title: Competitive Programming
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/competitive-programming
date: 2022-09-13 23:38:03
tags:
  - competitive-programming
  - cpp
  - macos
  - developer-tools
description: >-
  717 solution files from 19 judges since 2022, a one-command macOS setup that
  keeps 18 version-stamped GCC paths in sync, and a 2026 where I solved the
  most new problems with the fewest submissions per solve.
---

On a Mac, typing `g++` runs Apple Clang, and Apple Clang can't compile the first line of almost every competitive programming solution, `#include <bits/stdc++.h>`. My solutions repository has 717 solution files from 19 judges going back to 2022, and keeping them compiling on a new Mac turned into a 1,347-line setup script. **The hard part isn't installing GCC. It's that Homebrew puts the GCC version number into every path, and my editor config pointed at those paths in 18 places across five files, so every major GCC upgrade quietly broke autocomplete, the build task and the test runner at once.**

The other thing the repository holds is history. Pairing it with the submission data from my judge dashboard, 2026 is the year I solved the most new problems (244 by mid-October) while making the fewest submissions per new solve, 1.8 against 2.5 to 2.8 in every earlier year. This is a solo, personal collection, and the setup script targets an Apple Silicon MacBook.

## Why It Matters

Competitive programmers write C++ in a specific dialect. Solutions start with `bits/stdc++.h`, a GCC-only header that pulls in the whole standard library at once. Some use policy-based data structures (PBDS), a GCC extension that gives you a balanced tree that can answer "how many elements are smaller than x" in logarithmic time. Codeforces, AtCoder and most other judges compile with GCC, so code that relies on these is normal and expected.

None of it works with Apple's toolchain. Here's what the stock compiler on my laptop says.

```text
$ /usr/bin/g++ --version
Apple clang version 17.0.0 (clang-1700.4.4.1)
$ /usr/bin/g++ -std=c++20 t.cpp
t.cpp:1:10: fatal error: 'bits/stdc++.h' file not found
```

So a Mac needs real GCC from Homebrew, and then every tool that touches C++ has to be told to use it. That includes the build task, the language server that does autocomplete and error squiggles, the formatter, and the test runner that pastes sample inputs into your program. Each has its own config file and its own idea of where the compiler lives.

## Technical Details

### Where the Version Number Hides

Homebrew installs GCC as `g++-16`, never plain `g++`, and its headers live under `include/c++/16/` and `include/c++/16/aarch64-apple-darwin25/`. The editor tooling needs those exact paths. `clangd`, the language server, needs to be told which compiler to imitate so it can find GCC's headers instead of Apple's. My `compile_flags.txt` ends up looking like this.

```text
-std=c++23
-nostdinc++
-isystem/opt/homebrew/opt/gcc/include/c++/16
-isystem/opt/homebrew/opt/gcc/include/c++/16/aarch64-apple-darwin25
-isystem/opt/homebrew/opt/gcc/include/c++/16/backward
-I/opt/homebrew/opt/boost/include
```

Counting every `g++-16` and `c++/16` across the VS Code settings, tasks, IntelliSense config, `.clangd` and `compile_flags.txt` gives 18 references. **When Homebrew moves to GCC 17, all 18 go stale, and nothing fails loudly.** The language server just starts reporting that `bits/stdc++.h` is missing, which looks exactly like the Apple Clang problem you thought you had solved.

### The Test Runner Calls Plain g++

CPH-NG, the VS Code extension I use to run sample tests, gets its compiler path from the workspace settings, but anything that calls `g++` by name still gets Apple Clang. So the script also puts a symlink at `~/bin/g++` pointing at the newest Homebrew GCC and puts `~/bin` first on the `PATH`. After that, `g++` means GCC everywhere.

## Implementation

`setup.sh` is one idempotent Bash script. It installs the Apple command line tools, Homebrew, GCC, Boost, binutils, clang-format, VSCodium and its extensions, then configures the workspace. Running it again only fixes what's missing. Running it with `--check` changes nothing and reports what's wrong.

### Finding the Compiler Instead of Naming It

The script never hard-codes a version. It globs Homebrew's `bin` directory for every `g++-N` and keeps the highest `N`.

```bash
for candidate in "${gcc_prefix}"/bin/g++-[0-9]*; do
    [[ -x "$candidate" ]] || continue
    version="${candidate##*-}"
    [[ "$version" =~ ^[0-9]+$ ]] || continue
    if ((version > best_version)); then
        best_version="$version"
        best_path="$candidate"
    fi
done
```

From that path it derives everything else. The version is the suffix, the target triple comes from `g++ -dumpmachine`, and the header directories are built from both.

### Rewriting Every Config in One Pass

Then one Perl substitution walks all five config files and replaces any GCC path, of any version, under either `/opt/homebrew` (Apple Silicon) or `/usr/local` (Intel), with the current one.

```perl
s{/(?:opt/homebrew|usr/local)/opt/gcc/bin/g\+\+-[0-9]+}{$ENV{CP_GPP}}g;
s{/(?:opt/homebrew|usr/local)/opt/gcc/include/c\+\+/[0-9]+/(?:aarch64|x86_64)-apple-darwin[0-9]+}{$ENV{CP_GCC_TARGET_INCLUDE}}g;
s{/(?:opt/homebrew|usr/local)/opt/gcc/include/c\+\+/[0-9]+}{$ENV{CP_GCC_INCLUDE_BASE}}g;
```

The same pass pins the language standard to C++23 and sets the IntelliSense mode for the machine's architecture. Matching on a pattern instead of an exact old value means the script repairs a config regardless of which version it was last pointing at.

### Proving It Works

Checking that files exist isn't enough, because a path can exist and still point at the wrong compiler. The last step compiles and runs a real program that uses everything a solution might.

```cpp
#include <bits/stdc++.h>
#include <boost/container/flat_set.hpp>
#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace __gnu_pbds;
static_assert(__cplusplus >= 202100L, "C++23 mode is required");
int main() {
    tree<int, null_type, std::less<int>, rb_tree_tag, tree_order_statistics_node_update> values;
    boost::container::flat_set<int> boosted_values;
    values.insert(7);
    boosted_values.insert(11);
    return values.order_of_key(8) == 1 && boosted_values.contains(11) ? 0 : 1;
}
```

If the build used Apple Clang, the first include fails. If it used GCC in an older mode, the `static_assert` fails. If PBDS or Boost is missing, it doesn't compile. And `order_of_key` has to return the right answer for the program to exit zero.

### The Solutions Themselves

The solutions are sorted into one folder per judge. Codeforces has 228 files, CodeChef 106, CSES 87, Kattis 49, USACO and AtCoder 41 each, and UVa 38, with smaller folders for SPOJ, LightOJ, POJ, Toph, Aizu, Beecrowd, HackerRank, Library Checker and Meta Hacker Cup. Of the 698 C++ files, 625 include `bits/stdc++.h` and 292 use `#define int long long` from my starter snippet, and the root holds the reusable pieces I reach for most, a Fenwick tree, a segment tree, union-find and knapsack.

## Results

The solutions say what I solved, and the judge submissions say when. Counting per calendar year (2026 runs to October 13), with a "new solve" meaning the first accepted submission on a problem I hadn't solved before.

| Year | Submissions | New problems solved | Submissions per new solve |
| --- | --- | --- | --- |
| 2022 | 592 | 228 | 2.6 |
| 2023 | 636 | 225 | 2.8 |
| 2024 | 374 | 145 | 2.6 |
| 2025 | 433 | 173 | 2.5 |
| 2026 | 442 | 244 | 1.8 |

**2026 already has more new solves than any full year before it, from fewer submissions than 2022 or 2023.** Every earlier year took between 2.5 and 2.8 submissions for each new problem, a ratio steady enough that the drop to 1.8 stands out. Less of 2026 went to retrying problems and more went to new ones.

The mix of judges moved too. In 2022, Codeforces was my most-used judge at 265 submissions. In 2025 it was LeetCode at 228, and in 2026 LeetCode (154) and CSES (89) lead, with CSES up from 62 submissions in 2024. **My practice moved from contest problems toward standard problem sets, and that is also the year submissions per solve fell.**

## What I Would Change

I'd make the setup script check for a Homebrew GCC upgrade on every run of the build task instead of only when I run `setup.sh`. Today, after `brew upgrade`, I have to remember to re-run it.

I'd also add the problem statements consistently. Thirty-five Codeforces solutions have the statement saved next to them, and the rest don't, which makes old solutions harder to reread than they should be.
