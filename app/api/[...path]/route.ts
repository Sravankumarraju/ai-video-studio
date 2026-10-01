import { cleanupTemp } from "@/lib/temp";
import { portableDocument, remapMedia, safeProvenance } from "@/lib/backup";
import { db } from "@/lib/db";
import {
  guard,
  checkPassword,
  sessionToken,
  encrypt,
  decrypt,
  safeUrl,
} from "@/lib/security";
import {
  projectSchema,
  providerSchema,
  capability,
  type ProjectDoc,
} from "@/lib/schema";
import { json, saveProject } from "@/lib/projects";
import { registry, verify } from "@/lib/providers";
import { enqueue, publicJob } from "@/lib/jobs";
import { jobQueue, redis } from "@/lib/queue";
import { storage, storageKey } from "@/lib/storage";
import { detect, probe } from "@/lib/media";
import { templates } from "@/lib/prompts";
import { z } from "zod";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const publicProfile = (p: {
  id: string;
  config: unknown;
  verification: unknown;
}) => ({
  id: p.id,
  config: p.config,
  verification: p.verification,
  key: "••••••••",
});
async function boundedBody(req: Request, max: number) {
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader)
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > max) {
        await reader.cancel();
        throw Error("Request exceeds configured size limit");
      }
      chunks.push(r.value);
    }
  return Buffer.concat(chunks);
}
async function body(req: Request) {
  return JSON.parse((await boundedBody(req, 1024 * 1024 * 4)).toString("utf8"));
}
async function saveAsset(
  projectId: string,
  name: string,
  bytes: Buffer,
  metadata: unknown = {},
) {
  await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const detected = detect(bytes);
  const dir = await mkdtemp(path.join(tmpdir(), "story-upload-"));
  try {
    const file = path.join(dir, `input.${detected.ext}`);
    await writeFile(file, bytes);
    const info = await probe(file);
    if (info.width > 16000 || info.height > 16000)
      throw Error("Image dimensions exceed limit");
    const key = storageKey(projectId, detected.ext);
    await storage.put(key, bytes, detected.mime);
    return await db.asset.create({
      data: {
        projectId,
        name: name.replace(/[\x00-\x1f]/g, "").slice(0, 200),
        kind: detected.kind,
        mime: detected.mime,
        bytes: bytes.length,
        storageKey: key,
        duration: info.duration,
        metadata: json({
          ...(metadata as object),
          probe: info,
          uploadedAt: new Date().toISOString(),
        }),
      },
    });
  } finally {
    await cleanupTemp(dir);
  }
}
async function route(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const p = (await ctx.params).path;
    const method = req.method;
    if (p[0] === "login" && method === "POST") {
      const conn = redis();
      await conn.connect();
      try {
        const count = await conn.incr("owner-login-attempts");
        if (count === 1) await conn.expire("owner-login-attempts", 60);
        if (count > 10)
          return response(
            { error: "Too many login attempts; wait one minute" },
            429,
          );
        const b = z
          .object({ password: z.string().max(200) })
          .parse(await body(req));
        if (!checkPassword(b.password))
          return response({ error: "Incorrect owner password" }, 401);
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": `studio_session=${sessionToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.APP_ORIGIN?.startsWith("https:") ? "; Secure" : ""}`,
          },
        });
      } finally {
        await conn.quit();
      }
    }
    guard(req);
    if (p[0] === "logout")
      return new Response("{}", {
        headers: {
          "Set-Cookie":
            "studio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        },
      });
    if (p[0] === "session") return response({ authenticated: true });
    if (p[0] === "providers") {
      if (p.length === 1 && method === "GET")
        return response(
          (
            await db.providerProfile.findMany({ orderBy: { createdAt: "asc" } })
          ).map(publicProfile),
        );
      if (p.length === 1 && method === "POST") {
        const raw = await body(req);
        const config = providerSchema.parse(raw.config);
        await safeUrl(config.baseUrl);
        if (
          !config.capabilities.every((c) =>
            registry[config.type].capabilities.includes(c),
          )
        )
          throw Error("Unsupported adapter capability");
        const key = z.string().min(1).max(500).parse(raw.apiKey);
        return response(
          publicProfile(
            await db.providerProfile.create({
              data: { config: json(config), encryptedKey: encrypt(key) },
            }),
          ),
        );
      }
      const profile = await db.providerProfile.findUniqueOrThrow({
        where: { id: p[1] },
      });
      const config = providerSchema.parse(profile.config);
      if (p[2] === "verify" && method === "POST") {
        const verified = await verify({
          config,
          key: decrypt(profile.encryptedKey),
        });
        await db.providerProfile.update({
          where: { id: p[1] },
          data: { verification: json(verified) },
        });
        return response(verified);
      }
      if (p[2] === "voices" && method === "GET") {
        const adapter = registry[config.type];
        if (!adapter.voices) throw Error("Voice discovery not supported");
        return response(
          await adapter.voices({ config, key: decrypt(profile.encryptedKey) }),
        );
      }
      if (p[2] === "test" && method === "POST") {
        const b = z
          .object({ projectId: z.string(), capability })
          .parse(await body(req));
        const project = await db.project.findUniqueOrThrow({
          where: { id: b.projectId },
        });
        const doc = projectSchema.parse(project.document);
        return response(
          await enqueue(project.id, b.capability, {
            sceneId: doc.scenes[0]?.id,
            paidConfirmed: true,
            profileId: profile.id,
            explicitTest: true,
            prompt:
              b.capability === "voice"
                ? "This is a short voice preview."
                : "A simple sunrise. This is an explicit paid connection test.",
          }),
        );
      }
      if (method === "PATCH") {
        const raw = await body(req);
        const next = providerSchema.parse(raw.config);
        await safeUrl(next.baseUrl);
        return response(
          publicProfile(
            await db.providerProfile.update({
              where: { id: p[1] },
              data: {
                config: json(next),
                ...(raw.apiKey
                  ? {
                      encryptedKey: encrypt(
                        z.string().max(500).parse(raw.apiKey),
                      ),
                    }
                  : {}),
                verification: json({}),
              },
            }),
          ),
        );
      }
      if (method === "DELETE") {
        await db.providerProfile.delete({ where: { id: p[1] } });
        return response({ ok: true });
      }
    }
    if (p[0] === "defaults") {
      const owner = await db.owner.upsert({
        where: { id: "owner" },
        create: { id: "owner" },
        update: {},
      });
      if (method === "GET") return response(owner.defaults);
      const defaults = z.record(capability, z.string()).parse(await body(req));
      for (const [c, id] of Object.entries(defaults)) {
        if (!id) continue;
        const profile = providerSchema.parse(
          (await db.providerProfile.findUniqueOrThrow({ where: { id } }))
            .config,
        );
        if (!profile.capabilities.includes(c as z.infer<typeof capability>))
          throw Error("Profile does not support default capability");
      }
      await db.owner.update({
        where: { id: "owner" },
        data: { defaults: json(defaults) },
      });
      return response(defaults);
    }
    if (p[0] === "templates") {
      if (method === "GET")
        return response({
          defaults: templates,
          saved: await db.promptTemplate.findMany({
            orderBy: { updatedAt: "desc" },
          }),
        });
      if (method === "POST") {
        const b = z
          .object({
            name: z.string().min(1).max(100),
            stage: z.enum([
              "research",
              "script",
              "storyboard",
              "image",
              "video",
              "voice",
              "thumbnail",
              "publishing",
            ]),
            body: z.string().max(50000),
          })
          .parse(await body(req));
        return response(await db.promptTemplate.create({ data: b }));
      }
      if (method === "PATCH") {
        const b = z
          .object({
            body: z.string().max(50000),
            name: z.string().min(1).max(100),
          })
          .parse(await body(req));
        const old = await db.promptTemplate.findUniqueOrThrow({
          where: { id: p[1] },
        });
        return response(
          await db.promptTemplate.update({
            where: { id: p[1] },
            data: {
              ...b,
              version: { increment: 1 },
              history: json([
                ...(old.history as object[]),
                { version: old.version, body: old.body, name: old.name },
              ]),
            },
          }),
        );
      }
    }
    if (p[0] === "projects") {
      if (p.length === 1 && method === "GET")
        return response(
          await db.project.findMany({ orderBy: { updatedAt: "desc" } }),
        );
      if (p.length === 1 && method === "POST") {
        const doc = projectSchema.parse(await body(req));
        return response(
          await db.project.create({
            data: { title: doc.title, document: json(doc) },
          }),
        );
      }
      if (p[1] === "import" && method === "POST") {
        const parsed = z
          .object({
            schemaVersion: z.literal(1),
            document: projectSchema,
            assets: z
              .array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  base64: z.string(),
                  metadata: z.unknown().optional(),
                }),
              )
              .max(1000),
          })
          .parse(
            JSON.parse(
              (
                await boundedBody(
                  req,
                  Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024,
                )
              ).toString(),
            ),
          );
        const doc = portableDocument(parsed.document);
        const proj = await db.project.create({
          data: { title: doc.title, document: json(doc) },
        });
        const remap: Record<string, string> = {};
        for (const a of parsed.assets) {
          const saved = await saveAsset(
            proj.id,
            a.name,
            Buffer.from(a.base64, "base64"),
            { ...safeProvenance(a.metadata), source: "project-import" },
          );
          remap[a.id] = saved.id;
        }
        return response(await saveProject(proj.id, remapMedia(doc, remap), 1));
      }
      const project = await db.project.findUniqueOrThrow({
        where: { id: p[1] },
      });
      if (p[2] === "versions" && method === "GET")
        return response(
          await db.projectVersion.findMany({
            where: { projectId: project.id },
            orderBy: { revision: "desc" },
            take: 100,
          }),
        );
      if (p[2] === "export" && method === "GET") {
        const doc = portableDocument(projectSchema.parse(project.document));
        const list = await db.asset.findMany({
          where: { projectId: project.id },
        });
        const assets = [];
        for (const a of list)
          assets.push({
            id: a.id,
            name: a.name,
            metadata: safeProvenance(a.metadata),
            base64: (await storage.get(a.storageKey)).toString("base64"),
          });
        return new Response(
          JSON.stringify({ schemaVersion: 1, document: doc, assets }),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition":
                'attachment; filename="story-studio-project.json"',
              "Cache-Control": "no-store",
            },
          },
        );
      }
      if (p[2] === "duplicate" && method === "POST") {
        const doc = projectSchema.parse(project.document);
        doc.title += " (copy)";
        const copy = await db.project.create({
          data: { title: doc.title, document: json(doc) },
        });
        const list = await db.asset.findMany({
          where: { projectId: project.id },
        });
        const remap: Record<string, string> = {};
        for (const a of list) {
          const key = storageKey(copy.id, a.storageKey.split(".").at(-1)!);
          await storage.put(key, await storage.get(a.storageKey), a.mime);
          const saved = await db.asset.create({
            data: {
              projectId: copy.id,
              name: a.name,
              kind: a.kind,
              mime: a.mime,
              storageKey: key,
              bytes: a.bytes,
              duration: a.duration,
              metadata: a.metadata as never,
            },
          });
          remap[a.id] = saved.id;
        }
        const str = JSON.stringify(doc).replace(
          /"([a-zA-Z0-9_-]{1,80})"/g,
          (match, id) => (remap[id] ? JSON.stringify(remap[id]) : match),
        );
        return response(await saveProject(copy.id, JSON.parse(str), 1));
      }
      if (p[2] === "migrate-providers" && method === "POST") {
        const defaults =
          (await db.owner.findUnique({ where: { id: "owner" } }))?.defaults ||
          {};
        const doc = projectSchema.parse(project.document);
        doc.providers = defaults as ProjectDoc["providers"];
        return response(await saveProject(project.id, doc, project.revision));
      }
      if (p.length === 2 && method === "GET")
        return response({
          ...project,
          assets: await db.asset.findMany({
            where: { projectId: project.id },
            orderBy: { createdAt: "desc" },
          }),
        });
      if (method === "PATCH") {
        const b = await body(req);
        const result = await saveProject(
          project.id,
          b.document,
          z.number().int().parse(b.revision),
        );
        return response(result);
      }
      if (method === "DELETE") {
        await db.project.delete({ where: { id: project.id } });
        return response({ ok: true });
      }
    }
    if (p[0] === "assets" && method === "POST") {
      const max = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;
      const bytes = await boundedBody(req, max);
      const cloned = new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: new Uint8Array(bytes),
      });
      const form = await cloned.formData();
      const file = form.get("file");
      const projectId = z.string().parse(form.get("projectId"));
      if (!(file instanceof File)) throw Error("Select a file");
      return response(
        await saveAsset(
          projectId,
          file.name,
          Buffer.from(await file.arrayBuffer()),
        ),
      );
    }
    if (p[0] === "assets" && method === "GET") {
      const asset = await db.asset.findUniqueOrThrow({ where: { id: p[1] } });
      return fileResponse(
        await storage.get(asset.storageKey),
        asset.mime,
        req,
        asset.name,
      );
    }
    if (p[0] === "jobs") {
      if (p.length === 1 && method === "GET")
        return response(
          (
            await db.job.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
          ).map((j) => publicJob(j)),
        );
      if (p.length === 1 && method === "POST") {
        const b = z
          .object({
            projectId: z.string(),
            kind: z.enum([
              "script",
              "image",
              "video",
              "voice",
              "transcription",
              "render",
              "automatic",
            ]),
            options: z
              .object({
                sceneId: z.string().optional(),
                variantId: z.string().optional(),
                variantScoped: z.boolean().optional(),
                draft: z.boolean().optional(),
                prompt: z.string().max(50000).optional(),
                operation: z.string().max(100).optional(),
                paidConfirmed: z.boolean().optional(),
              })
              .default({}),
          })
          .parse(await body(req));
        if (b.kind === "automatic" && !b.options.paidConfirmed)
          throw Error(
            "Automation requires explicit approval of paid generation policy",
          );
        return response(await enqueue(b.projectId, b.kind, b.options));
      }
      const job = await db.job.findUniqueOrThrow({ where: { id: p[1] } });
      if (p[2] === "cancel" && method === "POST") {
        await db.job.update({
          where: { id: job.id },
          data: {
            cancelRequested: true,
            ...(job.state === "queued" || job.state === "waiting-for-input"
              ? { state: "cancelled", stage: "Cancelled locally" }
              : {}),
          },
        });
        return response({
          ok: true,
          message:
            "No new work will begin. Provider jobs already submitted may continue and remain chargeable.",
        });
      }
      if (p[2] === "retry" && method === "POST") {
        const b = await body(req);
        if (job.state === "running") throw Error("Job is still running");
        if (job.state === "completed" || job.state === "stale")
          throw Error("Completed jobs are preserved");
        if (
          job.submittedAt &&
          !job.providerJobId &&
          job.kind !== "render" &&
          job.kind !== "automatic" &&
          !job.result &&
          !b.acknowledgeNewCharge &&
          !b.providerJobId
        )
          throw Error(
            "Submission may have been charged. Supply a provider job ID or acknowledge a new charge.",
          );
        if (b.providerJobId) z.string().min(1).max(200).parse(b.providerJobId);
        if (
          b.acknowledgeNewCharge &&
          job.submittedAt &&
          !job.providerJobId &&
          !job.result &&
          !b.providerJobId &&
          !["render", "automatic"].includes(job.kind)
        ) {
          const latest = await db.project.findUniqueOrThrow({
            where: { id: job.projectId },
          });
          const doc = projectSchema.parse(latest.document);
          const replacement = await db.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${job.projectId} FOR UPDATE`;
            const charged = await tx.job.findMany({
              where: {
                projectId: job.projectId,
                kind: { notIn: ["render", "automatic"] },
                OR: [
                  { state: { not: "cancelled" } },
                  { submittedAt: { not: null } },
                ],
              },
            });
            if (charged.length >= doc.generationLimit)
              throw Error("Project generation limit reached");
            if (
              charged.reduce(
                (sum, j) => sum + (j.actualCost ?? j.estimatedCost ?? 0),
                0,
              ) +
                (job.estimatedCost ?? 0) >
              doc.budget
            )
              throw Error("Project budget exceeded");
            if (job.estimatedCost === null && doc.unknownCostPolicy === "block")
              throw Error("Unknown-cost retry is blocked by project policy");
            const next = await tx.job.create({
              data: {
                projectId: job.projectId,
                kind: job.kind,
                dedupeKey: crypto.randomUUID(),
                snapshot: json(job.snapshot),
                encryptedCredential: job.encryptedCredential,
                estimatedCost: job.estimatedCost,
              },
            });
            await tx.job.update({
              where: { id: job.id },
              data: {
                state: "cancelled",
                stage:
                  "Superseded by explicitly approved new-charge retry; original charge reservation retained",
              },
            });
            return next;
          });
          await jobQueue().add(
            replacement.kind,
            { id: replacement.id },
            { jobId: replacement.id },
          );
          return response({ ok: true, job: publicJob(replacement) });
        }
        await db.job.update({
          where: { id: job.id },
          data: {
            state: "queued",
            cancelRequested: false,
            error: null,
            ...(b.providerJobId ? { providerJobId: b.providerJobId } : {}),
            ...(b.acknowledgeNewCharge ? { submittedAt: null } : {}),
          },
        });
        const q = await jobQueue().getJob(job.id);
        if (q) await q.remove();
        await jobQueue().add(job.kind, { id: job.id }, { jobId: job.id });
        return response({ ok: true });
      }
      if (p[2] === "download" && method === "GET") {
        if (
          !["completed", "stale"].includes(job.state) ||
          job.kind !== "render"
        )
          throw Error("Export is not ready");
        const kind = new URL(req.url).searchParams.get("format") || "mp4";
        const r = job.result as {
          mp4Key: string;
          srtKey: string;
          vttKey: string;
        };
        const key =
          kind === "srt" ? r.srtKey : kind === "vtt" ? r.vttKey : r.mp4Key;
        return fileResponse(
          await storage.get(key),
          kind === "mp4"
            ? "video/mp4"
            : kind === "vtt"
              ? "text/vtt"
              : "text/plain",
          req,
          `story-${job.id}.${kind}`,
        );
      }
    }
    return response({ error: "Not found" }, 404);
  } catch (e) {
    const msg =
      e instanceof z.ZodError
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(";")
        : e instanceof Error
          ? e.message
          : "Request failed";
    const safe = /prisma|Invalid `|connect|ECONN|authentication failed/i.test(
      msg,
    )
      ? "Storage service unavailable. Check database, Redis and worker setup."
      : msg.startsWith("Provider request failed")
        ? msg
        : msg.slice(0, 1200);
    return response({ error: safe }, safe === "Unauthorized" ? 401 : 400);
  }
}
function fileResponse(bytes: Buffer, mime: string, req: Request, name: string) {
  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${name.replace(/[^a-zA-Z0-9_.-]/g, "_")}"`,
  };
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) return new Response(null, { status: 416 });
    const start = Number(match[1]),
      end = Math.min(
        match[2] ? Number(match[2]) : bytes.length - 1,
        bytes.length - 1,
      );
    if (start > end || start >= bytes.length)
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${bytes.length}` },
      });
    headers["Content-Range"] = `bytes ${start}-${end}/${bytes.length}`;
    headers["Content-Length"] = String(end - start + 1);
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206,
      headers,
    });
  }
  headers["Content-Length"] = String(bytes.length);
  return new Response(new Uint8Array(bytes), { headers });
}
export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
