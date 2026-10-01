import { readFile, writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const jobId = process.argv[2] || "da4de414-7fb0-4dcd-92a9-c7db34128350";
const basename = process.argv[3] || "silent-preview";
const variantId = process.argv[4] || "gita-telugu-two-minute";
if (!/^[a-z0-9-]+$/.test(basename)) throw new Error("Invalid output filename");
const token = process.env.STORY_STUDIO_MCP_TOKEN;
if (!token) throw new Error("Connector token is unavailable");
for (const format of ["mp4", "srt", "vtt"]) {
  const response = await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const path = `data/productions/bhagavad-gita-telugu/${basename}.${format}`;
  await writeFile(path, bytes);
  console.log(JSON.stringify({ path, bytes: bytes.length }));
}
if (basename !== "silent-preview") {
  const client = new Client({ name: "gita-production-download", version: "1.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  try {
    const path = "data/productions/bhagavad-gita-telugu/production.json";
    const production = JSON.parse(await readFile(path, "utf8"));
    const result = await client.callTool({ name: "get_project", arguments: { projectId: production.projectId } });
    if (result.isError) throw new Error("Cannot read updated project manifest");
    const project = JSON.parse(result.content.find(c => c.type === "text").text);
    await writeFile(path, JSON.stringify({ ...production, document: project.document, revision: project.revision, assets: project.assets, finalJobId: jobId, variantId }, null, 2));
  } finally { await client.close(); }
}
