import type { ProjectDoc } from "./schema";
export function reconcileVariantScenes(doc: ProjectDoc): ProjectDoc {
  const ids = new Set(doc.scenes.map((s) => s.id));
  return {
    ...doc,
    variants: doc.variants
      .map((v) => ({
        ...v,
        sceneIds: v.sceneIds.filter((id) => ids.has(id)),
        sceneOverrides: Object.fromEntries(
          Object.entries(v.sceneOverrides).filter(([id]) => ids.has(id)),
        ),
        framing: Object.fromEntries(
          Object.entries(v.framing).filter(([id]) => ids.has(id)),
        ),
      }))
      .filter((v) => v.sceneIds.length),
  };
}
export function createVideoVersion(doc: ProjectDoc, variantId: string, name: string) {
  const source = doc.variants.find(v => v.id === variantId);
  if (!source || !source.sceneIds.length) throw Error("Select a non-empty video version");
  const scenes = source.sceneIds.map(id => {
    const base = doc.scenes.find(s => s.id === id);
    if (!base) throw Error("Version references a missing scene");
    return { ...structuredClone({ ...base, ...source.sceneOverrides[id] }), id: crypto.randomUUID() };
  });
  const variant = { ...structuredClone(source), id: crypto.randomUUID(), name,
    sceneIds: scenes.map(s => s.id), sceneOverrides: {},
    framing: Object.fromEntries(source.sceneIds.flatMap((id, i) => source.framing[id] ? [[scenes[i].id, structuredClone(source.framing[id])]] : [])),
  };
  return { document: { ...doc, scenes: [...doc.scenes, ...scenes], variants: [...doc.variants, variant] }, variant };
}
