import "dotenv/config";
import { strict as assert } from "node:assert";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  projectSchema,
  newScene,
  variantSchema,
  providerSchema,
} from "../lib/schema";
import { sampleMedia } from "./sample";
import { db } from "../lib/db";
import { probe } from "../lib/media";
import { storage, localPath } from "../lib/storage";
import { decrypt } from "../lib/security";
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
let cookie = "";
const checks: { check: string; status: string }[] = [];
async function request(url: string, method = "GET", data?: unknown) {
  const r = await fetch(`${origin}/api/${url}`, {
    method,
    headers: {
      ...(data instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      cookie,
      origin,
    },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { r, body };
}
async function ok(url: string, method = "GET", data?: unknown) {
  const { r, body } = await request(url, method, data);
  assert(r.ok, JSON.stringify(body));
  return body;
}
function pass(check: string) {
  checks.push({ check, status: "passed" });
  console.log(`PASS: ${check}`);
}
async function main() {
  await mkdir("test-output", { recursive: true });
  const unauthorized = await request("projects");
  assert.equal(unauthorized.r.status, 401);
  pass("Owner access protects project API");
  const login = await request("login", "POST", {
    password: process.env.OWNER_PASSWORD,
  });
  assert(login.r.ok);
  cookie = login.r.headers.get("set-cookie")!.split(";")[0];
  const scenes = [
    { ...newScene(1, "An original test story."), duration: 2, captions: [] },
  ];
  const variant = variantSchema.parse({
    id: crypto.randomUUID(),
    name: "Landscape acceptance",
    aspect: "landscape",
    sceneIds: scenes.map((s) => s.id),
    captions: true,
  });
  const doc = projectSchema.parse({
    title: "TEST · Manual acceptance",
    scenes,
    variants: [variant],
  });
  let p = await ok("projects", "POST", doc);
  const media = await sampleMedia("test-output/api-fixtures");
  for (const [file, field] of [
    [media.image, "assetId"],
    [media.audio, "audioId"],
  ]) {
    const bytes = await readFile(file);
    const form = new FormData();
    form.set("projectId", p.id);
    form.set(
      "file",
      new File(
        [new Uint8Array(bytes)],
        file.endsWith("png") ? "test.png" : "calibration.wav",
      ),
    );
    const asset = await ok("assets", "POST", form);
    (doc.scenes[0] as unknown as Record<string, unknown>)[field] = asset.id;
  }
  doc.scenes[0].captions = [
    {
      id: "c",
      start: 0,
      end: 2,
      text: "An original test story.",
      accuracy: "manual",
    },
  ];
  p = await ok(`projects/${p.id}`, "PATCH", {
    document: doc,
    revision: p.revision,
  });
  pass("Manual workflow persists inspected uploaded media without AI keys");
  const loaded = await ok(`projects/${p.id}`);
  assert.equal(loaded.document.scenes[0].assetId, doc.scenes[0].assetId);
  assert.equal(loaded.assets.length, 2);
  pass("Refresh restores editable project and assets");
  const profileIds: string[] = [];
  for (const c of ["image", "video", "voice"] as const) {
    const config = providerSchema.parse({
      name: `TEST ${c}`,
      type: c === "voice" ? "elevenlabs" : "zenmux",
      baseUrl:
        c === "voice"
          ? "https://api.elevenlabs.io/v1"
          : "https://zenmux.ai/api/v1",
      capabilities: [c],
      model: "isolated-not-live-verified",
      discovery: false,
    });
    const profile = await ok("providers", "POST", {
      config,
      apiKey: `isolated-key-${c}`,
    });
    assert(!JSON.stringify(profile).includes(`isolated-key-${c}`));
    profileIds.push(profile.id);
  }
  const defaults = {
    image: profileIds[0],
    video: profileIds[1],
    voice: profileIds[2],
  };
  await ok("defaults", "POST", defaults);
  const extra = await ok("providers", "POST", {
    config: providerSchema.parse({
      name: "TEST alternate image",
      type: "zenmux",
      baseUrl: "https://zenmux.ai/api/v1",
      capabilities: ["image"],
      model: "isolated",
    }),
    apiKey: "isolated-other-image",
  });
  await ok("defaults", "POST", { ...defaults, image: extra.id });
  const changed = await ok("defaults");
  assert.equal(changed.video, defaults.video);
  assert.equal(changed.voice, defaults.voice);
  pass("Independent profile keys and capability defaults");
  const stored = await db.providerProfile.findUniqueOrThrow({
    where: { id: profileIds[0] },
  });
  assert.equal(decrypt(stored.encryptedKey), "isolated-key-image");
  assert(!stored.encryptedKey.includes("isolated-key-image"));
  pass("API keys are encrypted and absent from normal responses");
  await db.owner.update({ where: { id: "owner" }, data: { defaults: {} } });
  for (const id of [...profileIds, extra.id])
    await ok(`providers/${id}`, "DELETE");
  const visual = await fetch(`${origin}/api/assets/${doc.scenes[0].assetId}`, {
    headers: { cookie },
  });
  assert(visual.ok);
  pass("Assets remain usable after provider changes");
  const job = await ok("jobs", "POST", {
    projectId: p.id,
    kind: "render",
    options: { variantId: variant.id, draft: false },
  });
  const duplicate = await ok("jobs", "POST", {
    projectId: p.id,
    kind: "render",
    options: { variantId: variant.id, draft: false },
  });
  assert.equal(job.id, duplicate.id);
  pass("Duplicate background render submissions are prevented");
  let completed;
  for (let i = 0; i < 120; i++) {
    const list = await ok("jobs");
    const current = list.find((j: { id: string }) => j.id === job.id);
    assert(!JSON.stringify(current).includes("encryptedCredential"));
    assert(!("snapshot" in current));
    if (current.state === "completed") {
      completed = current;
      break;
    }
    if (["failed", "waiting-for-input"].includes(current.state))
      throw Error(current.error || current.stage);
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(completed, "Render did not complete");
  const download = await fetch(`${origin}/api/jobs/${job.id}/download`, {
    headers: { cookie },
  });
  assert(download.ok);
  assert(download.headers.get("content-type")?.includes("video/mp4"));
  const file = "test-output/manual-api.mp4";
  await writeFile(file, Buffer.from(await download.arrayBuffer()));
  const info = await probe(file);
  assert.equal(info.width, 1920);
  assert.equal(info.height, 1080);
  assert.equal(info.videoCodec, "h264");
  pass(
    "A real background-rendered playable MP4 is downloadable without AI credentials",
  );
  const ranged = await fetch(`${origin}/api/jobs/${job.id}/download`, {
    headers: { cookie, range: "bytes=0-127" },
  });
  assert.equal(ranged.status, 206);
  assert.equal((await ranged.arrayBuffer()).byteLength, 128);
  pass("Protected MP4 supports browser range playback");
  const backup = await ok(`projects/${p.id}/export`);
  assert(!JSON.stringify(backup).includes("encryptedKey"));
  assert(!JSON.stringify(backup).includes("isolated-key"));
  const imported = await ok("projects/import", "POST", backup);
  assert.equal(imported.document.scenes[0].narration, doc.scenes[0].narration);
  assert.notEqual(imported.document.scenes[0].assetId, doc.scenes[0].assetId);
  assert(
    imported.document.scenes[0].assetId,
    "Imported scene retains its media assignment",
  );
  assert(
    imported.document.scenes[0].audioId,
    "Imported scene retains its narration assignment",
  );
  pass(
    "Portable project backup restores editable structure/media and excludes secrets",
  );
  doc.scenes[0].locked = true;
  p = await ok(`projects/${p.id}`, "PATCH", {
    document: doc,
    revision: p.revision,
  });
  const locked = await request("jobs", "POST", {
    projectId: p.id,
    kind: "image",
    options: { sceneId: doc.scenes[0].id, paidConfirmed: true },
  });
  assert.equal(locked.r.status, 400);
  assert(locked.body.error.includes("Unlock"));
  pass("Locked scenes reject selected regeneration");
  doc.scenes[0].locked = false;
  p = await ok(`projects/${p.id}`, "PATCH", {
    document: doc,
    revision: p.revision,
  });
  doc.scenes[0].narration += " Edited.";
  p = await ok(`projects/${p.id}`, "PATCH", {
    document: doc,
    revision: p.revision,
  });
  assert(p.document.scenes[0].narrationStale);
  assert(p.document.scenes[0].captionsStale);
  const stale = await db.job.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(stale.state, "stale");
  pass(
    "Edited narration invalidates dependent captions and renders, preserving old output",
  );
  await writeFile(
    "test-output/acceptance-report.json",
    JSON.stringify(checks, null, 2),
  );
  await db.$disconnect();
  console.log(
    `${checks.length} API acceptance checks passed. No live AI calls or credits used.`,
  );
}
main().catch(async (e) => {
  console.error(e.message);
  await writeFile(
    "test-output/acceptance-report.json",
    JSON.stringify(
      [...checks, { check: e.message, status: "failed" }],
      null,
      2,
    ),
  );
  await db.$disconnect();
  process.exit(1);
});
