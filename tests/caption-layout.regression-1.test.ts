import { describe, it, expect } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { layoutCaptions, textWidthEm } from "../lib/caption-layout";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { assFile, captionGeometry } from "../worker/render";
import { command } from "../lib/media";

const ff = process.env.FFMPEG_PATH || "ffmpeg";
const fonts = path.resolve(process.env.FONT_DIR || "public/fonts").replace(/\\/g, "/").replace(/:/g, "\\:");
const longTelugu = "కర్మణ్యేవాధికారస్తే మా ఫలేషు కదాచన మా కర్మఫలహేతుర్భూః మా తే సంగోఽస్త్వకర్మణి నీకు కర్మ చేయడంలోనే అధికారం ఉంది ఫలితాలపై ఎప్పుడూ లేదు";
const timedWords = (text: string, start = 0, step = 0.5) => text.split(" ").map((t, i) => ({ text: t, start: start + i * step, end: start + i * step + step * 0.9 }));

function doc(aspect: "landscape" | "vertical", text: string, extra: Record<string, unknown> = {}) {
  const words = timedWords(text);
  const scene = { ...newScene(), duration: words.at(-1)!.end + 0.5, captions: [{ id: "cue", start: 0, end: words.at(-1)!.end + 0.5, text, accuracy: "aligned" as const, words }] };
  const v = variantSchema.parse({ id: aspect, name: aspect, aspect, sceneIds: [scene.id], fontSize: aspect === "vertical" ? 42 : 48, background: true, ...extra });
  return { d: projectSchema.parse({ title: "Captions", language: "te", subtitleLanguage: "te", scenes: [scene], variants: [v] }), v };
}

describe("caption layout for 16:9 and 9:16", () => {
  it("never splits a word, keeps at most two lines per page and covers the cue without gaps", () => {
    const words = timedWords(longTelugu);
    const pages = layoutCaptions([{ start: 0, end: 30, text: longTelugu, words }], { maxWidthPx: 800, fontPx: 75 });
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap(p => p.lines.flat().map(w => w.text))).toEqual(longTelugu.split(" "));
    for (const p of pages) {
      expect(p.lines.length).toBeLessThanOrEqual(2);
      for (const line of p.lines) expect(textWidthEm(line.map(w => w.text).join(" ")) * p.scale).toBeLessThanOrEqual(800 / 75 + 1e-9);
    }
    for (let i = 1; i < pages.length; i++) expect(pages[i].start).toBeCloseTo(pages[i - 1].end, 6);
    expect(pages[0].start).toBe(0);
    expect(pages.at(-1)!.end).toBe(30);
  });
  it("scales a single word wider than the frame instead of cutting it", () => {
    const giant = "కర్మణ్యేవాధికారస్తేమాఫలేషుకదాచనమాకర్మఫలహేతుర్భూః";
    const [page] = layoutCaptions([{ start: 0, end: 2, text: giant }], { maxWidthPx: 700, fontPx: 75 });
    expect(page.scale).toBeLessThan(1);
    expect(textWidthEm(giant) * page.scale).toBeLessThanOrEqual(700 / 75 + 1e-9);
  });
  it("splits untimed captions by length across the cue duration", () => {
    const pages = layoutCaptions([{ start: 10, end: 20, text: longTelugu }], { maxWidthPx: 600, fontPx: 60 });
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].start).toBe(10);
    expect(pages.at(-1)!.end).toBeCloseTo(20, 6);
    expect(pages.every(p => !p.timed)).toBe(true);
  });
  it("highlights only the word being spoken, in the highlight colour", () => {
    const { d, v } = doc("vertical", "ఒక అడుగు", { wordHighlight: true, highlightColor: "#ffd54a" });
    const events = assFile(d, v, 1080, 1920).split("\n").filter(l => l.startsWith("Dialogue:"));
    expect(events).toHaveLength(2);
    expect(events[0]).toContain("{\\c&H004AD5FF}ఒక{\\c&H00FFFFFF} అడుగు");
    expect(events[1]).toContain("ఒక {\\c&H004AD5FF}అడుగు{\\c&H00FFFFFF}");
    expect(events[0]).not.toContain("\\kf");
  });
  it("uses one plain event per page when word highlighting is off, and none when captions are off", () => {
    const { d, v } = doc("landscape", "ఒక అడుగు");
    expect(assFile(d, v, 1920, 1080).split("\n").filter(l => l.startsWith("Dialogue:"))).toHaveLength(1);
    expect(assFile(d, { ...v, captions: false }, 1920, 1080)).not.toContain("Dialogue:");
  });
  it("keeps vertical captions clear of the Shorts interface", () => {
    const { v } = doc("vertical", "ఒక");
    const g = captionGeometry(v, 1080, 1920);
    expect(g.marginV).toBeGreaterThanOrEqual(0.2 * 1920);
    expect(g.marginX).toBeGreaterThanOrEqual(0.1 * 1080);
  });
  for (const [aspect, w, h] of [["vertical", 1080, 1920], ["landscape", 1920, 1080]] as const)
    it(`renders long Telugu captions inside a ${aspect} frame, horizontally centred`, async () => {
      const dir = path.resolve("test-output/caption-layout");
      await mkdir(dir, { recursive: true });
      const { d, v } = doc(aspect, longTelugu);
      const ass = path.join(dir, `${aspect}.ass`);
      await writeFile(ass, assFile(d, v, w, h));
      const out = path.join(dir, `${aspect}.gray`);
      const escaped = ass.replace(/\\/g, "/").replace(/:/g, "\\:");
      // Every page of the cue, sampled mid-page.
      const times = [...new Set(assFile(d, v, w, h).split("\n").filter(l => l.startsWith("Dialogue:")).map(l => l.split(",")[1]))];
      expect(times.length).toBeGreaterThan(aspect === "vertical" ? 1 : 0);
      for (const t of times) {
        const [hh, mm, ss] = t.split(":");
        const at = Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + 0.1;
        await command(ff, ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=black:s=${w}x${h}:d=60`, "-ss", String(at), "-frames:v", "1",
          "-vf", `ass=filename='${escaped}':fontsdir='${fonts}':shaping=complex,format=gray`, "-f", "rawvideo", out]);
        const px = await readFile(out);
        let minX: number = w, maxX = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x] > 160) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
        expect(maxX).toBeGreaterThan(minX);
        // Text stays inside the frame with room to spare on both sides…
        expect(minX).toBeGreaterThan(w * 0.04);
        expect(maxX).toBeLessThan(w * 0.96);
        // …and is centred.
        expect(Math.abs(minX - (w - 1 - maxX))).toBeLessThan(w * 0.06);
      }
    });
});
