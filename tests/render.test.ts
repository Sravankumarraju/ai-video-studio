import "dotenv/config";
import { describe, it, expect, beforeAll, vi } from "vitest";
import * as mediaCommands from "../lib/media";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@prisma/client";
import { sampleMedia } from "../scripts/sample";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { storage, storageKey, localPath } from "../lib/storage";
import { command, probe } from "../lib/media";
import { render, assFile } from "../worker/render";
const assets: Asset[] = [];
beforeAll(async () => {
  const media = await sampleMedia(path.resolve("test-output/fixtures/render"));
  for (const [file, kind, mime, id] of [
    [media.image, "image", "image/png", "image-1"],
    [media.audio, "audio", "audio/wav", "audio-1"],
  ]) {
    const bytes = await readFile(file),
      key = storageKey("test", file.split(".").at(-1)!);
    await storage.put(key, bytes, mime);
    assets.push({
      id,
      projectId: "test",
      name: id,
      kind,
      mime,
      storageKey: key,
      bytes: bytes.length,
      duration: kind === "audio" ? 2 : null,
      metadata: {},
      createdAt: new Date(),
    });
  }
});
describe("real FFmpeg rendering without AI credentials", () => {
  it("keeps one narration continuous across image cuts and normalizes the final mix only", async () => {
    const s = { ...newScene(), duration: 2, assetId: "image-1", audioId: "audio-1", narration: "Continuous source" };
    const { splitVisualScene } = await import("../lib/production-workflow");
    // Use two one-second source slices to exercise the seek/mix path cheaply.
    const scenes = splitVisualScene({ ...s, duration: 4 }, 2).map((shot, i) => ({ ...shot, duration: 1, audioStart: i }));
    const v = variantSchema.parse({ id: "audio-cuts", name: "Audio cuts", aspect: "landscape", sceneIds: scenes.map(s => s.id) });
    const doc = projectSchema.parse({ title: "Continuous narration", scenes, variants: [v] });
    const spy = vi.spyOn(mediaCommands, "command");
    try {
      const result = await render(doc, v, assets, true, async () => {}, async () => false);
      const calls = spy.mock.calls.map(c => c[1]);
      const normalizations = calls.filter(args => args.includes("-af"));
      expect(normalizations).toHaveLength(2);
      for (const args of normalizations) expect(args[args.indexOf("-af") + 1]).not.toContain("loudnorm");
      expect(normalizations[1]).toContain("-ss");
      const final = calls.find(args => args.includes("+faststart"))!;
      expect(final[final.indexOf("-filter_complex") + 1].match(/loudnorm/g)).toHaveLength(1);
      const info = await probe(localPath(result.mp4Key));
      expect(info.duration).toBeCloseTo(2, 1); expect(info.audioCodec).toBe("aac");
      const pcm = path.resolve("test-output/audio-cut.f32");
      await command(process.env.FFMPEG_PATH || "ffmpeg", ["-y", "-v", "error", "-i", localPath(result.mp4Key), "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", pcm]);
      const bytes = await readFile(pcm);
      const rms = (start: number, end: number) => { let total = 0, count = 0; for (let i = Math.floor(start * 48000); i < Math.floor(end * 48000); i++) { total += bytes.readFloatLE(i * 4) ** 2; count++; } return Math.sqrt(total / count); };
      expect(rms(0.95, 1.05) / rms(0.7, 0.8)).toBeGreaterThan(0.85);
      expect(rms(1.2, 1.3) / rms(0.7, 0.8)).toBeGreaterThan(0.9);
    } finally { spy.mockRestore(); }
  });
  it("resumes persisted normalized scenes after interruption without encoding them again", async () => {
    const scenes = [0, 1].map(i => ({ ...newScene(), duration: 1, audioStart: i, audioSlice: true, assetId: "image-1", audioId: "audio-1" }));
    const v = variantSchema.parse({ id: "resume", name: "Resume", aspect: "landscape", sceneIds: scenes.map(s => s.id) });
    const doc = projectSchema.parse({ title: "Interrupted render", scenes, variants: [v] }), checkpoint = crypto.randomUUID();
    await expect(render(doc, v, assets, true, async stage => { if (stage === "Normalizing scene 2 of 2") throw Error("Simulated restart"); }, async () => false, checkpoint)).rejects.toThrow("Simulated restart");
    const stages: string[] = [], spy = vi.spyOn(mediaCommands, "command");
    try {
      await render(doc, v, assets, true, async s => { stages.push(s); }, async () => false, checkpoint);
      expect(stages).toContain("Resumed saved scene 1 of 2");
      expect(spy.mock.calls.filter(c => c[1].includes("-af"))).toHaveLength(1);
    } finally { spy.mockRestore(); }
  });
  it("bounds output encoder threads in every encoding stage, not only input decoding", async () => {
    const scene = { ...newScene(), duration: 2, assetId: "image-1", audioId: "audio-1" };
    const variant = variantSchema.parse({ id: "bounded-threads", name: "Bounded threads", aspect: "vertical", sceneIds: [scene.id] });
    const doc = projectSchema.parse({ title: "Bounded threads", scenes: [scene], variants: [variant] });
    const spy = vi.spyOn(mediaCommands, "command");
    try {
      await render(doc, variant, assets, true, async () => {}, async () => false);
      const encodes = spy.mock.calls.map(c => c[1]).filter(args => args.includes("libx264"));
      // Cut-only joining copies normalized video; only normalization and final overlays encode.
      expect(encodes).toHaveLength(2);
      for (const args of encodes) {
        const threads = args.indexOf("-threads:v");
        expect(threads).toBeGreaterThan(args.lastIndexOf("-i"));
        expect(args[threads + 1]).toBe("2");
        expect(threads).toBeLessThan(args.length - 1);
      }
    } finally { spy.mockRestore(); }
  });
  it("uses accurate word timing and distinct highlight colors in burned captions", () => {
    const s = {
      ...newScene(),
      duration: 2,
      captions: [
        {
          id: "caption",
          start: 0,
          end: 2,
          text: "One step",
          accuracy: "aligned" as const,
          words: [
            { text: "One", start: 0, end: 0.8 },
            { text: "step", start: 1, end: 2 },
          ],
        },
      ],
    };
    const v = variantSchema.parse({
      id: "words",
      name: "Words",
      aspect: "landscape",
      sceneIds: [s.id],
      wordHighlight: true,
    });
    const d = projectSchema.parse({
      title: "Words",
      scenes: [s],
      variants: [v],
    });
    const ass = assFile(d, v, 1920, 1080);
    // Only the word being spoken is highlighted: "One" until "step" begins at 1 s.
    expect(ass).toContain("0:00:00.00,0:00:01.00,Default,,0,0,0,,{\\c&H004AD5FF}One{\\c&H00FFFFFF} step");
    expect(ass).toContain("0:00:01.00,0:00:02.00,Default,,0,0,0,,One {\\c&H004AD5FF}step{\\c&H00FFFFFF}");
    expect(assFile(d, { ...v, captions: false }, 1920, 1080)).not.toContain(
      "Dialogue:",
    );
  });
  for (const language of ["en", "te", "hi"] as const)
    it(`renders shaped ${language} captions independently of browser`, async () => {
      const text = {
        en: "Every step is a beginning.",
        te: "ప్రతి అడుగు ఒక ఆరంభం.",
        hi: "हर कदम एक शुरुआत है।",
      }[language];
      const s = {
        ...newScene(),
        assetId: "image-1",
        audioId: "audio-1",
        duration: 2,
        captions: [
          {
            id: "caption",
            start: 0,
            end: 2,
            text,
            accuracy: "manual" as const,
          },
        ],
      };
      const v = variantSchema.parse({
        id: `variant-${language}`,
        name: "Unicode test",
        aspect: "landscape",
        sceneIds: [s.id],
      });
      const d = projectSchema.parse({
        title: "Unicode test",
        language,
        subtitleLanguage: language,
        scenes: [s],
        variants: [v],
      });
      const r = await render(
        d,
        v,
        assets,
        true,
        async () => {},
        async () => false,
      );
      expect(r.width).toBe(640);
      expect(r.duration).toBeCloseTo(2, 1);
      expect((await storage.get(r.srtKey)).toString()).toContain(text);
      await command(process.env.FFMPEG_PATH || "ffmpeg", [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        "1",
        "-i",
        localPath(r.mp4Key),
        "-frames:v",
        "1",
        path.resolve(`test-output/caption-${language}.png`),
      ]);
    });
  for (const aspect of ["landscape", "vertical"] as const)
    it(`exports full ${aspect} H.264/AAC with exact overlap timing`, async () => {
      const scenes = [
        {
          ...newScene(),
          duration: 2,
          assetId: "image-1",
          audioId: "audio-1",
          motion: "zoom-out" as const,
        },
        {
          ...newScene(2),
          duration: 2,
          assetId: "image-1",
          audioId: "audio-1",
          motion: "pan-left" as const,
          transition: "crossfade" as const,
          overlap: 0.4,
        },
      ];
      const v = variantSchema.parse({
        id: `variant-${aspect}`,
        name: "Manual",
        aspect,
        sceneIds: scenes.map((s) => s.id),
        captions: false,
      });
      const d = projectSchema.parse({
        title: "Manual",
        scenes,
        variants: [v],
        musicId: "audio-1",
        effects: [{ assetId: "audio-1", start: 0.5, volume: 0.2 }],
        ducking: true,
      });
      const r = await render(
        d,
        v,
        assets,
        false,
        async () => {},
        async () => false,
      );
      expect(r.width).toBe(aspect === "vertical" ? 1080 : 1920);
      expect(r.height).toBe(aspect === "vertical" ? 1920 : 1080);
      expect(r.duration).toBeCloseTo(3.6, 1);
      const info = await probe(localPath(r.mp4Key));
      expect(info.videoCodec).toBe("h264");
      expect(info.audioCodec).toBe("aac");
    });
  it("cooperatively cancels before generating output", async () => {
    const s = { ...newScene(), assetId: "image-1" };
    const v = variantSchema.parse({
      id: "v",
      name: "Cancel",
      aspect: "landscape",
      sceneIds: [s.id],
    });
    const d = projectSchema.parse({
      title: "Cancel",
      scenes: [s],
      variants: [v],
    });
    await expect(
      render(
        d,
        v,
        assets,
        true,
        async () => {},
        async () => true,
      ),
    ).rejects.toThrow("Cancelled");
  });
});
