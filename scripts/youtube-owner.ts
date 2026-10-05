import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { sessionToken } from "../lib/security";
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
const headers = {
  "Content-Type": "application/json",
  Cookie: `studio_session=${sessionToken()}`,
  Origin: origin,
};
export async function ownerApi(route: string, body?: unknown) {
  const r = await fetch(`${origin}/api/youtube/${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error || `Request failed (${r.status})`);
  return result;
}
async function main() {
  if (process.argv[2] === "configure") {
    const file = process.argv[3];
    if (!file) throw Error("Provide the private Google client JSON path");
    await ownerApi("client", JSON.parse(await readFile(file, "utf8")));
    console.log(JSON.stringify(await ownerApi("status")));
  }
  if (process.argv[2] === "status")
    console.log(
      JSON.stringify({
        connection: await ownerApi("status"),
        uploads: await ownerApi("uploads"),
      }),
    );
  if (process.argv[2] === "upload-manifest") {
    const file = process.argv[3],
      manifest = JSON.parse(await readFile(file, "utf8")),
      status = await ownerApi("status");
    if (!status.connected) throw Error("Complete Google consent first");
    if (!/divine\s*wisdom/i.test(status.channelTitle || ""))
      throw Error(
        "The connected channel does not match Divine Wisdom; review channel identity",
      );
    for (const entry of manifest.videos) {
      const result = await ownerApi("uploads", {
        renderJobId: entry.renderJobId,
        thumbnailAssetId: entry.thumbnailAssetId,
        expectedChannelId: status.channelId,
        metadata: entry.metadata,
      });
      entry.uploadId = result.id;
      entry.videoId = result.videoId;
      entry.state = result.state;
      await writeFile(file, JSON.stringify(manifest, null, 2));
      console.log(
        JSON.stringify({
          episode: entry.episode,
          uploadId: result.id,
          state: result.state,
          videoId: result.videoId,
        }),
      );
    }
  }
}
void main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
