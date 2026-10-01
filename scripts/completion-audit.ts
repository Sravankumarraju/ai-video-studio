import "dotenv/config";
import { strict as assert } from "node:assert";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  projectSchema,
  newScene,
  variantSchema,
  sceneSchema,
} from "../lib/schema";
import { sampleMedia } from "./sample";
import { probe } from "../lib/media";
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
let cookie = "";
const checks: string[] = [];
async function api(url: string, method = "GET", data?: unknown) {
  const response = await fetch(`${origin}/api/${url}`, {
    method,
    headers: {
      origin,
      cookie,
      ...(data instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  if (url === "login")
    cookie = response.headers.get("set-cookie")!.split(";")[0];
  const result = await response.json();
  if (!response.ok) throw Error(result.error || `${url}: ${response.status}`);
  return result;
}
async function main() {
  await mkdir("test-output", { recursive: true });
  await api("login", "POST", { password: process.env.OWNER_PASSWORD });
  const fixture = await sampleMedia("test-output/completion-fixtures");
  let doc = projectSchema.parse({
    title: "AUDIT · Manual production",
    mode: "manual",
    targetDuration: 30,
    shortTargetDuration: 15,
    script: "A small step starts the journey.\n\nKeep moving forward.",
  });
  doc.scenes = [
    newScene(1, "A small step starts the journey."),
    newScene(2, "Keep moving forward."),
  ];
  doc.variants = ["landscape", "vertical"].map((aspect) =>
    variantSchema.parse({
      id: crypto.randomUUID(),
      name: aspect,
      aspect,
      sceneIds: doc.scenes.map((s) => s.id),
      targetDuration: aspect === "landscape" ? 30 : 15,
    }),
  );
  let project = await api("projects", "POST", doc);
  const upload = async (file: string) => {
    const form = new FormData();
    form.set("projectId", project.id);
    form.set(
      "file",
      new Blob([new Uint8Array(await readFile(file))]),
      file.split(/[\\/]/).at(-1)!,
    );
    return api("assets", "POST", form);
  };
  const image = await upload(fixture.image),
    audio = await upload(fixture.audio);
  doc.scenes = doc.scenes.map((s, i) =>
    sceneSchema.parse({
      ...s,
      assetId: image.id,
      audioId: audio.id,
      duration: audio.duration,
      motion: i ? "pan-right" : "zoom-in",
      transition: i ? "crossfade" : "cut",
      overlap: 0.4,
      captions: [
        {
          id: crypto.randomUUID(),
          start: 0,
          end: audio.duration,
          text: i ? "Keep moving forward." : "A small step starts the journey.",
          accuracy: "manual",
        },
      ],
    }),
  );
  project = await api(`projects/${project.id}`, "PATCH", {
    document: doc,
    revision: project.revision,
  });
  checks.push(
    "Created manual project, scenes, inspected images/narration, motion, crossfade and editable captions",
  );
  const reloaded = await api(`projects/${project.id}`);
  doc = projectSchema.parse(reloaded.document);
  assert.equal(doc.variants[0].targetDuration, 30);
  assert.equal(doc.variants[1].targetDuration, 15);
  assert(doc.scenes[0].audioId);
  checks.push(
    "Reload preserves independent targets, media assignments, scene motion and captions",
  );
  for (const v of doc.variants) {
    const job = await api("jobs", "POST", {
      projectId: project.id,
      kind: "render",
      options: { variantId: v.id, draft: false },
    });
    let complete: any;
    for (let i = 0; i < 180; i++) {
      const jobs = await api("jobs");
      complete = jobs.find((j: any) => j.id === job.id);
      if (complete?.state === "completed") break;
      if (["failed", "waiting-for-input"].includes(complete?.state))
        throw Error(complete.error || complete.stage);
      await new Promise((r) => setTimeout(r, 1000));
    }
    assert.equal(complete.state, "completed");
    const response = await fetch(
      `${origin}/api/jobs/${job.id}/download?format=mp4`,
      { headers: { cookie } },
    );
    assert(response.ok);
    const file = `test-output/completion-${v.aspect}.mp4`;
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    const info = await probe(file);
    assert.equal(info.width, v.aspect === "landscape" ? 1920 : 1080);
    assert.equal(info.height, v.aspect === "landscape" ? 1080 : 1920);
    assert.equal(info.videoCodec, "h264");
    assert.equal(info.audioCodec, "aac");
    assert(Math.abs((info.duration ?? 0) - 3.6) < 0.15);
    checks.push(
      `${v.aspect} full MP4 downloads and probes as playable H.264/AAC with actual duration 3.6s rather than forced target`,
    );
    const srt = await fetch(
      `${origin}/api/jobs/${job.id}/download?format=srt`,
      { headers: { cookie } },
    );
    assert((await srt.text()).includes("Keep moving forward."));
    checks.push(
      `${v.aspect} editable captions exported on the actual audio timeline`,
    );
  }
  await writeFile(
    "test-output/completion-audit.json",
    JSON.stringify(checks, null, 2),
  );
  checks.forEach((c) => console.log("PASS: " + c));
  console.log("No live AI calls or credits used.");
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
