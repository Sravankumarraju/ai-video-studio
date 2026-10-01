CREATE TABLE "McpConnection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "McpConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "McpConnection_tokenHash_key" ON "McpConnection"("tokenHash");
