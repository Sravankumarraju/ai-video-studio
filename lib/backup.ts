import { projectSchema, type ProjectDoc, type Scene } from "./schema";
export function portableDocument(input: ProjectDoc) {
  const doc = projectSchema.parse(structuredClone(input));
  doc.providers = {};
  doc.scenes.forEach((s) => (s.providers = {}));
  doc.variants.forEach((v) =>
    Object.values(v.sceneOverrides).forEach((s) => (s.providers = {})),
  );
  return doc;
}
export function remapMedia(doc: ProjectDoc, ids: Record<string, string>) {
  const map = (id: string | undefined) => (id ? ids[id] : undefined);
  const scene = (s: Scene): Scene => ({
    ...s,
    assetId: map(s.assetId),
    audioId: map(s.audioId),
    alternatives: s.alternatives.map((id) => ids[id]).filter(Boolean),
  });
  doc.scenes = doc.scenes.map(scene);
  doc.variants = doc.variants.map((v) => ({
    ...v,
    logoId: v.logoId === null ? null : map(v.logoId),
    sceneOverrides: Object.fromEntries(
      Object.entries(v.sceneOverrides).map(([id, s]) => [id, scene(s)]),
    ),
  }));
  doc.musicId = map(doc.musicId);
  doc.logoId = map(doc.logoId);
  doc.introId = map(doc.introId);
  doc.outroId = map(doc.outroId);
  doc.effects = doc.effects
    .filter((e) => ids[e.assetId])
    .map((e) => ({ ...e, assetId: ids[e.assetId] }));
  doc.characters = doc.characters.map((c) => ({
    ...c,
    referenceAssetId: map(c.referenceAssetId),
  }));
  return doc;
}
export function safeProvenance(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const allowed = [
    "source",
    "jobId",
    "profileId",
    "model",
    "prompt",
    "parameters",
    "generatedAt",
    "alignment",
    "probe",
    "uploadedAt",
  ];
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) => [
        k,
        k === "parameters" && v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).filter(
                ([key]) =>
                  !/(key|secret|token|authorization|password)/i.test(key),
              ),
            )
          : v,
      ]),
  );
}
