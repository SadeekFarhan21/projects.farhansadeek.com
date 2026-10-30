import { useCallback } from "react";
import { useStore } from "@/store";
import {
  gitClone,
  gitPull,
  gitPush,
  gitCommit,
  gitStatus,
  gitLog,
  gitCurrentBranch,
  gitInit,
} from "@/lib/git";
import { mapStatusMatrix } from "@/lib/gitStatusMapper";
import { isRemoteWorkspacePath } from "@/lib/workspace/remotePaths";
import {
  remoteGitCommit,
  remoteGitLog,
  remoteGitPull,
  remoteGitPush,
  remoteGitStatus,
} from "@/lib/workspace/remoteWsBridge";
import { getGithubPatForGitOps, resolveGithubPatForRemoteGitOps } from "@/lib/gitRemotePat";

export function useGit() {
  const projectRoot = useStore((s) => s.projectRoot);
  const setCurrentBranch = useStore((s) => s.setCurrentBranch);
  const setGitStatus = useStore((s) => s.setGitStatus);
  const setRepoName = useStore((s) => s.setRepoName);
  const githubToken = useStore((s) => s.githubToken);
  const remoteGithubPatByKey = useStore((s) => s.remoteGithubPatByKey);
  const setGitFileStatuses = useStore((s) => s.setGitFileStatuses);

  const refreshRemoteGitState = useCallback(async (): Promise<string[]> => {
    try {
      const { branch, statuses, changedPaths } = await remoteGitStatus();
      setCurrentBranch(branch);
      setGitStatus(changedPaths);
      setGitFileStatuses(statuses);
      return changedPaths;
    } catch {
      setGitStatus([]);
      setGitFileStatuses({});
      setCurrentBranch("HEAD");
      return [];
    }
  }, [setCurrentBranch, setGitStatus, setGitFileStatuses]);

  const clone = useCallback(
    async (
      url: string,
      targetDir: string,
      onProgress?: (phase: string, loaded: number, total: number) => void
    ) => {
      if (isRemoteWorkspacePath(targetDir)) return;
      await gitClone(url, targetDir, {
        token: githubToken || undefined,
        onProgress,
      });

      // Extract repo name from URL
      const name = url.split("/").pop()?.replace(/\.git$/, "") ?? "repo";
      setRepoName(name);

      const branch = await gitCurrentBranch(targetDir);
      setCurrentBranch(branch);
    },
    [githubToken, setRepoName, setCurrentBranch]
  );

  const pull = useCallback(async () => {
    if (!projectRoot) return;
    if (isRemoteWorkspacePath(projectRoot)) {
      await remoteGitPull(await resolveGithubPatForRemoteGitOps());
      await refreshRemoteGitState();
      return;
    }
    await gitPull(projectRoot, {
      token: githubToken || undefined,
    });
  }, [projectRoot, githubToken, remoteGithubPatByKey, refreshRemoteGitState]);

  const push = useCallback(async () => {
    if (!projectRoot) return;
    if (isRemoteWorkspacePath(projectRoot)) {
      await remoteGitPush(await resolveGithubPatForRemoteGitOps());
      await refreshRemoteGitState();
      return;
    }
    await gitPush(projectRoot, {
      token: githubToken || undefined,
    });
  }, [projectRoot, githubToken, remoteGithubPatByKey, refreshRemoteGitState]);

  const commit = useCallback(
    async (message: string) => {
      if (!projectRoot) return;
      if (isRemoteWorkspacePath(projectRoot)) {
        const { oid } = await remoteGitCommit(message);
        await refreshRemoteGitState();
        return oid ?? "";
      }
      return gitCommit(projectRoot, message);
    },
    [projectRoot, refreshRemoteGitState]
  );

  const getStatus = useCallback(async () => {
    if (!projectRoot) return;
    if (isRemoteWorkspacePath(projectRoot)) {
      return refreshRemoteGitState();
    }
    const matrix = await gitStatus(projectRoot);
    const changed = matrix
      .filter(([, head, workdir]) => head !== workdir)
      .map(([filepath]) => filepath);
    setGitStatus(changed);
    const statuses = mapStatusMatrix(matrix);
    setGitFileStatuses(statuses);
    return changed;
  }, [
    projectRoot,
    setGitStatus,
    setGitFileStatuses,
    refreshRemoteGitState,
  ]);

  const getLog = useCallback(
    async (depth = 20) => {
      if (!projectRoot) return [];
      if (isRemoteWorkspacePath(projectRoot)) {
        try {
          return await remoteGitLog(depth);
        } catch {
          return [];
        }
      }
      return gitLog(projectRoot, depth);
    },
    [projectRoot]
  );

  const refreshBranch = useCallback(async () => {
    if (!projectRoot) return;
    if (isRemoteWorkspacePath(projectRoot)) {
      await refreshRemoteGitState();
      return;
    }
    const branch = await gitCurrentBranch(projectRoot);
    setCurrentBranch(branch);
  }, [projectRoot, setCurrentBranch, refreshRemoteGitState]);

  const init = useCallback(
    async (dir: string) => {
      if (isRemoteWorkspacePath(dir)) return;
      await gitInit(dir);
      setCurrentBranch("main");
    },
    [setCurrentBranch]
  );

  return {
    clone,
    pull,
    push,
    commit,
    getStatus,
    getLog,
    refreshBranch,
    init,
  };
}
