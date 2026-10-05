import { Queue } from "bullmq";
import { z } from "zod";
import { db } from "./db";
import { redis } from "./queue";
import { uploadMetadata, publicUpload } from "./youtube-policy";
import { youtubeStatus } from "./youtube";
import { renderIsCurrent } from "./projects";
import { projectSchema } from "./schema";
let queue: Queue | undefined;
export const youtubeQueue = () =>
  (queue ??= new Queue("story-studio-youtube", {
    connection: redis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 15000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  }));
export async function eligibleRender(id: string) {
  const job = await db.job.findUniqueOrThrow({ where: { id } });
  if (
    job.kind !== "render" ||
    job.state !== "completed" ||
    (job.snapshot as any).options?.draft ||
    !(job.result as any)?.mp4Key
  )
    throw Error("Select a completed full render");
  const current = await db.project.findUniqueOrThrow({ where: { id: job.projectId } });
  if (!renderIsCurrent((job.snapshot as any).doc, (job.snapshot as any).options?.variantId, projectSchema.parse(current.document)))
    throw Error("This render is outdated; render the selected version again before uploading");
  return job;
}
export async function queueYoutubeUpload(value: unknown) {
  const input = z
    .object({
      renderJobId: z.string().uuid(),
      thumbnailAssetId: z.string().uuid(),
      expectedChannelId: z.string().min(1),
      metadata: uploadMetadata,
    })
    .parse(value);
  const connection = await youtubeStatus();
  if (!connection.connected || connection.channelId !== input.expectedChannelId)
    throw Error("Connect and confirm the intended YouTube channel first");
  const job = await eligibleRender(input.renderJobId);
  const thumb = await db.asset.findUniqueOrThrow({
    where: { id: input.thumbnailAssetId },
  });
  if (
    thumb.projectId !== job.projectId ||
    thumb.kind !== "image" ||
    !["image/jpeg", "image/png"].includes(thumb.mime) ||
    thumb.bytes > 2 * 1024 * 1024
  )
    throw Error("Choose a project thumbnail in JPEG/PNG below 2 MB");
  const upload = await db.youtubeUpload.upsert({
    where: {
      renderJobId_channelId: {
        renderJobId: job.id,
        channelId: input.expectedChannelId,
      },
    },
    create: {
      renderJobId: job.id,
      projectId: job.projectId,
      channelId: input.expectedChannelId,
      thumbnailAssetId: thumb.id,
      metadata: input.metadata,
    },
    update: {},
  });
  if (upload.state === "queued")
    await youtubeQueue().add("upload", { id: upload.id }, { jobId: upload.id });
  return publicUpload(upload);
}
