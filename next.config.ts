import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bullmq", "ioredis"],
  poweredByHeader: false,
};
export default config;
