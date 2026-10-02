import "dotenv/config";
import { describe, it, expect, beforeAll, vi } from "vitest";
import * as mediaCommands from "../lib/media";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Asset } from "@prisma/client";
import { sampleMedia } from "../scripts/sample";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { storage, storageKey, localPath } from "../lib/storage";
import { command } from "../lib/media";
import { render } from "../worker/render";

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

describe("composition memory", () => {
  it("joins many cut-only shots through one sequential input and keeps audio in sync", async () => {
    const scenes = Array.from({ length: 12 }, (_, i) => ({ ...newScene(i + 1), duration: 1, assetId: "image-1", audioId: "audio-1", audioStart: i % 2, audioSlice: true }));
    const v = variantSchema.parse({ id: "many-cuts", name: "Many cuts", aspect: "landscape", sceneIds: scenes.map(s => s.id) });
    const doc = projectSchema.parse({ title: "Many cuts", scenes, variants: [v] });
    const spy = vi.spyOn(mediaCommands, "command");
    try {
      const result = await render(doc, v, assets, true, async () => {}, async () => false);
      const compose = spy.mock.calls.map(c => c[1]).find(args => args.some(a => a.endsWith("joined.mp4")))!;
      // One demuxed input instead of twelve simultaneously decoded inputs.
      expect(compose.filter(a => a === "-i")).toHaveLength(1);
      expect(compose[compose.indexOf("-i") - 1]).toBe("0");
      expect(compose).toContain("concat");
      const streams = JSON.parse(await command(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", localPath(result.mp4Key)])).streams as { codec_type: string; duration: string }[];
      for (const s of streams) expect(Number(s.duration)).toBeCloseTo(12, 1);
    } finally { spy.mockRestore(); }
  });
  it("still uses the crossfade filter graph when shots overlap", async () => {
    const scenes = [0, 1].map(i => ({ ...newScene(i + 1), duration: 1.5, assetId: "image-1", audioId: "audio-1", transition: "crossfade" as const, overlap: 0.4 }));
    const v = variantSchema.parse({ id: "fade", name: "Fade", aspect: "landscape", sceneIds: scenes.map(s => s.id) });
    const doc = projectSchema.parse({ title: "Fade", scenes, variants: [v] });
    const spy = vi.spyOn(mediaCommands, "command");
    try {
      await render(doc, v, assets, true, async () => {}, async () => false);
      const compose = spy.mock.calls.map(c => c[1]).find(args => args.some(a => a.endsWith("joined.mp4")))!;
      expect(compose[compose.indexOf("-filter_complex") + 1]).toContain("xfade");
      expect(compose).not.toContain("concat");
    } finally { spy.mockRestore(); }
  });
});
