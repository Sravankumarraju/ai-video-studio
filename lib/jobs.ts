import { jobDedupeKey } from "./job-dedupe";
import { db } from "./db";
import { json } from "./projects";
import {
  projectSchema,
  providerSchema,
  type Capability,
  type ProviderConfig,
} from "./schema";
import { decrypt, encrypt } from "./security";
import { jobQueue } from "./queue";
import { expandPrompt } from "./prompts";
import { registry } from "./providers";
import { targetDuration, durationPlan } from "./duration";
import { timeline } from "./timeline";
export const publicJob = (j: {
  encryptedCredential?: unknown;
  snapshot?: unknown;
  dedupeKey?: unknown;
  [k: string]: unknown;
}) => {
  const { encryptedCredential, snapshot, dedupeKey, ...safe } = j;
  return safe;
};
export async function enqueue(
  projectId: string,
  kind: Capability | "render" | "automatic",
  options: {
    sceneId?: string;
    variantId?: string;
    draft?: boolean;
    prompt?: string;
    operation?: string;
    paidConfirmed?: boolean;
    profileId?: string;
    explicitTest?: boolean;
    variantScoped?: boolean;
  } = {},
) {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
  });
  const doc = projectSchema.parse(project.document);
  const variant = options.variantScoped
    ? doc.variants.find((v) => v.id === options.variantId)
    : undefined;
  if (options.variantScoped && !variant) throw Error("Variant not found");
  const scene = options.sceneId
    ? variant?.sceneOverrides[options.sceneId] ||
      doc.scenes.find((s) => s.id === options.sceneId)
    : undefined;
  if (options.sceneId && !scene) throw Error("Scene not found");
  if (scene?.locked && kind !== "render" && !options.explicitTest)
    throw Error("Unlock scene before generation");
  let credential: string | undefined;
  let config: ProviderConfig | undefined;
  let profileId: string | undefined;
  let estimate: number | undefined;
  let prompt = options.prompt;
  if (kind !== "render" && kind !== "automatic") {
    if (!options.paidConfirmed)
      throw Error("Paid generation requires explicit confirmation");
    const owner = await db.owner.upsert({
      where: { id: "owner" },
      create: { id: "owner" },
      update: {},
    });
    const defaults = owner.defaults as Record<string, string>;
    profileId =
      options.profileId ||
      scene?.providers[kind] ||
      doc.providers[kind] ||
      defaults[kind];
    if (!profileId) throw Error(`Configure a ${kind} provider in Settings`);
    const profile = await db.providerProfile.findUniqueOrThrow({
      where: { id: profileId },
    });
    config = providerSchema.parse(profile.config);
    if (
      !config.capabilities.includes(kind) ||
      !registry[config.type].capabilities.includes(kind)
    )
      throw Error("Profile does not support this capability");
    credential = encrypt(decrypt(profile.encryptedKey));
    estimate = config.pricePerCall;
    if (estimate === undefined && doc.unknownCostPolicy === "block")
      throw Error(
        "Price unknown. Set an explicit allow policy in project setup",
      );
    const template = await db.promptTemplate.findFirst({
      where: {
        stage: kind === "script" ? options.operation || "script" : kind,
      },
      orderBy: { updatedAt: "desc" },
    });
    prompt ??=
      kind === "voice"
        ? scene?.narration
        : expandPrompt(
            options.operation || kind,
            doc,
            scene,
            template?.body,
            // The requested output version decides the frame, not the first version.
            doc.variants.find((v) => v.id === options.variantId)?.aspect,
          );
    if (
      kind === "script" &&
      variant &&
      options.operation?.startsWith("variant-")
    ) {
      const target = targetDuration(doc, variant),
        plan = durationPlan(target);
      prompt = `${expandPrompt("script", { ...doc, targetDuration: target, variants: [variant] }, undefined, template?.body)}\n${options.operation === "variant-shorten" ? "Shorten" : "Expand"} this variant to naturally spoken narration for ${target} seconds (roughly ${plan.minimumWords}-${plan.maximumWords} words). Add a compelling fresh hook in the first selected scene. Preserve selected scene IDs and locked scenes; never speed up speech. Return JSON ONLY: [{"sceneId":"existing-id","narration":"revised narration"}]. Scenes: ${JSON.stringify(
        timeline(doc, variant)
          .filter((t) => !t.scene.locked)
          .map((t) => ({ sceneId: t.scene.id, narration: t.scene.narration })),
      )}`;
    }
    if (kind === "image" || kind === "video") {
      const custom = kind === "image" ? scene?.imagePrompt : scene?.videoPrompt;
      if (custom) prompt = `${prompt}\nScene instructions: ${custom}`;
    }
  }
  if (
    kind === "render" &&
    !doc.variants.find((v) => v.id === options.variantId)
  )
    throw Error("Select an output variant");
  const snapshot = {
    doc,
    revision: project.revision,
    options,
    config,
    profileId,
    prompt,
  };
  const dedupeKey = jobDedupeKey(projectId, kind, snapshot);
  const existing = await db.job.findUnique({ where: { dedupeKey } });
  if (existing) {
    await jobQueue().add(kind, { id: existing.id }, { jobId: existing.id });
    return publicJob(existing);
  }
  const job = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
    if (config) {
      const jobs = await tx.job.findMany({
        where: {
          projectId,
          kind: { not: "render" },
          OR: [{ state: { not: "cancelled" } }, { submittedAt: { not: null } }],
        },
      });
      if (
        jobs.filter((j) => j.kind !== "automatic").length >= doc.generationLimit
      )
        throw Error("Project generation limit reached");
      const reserved = jobs.reduce(
        (sum, j) => sum + (j.actualCost ?? j.estimatedCost ?? 0),
        0,
      );
      if (reserved + (estimate ?? 0) > doc.budget)
        throw Error("Project budget exceeded");
    }
    return tx.job.create({
      data: {
        projectId,
        kind,
        dedupeKey,
        snapshot: json(snapshot),
        encryptedCredential: credential,
        estimatedCost: estimate,
      },
    });
  });
  await jobQueue().add(kind, { id: job.id }, { jobId: job.id });
  return publicJob(job);
}
// BullMQ can fail a job without processJob running its catch block: a job that stalls past
// maxStalledCount (e.g. a frozen or restarted container) is failed by the queue alone. Mirror
// that into the database, or the job shows "running" forever and Retry refuses it.
export async function recordQueueFailure(id: string, reason: string) {
  const j = await db.job.findUnique({ where: { id } });
  if (!j || !["queued", "running"].includes(j.state)) return;
  const unknownCharge =
    !!j.submittedAt && !j.providerJobId && !j.result && !["render", "automatic"].includes(j.kind);
  await db.job.update({
    where: { id },
    data: {
      state: unknownCharge ? "waiting-for-input" : "failed",
      stage: unknownCharge ? "Needs reconciliation" : "Interrupted",
      error: `The worker stopped during this job (${reason.slice(0, 200)}). Retry to resume${j.kind === "render" ? "; completed scene clips are reused" : ""}.`,
    },
  });
}
