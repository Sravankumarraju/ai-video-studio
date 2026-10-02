import { describe, it, expect } from "vitest";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { renderIsCurrent } from "../lib/projects";

function fixture() {
  const te = { ...newScene(), assetId: "image-te", imagePrompt: "Court of Hastinapura" };
  const hi = { ...newScene(2), assetId: "image-hi" };
  return projectSchema.parse({ title: "Gita 1.1", scenes: [te, hi], variants: [
    variantSchema.parse({ id: "te", name: "Telugu", aspect: "vertical", sceneIds: [te.id] }),
    variantSchema.parse({ id: "hi", name: "Hindi", aspect: "vertical", sceneIds: [hi.id] }),
  ] });
}

describe("render staleness is scoped to the rendered version", () => {
  it("stays current when another version is added or edited", () => {
    const rendered = fixture(), now = structuredClone(rendered);
    now.scenes[1].duration = 9;
    now.variants.push(variantSchema.parse({ id: "te-16x9", name: "16:9", aspect: "landscape", sceneIds: [now.scenes[0].id] }));
    expect(renderIsCurrent(rendered, "te", now)).toBe(true);
    expect(renderIsCurrent(rendered, "hi", now)).toBe(false);
  });
  it("ignores prompt, title and status edits that the renderer never reads", () => {
    const rendered = fixture(), now = structuredClone(rendered);
    Object.assign(now.scenes[0], { imagePrompt: "Refined prompt", title: "Renamed", status: "Reviewed" });
    now.variants[0].name = "Divine Wisdom Telugu";
    expect(renderIsCurrent(rendered, "te", now)).toBe(true);
  });
  it("becomes stale when this version's visuals, captions or settings change", () => {
    for (const edit of [
      (d: ReturnType<typeof fixture>) => { d.scenes[0].assetId = "new-image"; },
      (d: ReturnType<typeof fixture>) => { d.scenes[0].captions = [{ id: "c", start: 0, end: 1, text: "నమస్తే", accuracy: "manual" }]; },
      (d: ReturnType<typeof fixture>) => { d.variants[0].fontSize = 60; },
      (d: ReturnType<typeof fixture>) => { d.musicId = "music"; },
    ]) {
      const rendered = fixture(), now = structuredClone(rendered);
      edit(now);
      expect(renderIsCurrent(rendered, "te", now)).toBe(false);
    }
  });
  it("treats a removed version or unreadable snapshot as stale", () => {
    const rendered = fixture(), now = structuredClone(rendered);
    now.variants = now.variants.filter(v => v.id !== "te");
    expect(renderIsCurrent(rendered, "te", now)).toBe(false);
    expect(renderIsCurrent({ nonsense: true }, "te", fixture())).toBe(false);
  });
});
