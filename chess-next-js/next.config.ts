import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'socket.io': 'socket.io',
      })
    }
    return config
  },
};

export default nextConfig;
