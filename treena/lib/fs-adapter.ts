import * as FileSystem from "expo-file-system/legacy";

/**
 * Adapter implementing the fs.promises interface required by isomorphic-git,
 * built on top of expo-file-system's legacy function-based API (SDK 54).
 */

class FSError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

function enoent(path: string): FSError {
  return new FSError(`ENOENT: no such file or directory, '${path}'`, "ENOENT");
}

function eexist(path: string): FSError {
  return new FSError(`EEXIST: file already exists, '${path}'`, "EEXIST");
}

class Stat {
  type: "file" | "directory";
  size: number;
  mtimeMs: number;

  constructor(type: "file" | "directory", size: number, mtimeMs: number) {
    this.type = type;
    this.size = size;
    this.mtimeMs = mtimeMs;
  }

  isFile() {
    return this.type === "file";
  }
  isDirectory() {
    return this.type === "directory";
  }
  isSymbolicLink() {
    return false;
  }
}

function ensureUri(path: string): string {
  if (path.startsWith("file://")) return path;
  return "file://" + path;
}

async function ensureParentDir(path: string) {
  const uri = ensureUri(path);
  const parent = uri.substring(0, uri.lastIndexOf("/"));
  if (parent) {
    const info = await FileSystem.getInfoAsync(parent);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
    }
  }
}

export const fs = {
  promises: {
    async readFile(
      path: string,
      options?: { encoding?: string } | string
    ): Promise<Uint8Array | string> {
      const uri = ensureUri(path);
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw enoent(path);

      const encoding =
        typeof options === "string" ? options : options?.encoding;

      if (encoding === "utf8" || encoding === "utf-8") {
        return await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      // Return Uint8Array for binary reads
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    },

    async writeFile(
      path: string,
      data: Uint8Array | string,
      _options?: { encoding?: string } | string
    ): Promise<void> {
      await ensureParentDir(path);
      const uri = ensureUri(path);

      if (typeof data === "string") {
        await FileSystem.writeAsStringAsync(uri, data, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        // Convert Uint8Array to base64
        let binary = "";
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i]);
        }
        const base64 = btoa(binary);
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    },

    async unlink(path: string): Promise<void> {
      const uri = ensureUri(path);
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw enoent(path);
      await FileSystem.deleteAsync(uri);
    },

    async readdir(path: string): Promise<string[]> {
      const uri = ensureUri(path);
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw enoent(path);
      return await FileSystem.readDirectoryAsync(uri);
    },

    async mkdir(
      path: string,
      options?: { recursive?: boolean }
    ): Promise<void> {
      const uri = ensureUri(path);
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        if (options?.recursive) return;
        throw eexist(path);
      }
      await FileSystem.makeDirectoryAsync(uri, {
        intermediates: options?.recursive ?? false,
      });
    },

    async rmdir(path: string): Promise<void> {
      const uri = ensureUri(path);
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw enoent(path);
      await FileSystem.deleteAsync(uri);
    },

    async stat(path: string): Promise<Stat> {
      const uri = ensureUri(path);
      const info = await FileSystem.getInfoAsync(uri);

      if (!info.exists) throw enoent(path);

      if (info.isDirectory) {
        return new Stat(
          "directory",
          info.size ?? 0,
          info.modificationTime ? info.modificationTime * 1000 : Date.now()
        );
      }

      return new Stat(
        "file",
        info.size ?? 0,
        info.modificationTime ? info.modificationTime * 1000 : Date.now()
      );
    },

    async lstat(path: string): Promise<Stat> {
      // No symlink support on mobile, falls through to stat
      return fs.promises.stat(path);
    },
  },
};
