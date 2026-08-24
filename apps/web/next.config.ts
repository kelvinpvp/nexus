import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: process.env.TAURI_ENV ? 'export' : undefined,
  async rewrites() {
    if (process.env.TAURI_ENV) {
      return [];
    }
    return [
      {
        source: '/invite/:code',
        destination: '/invite?code=:code',
      },
    ];
  },
};

export default nextConfig;
