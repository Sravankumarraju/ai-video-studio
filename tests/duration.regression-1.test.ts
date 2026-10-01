import { describe, it, expect } from "vitest";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import {
  durationPlan,
  targetDuration,
  durationSummary,
  applyVariantNarration,
} from "../lib/duration";
import { expandPrompt } from "../lib/prompts";
// Regression: duration controls and variant rewrite must preserve original narration.
// Found by /qa on 2026-10-01.
// Report: docs/COMPLETION-AUDIT.md
function fixture() {
  const scenes = [
    {
      ...newScene(),
      duration: 5,
      narration: "Original hook",
      audioId: "voice-1",
      assetId: "image-1",
      captions: [
        {
          id: "c",
          start: 0,
          end: 5,
          text: "Original hook",
          accuracy: "manual" as const,
        },
      ],
    },
    {
      ...newScene(2),
      duration: 4,
      narration: "Ending",
      transition: "crossfade" as const,
      overlap: 0.5,
    },
  ];
  return projectSchema.parse({
    title: "Duration fixture",
    targetDuration: 300,
    shortTargetDuration: 30,
    scenes,
    variants: [
      variantSchema.parse({
        id: "long",
        name: "Long",
        aspect: "landscape",
        sceneIds: scenes.map((s) => s.id),
      }),
      variantSchema.parse({
        id: "short",
        name: "Short",
        aspect: "vertical",
        sceneIds: scenes.map((s) => s.id),
      }),
    ],
  });
}
describe("video length and safe variant adaptation", () => {
  it("loads existing projects with long duration preserved and a separate short fallback", () => {
    const d = fixture();
    expect(targetDuration(d, d.variants[0])).toBe(300);
    expect(targetDuration(d, d.variants[1])).toBe(30);
    expect(
      projectSchema.parse({ title: "Legacy", targetDuration: 600 })
        .targetDuration,
    ).toBe(600);
  });
  it("keeps per-variant targets independent of platform duration warnings", () => {
    const d = fixture();
    const v = { ...d.variants[1], targetDuration: 90, maxDuration: 180 };
    expect(targetDuration(d, v)).toBe(90);
    expect(d.targetDuration).toBe(300);
  });
  it("compares measured audio and actual overlap timing without stretching narration", () => {
    const d = fixture();
    const s = durationSummary(d, d.variants[0], [
      { id: "voice-1", duration: 5.2 },
    ]);
    expect(s.actual).toBe(8.5);
    expect(s.measuredNarration).toBe(5.2);
    expect(s.narrationComplete).toBe(false);
    expect(d.scenes[0].duration).toBe(5);
  });
  it("rewrites only selected variant overrides, preserving media and marking narration stale", () => {
    const d = fixture();
    const rewritten = applyVariantNarration(
      d,
      "short",
      JSON.stringify([{ sceneId: d.scenes[0].id, narration: "Fresh hook" }]),
    );
    const s = rewritten.variants[1].sceneOverrides[d.scenes[0].id];
    expect(s.narration).toBe("Fresh hook");
    expect(s.audioId).toBe("voice-1");
    expect(s.assetId).toBe("image-1");
    expect(s.narrationStale).toBe(true);
    expect(s.captionsStale).toBe(true);
    expect(rewritten.scenes[0].narration).toBe("Original hook");
    expect(rewritten.variants[0].sceneOverrides).toEqual({});
  });
  it("rejects unknown, duplicate and locked scene rewrites", () => {
    const d = fixture();
    expect(() =>
      applyVariantNarration(
        d,
        "short",
        '[{"sceneId":"missing","narration":"Text"}]',
      ),
    ).toThrow("invalid");
    const x = { sceneId: d.scenes[0].id, narration: "New" };
    expect(() =>
      applyVariantNarration(d, "short", JSON.stringify([x, x])),
    ).toThrow("invalid");
    d.scenes[0].locked = true;
    expect(() =>
      applyVariantNarration(d, "short", JSON.stringify([x])),
    ).toThrow("Unlock");
  });
  it("validates target bounds and includes duration planning in generation prompts", () => {
    expect(
      projectSchema.safeParse({ title: "Test", shortTargetDuration: 0 })
        .success,
    ).toBe(false);
    expect(
      variantSchema.safeParse({
        ...fixture().variants[0],
        targetDuration: 7201,
      }).success,
    ).toBe(false);
    expect(durationPlan(30)).toEqual({
      minimumWords: 60,
      maximumWords: 78,
      suggestedScenes: 4,
    });
    expect(expandPrompt("script", fixture())).toContain(
      "approximately 600-780 words",
    );
    expect(expandPrompt("script", fixture())).toContain(
      "Never speed up narration",
    );
  });
});
