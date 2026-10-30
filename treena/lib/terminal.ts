import * as FileSystem from "expo-file-system/legacy";
import { useStore } from "@/store";
import { remoteTerminal } from "@/lib/remote-terminal";

const HELP_TEXT = `Available commands:
  ls [path]       List directory contents
  cat <file>      Display file contents
  mkdir <name>    Create directory
  touch <name>    Create empty file
  rm <path>       Remove file (use -r for directories)
  pwd             Print working directory
  clear           Clear terminal
  git status      Show git status
  git log         Show recent commits
  git branch      Show current branch
  help            Show this help message`;

const GIT_STUB_HELP = `This is not a full git binary — only these work here:
  git status   — working tree summary (isomorphic-git)
  git log      — last 10 commits
  git branch   — current branch

Use the Git UI in the app for commit/pull/push. For a real shell with git, turn on Remote workspace and connect to the bridge (Git must be installed on the bridge host).`;

function getProjectRoot(): string {
  return (
    useStore.getState().projectRoot ||
    FileSystem.documentDirectory + "projects/"
  );
}

function resolvePath(pathArg: string): string {
  const root = getProjectRoot();
  // Build the candidate path
  let resolved: string;
  if (pathArg.startsWith("/")) {
    resolved = root + pathArg.slice(1);
  } else {
    resolved = root + pathArg;
  }

  // Normalize away any ".." or "." segments to prevent path traversal
  const parts = resolved.split("/").filter(Boolean);
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      normalized.pop();
    } else if (part !== ".") {
      normalized.push(part);
    }
  }
  const final = "/" + normalized.join("/") + "/";

  // Ensure the resolved path is still within the project root
  if (!final.startsWith(root)) {
    throw new Error("Access denied: path is outside project directory");
  }
  // Return without trailing slash (unless it IS the root)
  return final.endsWith("/") && final !== root ? final.slice(0, -1) : final;
}

export async function executeCommand(input: string): Promise<string> {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  try {
    switch (cmd) {
      case "help":
        return HELP_TEXT;

      case "clear":
        useStore.getState().clearTerminal(useStore.getState().activeTerminalId);
        return "";

      case "pwd":
        return getProjectRoot();

      case "ls": {
        const target = args[0] ? resolvePath(args[0]) : getProjectRoot();
        const info = await FileSystem.getInfoAsync(target);
        if (!info.exists)
          return `ls: ${args[0] || "."}: No such file or directory`;
        if (!info.isDirectory) return args[0] || ".";
        const entries = await FileSystem.readDirectoryAsync(target);
        return entries.sort().join("\n") || "(empty)";
      }

      case "cat": {
        if (!args[0]) return "cat: missing operand";
        const path = resolvePath(args[0]);
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists)
          return `cat: ${args[0]}: No such file or directory`;
        return await FileSystem.readAsStringAsync(path, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      case "mkdir": {
        if (!args[0]) return "mkdir: missing operand";
        const path = resolvePath(args[0]);
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
        return `Created directory: ${args[0]}`;
      }

      case "touch": {
        if (!args[0]) return "touch: missing operand";
        const path = resolvePath(args[0]);
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) return `File already exists: ${args[0]}`;
        await FileSystem.writeAsStringAsync(path, "", {
          encoding: FileSystem.EncodingType.UTF8,
        });
        return `Created file: ${args[0]}`;
      }

      case "rm": {
        if (!args[0]) return "rm: missing operand";
        const hasRecursiveFlag = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
        const target = args.find((a) => !a.startsWith("-"));
        if (!target) return "rm: missing operand";
        const path = resolvePath(target);
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists)
          return `rm: ${target}: No such file or directory`;
        if (info.isDirectory && !hasRecursiveFlag) {
          return `rm: ${target}: is a directory (use -r to remove)`;
        }
        await FileSystem.deleteAsync(path);
        return `Removed: ${target}`;
      }

      case "git": {
        const subCmd = args[0]?.toLowerCase();
        const dir = getProjectRoot();

        if (!subCmd) {
          return GIT_STUB_HELP;
        }

        switch (subCmd) {
          case "status": {
            const { gitStatus } = await import("./git");
            const matrix = await gitStatus(dir);
            if (matrix.length === 0)
              return "Nothing to commit, working tree clean";
            return (
              matrix
                .filter(([, head, workdir]) => head !== workdir)
                .map(([filepath, head, workdir]) => {
                  const status =
                    head === 0
                      ? "new file"
                      : workdir === 0
                      ? "deleted"
                      : "modified";
                  return `  ${status}: ${filepath}`;
                })
                .join("\n") || "Nothing to commit, working tree clean"
            );
          }

          case "log": {
            const { gitLog } = await import("./git");
            const entries = await gitLog(dir, 10);
            return (
              entries
                .map((e) => `${e.shortOid} ${e.message} (${e.author})`)
                .join("\n") || "No commits yet"
            );
          }

          case "branch": {
            const { gitCurrentBranch } = await import("./git");
            const branch = await gitCurrentBranch(dir);
            return `* ${branch}`;
          }

          default:
            return `git: '${args[0]}' is not supported in the on-device terminal.\n\n${GIT_STUB_HELP}`;
        }
      }

      case "npm":
      case "npx":
      case "node":
      case "yarn":
      case "pnpm":
      case "bun":
      case "pip":
      case "python":
      case "ruby":
      case "cargo":
        if (remoteTerminal.isConnected) {
          return _executeRemote(input);
        }
        return "Not connected to remote server. Configure server URL in settings.";

      default:
        if (remoteTerminal.isConnected) {
          return _executeRemote(input);
        }
        return `${cmd}: command not found. Type 'help' for available commands.`;
    }
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

function _executeRemote(command: string): Promise<string> {
  const { appendTerminalOutput } = useStore.getState();
  return new Promise((resolve) => {
    remoteTerminal.executeRemote(
      command,
      (line) => appendTerminalOutput(line),
      (_code) => resolve(""),
      (error) => resolve(`Error: ${error}`)
    );
  });
}
