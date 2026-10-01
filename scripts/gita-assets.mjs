import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { readFile, writeFile } from "node:fs/promises";
const dir = "data/productions/bhagavad-gita-telugu";
const production = JSON.parse(await readFile(`${dir}/production.json`, "utf8"));
const client = new Client({ name: "gita-video-production", version: "1.0" });
async function call(name, args) {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw Error(r.content.find(c => c.type === "text")?.text || "MCP operation failed");
  return JSON.parse(r.content.find(c => c.type === "text").text);
}
await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"), { requestInit: { headers: { Authorization: `Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}` } } }));
try {
  let project = await call("get_project", { projectId: production.projectId });
  const assets = [];
  for (const name of ["krishna-arjuna.png", "krishna-gita.png"]) {
    const existing = project.assets.find(a => a.name === name);
    assets.push(existing || await call("import_asset", { projectId: project.id, name, base64: (await readFile(`${dir}/${name}`)).toString("base64") }));
  }
  const document = project.document;
  document.scenes = document.scenes.map((s, i) => {
    const words = s.narration.split(/\s+/);
    const phrases = []; let phrase = "";
    for (const word of words) { if (phrase && (phrase + " " + word).length > 58) { phrases.push(phrase); phrase = word; } else phrase += (phrase ? " " : "") + word; }
    if (phrase) phrases.push(phrase);
    const weights = phrases.reduce((n, text) => n + text.length, 0); let start = 0;
    const captions = phrases.map((text, j) => { const end = j === phrases.length - 1 ? s.duration : start + s.duration * text.length / weights; const c = { id: `gita-caption-${i + 1}-${j + 1}`, start, end, text, accuracy: "approximate" }; start = end; return c; });
    const imageIndex = [0, 0, 1, 1, 1, 1, 0, 1][i];
    return { ...s, assetId: assets[imageIndex].id, captions, focalY: 0.5, strength: 0.06, status: "Original backgrounds and provisional captions ready; voice pending" };
  });
  project = await call("update_project", { projectId: project.id, expectedRevision: project.revision, document });
  production.document = project.document; production.revision = project.revision; production.assets = assets;
  await writeFile(`${dir}/production.json`, JSON.stringify(production, null, 2));
  console.log(JSON.stringify({ projectId: project.id, revision: project.revision, importedImages: assets.map(a => ({ id: a.id, name: a.name })), sceneCount: document.scenes.length, duration: document.scenes.reduce((n, s) => n + s.duration, 0) }));
} finally { await client.close(); }
