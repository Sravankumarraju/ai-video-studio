import { Prisma } from "@prisma/client";
import { db } from "./db";
import { projectSchema, invalidate, type ProjectDoc } from "./schema";
import { renderInputs } from "./timeline";
export const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export function validateStructure(doc: ProjectDoc) {
  const ids = doc.scenes.map((s) => s.id);
  if (new Set(ids).size !== ids.length) throw Error("Scene IDs must be unique");
  if (new Set(doc.variants.map((v) => v.id)).size !== doc.variants.length)
    throw Error("Variant IDs must be unique");
  for (const v of doc.variants) {
    for (const [id, s] of Object.entries(v.sceneOverrides)) {
      if (id !== s.id || !ids.includes(id))
        throw Error("Invalid variant scene override");
    }
    if (
      new Set(v.sceneIds).size !== v.sceneIds.length ||
      v.sceneIds.some((id) => !ids.includes(id))
    )
      throw Error("Variant must reference unique existing scenes");
  }
  for (const s of doc.scenes) {
    if (s.captions.some((c) => c.end > s.duration + 0.05))
      throw Error(`${s.title}: caption exceeds scene duration`);
  }
}
// A render is stale only when its own version's rendered inputs differ from the project now.
export function renderIsCurrent(snapshotDoc: unknown, variantId: string | undefined, current: ProjectDoc) {
  if (!variantId) return false;
  try {
    const before = renderInputs(projectSchema.parse(snapshotDoc), variantId);
    return !!before && before === renderInputs(current, variantId);
  } catch {
    return false;
  }
}
export async function reconcileRenders(
  tx: Prisma.TransactionClient,
  projectId: string,
  current: ProjectDoc,
) {
  const renders = await tx.job.findMany({
    where: { projectId, kind: "render", state: { in: ["completed", "stale"] } },
    select: { id: true, state: true, snapshot: true },
  });
  for (const j of renders) {
    const snapshot = j.snapshot as { doc?: unknown; options?: { variantId?: string } };
    const state = renderIsCurrent(snapshot.doc, snapshot.options?.variantId, current) ? "completed" : "stale";
    if (state !== j.state) await tx.job.update({ where: { id: j.id }, data: { state } });
  }
}
export async function saveProject(
  id: string,
  document: unknown,
  revision: number,
) {
  return db.$transaction(async (tx) => {
    const old = await tx.project.findUniqueOrThrow({ where: { id } });
    if (old.revision !== revision)
      throw Error("Project changed in another tab. Reload before saving.");
    const previous = projectSchema.parse(old.document);
    const next = invalidate(previous, projectSchema.parse(document));
    validateStructure(next);
    for (const s of previous.scenes.filter((s) => s.locked)) {
      const updated = next.scenes.find((n) => n.id === s.id);
      if (!updated) throw Error("Unlock completed scenes before deleting them");
      if (updated.locked && JSON.stringify(updated) !== JSON.stringify(s))
        throw Error("Unlock completed scenes before editing them");
    }
    await tx.projectVersion.create({
      data: {
        projectId: id,
        revision,
        document: old.document as Prisma.InputJsonValue,
      },
    });
    const changed = await tx.project.updateMany({
      where: { id, revision },
      data: {
        title: next.title,
        document: json(next),
        revision: { increment: 1 },
      },
    });
    if (!changed.count)
      throw Error("Project changed in another tab. Reload before saving.");
    await reconcileRenders(tx, id, next);
    return tx.project.findUniqueOrThrow({ where: { id } });
  });
}
export async function applyJob(
  id: string,
  revision: number,
  apply: (doc: ProjectDoc) => ProjectDoc,
) {
  const p = await db.project.findUniqueOrThrow({ where: { id } });
  if (p.revision !== revision) return false;
  await saveProject(id, apply(projectSchema.parse(p.document)), revision);
  return true;
}
