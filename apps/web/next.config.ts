import type { NextConfig } from "next";

const minioUrl = new URL(process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: minioUrl.protocol.slice(0, -1) as "http" | "https",
        hostname: minioUrl.hostname,
        port: minioUrl.port || undefined,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [];
  },
};

export default nextConfig;
