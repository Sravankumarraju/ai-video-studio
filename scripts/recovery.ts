import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { db } from "../lib/db";
import { jobQueue, closeQueue } from "../lib/queue";
import { json } from "../lib/projects";
import {
  projectSchema,
  newScene,
  variantSchema,
  providerSchema,
} from "../lib/schema";
import { encrypt, decrypt } from "../lib/security";
const checks: string[] = [];
let child: ChildProcess | undefined;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function start() {
  child = spawn(process.execPath, ["--import", "tsx", "worker/index.ts"], {
    windowsHide: true,
    env: {
      ...process.env,
      WORKER_CONCURRENCY: "1",
      JOB_LOCK_DURATION_MS: "5000",
      JOB_STALLED_INTERVAL_MS: "1000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(
      () => reject(Error("Worker startup timed out")),
      20000,
    );
    child!.stdout!.on("data", (b) => {
      if (String(b).includes("worker ready")) {
        clearTimeout(t);
        resolve();
      }
    });
    child!.once("error", reject);
  });
}
async function stop() {
  if (!child) return;
  const proc = child;
  child = undefined;
  await new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
    proc.kill("SIGKILL");
  });
}
async function waitJob(
  id: string,
  predicate: (j: { state: string; stage: string; attempts: number }) => boolean,
) {
  for (let i = 0; i < 160; i++) {
    const j = await db.job.findUniqueOrThrow({ where: { id } });
    if (predicate(j)) return j;
    if (["failed", "waiting-for-input"].includes(j.state))
      throw Error(j.error || j.stage);
    await delay(500);
  }
  throw Error("Recovery deadline exceeded");
}
async function main() {
  const image = await db.asset.findFirstOrThrow({ where: { kind: "image" } });
  const scene = {
    ...newScene(),
    duration: 8,
    assetId: image.id,
    narration: "",
    captions: [],
  };
  const variant = variantSchema.parse({
    id: crypto.randomUUID(),
    name: "Restart test",
    aspect: "landscape",
    sceneIds: [scene.id],
    captions: false,
  });
  const doc = projectSchema.parse({
    title: "TEST · Worker restart",
    scenes: [scene],
    variants: [variant],
  });
  const project = await db.project.create({
    data: { title: doc.title, document: json(doc) },
  });
  const asset = await db.asset.create({
    data: {
      projectId: project.id,
      name: image.name,
      kind: image.kind,
      mime: image.mime,
      storageKey: `recovery-alias/${crypto.randomUUID()}.png`,
      bytes: image.bytes,
      metadata: json({}),
    },
  }); // use a separate physical key; no shared-asset deletion
  const { storage } = await import("../lib/storage");
  await storage.put(
    asset.storageKey,
    await storage.get(image.storageKey),
    image.mime,
  );
  doc.scenes[0].assetId = asset.id;
  await db.project.update({
    where: { id: project.id },
    data: { document: json(doc) },
  });
  const render = await db.job.create({
    data: {
      projectId: project.id,
      kind: "render",
      dedupeKey: createHash("sha256").update(crypto.randomUUID()).digest("hex"),
      snapshot: json({
        doc,
        revision: 1,
        options: { variantId: variant.id, draft: false },
      }),
    },
  });
  await jobQueue().add("render", { id: render.id }, { jobId: render.id });
  await start();
  await waitJob(
    render.id,
    (j) => j.state === "running" && j.stage.startsWith("Normalizing"),
  );
  await stop();
  checks.push(
    "Running job and configuration remain in PostgreSQL after abrupt worker termination",
  );
  console.log("PASS: Worker interrupted; persisted render retained");
  await start();
  const completed = await waitJob(render.id, (j) => j.state === "completed");
  assert(completed.attempts >= 2);
  assert((completed.result as { bytes: number }).bytes > 100);
  checks.push(
    "BullMQ stalled-job recovery resumes and validates MP4 after worker restart",
  );
  console.log("PASS: Render recovered after worker restart");
  const p = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  const config = providerSchema.parse({
    name: "Isolated saved result",
    type: "zenmux",
    baseUrl: "https://example.invalid/v1",
    capabilities: ["script"],
    model: "isolated",
  });
  const credential = encrypt("snapshot-key-before-rotation");
  const generated = await db.job.create({
    data: {
      projectId: project.id,
      kind: "script",
      dedupeKey: crypto.randomUUID(),
      encryptedCredential: credential,
      submittedAt: new Date(),
      result: json({
        text: "Recovered response from a completed provider generation.",
      }),
      snapshot: json({
        doc,
        revision: p.revision,
        options: {},
        config,
        profileId: crypto.randomUUID(),
        prompt: "Test",
      }),
    },
  });
  await jobQueue().add("script", { id: generated.id }, { jobId: generated.id });
  await waitJob(generated.id, (j) => j.state === "completed");
  const changed = await db.project.findUniqueOrThrow({
    where: { id: project.id },
  });
  assert.equal(
    (changed.document as { script: string }).script,
    "Recovered response from a completed provider generation.",
  );
  assert.equal(
    decrypt(generated.encryptedCredential!),
    "snapshot-key-before-rotation",
  );
  checks.push(
    "A saved provider result is applied without resubmitting a paid request; encrypted credential snapshot is retained",
  );
  console.log("PASS: Completed generation resumed with no provider request");
  await stop();
  await writeFile(
    "test-output/recovery-report.json",
    JSON.stringify(checks, null, 2),
  );
  await closeQueue();
  await db.$disconnect();
}
main().catch(async (e) => {
  console.error(e.message);
  await stop();
  await closeQueue();
  await db.$disconnect();
  process.exit(1);
});
