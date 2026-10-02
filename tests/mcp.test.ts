import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { projectSchema, sceneSchema } from "../lib/schema";
const mocks = vi.hoisted(() => ({
  connection: { findUnique: vi.fn(), update: vi.fn() },
  project: { findUniqueOrThrow: vi.fn(), create: vi.fn() },
  asset: { count: vi.fn() },
  save: vi.fn(),
  enqueue: vi.fn(),
}));
vi.mock("../lib/db", () => ({
  db: {
    mcpConnection: mocks.connection,
    project: mocks.project,
    asset: mocks.asset,
  },
}));
vi.mock("../lib/projects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/projects")>()),
  saveProject: mocks.save,
}));
vi.mock("../lib/jobs", () => ({
  enqueue: mocks.enqueue,
  publicJob: (v: unknown) => v,
}));
import { createMcpServer, assetReferences } from "../lib/mcp-server";
import {
  checkMcpOrigin,
  newMcpToken,
  hashToken,
  authenticateMcp,
} from "../lib/mcp-auth";
async function call(name: string, args: Record<string, unknown>) {
  const server = createMcpServer("connection-1");
  const client = new Client({ name: "regression", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}
beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_ORIGIN = "http://localhost:3000";
  mocks.connection.findUnique.mockResolvedValue({
    id: "connection-1",
    scopes: ["read", "edit", "render"],
    revokedAt: null,
  });
  mocks.connection.update.mockResolvedValue({});
  mocks.asset.count.mockResolvedValue(0);
  mocks.save.mockImplementation(async (id, document, revision) => ({
    id,
    document,
    revision: revision + 1,
  }));
});
describe("MCP permissions and preservation", () => {
  it("blocks inflated spending limits on newly created connector projects", async () => {
    const r = await call("create_project", {
      document: { title: "Unsafe budget", budget: 1000 },
    });
    expect(r.isError).toBe(true);
    expect(mocks.project.create).not.toHaveBeenCalled();
  });
  it("requires per-call paid confirmation even when generate permission is granted", async () => {
    mocks.connection.findUnique.mockResolvedValue({
      id: "connection-1",
      scopes: ["read", "generate"],
      revokedAt: null,
    });
    const r = await call("queue_generation", {
      projectId: "project-1",
      kind: "image",
      paidConfirmed: false,
    });
    expect(r.isError).toBe(true);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("creates unguessable tokens and stores a distinct digest", () => {
    const token = newMcpToken();
    expect(token).toMatch(/^ss_mcp_[a-f0-9]{64}$/);
    expect(newMcpToken()).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).not.toContain(token);
  });
  it("rejects foreign hosts and origins", () => {
    expect(() =>
      checkMcpOrigin(
        new Request("http://localhost:3000/api/mcp", {
          headers: { host: "attacker.example" },
        }),
      ),
    ).toThrow("host");
    expect(() =>
      checkMcpOrigin(
        new Request("http://localhost:3000/api/mcp", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow("origin");
  });
  it("rejects revoked bearer credentials even with a valid hash", async () => {
    mocks.connection.findUnique.mockResolvedValue({ revokedAt: new Date() });
    await expect(
      authenticateMcp(
        new Request("http://localhost:3000/api/mcp", {
          headers: { Authorization: `Bearer ${newMcpToken()}` },
        }),
      ),
    ).rejects.toThrow("revoked");
  });
  it("blocks paid calls without the separate generate scope", async () => {
    const r = await call("queue_generation", {
      projectId: "project-1",
      kind: "image",
      paidConfirmed: true,
    });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r)).toContain("generate permission");
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("rechecks revocation when executing a tool", async () => {
    mocks.connection.findUnique.mockResolvedValue({ revokedAt: new Date() });
    const r = await call("get_project", { projectId: "project-1" });
    expect(r.isError).toBe(true);
    expect(mocks.project.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it("patches one scene without losing existing captions, motion, media or variants", async () => {
    const scene = sceneSchema.parse({
      id: "scene-1",
      title: "Original",
      assetId: "asset-1",
      motion: "pan-right",
      captions: [{ id: "caption-1", start: 0, end: 1, text: "Caption" }],
    });
    const doc = projectSchema.parse({ title: "Saved", scenes: [scene] });
    mocks.project.findUniqueOrThrow.mockResolvedValue({ document: doc });
    mocks.asset.count.mockResolvedValue(1);
    const r = await call("upsert_scene", {
      projectId: "project-1",
      expectedRevision: 7,
      scene: { id: "scene-1", title: "Changed" },
    });
    expect(r.isError).not.toBe(true);
    const saved = mocks.save.mock.calls[0][1];
    expect(saved.scenes[0]).toEqual({ ...scene, title: "Changed" });
    expect(mocks.save.mock.calls[0][2]).toBe(7);
  });
  it("collects media references inside variant overrides and rejects foreign assets", async () => {
    const scene = sceneSchema.parse({
      id: "scene-1",
      title: "One",
      assetId: "foreign",
    });
    const doc = projectSchema.parse({
      title: "Project",
      scenes: [scene],
      variants: [
        {
          id: "vertical",
          name: "Vertical",
          aspect: "vertical",
          logoId: "foreign-version-logo",
          sceneIds: [scene.id],
          sceneOverrides: {
            [scene.id]: { ...scene, audioId: "variant-audio" },
          },
        },
      ],
    });
    expect(assetReferences(doc)).toEqual(
      expect.arrayContaining(["foreign", "variant-audio", "foreign-version-logo"]),
    );
    const r = await call("update_project", {
      projectId: "project-1",
      expectedRevision: 1,
      document: doc,
    });
    expect(r.isError).toBe(true);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("prevents a connector from raising an existing project budget", async () => {
    const old = projectSchema.parse({ title: "Saved", budget: 2 });
    mocks.project.findUniqueOrThrow.mockResolvedValue({ document: old });
    const r = await call("update_project", {
      projectId: "project-1",
      expectedRevision: 1,
      document: { ...old, budget: 200 },
    });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r)).toContain("Spending limits");
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
