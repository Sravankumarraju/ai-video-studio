import { cleanupTemp } from "../lib/temp";
import "dotenv/config";
import { Worker, UnrecoverableError } from "bullmq";
import { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { redis, jobQueue } from "../lib/queue";
import { decrypt, safeFetch } from "../lib/security";
import {
  registry,
  ProviderError,
  type GenerationResult,
} from "../lib/providers";
import {
  projectSchema,
  newScene,
  type ProjectDoc,
  type Scene,
  type Capability,
  sceneSchema,
  providerSchema,
} from "../lib/schema";
import { applyJob, json, renderIsCurrent } from "../lib/projects";
import { applyVariantNarration } from "../lib/duration";
import { storage, storageKey, materialize } from "../lib/storage";
import { detect, probe } from "../lib/media";
import { enqueue, recordQueueFailure } from "../lib/jobs";
import { render } from "./render";
import { z } from "zod";
import { narrationTiming } from "../lib/alignment";
import { timeline } from "../lib/timeline";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
export async function processJob(id: string) {
  const j = await db.job.findUniqueOrThrow({ where: { id } });
  if (
    ["completed", "cancelled", "stale", "waiting-for-input"].includes(j.state)
  )
    return;
  const snapshot = j.snapshot as unknown as {
    doc: ProjectDoc;
    revision: number;
    config?: ReturnType<typeof providerSchema.parse>;
    profileId?: string;
    prompt: string;
    options: {
      sceneId?: string;
      variantId?: string;
      draft?: boolean;
      operation?: string;
      explicitTest?: boolean;
      variantScoped?: boolean;
    };
  };
  const doc = projectSchema.parse(snapshot.doc);
  const opts = snapshot.options;
  const selectedVariant = opts.variantScoped
    ? doc.variants.find((v) => v.id === opts.variantId)
    : undefined;
  const scene =
    (opts.sceneId && selectedVariant?.sceneOverrides[opts.sceneId]) ||
    doc.scenes.find((s) => s.id === opts.sceneId);
  const cancelled = async () =>
    !!(
      await db.job.findUnique({
        where: { id },
        select: { cancelRequested: true },
      })
    )?.cancelRequested;
  const stage = async (stage: string) => {
    if (await cancelled()) throw Error("Cancelled");
    await db.job.update({ where: { id }, data: { stage } });
  };
  if (await cancelled()) {
    await db.job.update({
      where: { id },
      data: { state: "cancelled", stage: "Cancelled" },
    });
    return;
  }
  await db.job.update({
    where: { id },
    data: { state: "running", attempts: { increment: 1 }, error: null },
  });
  try {
    if (j.kind === "render") {
      const variant = doc.variants.find((v) => v.id === opts.variantId)!;
      const result = await render(
        doc,
        variant,
        await db.asset.findMany({ where: { projectId: j.projectId } }),
        !!opts.draft,
        stage,
        cancelled,
        id,
      );
      const current = await db.project.findUniqueOrThrow({
        where: { id: j.projectId },
      });
      await db.job.update({
        where: { id },
        data: {
          state:
            current.revision === snapshot.revision ||
            renderIsCurrent(snapshot.doc, opts.variantId, projectSchema.parse(current.document))
              ? "completed"
              : "stale",
          stage: "Validated and available for download",
          result: json(result),
        },
      });
      return;
    }
    if (j.kind === "automatic") {
      await orchestrate(j.projectId, id, opts.variantId);
      return;
    }
    if (!snapshot.config || !j.encryptedCredential)
      throw Error("Provider snapshot missing");
    const config = snapshot.config,
      ctx = { config, key: decrypt(j.encryptedCredential) },
      adapter = registry[config.type];
    // Per-job expiring leases share capacity across workers and recover after crashes.
    const conn = redis();
    await conn.connect();
    const lock = `profile:${snapshot.profileId}`;
    const acquired = await conn.eval(
      "redis.call('zremrangebyscore',KEYS[1],'-inf',ARGV[1]); if redis.call('zcard',KEYS[1])>=tonumber(ARGV[2]) then return 0 end; redis.call('zadd',KEYS[1],ARGV[3],ARGV[4]); redis.call('expire',KEYS[1],180); return 1",
      1,
      lock,
      Date.now(),
      config.concurrency,
      Date.now() + 120000,
      id,
    );
    if (!acquired) {
      await conn.quit();
      throw new ProviderError(429, false);
    }
    let result: GenerationResult;
    const heartbeat = setInterval(() => {
      void conn
        .zadd(lock, Date.now() + 120000, id)
        .then(() => conn.expire(lock, 180))
        .catch(() => {});
    }, 30000);
    try {
      if (j.result && !(j.result as Record<string, unknown>).assetId) {
        const saved = j.result as GenerationResult & { outputKey?: string };
        result = {
          ...saved,
          bytes: saved.outputKey
            ? await storage.get(saved.outputKey)
            : undefined,
        };
      } else if (j.providerJobId) {
        await stage("Polling saved provider job");
        result = await poll(adapter, ctx, j.providerJobId, stage, cancelled);
      } else {
        if (j.submittedAt) {
          await db.job.update({
            where: { id },
            data: {
              state: "waiting-for-input",
              stage: "Submission needs reconciliation",
              error:
                "Previous submission may have been charged. Supply provider job ID or explicitly acknowledge a new paid attempt.",
            },
          });
          return;
        }
        await stage("Submitting generation");
        await db.job.update({
          where: { id },
          data: { submittedAt: new Date() },
        });
        const index = scene
          ? doc.scenes.findIndex((s) => s.id === scene.id)
          : -1;
        let audio: Buffer | undefined;
        if (j.kind === "transcription") {
          if (!scene?.audioId) throw Error("Upload narration first");
          const asset = await db.asset.findUniqueOrThrow({
            where: { id: scene.audioId },
          });
          audio = await storage.get(asset.storageKey);
        }
        result = await adapter.generate(
          ctx,
          {
            prompt: snapshot.prompt,
            language: doc.language,
            duration: opts.explicitTest
              ? 5
              : scene?.duration || doc.targetDuration,
            aspect:
              (doc.variants.find((v) => v.id === opts.variantId) || doc.variants[0])?.aspect === "vertical"
                ? "9:16"
                : "16:9",
            voiceId: scene?.voiceId,
            previousText: doc.scenes[index - 1]?.narration,
            nextText: doc.scenes[index + 1]?.narration,
            audio,
          },
          j.kind as Capability,
        );
        if (result.jobId) {
          await db.job.update({
            where: { id },
            data: { providerJobId: result.jobId },
          });
          result = await poll(adapter, ctx, result.jobId, stage, cancelled);
        }
        // Persist completed outputs before probing or applying them, so retries do not generate again.
        if (result.bytes) {
          const detected = detect(result.bytes);
          const outputKey = storageKey(j.projectId, detected.ext);
          await storage.put(outputKey, result.bytes, detected.mime);
          await db.job.update({
            where: { id },
            data: { result: json({ ...result, bytes: undefined, outputKey }) },
          });
        }
        if (result.text || result.url)
          await db.job.update({
            where: { id },
            data: { result: json({ ...result, bytes: undefined }) },
          });
      }
      if (await cancelled()) throw Error("Cancelled");
      await stage("Importing durable output");
      let assetId: string | undefined;
      let measured: number | undefined;
      if (result.bytes || result.url) {
        const previous = await db.asset.findFirst({
          where: {
            projectId: j.projectId,
            metadata: { path: ["jobId"], equals: id },
          },
        });
        if (previous) {
          assetId = previous.id;
          measured = previous.duration ?? undefined;
        } else {
          const bytes =
            result.bytes ??
            Buffer.from(await (await safeFetch(result.url!)).arrayBuffer());
          const detected = detect(bytes);
          const dir = await mkdtemp(path.join(tmpdir(), "story-import-"));
          try {
            const file = path.join(dir, `input.${detected.ext}`);
            await writeFile(file, bytes);
            const info = await probe(file);
            measured = info.duration ?? undefined;
            const key = storageKey(j.projectId, detected.ext);
            await storage.put(key, bytes, detected.mime);
            const asset = await db.asset.create({
              data: {
                projectId: j.projectId,
                name: `${j.kind} · ${scene?.title || doc.title}`,
                kind: detected.kind,
                mime: detected.mime,
                storageKey: key,
                bytes: bytes.length,
                duration: info.duration,
                metadata: json({
                  jobId: id,
                  profileId: snapshot.profileId,
                  model: config.model,
                  prompt: snapshot.prompt,
                  parameters: config.parameters,
                  generatedAt: new Date().toISOString(),
                  probe: info,
                  alignment: result.alignment,
                }),
              },
            });
            assetId = asset.id;
          } finally {
            await cleanupTemp(dir);
          }
        }
      }
      const applied = opts.explicitTest
        ? false
        : await applyJob(j.projectId, snapshot.revision, (p) => {
            if (j.kind === "script") {
              if (
                opts.variantScoped &&
                opts.variantId &&
                opts.operation?.startsWith("variant-")
              )
                return applyVariantNarration(
                  p,
                  opts.variantId,
                  cleanJson(result.text!),
                );
              if (opts.operation === "storyboard") {
                const raw = JSON.parse(cleanJson(result.text!));
                const list = z
                  .array(
                    z.object({
                      title: z.string(),
                      narration: z.string(),
                      visual: z.string(),
                      imagePrompt: z.string(),
                      videoPrompt: z.string(),
                      duration: z.number().positive(),
                      mediaType: z.enum(["image", "video"]),
                    }),
                  )
                  .max(200)
                  .parse(raw);
                const locked = p.scenes.filter((s) => s.locked);
                p.scenes = [
                  ...locked,
                  ...list.map((s, i) =>
                    sceneSchema.parse({
                      ...newScene(i + locked.length + 1),
                      ...s,
                    }),
                  ),
                ];
                p.variants = p.variants.map((v) => ({
                  ...v,
                  sceneIds: p.scenes.map((s) => s.id),
                  sceneOverrides: {},
                  framing: {},
                }));
                if (!p.variants.length && p.scenes.length)
                  p.variants = [
                    {
                      id: crypto.randomUUID(),
                      name: "Long video",
                      aspect: "landscape",
                      sceneIds: p.scenes.map((s) => s.id),
                      fps: 30,
                      crf: 20,
                      bitrate: "8M",
                      captions: true,
                      fontSize: 48,
                      color: "#ffffff",
                      highlightColor: "#ffd54a",
                      outline: 2,
                      background: false,
                      position: "bottom",
                      framing: {},
                      maxDuration: 7200,
                      titleOverlay: "",
                      wordHighlight: false,
                      sceneOverrides: {},
                    },
                  ];
              } else if (opts.operation === "publishing") {
                const publishing = projectSchema.shape.publishing.parse(
                  JSON.parse(cleanJson(result.text!)),
                );
                if (opts.variantScoped && opts.variantId)
                  p.variants = p.variants.map(v => v.id === opts.variantId ? {...v, publishing} : v);
                else p.publishing = publishing;
              } else if (scene) {
                p.scenes = p.scenes.map((s) =>
                  s.id === scene.id ? { ...s, narration: result.text! } : s,
                );
              } else p.script = result.text!;
            } else if (scene) {
              const updateScene = (s: Scene): Scene => {
                if (s.id !== scene.id || s.locked) return s;
                if (j.kind === "voice")
                  return {
                    ...s,
                    audioId: assetId,
                    audioStart: 0,
                    audioSlice: false,
                    duration: measured || s.duration,
                    ...narrationTiming(result.alignment, measured || s.duration),
                  };
                if (j.kind === "transcription") {
                  const data = z
                    .object({
                      segments: z.array(
                        z.object({
                          start: z.number(),
                          end: z.number(),
                          text: z.string(),
                        }),
                      ),
                    })
                    .parse(JSON.parse(result.text!));
                  return {
                    ...s,
                    captions: data.segments.map((c) => ({
                      ...c,
                      id: crypto.randomUUID(),
                      accuracy: "aligned" as const,
                    })),
                    captionsStale: false,
                  };
                }
                return {
                  ...s,
                  assetId,
                  alternatives: [
                    ...new Set([
                      ...s.alternatives,
                      ...(s.assetId ? [s.assetId] : []),
                      ...(assetId ? [assetId] : []),
                    ]),
                  ],
                  mediaType: j.kind === "video" ? "video" : "image",
                  status: "Media ready",
                };
              };
              if (opts.variantScoped && opts.variantId) {
                p.variants = p.variants.map((v) =>
                  v.id === opts.variantId
                    ? {
                        ...v,
                        sceneOverrides: {
                          ...v.sceneOverrides,
                          [scene.id]: updateScene(
                            v.sceneOverrides[scene.id] ||
                              p.scenes.find((s) => s.id === scene.id)!,
                          ),
                        },
                      }
                    : v,
                );
              } else p.scenes = p.scenes.map(updateScene);
            }
            return p;
          });
      if (opts.explicitTest && snapshot.profileId) {
        const profile = await db.providerProfile.findUnique({
          where: { id: snapshot.profileId },
        });
        if (profile)
          await db.providerProfile.update({
            where: { id: profile.id },
            data: {
              verification: json({
                ...(profile.verification as object),
                generation: "succeeded",
                testedModel: config.model,
                testedCapability: j.kind,
                testedAt: new Date().toISOString(),
              }),
            },
          });
      }
      await db.job.update({
        where: { id },
        data: {
          state: "completed",
          stage: opts.explicitTest
            ? "Explicit generation test succeeded"
            : applied
              ? "Generation complete"
              : "Output saved; project changed, assign asset manually",
          result: json({ assetId, text: result.text, applied }),
          actualCost: result.cost,
        },
      });
    } finally {
      clearInterval(heartbeat);
      await conn.zrem(lock, id).catch(() => {});
      await conn.quit();
    }
  } catch (e) {
    const error = e instanceof Error ? e : Error("Job failed");
    const latest = await db.job.findUniqueOrThrow({ where: { id } });
    const definitelyRejected =
      e instanceof ProviderError &&
      [400, 401, 403, 404, 422, 429].includes(e.status);
    if (definitelyRejected && !latest.providerJobId)
      await db.job.update({ where: { id }, data: { submittedAt: null } });
    const wait =
      !latest.providerJobId &&
      !latest.result &&
      !definitelyRejected &&
      (!!latest.submittedAt || (e instanceof ProviderError && e.ambiguous));
    const cancelledNow = await cancelled();
    await db.job.update({
      where: { id },
      data: {
        state: cancelledNow
          ? "cancelled"
          : wait
            ? "waiting-for-input"
            : "failed",
        stage: cancelledNow
          ? "Cancelled"
          : wait
            ? "Needs reconciliation"
            : "Failed",
        error:
          error instanceof ProviderError
            ? error.message
            : error.message.slice(0, 1000),
      },
    });
    if (wait || cancelledNow)
      throw new UnrecoverableError("Job requires owner action");
    throw e;
  }
}
function cleanJson(s: string) {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
}
async function poll(
  adapter: typeof registry.zenmux,
  ctx: Parameters<typeof registry.zenmux.generate>[0],
  providerId: string,
  stage: (s: string) => Promise<void>,
  cancel: () => Promise<boolean>,
) {
  if (!adapter.poll) throw Error("Adapter cannot poll");
  for (let i = 0; i < 80; i++) {
    if (await cancel()) throw Error("Cancelled");
    const r = await adapter.poll(ctx, providerId);
    if (r.state === "succeeded") {
      if (!r.url) throw Error("Completed video has no download URL");
      return { url: r.url };
    }
    if (r.state === "failed") throw Error("Provider video generation failed");
    await stage(`Provider ${r.state}; poll ${i + 1}/80`);
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw Error(
    "Video polling window exceeded. Resume with the saved provider job ID.",
  );
}
async function orchestrate(projectId: string, id: string, variantId?: string) {
  const p = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const doc = projectSchema.parse(p.document);
  const parent = await db.job.findUniqueOrThrow({ where: { id } });
  const childId = (parent.result as { childJobId?: string } | null)?.childJobId;
  const child = childId ? await db.job.findUnique({ where: { id: childId } }) : undefined;
  const blocked = child && child.state !== "completed" ? child : undefined;
  if (blocked) {
    await db.job.update({
      where: { id },
      data: {
        state: "waiting-for-input",
        stage: "Wait for or resolve this production's child job in Jobs before resuming",
      },
    });
    return;
  }
  const queueStage = async (
    kind: Capability,
    options: Parameters<typeof enqueue>[2],
  ) => {
    const child = await enqueue(projectId, kind, {
      ...options,
      variantId,
      variantScoped: !!variantId && !!options?.sceneId,
      paidConfirmed: true,
    });
    await db.job.update({
      where: { id },
      data: {
        state: "waiting-for-input",
        stage: `${kind} job queued. Continue automation after review or completion.`,
        result: json({ childJobId: child.id }),
      },
    });
  };
  if (!doc.script) {
    if (doc.mode === "manual") {
      await db.job.update({
        where: { id },
        data: {
          state: "waiting-for-input",
          stage: "Paste or write the script",
          result: Prisma.JsonNull,
        },
      });
      return;
    }
    await queueStage("script", {});
    return;
  }
  if (!doc.scenes.length) {
    if (doc.mode === "manual") {
      await db.job.update({
        where: { id },
        data: {
          state: "waiting-for-input",
          stage: "Create the storyboard scenes",
          result: Prisma.JsonNull,
        },
      });
      return;
    }
    await queueStage("script", { operation: "storyboard" });
    return;
  }
  const selected = variantId ? doc.variants.find(v => v.id === variantId) : doc.variants[0];
  if (variantId && !selected) throw Error("Selected output variant no longer exists");
  for (const s of selected ? timeline(doc, selected).map(t => t.scene) : doc.scenes) {
    if (s.locked) continue;
    const visual = s.mediaType === "video" ? "video" : "image";
    if (!s.assetId) {
      if (s.modes[visual] === "manual" || doc.mode === "manual") {
        await db.job.update({
          where: { id },
          data: {
            state: "waiting-for-input",
            stage: `${s.title}: upload visual media`,
            result: Prisma.JsonNull,
          },
        });
        return;
      }
      await queueStage(visual, { sceneId: s.id });
      return;
    }
    if ((!s.audioId || s.narrationStale) && s.narration) {
      if (s.modes.voice === "manual" || doc.mode === "manual") {
        await db.job.update({
          where: { id },
          data: {
            state: "waiting-for-input",
            stage: `${s.title}: upload narration`,
            result: Prisma.JsonNull,
          },
        });
        return;
      }
      await queueStage("voice", { sceneId: s.id });
      return;
    }
    if (s.captionsStale) {
      await db.job.update({ where: { id }, data: { state: "waiting-for-input", stage: `${s.title}: review or rebuild captions before continuing`, result: Prisma.JsonNull } });
      return;
    }
  }
  if (!doc.variants.length) throw Error("Create an output variant");
  await enqueue(projectId, "render", {
    variantId: selected?.id || doc.variants[0].id,
    draft: true,
  });
  await db.job.update({
    where: { id },
    data: { state: "completed", stage: "Draft preview queued; no publication" },
  });
}
const worker = new Worker(
  "story-studio",
  async (job) => processJob(job.data.id),
  {
    connection: redis(),
    concurrency: Number(process.env.WORKER_CONCURRENCY || 2),
    lockDuration: Number(process.env.JOB_LOCK_DURATION_MS || 60000),
    stalledInterval: Number(process.env.JOB_STALLED_INTERVAL_MS || 30000),
    maxStalledCount: 2,
  },
);
worker.on("failed", (job, err) => {
  console.error("Job failed:", job?.id);
  if (job?.id)
    void recordQueueFailure(job.id, err.message).catch(() =>
      console.error("Could not record queue failure", job.id),
    );
});
// Database is an outbox: recover queue submission failures and restarts without new paid requests.
const recovery = setInterval(() => {
  void (async () => {
    const jobs = await db.job.findMany({
      where: { state: { in: ["queued", "running"] } },
      take: 100,
    });
    for (const j of jobs) {
      const queued = await jobQueue().getJob(j.id);
      if (!queued) await jobQueue().add(j.kind, { id: j.id }, { jobId: j.id });
      // Failed in the queue while this worker was down, so the failed event never fired here.
      else if (await queued.isFailed())
        await recordQueueFailure(j.id, queued.failedReason || "queue failure");
    }
    const autos = await db.job.findMany({
      where: { kind: "automatic", state: "waiting-for-input" },
      include: { project: true },
    });
    for (const a of autos) {
      const doc = projectSchema.parse(a.project.document);
      const child = (a.result as { childJobId?: string } | null)?.childJobId;
      if (
        !doc.reviewCheckpoints &&
        child &&
        (await db.job.findUnique({ where: { id: child } }))?.state ===
          "completed"
      ) {
        await db.job.update({ where: { id: a.id }, data: { state: "queued" } });
        const q = await jobQueue().getJob(a.id);
        if (q) await q.remove();
        await jobQueue().add("automatic", { id: a.id }, { jobId: a.id });
      }
    }
  })().catch(() => console.error("Recovery check failed"));
}, 10000);
async function shutdown() {
  clearInterval(recovery);
  await worker.close();
  await db.$disconnect();
  await jobQueue().close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
console.log("Story Studio worker ready");
