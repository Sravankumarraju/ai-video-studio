import { describe, expect, it } from "vitest";
import { alignmentCaptions, narrationTiming } from "../lib/alignment";
const timing = { characters: ["అ", "."], character_start_times_seconds: [0, 0.9], character_end_times_seconds: [0.9, 1.04] };
describe("provider audio boundary timing", () => {
  it("bounds slight provider timestamp overshoot to measured audio, including words", () => {
    const captions = alignmentCaptions(timing, 1);
    expect(captions[0].end).toBe(1);
    expect(captions[0].words[0].end).toBe(1);
    expect(captions[0].text).toBe("అ.");
  });
  it("rejects a materially mismatched alignment instead of hiding it", () => {
    expect(() => alignmentCaptions(timing, 0.5)).toThrow("Alignment exceeds recorded audio duration");
  });
  it("keeps collapsed provider timing out of exports and marks the saved recording for review", () => {
    const collapsed = { characters: ["అ", ".", "బ", "."], character_start_times_seconds: [0, 0.5, 0.6, 0.6], character_end_times_seconds: [0.5, 0.6, 0.6, 0.6] };
    expect(() => alignmentCaptions(collapsed, 1)).toThrow("collapsed speech timing");
    const recovered = narrationTiming(collapsed, 1);
    expect(recovered.captions).toEqual([]);
    expect(recovered.narrationStale).toBe(true);
    expect(recovered.captionsStale).toBe(true);
    expect(recovered.status).toContain("Recording saved");
    expect(narrationTiming(timing, 1).captions[0].end).toBe(1);
  });
});
