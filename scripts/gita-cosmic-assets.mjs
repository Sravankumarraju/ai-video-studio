import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { readFile } from "node:fs/promises";
const projectId = "a39b4823-f4d4-436b-be68-7d6694418d36";
const dir = "data/productions/bhagavad-gita-telugu";
const prompts = JSON.parse(await readFile(`${dir}/cosmic-image-prompts.json`, "utf8")).prompts;
const client = new Client({ name: "cosmic-gita-production", version: "1.0" });
async function call(name, args) {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw Error(r.content.find(c => c.type === "text")?.text || "MCP operation failed");
  return JSON.parse(r.content.find(c => c.type === "text").text);
}
await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"), { requestInit: { headers: { Authorization: `Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}` } } }));
try {
  let project = await call("get_project", { projectId });
  const assets = [];
  for (const name of ["cosmic-cinematic.png", "cosmic-miniature.png", "cosmic-watercolor.png"]) {
    assets.push(project.assets.find(a => a.name === name) || await call("import_asset", { projectId, name, base64: (await readFile(`${dir}/${name}`)).toString("base64") }));
  }
  project = await call("get_project", { projectId });
  const document = project.document;
  const scenes = document.scenes.filter(s => s.id.startsWith("gita-divine-te-"));
  if (scenes.length !== 8 || scenes.some(s => !s.audioId)) throw Error("Complete the eight narration scenes before assembling cosmic visuals");
  const recorded = scenes.reduce((n, s) => n + s.duration, 0);
  const pause = recorded < 120 ? (120 - recorded) / scenes.length : 0;
  const imageIndices = [0, 1, 1, 0, 2, 2, 0, 2];
  scenes.forEach((s, i) => {
    s.assetId = assets[imageIndices[i]].id;
    s.imagePrompt = prompts[imageIndices[i]];
    s.duration += pause;
    s.status = "Cosmic artwork and new devotional narration ready";
  });
  document.variants.find(v => v.id === "gita-telugu-divine-voice").name = "Cosmic Krishna · new devotional voice";
  await call("update_project", { projectId, expectedRevision: project.revision, document });
  console.log(JSON.stringify({ imported: assets.map(a => ({ id: a.id, name: a.name })), recordedDuration: recorded, videoDuration: Math.max(recorded, 120), promptsSaved: scenes.length }));
} finally { await client.close(); }
