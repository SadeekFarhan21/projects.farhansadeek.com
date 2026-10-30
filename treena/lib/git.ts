import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { fs } from "./fs-adapter";

export interface GitLogEntry {
  oid: string;
  shortOid: string;
  message: string;
  author: string;
  timestamp: number;
}

function authHeaders(token?: string): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Basic ${btoa(token + ":")}` };
}

export async function gitClone(
  url: string,
  dir: string,
  options?: { token?: string; onProgress?: (phase: string, loaded: number, total: number) => void }
): Promise<void> {
  await git.clone({
    fs,
    http,
    dir,
    url,
    singleBranch: true,
    depth: 50,
    headers: authHeaders(options?.token),
    onProgress: options?.onProgress
      ? (event) =>
          options.onProgress!(
            event.phase,
            event.loaded,
            event.total ?? 0
          )
      : undefined,
  });
}

export async function gitPull(
  dir: string,
  options?: { token?: string }
): Promise<void> {
  await git.pull({
    fs,
    http,
    dir,
    singleBranch: true,
    headers: authHeaders(options?.token),
    author: { name: "Treena User", email: "user@treena.app" },
  });
}

export async function gitPush(
  dir: string,
  options?: { token?: string }
): Promise<void> {
  await git.push({
    fs,
    http,
    dir,
    headers: authHeaders(options?.token),
  });
}

export async function gitCommit(
  dir: string,
  message: string,
  authorName = "Treena User",
  authorEmail = "user@treena.app"
): Promise<string> {
  // Stage all changes
  const matrix = await git.statusMatrix({ fs, dir });
  for (const [filepath, , workdir, stage] of matrix) {
    if (workdir !== stage) {
      if (workdir === 0) {
        await git.remove({ fs, dir, filepath });
      } else {
        await git.add({ fs, dir, filepath });
      }
    }
  }

  return await git.commit({
    fs,
    dir,
    message,
    author: { name: authorName, email: authorEmail },
  });
}

export async function gitStatus(
  dir: string
): Promise<Array<[string, number, number, number]>> {
  return await git.statusMatrix({ fs, dir });
}

export async function gitLog(
  dir: string,
  depth = 20
): Promise<GitLogEntry[]> {
  const commits = await git.log({ fs, dir, depth });
  return commits.map((c) => ({
    oid: c.oid,
    shortOid: c.oid.slice(0, 7),
    message: c.commit.message.trim(),
    author: c.commit.author.name,
    timestamp: c.commit.author.timestamp * 1000,
  }));
}

export async function gitCurrentBranch(dir: string): Promise<string> {
  return (await git.currentBranch({ fs, dir })) ?? "main";
}

export async function gitInit(dir: string): Promise<void> {
  await git.init({ fs, dir });
}
