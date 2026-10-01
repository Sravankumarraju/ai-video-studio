import { describe, expect, it } from "vitest";
import { createVideoVersion } from "../lib/project-edit";
import { newScene, projectSchema, variantSchema } from "../lib/schema";
import { validateStructure } from "../lib/projects";
describe("independent visual video versions", () => {
  it("preserves old prompts, audio, captions and resolved variant overrides when cloning", () => {
    const scene = { ...newScene(), assetId: "old-image", audioId: "recorded-voice", imagePrompt: "Original art", captions: [{ id: "c", start: 0, end: 1, text: "caption", accuracy: "aligned" as const }] };
    const variant = variantSchema.parse({ id: "v", name: "Original", aspect: "vertical", sceneIds: [scene.id], sceneOverrides: { [scene.id]: { ...scene, assetId: "reviewed-image" } }, framing: { [scene.id]: { x: 0.2, y: 0.6 } } });
    const doc = projectSchema.parse({ title: "Version test", scenes: [scene], variants: [variant] });
    const next = createVideoVersion(doc, variant.id, "New visual version");
    validateStructure(next.document);
    const copy = next.document.scenes.at(-1)!;
    expect(copy.audioId).toBe(scene.audioId);
    expect(copy.assetId).toBe("reviewed-image");
    expect(copy.captions).toEqual(scene.captions);
    expect(next.variant.framing[copy.id]).toEqual({ x: 0.2, y: 0.6 });
    copy.imagePrompt = "New cosmic art";
    copy.captions[0].text = "edited caption";
    expect(doc.scenes[0].imagePrompt).toBe("Original art");
    expect(doc.scenes[0].captions[0].text).toBe("caption");
    expect(doc.variants).toHaveLength(1);
    expect(next.variant.sceneOverrides).toEqual({});
  });
});
