import "dotenv/config";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { sampleMedia } from "./sample";
import { probe } from "../lib/media";
const origin = process.env.APP_ORIGIN || "http://localhost:3000";
let cookie = "";
const checks: string[] = [];
const connections: string[] = [];
async function owner(url: string, method = "GET", data?: unknown) {
  const res = await fetch(`${origin}/api/${url}`, {
    method,
    headers: { cookie, origin, "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (url === "login") cookie = res.headers.get("set-cookie")!.split(";")[0];
  assert(res.ok, `${url} returned ${res.status}`);
  return res.json();
}
async function connect(token: string) {
  const client = new Client({
    name: "story-studio-acceptance",
    version: "1.0",
  });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}/api/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}
async function tool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  const result = await client.callTool({ name, arguments: args });
  assert(!result.isError, `${name}: ${JSON.stringify(result.content)}`);
  const content = result.content as { type: string; text: string }[];
  return JSON.parse(content[0].text);
}
async function main() {
  await mkdir("test-output", { recursive: true });
  await owner("login", "POST", { password: process.env.OWNER_PASSWORD });
  const before = await owner("projects");
  const settings = await owner("mcp-connections", "POST", {
    name: "TEST MCP workflow",
    scopes: ["read", "edit", "render"],
  });
  connections.push(settings.id);
  const token = settings.token as string;
  const client = await connect(token);
  try {
    assert((await client.listTools()).tools.length >= 13);
    assert(
      (await client.listResources()).resources.some(
        (r) => r.uri === "story-studio://workflow",
      ),
    );
    assert(
      (await client.listPrompts()).prompts.some(
        (p) => p.name === "create_video",
      ),
    );
    checks.push(
      "Official HTTP SDK initialized and discovered tools, resources and prompts",
    );
    const noAuth = await fetch(`${origin}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(noAuth.status, 401);
    const badOrigin = await fetch(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(badOrigin.status, 403);
    checks.push("Missing credentials and foreign Origin rejected");
    const create = projectSchema.parse({
      title: "TEST MCP manual workflow",
      targetDuration: 30,
      shortTargetDuration: 15,
      script:
        "This is a test video with a calibration tone, not synthesized narration.",
      scenes: [newScene(1, "A new beginning.")],
    });
    let project = await tool(client, "create_project", { document: create });
    const sceneId = create.scenes[0].id;
    const fixtures = await sampleMedia("test-output/mcp-fixtures");
    const image = await tool(client, "import_asset", {
      projectId: project.id,
      name: "original-landscape.png",
      base64: (await readFile(fixtures.image)).toString("base64"),
    });
    const audio = await tool(client, "import_asset", {
      projectId: project.id,
      name: "calibration.wav",
      base64: (await readFile(fixtures.audio)).toString("base64"),
    });
    project = await tool(client, "upsert_scene", {
      projectId: project.id,
      expectedRevision: project.revision,
      scene: {
        id: sceneId,
        assetId: image.id,
        audioId: audio.id,
        duration: audio.duration,
        motion: "pan-right",
        captions: [
          {
            id: crypto.randomUUID(),
            start: 0,
            end: audio.duration,
            text: "MCP workflow test",
            accuracy: "manual",
          },
        ],
      },
    });
    const conflict = await client.callTool({
      name: "upsert_scene",
      arguments: {
        projectId: project.id,
        expectedRevision: 1,
        scene: { id: sceneId, title: "Stale edit" },
      },
    });
    assert(conflict.isError);
    checks.push(
      "Real image/audio persisted; motion and captions saved; stale edit rejected",
    );
    const variants = ["landscape", "vertical"].map((aspect) =>
      variantSchema.parse({
        id: crypto.randomUUID(),
        name: aspect,
        aspect,
        sceneIds: [sceneId],
        targetDuration: aspect === "landscape" ? 30 : 15,
      }),
    );
    for (const variant of variants)
      project = await tool(client, "create_variant", {
        projectId: project.id,
        expectedRevision: project.revision,
        variant,
      });
    const providers = await tool(client, "list_provider_profiles", {});
    assert(!/encryptedKey|encryptedCredential/.test(JSON.stringify(providers)));
    assert(!JSON.stringify(providers).includes(token));
    const blocked = await client.callTool({
      name: "queue_generation",
      arguments: { projectId: project.id, kind: "image", paidConfirmed: true },
    });
    assert(blocked.isError);
    checks.push(
      "Separate profiles exposed without keys; ungranted paid generation blocked",
    );
    for (const variant of variants) {
      let job = await tool(client, "queue_render", {
        projectId: project.id,
        variantId: variant.id,
        draft: false,
      });
      const deadline = Date.now() + 180000;
      while (
        !["completed", "failed", "cancelled", "waiting"].includes(job.state) &&
        Date.now() < deadline
      ) {
        await new Promise((r) => setTimeout(r, 1000));
        job = await tool(client, "get_job", { jobId: job.id });
      }
      assert.equal(
        job.state,
        "completed",
        `${variant.aspect}: ${job.error || job.state}`,
      );
      assert(!("encryptedCredential" in job));
      const exports = await tool(client, "get_exports", { jobId: job.id });
      const res = await fetch(exports.files.mp4, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert(res.ok);
      const file = `test-output/mcp-${variant.aspect}.mp4`;
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      const info = await probe(file);
      assert.equal(info.width, variant.aspect === "landscape" ? 1920 : 1080);
      assert.equal(info.height, variant.aspect === "landscape" ? 1080 : 1920);
      assert.equal(info.videoCodec, "h264");
      assert.equal(info.audioCodec, "aac");
      const range = await fetch(exports.files.mp4, {
        headers: { Authorization: `Bearer ${token}`, Range: "bytes=0-31" },
      });
      assert.equal(range.status, 206);
      assert.equal((await range.arrayBuffer()).byteLength, 32);
      const missing = await fetch(exports.files.mp4);
      assert.equal(missing.status, 401);
      const subtitle = await fetch(exports.files.srt, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert((await subtitle.text()).includes("MCP workflow test"));
      checks.push(
        `${variant.aspect} full H.264/AAC MP4 rendered, downloaded, probed; ranges/subtitles and auth checked`,
      );
    }
    const stdio = new Client({ name: "stdio-acceptance", version: "1" });
    await stdio.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [path.resolve("scripts/mcp-bridge.mjs")],
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(
              (entry): entry is [string, string] => entry[1] !== undefined,
            ),
          ),
          STORY_STUDIO_MCP_URL: `${origin}/api/mcp`,
          STORY_STUDIO_MCP_TOKEN: token,
        },
        stderr: "pipe",
      }),
    );
    try {
      assert((await stdio.listTools()).tools.length >= 13);
      assert.equal(
        (await tool(stdio, "get_project", { projectId: project.id })).id,
        project.id,
      );
    } finally {
      await stdio.close();
    }
    checks.push(
      "Desktop stdio bridge initialized and called upstream project tool",
    );
    const readOnly = await owner("mcp-connections", "POST", {
      name: "TEST MCP read only",
      scopes: ["read"],
    });
    connections.push(readOnly.id);
    const readClient = await connect(readOnly.token);
    try {
      const result = await readClient.callTool({
        name: "create_project",
        arguments: { document: { title: "Forbidden" } },
      });
      assert(result.isError);
    } finally {
      await readClient.close();
    }
    const listed = await owner("mcp-connections");
    assert(
      listed.every(
        (c: Record<string, unknown>) => !("token" in c) && !("tokenHash" in c),
      ),
    );
    await owner(`mcp-connections?id=${settings.id}`, "DELETE");
    const revoked = await fetch(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(revoked.status, 401);
    const after = await owner("projects");
    for (const existing of before)
      assert(
        after.some(
          (p: { id: string; revision: number }) =>
            p.id === existing.id && p.revision === existing.revision,
        ),
      );
    checks.push(
      "Read-only edits denied, token values omitted from lists, revocation immediate, existing projects unchanged",
    );
    await writeFile(
      "test-output/mcp-acceptance-report.json",
      JSON.stringify(
        {
          projectId: project.id,
          checks,
          paidProviderCalls: 0,
          unverified: [
            "Live AI generation",
            "Individual third-party client UIs",
            "Cloud OAuth-only clients",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        { projectId: project.id, checks, paidProviderCalls: 0 },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
    for (const id of connections)
      await owner(`mcp-connections?id=${id}`, "DELETE");
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "MCP acceptance failed");
  process.exitCode = 1;
});
