import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { landscapeShotVersion, addCallToAction, visualPromptPack } from "../lib/production-workflow";
import { projectSchema } from "../lib/schema";
async function main() {
const dir = "data/productions/divine-wisdom/gita-1-1/landscape-v2";
const projectId = "a39b4823-f4d4-436b-be68-7d6694418d36", variantId = "gita-1-1-te-landscape-v2", mode = process.argv[2] || "status";
await mkdir(dir, { recursive: true });
const state: Record<string, any> = await readFile(`${dir}/state.json`, "utf8").then(JSON.parse).catch(e => { if (e.code !== "ENOENT") throw e; return { projectId, variantId }; });
const client = new Client({ name: "divine-wisdom-landscape", version: "1.0" });
const token = process.env.STORY_STUDIO_MCP_TOKEN;
if (!token) throw Error("Set STORY_STUDIO_MCP_TOKEN privately in the process environment");
await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"), { requestInit: { headers: { Authorization: `Bearer ${token}`, Connection: "close" } } }));
async function call(name: string, args: Record<string, unknown>): Promise<any> { const r = await client.callTool({ name, arguments: args }) as { content: { type: string; text?: string }[]; isError?: boolean }; const text = r.content.find(c => c.type === "text")?.text; if (!text || r.isError) throw Error(text || "Missing MCP response"); return JSON.parse(text); }
async function save() { await writeFile(`${dir}/state.json`, JSON.stringify(state, null, 2)); }
try {
  if (mode === "prepare") {
    let p = await call("get_project", { projectId });
    let doc = projectSchema.parse(p.document);
    if (!doc.variants.some(v => v.id === variantId)) {
      const next = landscapeShotVersion(doc, "gita-1-1-te", 8);
      next.document.variants = next.document.variants.map(v => v.id === next.variant.id ? { ...v, id: variantId, name: "Divine Wisdom Telugu · 001 / 1.1 · 16:9" } : v);
      // Project remains Telugu; originals and all other language versions are unchanged.
      const outro = addCallToAction(next.document, variantId);
      doc = outro.document; state.outroSceneId = outro.scene.id;
      const old = p.document.scenes.map((s: any) => s.id);
      if (!old.every((id: string) => doc.scenes.some(s => s.id === id))) throw Error("Original scenes must remain");
      await call("update_project", { projectId, expectedRevision: p.revision, document: doc }); await save();
      p = await call("get_project", { projectId }); doc = projectSchema.parse(p.document);
    }
    state.outroSceneId ||= doc.variants.find(v => v.id === variantId)!.sceneIds.at(-1);
    const pack = visualPromptPack(doc, variantId);
    await writeFile(`${dir}/visual-prompts.json`, JSON.stringify(pack, null, 2));
    await writeFile(`${dir}/frontier-prompts.md`, `# Episode 001 · Bhagavad Gita 1.1 · 16:9\n\n${pack.metaPrompt}\n\n${pack.instruction}\n\n` + pack.shots.map((s, i) => `## ${i + 1}. ${s.title}\n\nScene ID: ${s.sceneId}\nTimeline: ${s.start.toFixed(2)}–${s.end.toFixed(2)} seconds\n\nNarration: ${s.narration}\n\nImage prompt:\n${s.imagePrompt}\n\nVideo prompt:\n${s.videoPrompt}\n`).join("\n"));
    await save(); console.log(JSON.stringify({ prepared: true, variantId, shots: pack.shots.length, outroSceneId: state.outroSceneId }));
  }
  if (mode === "narrate") {
    const p = await call("get_project", { projectId }), s = p.document.scenes.find((s: any) => s.id === state.outroSceneId);
    if (!s) throw Error("Run prepare first");
    if (s.audioId) console.log(JSON.stringify({ narrationAlreadySaved: true }));
    else {
      if (!state.voiceJobId) { const j = await call("queue_generation", { projectId, kind: "voice", sceneId: s.id, profileId: "7e994f10-1088-464c-91fb-79297b8fd6cb", paidConfirmed: true }); state.voiceJobId = j.id; await save(); }
      console.log(JSON.stringify(await call("get_job", { jobId: state.voiceJobId })));
    }
  }
  if (mode === "render") {
    if (!state.renderJobId) { const j = await call("queue_render", { projectId, variantId, draft: false }); state.renderJobId = j.id; await save(); }
    console.log(JSON.stringify(await call("get_job", { jobId: state.renderJobId })));
  }
  if (mode === "captions") {
    const p = await call("get_project", { projectId }), s = p.document.scenes.find((s: any) => s.id === state.outroSceneId);
    if (!s?.audioId || s.narrationStale) throw Error("Outro narration is not ready");
    const words = s.captions.flatMap((c: any) => c.words || []), cues: any[] = [], segmenter = new Intl.Segmenter("te", { granularity: "grapheme" });
    if (!words.length) throw Error("Aligned outro words missing");
    let group: any[] = [], lines = [""];
    const length = (t: string) => Array.from(segmenter.segment(t)).length;
    const flush = () => { if (!group.length) return; cues.push({ id: crypto.randomUUID(), start: group[0].start, end: group.at(-1).end, text: lines.join("\n"), words: group, accuracy: "aligned" }); group = []; lines = [""]; };
    for (const w of words) { const next = [...lines], i = next.length - 1, t = next[i] ? next[i] + " " + w.text : w.text; if (length(t) > 18 && next[i]) next.push(w.text); else next[i] = t; if (next.length > 2 || group.length >= 4) { flush(); lines = [w.text]; } else lines = next; group.push(w); if (/[.!?।]$/u.test(w.text)) flush(); } flush();
    for (let i = 0; i < cues.length; i++) cues[i].end = Math.min(s.duration, cues[i + 1]?.start ?? s.duration, cues[i].end + 0.2);
    s.captions = cues; s.volume = 1.25; const cosmic = p.document.scenes.find((s: any) => s.id === "gita-1-1-te-section-0"); s.assetId = cosmic.assetId; s.imagePrompt = cosmic.imagePrompt; s.motion = "zoom-out";
    await call("update_project", { projectId, expectedRevision: p.revision, document: p.document });
    console.log(JSON.stringify({ captionsSaved: true, cues: cues.length }));
  }
  if (mode === "status") for (const key of ["voiceJobId", "renderJobId"]) if (state[key]) { const j = await call("get_job", { jobId: state[key] }); console.log(JSON.stringify({ kind: j.kind, id: j.id, state: j.state, stage: j.stage, error: j.error, result: j.result })); }
  if (mode === "download") {
    const job = await call("get_job", { jobId: state.renderJobId }); if (job.state !== "completed") throw Error("Render is not completed");
    for (const format of ["mp4", "srt", "vtt"]) { const r = await fetch(`http://localhost:3000/api/mcp/files/jobs/${state.renderJobId}/download?format=${format}`, { headers: { Authorization: `Bearer ${token}`, Connection: "close" } }); if (!r.ok) throw Error(`Download failed: ${r.status}`); await writeFile(`${dir}/episode-001-te-16x9.${format}`, Buffer.from(await r.arrayBuffer())); }
    const p = await call("get_project", { projectId }), pack = visualPromptPack(projectSchema.parse(p.document), variantId);
    await writeFile(`${dir}/visual-prompts.json`, JSON.stringify(pack, null, 2));
    console.log(JSON.stringify({ downloaded: true, result: job.result }));
  }
} finally { await client.close(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Production failed"); process.exitCode = 1; });
