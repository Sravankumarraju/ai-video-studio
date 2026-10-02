import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "./db";
import {
  projectSchema,
  sceneSchema,
  variantSchema,
  capability,
  type ProjectDoc,
} from "./schema";
import { json, saveProject, validateStructure } from "./projects";
import { enqueue, publicJob } from "./jobs";
import { requireMcpScope, type McpScope } from "./mcp-auth";
import { safeFetch, sessionToken } from "./security";
import { POST as ownerPost } from "../app/api/[...path]/route";
import { decodeAssetBase64 } from "./asset-base64";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const MCP_GUIDE = `Story Studio is a persistent video editor. Start by asking the user for topic, language, audience, target duration and desired landscape/vertical variants. Use your own reasoning to write scripts and scenes through create_project, update_project and upsert_scene; this requires no paid text provider. Never invent sources or claim a still image is generated video. Import real images, videos and narration using import_asset, or ask the user to upload them in the manual editor. Set scene assetId/audioId, motion, duration and captions explicitly. Narration timing must match actual recording; never speed narration unnaturally to reach a target. Use create_variant for separate target durations, scene selections and overrides. get_project includes complete settings and revision; edits require expectedRevision and preserve scene locks and version history. Read the latest revision before every save; on conflicts reload and merge with user changes. update_project replaces the whole document, so preserve all fields and assets. Prefer upsert_scene for small edits. Use list_provider_profiles to discover independent text/image/video/voice/transcription profiles; API keys are never exposed. Paid generation needs the owner's generate permission, explicit consent for the requested spending, paidConfirmed:true, and the project's existing budget and generation limits. Do not change budget or unknownCostPolicy to bypass limits. With read/edit/render permission you can fully assemble uploaded media without paid generation. Queue draft renders, inspect them, then queue full landscape and vertical renders. Poll get_job for real background progress. Only report completion when a job completes and get_exports returns files. Download file URLs with the same Authorization bearer header, or open them in a signed-in owner browser. Local servers need desktop MCP clients; cloud clients require a reachable HTTPS deployment and supported authentication. No shell commands, publishing or credential administration are available.`;
export function assetReferences(doc: ProjectDoc) {
  const scenes = [
    ...doc.scenes,
    ...doc.variants.flatMap((v) => Object.values(v.sceneOverrides)),
  ];
  return [
    ...new Set(
      [
        doc.musicId,
        doc.logoId,
        ...doc.variants.map((v) => v.logoId),
        doc.introId,
        doc.outroId,
        ...doc.effects.map((e) => e.assetId),
        ...doc.characters.map((c) => c.referenceAssetId),
        ...scenes.flatMap((s) => [s.assetId, s.audioId, ...s.alternatives]),
      ].filter((v): v is string => !!v),
    ),
  ];
}
async function validateMedia(projectId: string | undefined, doc: ProjectDoc) {
  validateStructure(doc);
  const refs = assetReferences(doc);
  if (!refs.length) return;
  if (
    !projectId ||
    (await db.asset.count({ where: { projectId, id: { in: refs } } })) !==
      refs.length
  )
    throw Error(
      "Assets must belong to this project; import media before assigning it",
    );
}
const publicAsset = (a: {
  id: string;
  name: string;
  kind: string;
  mime: string;
  bytes: number;
  duration: number | null;
}) => ({
  id: a.id,
  name: a.name,
  kind: a.kind,
  mime: a.mime,
  bytes: a.bytes,
  duration: a.duration,
  url: `${process.env.APP_ORIGIN}/api/mcp/files/assets/${a.id}`,
});
function safeError(e: unknown) {
  if (e instanceof z.ZodError)
    return e.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ")
      .slice(0, 1000);
  const msg = e instanceof Error ? e.message : "Operation failed";
  if (/prisma|Invalid `|ECONN|DATABASE_URL|redis|connect ECONN/i.test(msg))
    return "Storage or queue unavailable; check application services";
  return msg.slice(0, 1000);
}
export function createMcpServer(connectionId: string) {
  const server = new McpServer(
    { name: "story-studio", version: "1.1.0" },
    { instructions: MCP_GUIDE },
  );
  function tool<S extends z.ZodRawShape>(
    name: string,
    scope: McpScope,
    description: string,
    inputSchema: S,
    action: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>,
    openWorldHint = false,
  ) {
    server.registerTool(
      name,
      {
        description,
        inputSchema: inputSchema as z.ZodRawShape,
        annotations: {
          readOnlyHint: scope === "read",
          destructiveHint: scope === "edit",
          idempotentHint: scope === "read",
          openWorldHint,
        },
      },
      async (args) => {
        try {
          await requireMcpScope(connectionId, scope);
          const result = await action(z.object(inputSchema).parse(args));
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (e) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: safeError(e) }],
          };
        }
      },
    );
  }
  server.registerResource(
    "workflow",
    "story-studio://workflow",
    {
      mimeType: "text/plain",
      description: "Video creation workflow and spending policy",
    },
    async (uri) => {
      await requireMcpScope(connectionId, "read");
      return {
        contents: [{ uri: uri.href, mimeType: "text/plain", text: MCP_GUIDE }],
      };
    },
  );
  server.registerPrompt(
    "create_video",
    {
      description: "Plan and create a Story Studio video",
      argsSchema: { brief: z.string().max(50000) },
    },
    async ({ brief }) => {
      await requireMcpScope(connectionId, "read");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${MCP_GUIDE}\n\nUser brief: ${brief}`,
            },
          },
        ],
      };
    },
  );
  tool(
    "list_projects",
    "read",
    "List saved projects without loading large documents",
    { limit: z.number().int().min(1).max(100).default(30) },
    async ({ limit }) =>
      db.project.findMany({
        where: { role: "video" },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, revision: true, updatedAt: true },
      }),
  );
  tool(
    "get_project",
    "read",
    "Read the full project document, latest revision and available assets",
    { projectId: id },
    async ({ projectId }) => {
      const p = await db.project.findUniqueOrThrow({
        where: { id: projectId },
        include: { assets: true },
      });
      return {
        id: p.id,
        title: p.title,
        revision: p.revision,
        document: p.document,
        assets: p.assets.map(publicAsset),
      };
    },
  );
  tool(
    "create_project",
    "edit",
    "Create a project with script, scenes, durations and variants; media must be imported afterward",
    { document: projectSchema },
    async ({ document }) => {
      if (document.mode !== "manual" || !document.reviewCheckpoints)
        throw Error(
          "Connector-created projects use manual mode with review checkpoints; the connected client drives the workflow through explicit tool calls",
        );
      if (
        document.budget > 10 ||
        document.generationLimit > 50 ||
        document.unknownCostPolicy !== "block"
      )
        throw Error(
          "New connector projects use a budget of at most $10, at most 50 generations and block unknown costs. The owner can change limits in the manual editor",
        );
      await validateMedia(undefined, document);
      return db.project.create({
        data: { title: document.title, document: json(document) },
      });
    },
  );
  tool(
    "update_project",
    "edit",
    "Replace the full document using the latest revision. Preserve unrelated settings and assets",
    {
      projectId: id,
      expectedRevision: z.number().int().positive(),
      document: projectSchema,
    },
    async ({ projectId, expectedRevision, document }) => {
      await validateMedia(projectId, document);
      const old = projectSchema.parse(
        (await db.project.findUniqueOrThrow({ where: { id: projectId } }))
          .document,
      );
      if (
        document.mode !== old.mode ||
        document.reviewCheckpoints !== old.reviewCheckpoints
      )
        throw Error(
          "Automation mode and review policy must be changed by the owner in the manual editor",
        );
      if (
        document.budget !== old.budget ||
        document.generationLimit !== old.generationLimit ||
        document.unknownCostPolicy !== old.unknownCostPolicy
      )
        throw Error(
          "Spending limits must be changed by the owner in the manual editor",
        );
      return saveProject(projectId, document, expectedRevision);
    },
  );
  tool(
    "upsert_scene",
    "edit",
    "Add or patch one scene, preserving omitted fields and other scenes. Variants select scene IDs explicitly",
    {
      projectId: id,
      expectedRevision: z.number().int().positive(),
      scene: sceneSchema.partial().extend({ id }),
    },
    async ({ projectId, expectedRevision, scene }) => {
      const p = await db.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      const doc = projectSchema.parse(p.document);
      const index = doc.scenes.findIndex((s) => s.id === scene.id);
      const updated = sceneSchema.parse({
        ...(index < 0
          ? { title: `Scene ${doc.scenes.length + 1}` }
          : doc.scenes[index]),
        ...scene,
      });
      if (index < 0) doc.scenes.push(updated);
      else doc.scenes[index] = updated;
      await validateMedia(projectId, doc);
      return saveProject(projectId, doc, expectedRevision);
    },
  );
  tool(
    "create_variant",
    "edit",
    "Add a landscape or vertical variant with its own timing and framing",
    {
      projectId: id,
      expectedRevision: z.number().int().positive(),
      variant: variantSchema,
    },
    async ({ projectId, expectedRevision, variant }) => {
      const doc = projectSchema.parse(
        (await db.project.findUniqueOrThrow({ where: { id: projectId } }))
          .document,
      );
      doc.variants.push(variant);
      await validateMedia(projectId, doc);
      return saveProject(projectId, doc, expectedRevision);
    },
  );
  tool(
    "import_asset",
    "edit",
    "Persist a real image/video/audio from public HTTPS URL or base64 (max 8 MiB). Assign returned ID to scenes separately",
    {
      projectId: id,
      name: z.string().min(1).max(200),
      url: z.string().url().optional(),
      base64: z
        .string()
        .max(12 * 1024 * 1024)
        .optional(),
    },
    async ({ projectId, name, url, base64 }) => {
      if (!!url === !!base64)
        throw Error("Supply exactly one of url or base64");
      let bytes: Buffer;
      if (url) {
        const res = await safeFetch(url, {}, 8 * 1024 * 1024);
        if (!res.ok) throw Error("Media download failed");
        bytes = Buffer.from(await res.arrayBuffer());
      } else {
        bytes = decodeAssetBase64(base64!);
      }
      if (!bytes.length || bytes.length > 8 * 1024 * 1024)
        throw Error(
          "Media size must be 1 byte to 8 MiB; use manual upload for larger files",
        );
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("file", new File([new Uint8Array(bytes)], name));
      const res = await ownerPost(
        new Request(`${process.env.APP_ORIGIN}/api/assets`, {
          method: "POST",
          headers: { cookie: `studio_session=${sessionToken()}` },
          body: form,
        }),
        { params: Promise.resolve({ path: ["assets"] }) },
      );
      const value = await res.json();
      if (!res.ok) throw Error(value.error);
      return publicAsset(value);
    },
    true,
  );
  tool(
    "list_provider_profiles",
    "read",
    "Read independent provider IDs and public configuration; never returns credentials",
    {},
    async () => {
      const profiles = await db.providerProfile.findMany({
        select: { id: true, config: true, verification: true },
      });
      const owner = await db.owner.findUnique({
        where: { id: "owner" },
        select: { defaults: true },
      });
      return { profiles, defaults: owner?.defaults || {} };
    },
  );
  tool(
    "queue_render",
    "render",
    "Queue a draft or full MP4 render from saved media, without paid provider calls",
    { projectId: id, variantId: id, draft: z.boolean().default(true) },
    async ({ projectId, variantId, draft }) => {
      const doc = projectSchema.parse(
        (await db.project.findUniqueOrThrow({ where: { id: projectId } }))
          .document,
      );
      if (!doc.variants.some((v) => v.id === variantId))
        throw Error("Variant not found");
      return publicJob(
        await enqueue(projectId, "render", { variantId, draft }),
      );
    },
  );
  tool(
    "queue_generation",
    "generate",
    "PAID: queue one provider operation only after explicit user spending consent. Budgets and generation limits apply",
    {
      projectId: id,
      kind: capability,
      sceneId: id.optional(),
      variantId: id.optional(),
      variantScoped: z.boolean().optional(),
      profileId: id.optional(),
      prompt: z.string().max(50000).optional(),
      paidConfirmed: z.literal(true),
    },
    async ({ projectId, kind, ...options }) =>
      publicJob(await enqueue(projectId, kind, options)),
    true,
  );
  tool(
    "get_job",
    "read",
    "Poll persisted job state, stage and result; completed renders have downloadable files",
    { jobId: id },
    async ({ jobId }) =>
      publicJob(await db.job.findUniqueOrThrow({ where: { id: jobId } })),
  );
  tool(
    "list_jobs",
    "read",
    "List recent background jobs for a project",
    { projectId: id, limit: z.number().int().min(1).max(100).default(20) },
    async ({ projectId, limit }) =>
      (
        await db.job.findMany({
          where: { projectId },
          take: limit,
          orderBy: { createdAt: "desc" },
        })
      ).map(publicJob),
  );
  tool(
    "get_exports",
    "read",
    "Get authenticated download URLs for completed MP4 and subtitle files; stale exports are labeled",
    { jobId: id },
    async ({ jobId }) => {
      const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
      if (job.kind !== "render" || !["completed", "stale"].includes(job.state))
        throw Error("Render has not completed");
      return {
        jobId,
        stale: job.state === "stale",
        files: Object.fromEntries(
          ["mp4", "srt", "vtt"].map((format) => [
            format,
            `${process.env.APP_ORIGIN}/api/mcp/files/jobs/${jobId}/download?format=${format}`,
          ]),
        ),
        authentication:
          "Use Authorization: Bearer <connector token>, or a signed-in owner browser",
      };
    },
  );
  return server;
}
