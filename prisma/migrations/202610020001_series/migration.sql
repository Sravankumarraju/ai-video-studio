-- Devotional projects (series) with inherited video settings. Additive: existing projects
-- become unassigned videos and keep working unchanged.
CREATE TABLE "Series" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "settings" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "libraryProjectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Series_libraryProjectId_key" ON "Series"("libraryProjectId");
ALTER TABLE "Project" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'video';
ALTER TABLE "Project" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "Project_seriesId_idx" ON "Project"("seriesId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
