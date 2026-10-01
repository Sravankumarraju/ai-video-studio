import type { ProjectDoc, Scene, Variant } from "./schema";
export function timeline(doc: ProjectDoc, variant: Variant) {
  let end = 0;
  let previous: Scene | undefined;
  return variant.sceneIds.map((id, i) => {
    const scene =
      variant.sceneOverrides[id] || doc.scenes.find((s) => s.id === id);
    if (!scene) throw Error("Variant references a missing scene");
    const overlap =
      i && scene.transition === "crossfade"
        ? Math.min(scene.overlap, scene.duration / 2, previous!.duration / 2)
        : 0;
    const start = end - overlap;
    end = start + scene.duration;
    previous = scene;
    return { scene, start, end, overlap };
  });
}
export function motionState(s: Scene, progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  const pan = s.motion.startsWith("pan");
  const zoom =
    s.motion === "zoom-in"
      ? 1 + s.strength * p
      : s.motion === "zoom-out"
        ? 1 + s.strength * (1 - p)
        : pan
          ? 1 + s.strength
          : 1;
  return {
    zoom,
    x:
      s.motion === "pan-left" ? 1 - p : s.motion === "pan-right" ? p : s.focalX,
    y: s.motion === "pan-up" ? 1 - p : s.motion === "pan-down" ? p : s.focalY,
  };
}
export function duration(doc: ProjectDoc, v: Variant) {
  return timeline(doc, v).at(-1)?.end || 0;
}
export function captions(doc: ProjectDoc, v: Variant) {
  return timeline(doc, v)
    .flatMap((t) =>
      t.scene.captions
        .filter((c) => c.start < t.scene.duration)
        .map((c) => ({
          ...c,
          start: t.start + c.start,
          end: t.start + Math.min(c.end, t.scene.duration),
          words: c.words?.map((w) => ({
            ...w,
            start: t.start + w.start,
            end: t.start + w.end,
          })),
        })),
    )
    .sort((a, b) => a.start - b.start);
}
export function stamp(sec: number, separator = ",") {
  const ms = Math.round(sec * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}
export function subtitleFile(
  doc: ProjectDoc,
  v: Variant,
  format: "srt" | "vtt",
) {
  return (
    (format === "vtt" ? "WEBVTT\n\n" : "") +
    captions(doc, v)
      .map(
        (c, i) =>
          `${i + 1}\n${stamp(c.start, format === "vtt" ? "." : ",")} --> ${stamp(c.end, format === "vtt" ? "." : ",")}\n${c.text.replace(/\r/g, "")}\n`,
      )
      .join("\n")
  );
}
export function approximateCaptions(scene: Scene) {
  const phrases = scene.narration.match(/[^.!?।\n]+[.!?।]?/gu) || [
    scene.narration,
  ];
  const total = phrases.reduce((n, p) => n + Array.from(p).length, 0) || 1;
  let start = 0;
  return phrases
    .filter((p) => p.trim())
    .map((p) => {
      const end = start + (scene.duration * Array.from(p).length) / total;
      const c = {
        id: crypto.randomUUID(),
        start,
        end,
        text: p.trim(),
        accuracy: "approximate" as const,
      };
      start = end;
      return c;
    });
}
export function warnings(
  doc: ProjectDoc,
  v: Variant,
  assets: { id: string; duration: number | null; kind: string }[],
) {
  const w: string[] = [];
  for (const { scene: s } of timeline(doc, v)) {
    const a = assets.find((a) => a.id === s.assetId);
    if (!a) w.push(`${s.title}: missing visual`);
    if (!s.audioId && s.narration) w.push(`${s.title}: narration is missing`);
    if (s.narrationStale || s.captionsStale)
      w.push(`${s.title}: dependent content is stale`);
    if (
      a?.kind === "video" &&
      a.duration &&
      a.duration - s.trimStart < s.duration &&
      s.shortClipPolicy === "reject"
    )
      w.push(`${s.title}: choose a short clip policy`);
  }
  if (duration(doc, v) > v.maxDuration)
    w.push(`Duration exceeds saved ${v.maxDuration}s platform preset`);
  return w;
}
