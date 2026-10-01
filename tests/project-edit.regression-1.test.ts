import { describe, it, expect } from "vitest";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { reconcileVariantScenes } from "../lib/project-edit";
import { validateStructure } from "../lib/projects";
// Regression: ISSUE-002 — deleting a scene after editing its variant left invalid references.
// Found by /qa on 2026-10-01. Report: docs/COMPLETION-AUDIT.md
describe("scene deletion across independent variants", () => {
  it("removes only deleted scene references and preserves shared media on surviving scenes", () => {
    const a = { ...newScene(), assetId: "shared-image" },
      b = { ...newScene(2), assetId: "shared-image" };
    const v = variantSchema.parse({
      id: "v",
      name: "Short",
      aspect: "vertical",
      sceneIds: [a.id, b.id],
      sceneOverrides: { [a.id]: a, [b.id]: b },
      framing: { [a.id]: { x: 0.2, y: 0.5 }, [b.id]: { x: 0.8, y: 0.5 } },
    });
    const d = projectSchema.parse({
      title: "Test",
      scenes: [b],
      variants: [v],
    });
    const next = reconcileVariantScenes(d);
    validateStructure(next);
    expect(next.variants[0].sceneIds).toEqual([b.id]);
    expect(next.variants[0].sceneOverrides[a.id]).toBeUndefined();
    expect(next.variants[0].framing[a.id]).toBeUndefined();
    expect(next.variants[0].sceneOverrides[b.id].assetId).toBe("shared-image");
    expect(d.variants[0].sceneIds).toHaveLength(2);
  });
});
