import "dotenv/config";
import { describe, it, expect, beforeAll, vi } from "vitest";
import * as mediaCommands from "../lib/media";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@prisma/client";
import { sampleMedia } from "../scripts/sample";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { storage, storageKey } from "../lib/storage";
import { command } from "../lib/media";
import { render, assFile } from "../worker/render";
import { expandPrompt } from "../lib/prompts";

const ff = process.env.FFMPEG_PATH || "ffmpeg";
const fonts = path.resolve(process.env.FONT_DIR || "public/fonts").replace(/\\/g, "/").replace(/:/g, "\\:");
const telugu = "ధర్మక్షేత్రమైన కురుక్షేత్రంలో యుద్ధం";
const assets: Asset[] = [];

beforeAll(async () => {
  const media = await sampleMedia(path.resolve("test-output/fixtures"));
  for (const [file, kind, mime, id] of [[media.image, "image", "image/png", "image-1"], [media.audio, "audio", "audio/wav", "audio-1"]]) {
    const bytes = await readFile(file), key = storageKey("test", file.split(".").at(-1)!);
    await storage.put(key, bytes, mime);
    assets.push({ id, projectId: "test", name: id, kind, mime, storageKey: key, bytes: bytes.length,
      duration: kind === "audio" ? 2 : null, metadata: {}, createdAt: new Date() });
  }
});

function teluguDoc(background = false) {
  const scene = { ...newScene(), duration: 1, assetId: "image-1", audioId: "audio-1",
    captions: [{ id: "cue", start: 0, end: 1, text: telugu, accuracy: "manual" as const }] };
  const v = variantSchema.parse({ id: "te", name: "Telugu", aspect: "vertical", sceneIds: [scene.id], background });
  const doc = projectSchema.parse({ title: "Shaping", language: "te", subtitleLanguage: "te", scenes: [scene], variants: [v] });
  return { doc, v };
}

describe("Indic caption shaping", () => {
  it("burns captions with complex (HarfBuzz) shaping so Telugu conjuncts form", async () => {
    const { doc, v } = teluguDoc();
    const spy = vi.spyOn(mediaCommands, "command");
    try {
      await render(doc, v, assets, true, async () => {}, async () => false);
      const final = spy.mock.calls.map(c => c[1]).find(args => args.includes("+faststart"))!;
      const graph = final[final.indexOf("-filter_complex") + 1];
      expect(graph).toMatch(/\bass=filename=.*:shaping=complex\[captioned\]/);
      expect(graph).not.toContain("subtitles=");
    } finally { spy.mockRestore(); }
  });

  it("produces different glyphs than the simple shaper for a conjunct-heavy line", async () => {
    const dir = path.resolve("test-output/shaping");
    await mkdir(dir, { recursive: true });
    const { doc, v } = teluguDoc();
    const ass = path.join(dir, "telugu.ass");
    await writeFile(ass, assFile(doc, v, 1080, 1920));
    const escaped = ass.replace(/\\/g, "/").replace(/:/g, "\\:");
    const frame = async (shaping: string) => {
      const out = path.join(dir, `${shaping}.gray`);
      await command(ff, ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=1080x1920", "-frames:v", "1",
        "-vf", `ass=filename='${escaped}':fontsdir='${fonts}':shaping=${shaping},format=gray`, "-f", "rawvideo", out]);
      return await readFile(out);
    };
    const [complex, simple] = await Promise.all([frame("complex"), frame("simple")]);
    let changed = 0;
    for (let i = 0; i < complex.length; i++) if (Math.abs(complex[i] - simple[i]) > 64) changed++;
    // Simple shaping draws each virama separately; complex shaping stacks the consonants.
    expect(changed).toBeGreaterThan(500);
  });

  it("uses a translucent caption box when the background option is enabled", () => {
    const style = (bg: boolean) => { const { doc, v } = teluguDoc(bg); return assFile(doc, v, 1080, 1920).split("\n").find(l => l.startsWith("Style:"))!.split(","); };
    // Fields: Name, Fontname, Fontsize, Primary, Secondary, Outline, Back, ..., BorderStyle at index 15.
    expect(style(true)[15]).toBe("3");
    expect(style(true)[5]).toBe("&H60000000");
    expect(style(false)[5]).toBe("&H00101010");
  });
});

describe("prompt context follows the selected output version", () => {
  function fixture() {
    const a = newScene(), b = newScene(2);
    const vertical = variantSchema.parse({ id: "vertical", name: "Original", aspect: "vertical", sceneIds: [a.id] });
    const landscape = variantSchema.parse({ id: "landscape", name: "16:9", aspect: "landscape", sceneIds: [b.id] });
    return projectSchema.parse({ title: "Aspect", scenes: [{ ...a, characterIds: ["sanjaya"] }, b], variants: [vertical, landscape],
      characters: [{ id: "sanjaya", name: "Sanjaya", description: "Charioteer and narrator" },
                   { id: "dhritarashtra", name: "Dhritarashtra", description: "Blind king" }] });
  }
  it("states the requested version's aspect instead of the first version's", () => {
    const d = fixture();
    expect(expandPrompt("image", d, d.scenes[1], undefined, "landscape")).toContain("aspect: landscape 16:9");
    expect(expandPrompt("image", d, d.scenes[1])).toContain("aspect: vertical 9:16");
  });
  it("includes only the characters assigned to the scene", () => {
    const d = fixture();
    const assigned = expandPrompt("image", d, d.scenes[0]);
    expect(assigned).toContain("Sanjaya");
    expect(assigned).not.toContain("Dhritarashtra");
    expect(expandPrompt("image", d, d.scenes[1])).toContain("Dhritarashtra");
  });
});
