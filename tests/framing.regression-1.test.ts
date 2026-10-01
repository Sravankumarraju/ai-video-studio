import "dotenv/config";
import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sampleMedia } from "../scripts/sample";
import { newScene } from "../lib/schema";
import { motionFilter } from "../worker/render";
import { command, probe } from "../lib/media";
// Regression: ISSUE-003 — still images were center-cropped before applying the variant focal point.
// Found by /qa on 2026-10-01. Report: docs/COMPLETION-AUDIT.md
it("changes the actual vertical crop at opposite focal points without changing output dimensions", async () => {
  const media = await sampleMedia("test-output/framing-fixtures");
  const hashes = [];
  for (const focalX of [0, 1]) {
    const output = `test-output/framing-fixtures/focal-${focalX}.png`;
    await command(process.env.FFMPEG_PATH || "ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      media.image,
      "-vf",
      motionFilter(
        {
          ...newScene(),
          motion: "static",
          strength: 0,
          focalX,
          focalY: 0.5,
          duration: 1,
        },
        360,
        640,
        30,
      ),
      "-frames:v",
      "1",
      output,
    ]);
    const info = await probe(output);
    expect(info.width).toBe(360);
    expect(info.height).toBe(640);
    hashes.push(
      createHash("sha256")
        .update(await readFile(output))
        .digest("hex"),
    );
  }
  expect(hashes[0]).not.toBe(hashes[1]);
});
it("reuses a still across motion frames without changing any frame or resetting motion at one second", async () => {
  const media = await sampleMedia("test-output/motion-fixtures");
  for (const motion of ["zoom-in", "pan-left"] as const) {
    const scene = { ...newScene(), motion, strength: 0.15, duration: 1.5 };
    const cached = motionFilter(scene, 320, 180, 30);
    const filters = [cached, cached.replace(/:d=\d+:/, ":d=1:")];
    const hashes = [];
    for (const filter of filters) {
      const result = await command(process.env.FFMPEG_PATH || "ffmpeg", [
        "-v", "error", "-threads", "1", "-filter_threads", "1", "-loop", "1", "-framerate", "30", "-i", media.image,
        "-vf", filter, "-t", "1.5", "-f", "framemd5", "-",
      ]);
      hashes.push(result.split("\n").filter(line => line && !line.startsWith("#")));
    }
    expect(hashes[0]).toHaveLength(45);
    expect(hashes[0]).toEqual(hashes[1]);
    expect(hashes[0][0].split(",").at(-1)).not.toBe(hashes[0][44].split(",").at(-1));
  }
});
