import "dotenv/config";
import { Worker, UnrecoverableError } from "bullmq";
import { mkdtemp, open, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { db } from "../lib/db";
import { redis } from "../lib/queue";
import { encrypt, decrypt } from "../lib/security";
import { storage, materialize } from "../lib/storage";
import { googleRequest, youtubeStatus } from "../lib/youtube";
import { youtubeQueue, eligibleRender } from "../lib/youtube-uploads";
import {
  privateVideoMetadata,
  acknowledgedOffset,
  validUploadSession,
} from "../lib/youtube-policy";

async function run(id: string) {
  let upload = await db.youtubeUpload.findUniqueOrThrow({ where: { id } });
  if (["completed", "needs-review", "cancelled"].includes(upload.state)) return;
  const current = await youtubeStatus();
  if (current.channelId !== upload.channelId)
    throw new UnrecoverableError(
      "Connected channel changed; reconnect the original channel",
    );
  const update = async (data: any) => {
    upload = await db.youtubeUpload.update({ where: { id }, data });
  };
  const request = (url: string, init: RequestInit = {}) => googleRequest(url, init, upload.channelId);
  const cancelled = async () => {
    if (
      (await db.youtubeUpload.findUniqueOrThrow({ where: { id } }))
        .cancelRequested
    ) {
      await update({
        state: "cancelled",
        stage: "Stopped; existing private video and progress retained",
      });
      throw new UnrecoverableError("Upload stopped");
    }
  };
  const responseError = async (r: Response) => {
    // Google's response is not logged: it can contain a resumable session URL.
    if ([400, 403, 404, 410].includes(r.status))
      throw new UnrecoverableError(
        `YouTube request failed (${r.status}); inspect API permissions/quota in Google Cloud`,
      );
    throw Error(`YouTube request failed (${r.status})`);
  };
  const dir = await mkdtemp(path.join(tmpdir(), "youtube-upload-"));
  try {
    await cancelled();
    await update({ state: "running", error: null });
    if (!upload.videoId) {
      const job = await eligibleRender(upload.renderJobId);
      const file = await materialize((job.result as any).mp4Key, dir);
      const total = (await stat(file)).size;
      await update({ totalBytes: total });
      if (!upload.encryptedSession) {
        // Persist before creating a session. A crash/lost acknowledgement must never automatically POST again.
        if (upload.stage === "Starting Google upload session") {
          await update({
            state: "needs-review",
            error:
              "Session creation was interrupted. Review before starting another upload.",
          });
          return;
        }
        await update({ stage: "Starting Google upload session" });
        let r: Response;
        try {
          r = await request(
            "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Upload-Content-Type": "video/mp4",
                "X-Upload-Content-Length": String(total),
              },
              body: JSON.stringify(privateVideoMetadata(upload.metadata)),
            },
          );
        } catch {
          await update({
            state: "needs-review",
            error:
              "Google session acknowledgement was lost; review to avoid duplicate uploads",
          });
          return;
        }
        if (r.status >= 500) {
          await update({
            state: "needs-review",
            error:
              "Google session creation returned a server error; review before restarting",
          });
          return;
        }
        if (!r.ok) {
          await update({ stage: "Google session rejected" });
          await responseError(r);
        }
        const location = r.headers.get("location");
        if (!location) {
          await update({
            state: "needs-review",
            error: "Google did not return an upload session",
          });
          return;
        }
        await update({
          encryptedSession: encrypt(validUploadSession(location)),
          stage: "Uploading private video",
        });
      }
      const session = validUploadSession(decrypt(upload.encryptedSession!));
      const accept = async (r: Response) => {
        if (r.status === 308) {
          await update({
            bytesUploaded: acknowledgedOffset(r.headers.get("range"), total),
          });
          return;
        }
        if (r.ok) {
          const body = await r.json();
          if (!body.id || typeof body.id !== "string")
            throw Error("YouTube completion did not include a video ID");
          await update({
            videoId: body.id,
            bytesUploaded: total,
            stage: "Applying thumbnail",
          });
          return;
        }
        if ([404, 410].includes(r.status)) {
          await update({
            state: "needs-review",
            error:
              "Google upload session expired; review channel uploads before starting again",
          });
          throw new UnrecoverableError("Upload session expired");
        }
        await responseError(r);
      };
      // Always ask Google for its saved offset, including after an interrupted final acknowledgement.
      await accept(
        await request(session, {
          method: "PUT",
          headers: {
            "Content-Length": "0",
            "Content-Range": `bytes */${total}`,
          },
        }),
      );
      const handle = await open(file, "r");
      try {
        while (!upload.videoId && upload.bytesUploaded < total) {
          await cancelled();
          const offset = upload.bytesUploaded,
            size = Math.min(8 * 1024 * 1024, total - offset),
            bytes = Buffer.alloc(size);
          const read = await handle.read(bytes, 0, size, offset);
          if (read.bytesRead !== size)
            throw new UnrecoverableError("Video file changed during upload");
          await accept(
            await request(session, {
              method: "PUT",
              headers: {
                "Content-Type": "video/mp4",
                "Content-Length": String(size),
                "Content-Range": `bytes ${offset}-${offset + size - 1}/${total}`,
              },
              body: bytes as any,
            }),
          );
          if (!upload.videoId && upload.bytesUploaded <= offset)
            throw Error(
              "Google has not acknowledged progress; reconnecting to the saved session",
            );
        }
      } finally {
        await handle.close();
      }
      if (!upload.videoId)
        throw Error("Upload completion has not been acknowledged");
    }
    await cancelled();
    if (!upload.thumbnailApplied) {
      const asset = await db.asset.findUniqueOrThrow({
        where: { id: upload.thumbnailAssetId },
      });
      const r = await request(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=${encodeURIComponent(upload.videoId!)}`,
        {
          method: "POST",
          headers: { "Content-Type": asset.mime },
          body: (await storage.get(asset.storageKey)) as any,
        },
      );
      if (!r.ok) await responseError(r);
      await update({
        thumbnailApplied: true,
        stage: "Verifying private visibility",
      });
    }
    const r = await request(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${encodeURIComponent(upload.videoId!)}`,
    );
    if (!r.ok) await responseError(r);
    const video = (await r.json()).items?.[0];
    if (
      !video ||
      video.snippet.channelId !== upload.channelId ||
      video.status.privacyStatus !== "private"
    )
      throw new UnrecoverableError(
        "Could not verify the intended channel and private visibility",
      );
    await update({
      state: "completed",
      stage: `Private upload verified; YouTube processing: ${video.processingDetails?.processingStatus || "unknown"}`,
      verifiedAt: new Date(),
      error: null,
    });
  } catch (error) {
    const latest = await db.youtubeUpload.findUniqueOrThrow({ where: { id } });
    if (!["needs-review", "cancelled"].includes(latest.state))
      await db.youtubeUpload.update({
        where: { id },
        data: {
          state: error instanceof UnrecoverableError ? "failed" : "queued",
          error: error instanceof Error ? error.message : "Upload failed",
        },
      });
    throw error;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
const worker = new Worker("story-studio-youtube", (job) => run(job.data.id), {
  connection: redis(),
  concurrency: 1,
});
worker.on("failed", async (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 3))
    await db.youtubeUpload.updateMany({
      where: { id: job.data.id, state: "queued" },
      data: { state: "failed", error: error.message },
    });
});
async function recover() {
  const rows = await db.youtubeUpload.findMany({
    where: { state: { in: ["queued", "running"] } },
  });
  for (const row of rows)
    await youtubeQueue().add("upload", { id: row.id }, { jobId: row.id });
}
void recover()
  .then(() => {
    setInterval(
      () =>
        void recover().catch(() =>
          console.error("YouTube queue recovery failed"),
        ),
      10000,
    ).unref();
    console.log("Private YouTube upload worker ready");
  })
  .catch(() => {
    console.error("YouTube worker startup failed");
    process.exitCode = 1;
  });
