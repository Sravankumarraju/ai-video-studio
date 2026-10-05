import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { sessionToken } from "../lib/security";
async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000", seriesId = "60823952-1e93-462e-a6bc-ce7161e85dd1";
  const manifest = JSON.parse(await readFile("data/productions/divine-wisdom/youtube-private-batch.json", "utf8"));
  const headers = { Cookie: `studio_session=${sessionToken()}`, Origin: origin, "Content-Type": "application/json" };
  const records = [];
  for (const video of manifest.videos) {
    const beforeResponse = await fetch(`${origin}/api/projects/${video.projectId}`, { headers });
    assert(beforeResponse.ok); const before = await beforeResponse.json();
    assert(!before.seriesId || before.seriesId === seriesId, "Preserve an existing association to another project");
    const changed = await fetch(`${origin}/api/projects/${video.projectId}/series`, { method: "POST", headers, body: JSON.stringify({ seriesId }) });
    assert(changed.ok); const after = await changed.json();
    assert.equal(after.seriesId, seriesId);
    assert.equal(JSON.stringify(after.document), JSON.stringify(before.document));
    assert.equal(after.revision, before.revision);
    records.push({ episode: video.episode, projectId: video.projectId, previousSeriesId: before.seriesId, seriesId, unchangedDocumentHash: createHash("sha256").update(JSON.stringify(after.document)).digest("hex") });
  }
  await writeFile("data/productions/divine-wisdom/catalogue-grouping.json", JSON.stringify(records, null, 2));
  console.log(JSON.stringify({ grouped: records.length, series: "Bhagavad Gita · Telugu", documentsAndRevisionsPreserved: true }));
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });
