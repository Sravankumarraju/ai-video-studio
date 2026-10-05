CREATE TABLE "YoutubeConnection" (
 "id" TEXT NOT NULL DEFAULT 'owner', "encryptedClient" TEXT NOT NULL,
 "encryptedTokens" TEXT, "channelId" TEXT, "channelTitle" TEXT,
 "stateHash" TEXT, "encryptedVerifier" TEXT, "stateExpiresAt" TIMESTAMP(3),
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "YoutubeConnection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "YoutubeUpload" (
 "id" TEXT NOT NULL, "renderJobId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
 "channelId" TEXT NOT NULL, "thumbnailAssetId" TEXT NOT NULL, "metadata" JSONB NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'queued', "stage" TEXT NOT NULL DEFAULT 'Queued',
 "encryptedSession" TEXT, "totalBytes" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "bytesUploaded" DOUBLE PRECISION NOT NULL DEFAULT 0, "videoId" TEXT,
 "thumbnailApplied" BOOLEAN NOT NULL DEFAULT false, "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
 "error" TEXT, "verifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "YoutubeUpload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "YoutubeUpload_renderJobId_channelId_key" ON "YoutubeUpload"("renderJobId", "channelId");
CREATE INDEX "YoutubeUpload_state_createdAt_idx" ON "YoutubeUpload"("state", "createdAt");
