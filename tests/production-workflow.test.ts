import { describe, it, expect } from "vitest";
import { projectSchema, newScene, variantSchema, invalidate } from "../lib/schema";
import { landscapeShotVersion, addCallToAction, visualPromptPack, splitVisualScene } from "../lib/production-workflow";
import { durationSummary } from "../lib/duration";
function fixture() {
  const s = { ...newScene(), duration: 20, narration: "Reviewed narration", audioId: "recording", assetId: "old-image", volume: 1.25,
    captions: [{ id: "c", start: 7, end: 9, text: "A crossing caption", accuracy: "aligned" as const, words: [{ text: "A", start: 7, end: 8 }, { text: "caption", start: 8, end: 9 }] }] };
  const v = variantSchema.parse({ id: "original", name: "Original", aspect: "vertical", sceneIds: [s.id] });
  return projectSchema.parse({ title: "Episode 001", language: "te", scenes: [s], variants: [v] });
}
describe("continuous narration with short visual shots", () => {
  it("preserves originals, continuous source ranges and caption boundaries", () => {
    const d = fixture(), before = JSON.stringify(d), next = landscapeShotVersion(d, "original", 8);
    expect(JSON.stringify(d)).toBe(before);
    expect(next.document.scenes[0]).toEqual(d.scenes[0]);
    const shots = next.document.scenes.slice(1);
    expect(shots).toHaveLength(3);
    expect(next.variant.aspect).toBe("landscape");
    expect(shots.reduce((n, s) => n + s.duration, 0)).toBeCloseTo(20);
    for (let i = 0; i < shots.length; i++) {
      expect(shots[i].audioId).toBe("recording"); expect(shots[i].volume).toBe(1.25);
      if (i) expect(shots[i].audioStart).toBeCloseTo(shots[i-1].audioStart + shots[i-1].duration);
      for (const c of shots[i].captions) { expect(c.start).toBeGreaterThanOrEqual(0); expect(c.end).toBeLessThanOrEqual(shots[i].duration); }
    }
    expect(durationSummary(next.document, next.variant, [{ id: "recording", duration: 20 }]).measuredNarration).toBeCloseTo(20);
  });
  it("image replacement never changes audio, gain, timing or stale flags", () => {
    const d = fixture(), next = structuredClone(d); next.scenes[0].assetId = "new-image";
    const saved = invalidate(d, next).scenes[0];
    expect(saved).toEqual({ ...d.scenes[0], assetId: "new-image" });
  });
  it("refuses splitting an existing fade that would shorten or fade the narration", () => {
    expect(() => splitVisualScene({ ...fixture().scenes[0], transition: "crossfade" }, 8)).toThrow("zero audio fades");
  });
  it("adds an editable, separate-language call to action without touching prior recordings", () => {
    const d = fixture(), next = addCallToAction(d, "original");
    expect(next.scene.narration).toContain("సబ్‌స్క్రైబ్"); expect(next.scene.audioId).toBeUndefined();
    expect(next.document.scenes[0]).toEqual(d.scenes[0]);
    expect(() => addCallToAction(next.document, "original")).toThrow("already");
  });
  it("exports timed standalone prompts and a prompt refinement instruction", () => {
    const next = landscapeShotVersion(fixture(), "original"), pack = visualPromptPack(next.document, next.variant.id);
    expect(pack.aspect).toBe("16:9"); expect(pack.metaPrompt).toContain("sceneId");
    expect(pack.shots.at(-1)!.end).toBeCloseTo(20);
    expect(new Set(pack.shots.map(s => s.sceneId)).size).toBe(3);
  });
  it("loads old documents with a zero recording offset", () => {
    const d = fixture(); const raw = JSON.parse(JSON.stringify(d)); delete raw.scenes[0].audioStart;
    expect(projectSchema.parse(raw).scenes[0].audioStart).toBe(0);
  });
});
