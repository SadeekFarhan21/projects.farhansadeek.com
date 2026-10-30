import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A lockfile in a parent directory otherwise makes Next guess the wrong workspace root.
  outputFileTracingRoot: path.dirname(new URL(import.meta.url).pathname),
  // The CP4/CP5 list used to live at /starred.
  async redirects() {
    return [
      { source: "/starred", destination: "/halim-book", permanent: true },
      { source: "/starred.json", destination: "/halim-book.json", permanent: true },
      { source: "/starred.csv", destination: "/halim-book.csv", permanent: true },
      { source: "/atcoder", destination: "/atcoder-topicwise", permanent: true },
    ];
  },
  // Short names for the AtCoder Topicwise exports, served in place so plain curl needs no -L.
  async rewrites() {
    return [
      { source: "/atcoder.txt", destination: "/atcoder-topicwise.txt" },
      { source: "/atcoder.csv", destination: "/atcoder-topicwise.csv" },
      { source: "/atcoder.json", destination: "/atcoder-topicwise.json" },
    ];
  },
};

export default nextConfig;
