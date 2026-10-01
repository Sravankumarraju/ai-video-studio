import { z } from "zod";
import type { ProjectDoc, Variant } from "./schema";
import { timeline, duration } from "./timeline";
export const durationPresets = [30, 60, 90, 180, 300, 600];
export function targetDuration(doc: ProjectDoc, v: Variant) {
  return (
    v.targetDuration ??
    (v.aspect === "vertical" ? doc.shortTargetDuration : doc.targetDuration)
  );
}
export function durationPlan(seconds: number) {
  return {
    minimumWords: Math.round(seconds * 2),
    maximumWords: Math.round(seconds * 2.6),
    suggestedScenes: Math.max(1, Math.ceil(seconds / 8)),
  };
}
export function durationSummary(
  doc: ProjectDoc,
  v: Variant,
  assets: { id: string; duration: number | null }[],
) {
  const tracks = timeline(doc, v);
  const narrated = tracks.filter((t) => t.scene.narration && !t.scene.muted);
  return {
    target: targetDuration(doc, v),
    actual: duration(doc, v),
    measuredNarration: narrated.reduce(
      (n, t) =>
        n + (t.scene.audioSlice ? Math.min(t.scene.duration, Math.max(0, (assets.find((a) => a.id === t.scene.audioId)?.duration || 0) - t.scene.audioStart)) : (assets.find((a) => a.id === t.scene.audioId)?.duration || 0)),
      0,
    ),
    narrationComplete: narrated.every(
      (t) => !!assets.find((a) => a.id === t.scene.audioId)?.duration,
    ),
  };
}
export function applyVariantNarration(
  doc: ProjectDoc,
  variantId: string,
  text: string,
) {
  const variant = doc.variants.find((v) => v.id === variantId);
  if (!variant) throw Error("Variant not found");
  const list = z
    .array(z.object({ sceneId: z.string(), narration: z.string().max(100000) }))
    .min(1)
    .max(200)
    .parse(JSON.parse(text));
  if (
    new Set(list.map((x) => x.sceneId)).size !== list.length ||
    list.some((x) => !variant.sceneIds.includes(x.sceneId))
  )
    throw Error("Rewrite references invalid scenes");
  const overrides = { ...variant.sceneOverrides };
  for (const item of list) {
    const base =
      overrides[item.sceneId] || doc.scenes.find((s) => s.id === item.sceneId)!;
    if (base.locked) throw Error("Unlock affected scenes before rewriting");
    overrides[item.sceneId] = {
      ...base,
      narration: item.narration,
      narrationStale: !!base.audioId,
      captionsStale: !!base.captions.length,
    };
  }
  return {
    ...doc,
    variants: doc.variants.map((v) =>
      v.id === variantId ? { ...v, sceneOverrides: overrides } : v,
    ),
  };
}
