import { cleanupTemp } from "../lib/temp";
import {
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Asset } from "@prisma/client";
import { projectSchema, type ProjectDoc, type Variant } from "../lib/schema";
import { timeline, duration, captions, subtitleFile } from "../lib/timeline";
import { layoutCaptions } from "../lib/caption-layout";
import { command, probe } from "../lib/media";
import { materialize, storage, storageKey } from "../lib/storage";
export function motionFilter(
  s: ProjectDoc["scenes"][number],
  w: number,
  h: number,
  fps: number,
) {
  const frames = Math.max(2, Math.round(s.duration * fps)),
    u = `min(on/${frames - 1},1)`,
    p = s.motionEasing === "smooth" ? `(${u}*${u}*(3-2*${u}))` : u,
    str = s.strength;
  let z = "1";
  let x = `(iw-iw/zoom)*${s.focalX}`,
    y = `(ih-ih/zoom)*${s.focalY}`;
  if (s.motion === "zoom-in") z = `1+${str}*${p}`;
  if (s.motion === "zoom-out") z = `1+${str}*(1-${p})`;
  if (s.motion.startsWith("pan")) {
    z = String(1 + str);
    if (s.motion === "pan-left") x = `(iw-iw/zoom)*(1-${p})`;
    if (s.motion === "pan-right") x = `(iw-iw/zoom)*${p}`;
    if (s.motion === "pan-up") y = `(ih-ih/zoom)*(1-${p})`;
    if (s.motion === "pan-down") y = `(ih-ih/zoom)*${p}`;
  }
  // A still needs decoding/scaling once. zoompan emits the complete motion sequence.
  // Supersampling reduces integer-coordinate stepping during very small camera movements.
  const factor = s.motionEasing === "smooth" && s.motion !== "static" ? 4 : 2;
  return `scale=${w * factor}:${h * factor}:force_original_aspect_ratio=increase,crop=${w * factor}:${h * factor}:x='(iw-ow)*${s.focalX}':y='(ih-oh)*${s.focalY}',zoompan=z='${z}':x='${x}':y='${y}':d=${frames}:s=${w}x${h}:fps=${fps},setsar=1,format=yuv420p`;
}
const assTime = (s: number) => {
  const n = Math.round(s * 100);
  return `${Math.floor(n / 360000)}:${String(Math.floor(n / 6000) % 60).padStart(2, "0")}:${String(Math.floor(n / 100) % 60).padStart(2, "0")}.${String(n % 100).padStart(2, "0")}`;
};
const assText = (s: string) =>
  s.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\r?\n/g, "\\N");
const assColor = (hex: string) => "&H00" + hex.slice(1).match(/../g)!.reverse().join("").toUpperCase();
export function captionGeometry(v: Variant, w: number, h: number) {
  const vertical = v.aspect === "vertical";
  // Vertical frames keep clear of the Shorts/Reels buttons on the right and the UI at the bottom.
  const marginX = Math.round(w * (vertical ? 0.1 : 0.08));
  const marginV = Math.round(h * (v.captionBottom ?? (vertical ? 0.2 : 0.07)));
  return { marginX, marginV, fontPx: Math.round((v.fontSize * h) / 1080), maxWidthPx: Math.floor((w - 2 * marginX) * 0.92) };
}
export function assFile(doc: ProjectDoc, v: Variant, w: number, h: number) {
  const font =
    v.font && v.font !== "automatic"
      ? v.font
      : doc.subtitleLanguage === "te"
        ? "Noto Sans Telugu"
        : doc.subtitleLanguage === "hi"
          ? "Noto Sans Devanagari"
          : "Noto Sans";
  const color = assColor(v.color), highlight = assColor(v.highlightColor);
  const align = v.position === "top" ? 8 : v.position === "center" ? 5 : 2;
  const g = captionGeometry(v, w, h);
  // BorderStyle 3 paints the caption box with OutlineColour, so translucency belongs there.
  const outline = v.background ? "&H60000000" : "&H00101010";
  const pages = layoutCaptions(captions(doc, v).filter(c => v.captions || c.display === "full-verse"), g);
  const events: string[] = [];
  for (const page of pages) {
    const words = page.lines.flat();
    const scale = page.scale < 1 ? `{\\fscx${Math.floor(page.scale * 100)}\\fscy${Math.floor(page.scale * 100)}}` : "";
    const text = (active = -1) => {
      let k = 0;
      return (page.held ? "{\\an5}" : "") + scale + page.lines.map((line) => line.map((word) => (k++ === active ? `{\\c${highlight}}${assText(word.text)}{\\c${color}}` : assText(word.text))).join(" ")).join("\\N");
    };
    if (!v.wordHighlight || !page.timed) {
      events.push(`Dialogue: 0,${assTime(page.start)},${assTime(page.end)},${page.held ? "Verse" : "Default"},,0,0,0,,${text()}`);
      continue;
    }
    // One event per spoken word: only the word being said is highlighted.
    words.forEach((word, k) => {
      const start = k === 0 ? page.start : Math.max(page.start, word.start!);
      const end = k === words.length - 1 ? page.end : Math.min(page.end, words[k + 1].start!);
      if (end > start) events.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${text(k)}`);
    });
  }
  return (
    `[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${font},${g.fontPx},${color},${color},${outline},&H80000000,0,0,0,0,100,100,0,0,${v.background ? 3 : 1},${v.outline},${v.background ? 0 : 2},${align},${g.marginX},${g.marginX},${g.marginV},1\n` +
    `Style: Verse,${font},${g.fontPx},${color},${color},&H00101010,&H00000000,0,0,0,0,100,100,0,0,1,${v.outline},2,5,${g.marginX},${g.marginX},${g.marginV},1\n` +
    `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
    events.join("\n") +
    (v.titleOverlay
      ? `\nDialogue: 1,0:00:00.00,${assTime(Math.min(3, duration(doc, v)))},Default,,0,0,0,,{\\an8}${assText(v.titleOverlay)}`
      : "")
  );
}
function escapeFilterPath(p: string) {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
export type RenderResult = {
  mp4Key: string;
  srtKey: string;
  vttKey: string;
  duration: number;
  width: number;
  height: number;
  bytes: number;
  variantId: string;
  draft: boolean;
};
export async function render(
  doc: ProjectDoc,
  v: Variant,
  assets: Asset[],
  draft: boolean,
  stage: (s: string) => Promise<void>,
  cancel: () => Promise<boolean>,
  checkpointId?: string,
): Promise<RenderResult> {
  projectSchema.parse(doc);
  const dir = await mkdtemp(path.join(tmpdir(), "story-render-"));
  const w = draft
      ? v.aspect === "vertical"
        ? 360
        : 640
      : v.aspect === "vertical"
        ? 1080
        : 1920,
    h = draft
      ? v.aspect === "vertical"
        ? 640
        : 360
      : v.aspect === "vertical"
        ? 1920
        : 1080;
  const ff = process.env.FFMPEG_PATH || "ffmpeg";
  const file = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) throw Error("Missing media asset");
    return { asset, path: await materialize(asset.storageKey, dir) };
  };
  try {
    const tracks = timeline(doc, v);
    if (!tracks.length) throw Error("Add at least one scene");
    const clips: string[] = [];
    for (let i = 0; i < tracks.length; i++) {
      if (await cancel()) throw Error("Cancelled");
      const { scene } = tracks[i];
      if (scene.narrationStale || scene.captionsStale)
        throw Error(
          `${scene.title}: review stale narration/captions before rendering`,
        );
      await stage(`Normalizing scene ${i + 1} of ${tracks.length}`);
      const clip = path.join(dir, `scene-${i}.mp4`);
      const checkpoint = checkpointId ? `render-checkpoints/${createHash("sha256").update(JSON.stringify({ checkpointId, scene, framing: v.framing[scene.id], w, h, fps: v.fps, crf: v.crf, draft, version: 1 })).digest("hex")}.mp4` : undefined;
      if (checkpoint) {
        try {
          await writeFile(clip, await storage.get(checkpoint));
          const info = await probe(clip);
          if (info.width === w && info.height === h && info.videoCodec === "h264" && info.audioCodec === "aac" && info.duration && Math.abs(info.duration - scene.duration) < 0.15) {
            await stage(`Resumed saved scene ${i + 1} of ${tracks.length}`);
            clips.push(clip); continue;
          }
        } catch { /* An absent/incomplete checkpoint is rendered again; no provider call. */ }
      }
      if (!scene.assetId)
        throw Error(`${scene.title}: upload or generate visual media`);
      const visual = await file(scene.assetId);
      if (!["image", "video"].includes(visual.asset.kind))
        throw Error("Visual track requires image or video");
      const args = [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-threads",
        "1",
        "-filter_threads",
        "1",
      ];
      if (visual.asset.kind === "image")
        args.push("-loop", "1", "-framerate", String(v.fps));
      else {
        const available = (visual.asset.duration || 0) - scene.trimStart;
        if (available < scene.duration && scene.shortClipPolicy === "reject")
          throw Error(
            `${scene.title}: clip is shorter than scene; select freeze, loop or trim`,
          );
        if (available < scene.duration && scene.shortClipPolicy === "trim")
          throw Error("Apply scene trim before rendering");
        if (scene.shortClipPolicy === "loop") args.push("-stream_loop", "-1");
        args.push("-ss", String(scene.trimStart));
      }
      args.push("-i", visual.path);
      if (scene.audioId) {
        const audio = await file(scene.audioId);
        if (audio.asset.kind !== "audio")
          throw Error("Narration track requires audio");
        if (
          audio.asset.duration &&
          scene.audioStart >= audio.asset.duration
        )
          throw Error(
            `${scene.title}: narration range exceeds the source recording`,
          );
        args.push("-ss", String(scene.audioStart), "-i", audio.path);
      } else args.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
      const framing = v.framing[scene.id];
      const framed = {
        ...scene,
        focalX: framing?.x ?? scene.focalX,
        focalY: framing?.y ?? scene.focalY,
      };
      let vf =
        visual.asset.kind === "image"
          ? motionFilter(framed, w, h, v.fps)
          : `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:x='(iw-ow)*${framed.focalX}':y='(ih-oh)*${framed.focalY}',setsar=1,fps=${v.fps},format=yuv420p`;
      if (visual.asset.kind === "video" && scene.shortClipPolicy === "freeze")
        vf += `,tpad=stop_mode=clone:stop_duration=${scene.duration}`;
      // FFmpeg interprets a zero-duration afade as its default sample-count fade.
      // Omit disabled fades completely, or every image cut fades the voice in again.
      const af = ["aresample=48000", "aformat=channel_layouts=stereo", `volume=${scene.muted ? 0 : scene.volume}`,
        ...(scene.fadeIn > 0 ? [`afade=t=in:d=${scene.fadeIn}`] : []),
        ...(scene.fadeOut > 0 ? [`afade=t=out:st=${Math.max(0, scene.duration - scene.fadeOut)}:d=${scene.fadeOut}`] : []),
        "apad", `atrim=duration=${scene.duration}`, "asetpts=PTS-STARTPTS"].join(",");
      args.push(
        "-vf",
        vf,
        "-af",
        af,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-t",
        String(scene.duration),
        "-c:v",
        "libx264",
        "-threads:v",
        "2",
        "-preset",
        draft ? "ultrafast" : v.encodingPreset ?? "medium",
        "-crf",
        String(draft ? 28 : v.crf),
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        clip,
      );
      await command(ff, args, cancel);
      if (checkpoint) await storage.put(checkpoint, await readFile(clip), "video/mp4");
      clips.push(clip);
    }
    await stage("Composing transitions and audio");
    const joined = path.join(dir, "joined.mp4");
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-threads",
      "1",
      "-filter_complex_threads",
      "1",
    ];
    let video = "0:v",
      audio = "0:a";
    const filters: string[] = [];
    // Cut-only timelines read clips one at a time through the concat demuxer. Opening every
    // clip as a separate input keeps all decoders alive at once and was OOM-killed at 33 shots.
    const cutsOnly = tracks.every((t) => !t.overlap);
    if (cutsOnly) {
      const list = path.join(dir, "clips.txt");
      const entry = (c: string) => `file '${c.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`;
      // Container duration can include rounded video frames/AAC padding. Explicit timeline
      // durations keep later narration/caption starts from drifting across many short shots.
      await writeFile(list, clips.map((clip, i) => `${entry(clip)}\nduration ${tracks[i].scene.duration}`).join("\n"));
      args.push("-f", "concat", "-safe", "0", "-i", list);
    } else clips.forEach((c) => args.push("-i", c));
    for (let i = 1; i < tracks.length && !cutsOnly; i++) {
      const t = tracks[i];
      if (t.overlap) {
        filters.push(
          `[${video}][${i}:v]xfade=transition=fade:duration=${t.overlap}:offset=${t.start}[v${i}]`,
          `[${audio}][${i}:a]acrossfade=d=${t.overlap}:c1=tri:c2=tri[a${i}]`,
        );
      } else {
        filters.push(
          `[${video}][${i}:v]concat=n=2:v=1:a=0[v${i}]`,
          `[${audio}][${i}:a]concat=n=2:v=0:a=1[a${i}]`,
        );
      }
      video = `v${i}`;
      audio = `a${i}`;
    }
    if (filters.length) args.push("-filter_complex", filters.join(";"));
    args.push(
      "-map",
      filters.length ? `[${video}]` : video,
      "-map",
      filters.length ? `[${audio}]` : audio,
      "-c:v",
      cutsOnly ? "copy" : "libx264",
      "-threads:v",
      "2",
      "-preset",
      draft ? "ultrafast" : v.encodingPreset ?? "medium",
      "-crf",
      String(draft ? 28 : v.crf),
      "-c:a",
      "aac",
      "-t",
      String(duration(doc, v)),
      joined,
    );
    await command(ff, args, cancel);
    await stage("Mixing music, effects, overlays and captions");
    const output = path.join(dir, "final.mp4");
    const final = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-threads",
      "1",
      "-filter_complex_threads",
      "1",
      "-i",
      joined,
    ];
    const mix: string[] = [];
    let a = "0:a";
    let next = 1;
    if (doc.musicId) {
      const music = await file(doc.musicId);
      const musicDuration =
        music.asset.duration || (await probe(music.path)).duration;
      if (!musicDuration) throw Error("Music duration could not be measured");
      const loopDuration = Math.min(musicDuration, duration(doc, v));
      const fade = Math.min(0.3, loopDuration / 4);
      const fadedLoop = path.join(dir, "music-loop.wav");
      await command(
        ff,
        [
          "-y",
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          music.path,
          "-t",
          String(loopDuration),
          "-af",
          `aresample=48000,afade=t=in:d=${fade},afade=t=out:st=${loopDuration - fade}:d=${fade}`,
          "-ac",
          "2",
          fadedLoop,
        ],
        cancel,
      );
      final.push("-stream_loop", "-1", "-i", fadedLoop);
      const m = next++;
      mix.push(
        `[${m}:a]aresample=48000,volume=${doc.musicVolume},afade=t=in:d=1,afade=t=out:st=${Math.max(0, duration(doc, v) - 1)}:d=1[music]`,
      );
      if (doc.ducking) {
        mix.push(
          `[0:a]asplit=2[voice][side]`,
          `[music][side]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=300[duck]`,
          `[voice][duck]amix=inputs=2:duration=first:normalize=0[mixed]`,
        );
      } else
        mix.push("[0:a][music]amix=inputs=2:duration=first:normalize=0[mixed]");
      a = "mixed";
    }
    for (let i = 0; i < doc.effects.length; i++) {
      const effect = doc.effects[i];
      final.push("-i", (await file(effect.assetId)).path);
      mix.push(
        `[${next++}:a]aresample=48000,volume=${effect.volume},adelay=${Math.round(effect.start * 1000)}:all=1[fx${i}]`,
        `[${a}][fx${i}]amix=inputs=2:duration=first:normalize=0[effect${i}]`,
      );
      a = `effect${i}`;
    }
    // Normalize once across the complete mix, never again at each image cut.
    mix.push(`[${a}]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[leveled]`);
    a = "leveled";
    let videoOut = "0:v";
    const logoId = v.logoId === undefined ? doc.logoId : v.logoId;
    if (logoId) {
      const logo = await file(logoId);
      if (logo.asset.kind !== "image") throw Error("Logo must be an image");
      final.push("-i", logo.path);
      mix.push(
        `[${next++}:v]scale=${Math.round(w * 0.12)}:-1[logo]`,
        `[0:v][logo]overlay=W-w-20:20:enable='gte(t,${v.logoStart ?? 0})'[branded]`,
      );
      videoOut = "branded";
    }
    if (v.captions || v.titleOverlay || captions(doc, v).some(c => c.display === "full-verse")) {
      const ass = path.join(dir, "captions.ass");
      await writeFile(ass, assFile(doc, v, w, h));
      mix.push(
        // Complex (HarfBuzz) shaping is required for Telugu/Devanagari conjuncts; the default
        // shaper renders them as separate letters with visible viramas.
        `[${videoOut}]ass=filename='${escapeFilterPath(ass)}':fontsdir='${escapeFilterPath(path.resolve(process.env.FONT_DIR || "public/fonts"))}':shaping=complex[captioned]`,
      );
      videoOut = "captioned";
    }
    if (mix.length) final.push("-filter_complex", mix.join(";"));
    final.push(
      "-map",
      videoOut.includes(":") ? videoOut : `[${videoOut}]`,
      "-map",
      a.includes(":") ? a : `[${a}]`,
      "-t",
      String(duration(doc, v)),
      "-c:v",
      "libx264",
      "-threads:v",
      "2",
      "-preset",
      draft ? "ultrafast" : v.encodingPreset ?? "medium",
      "-crf",
      String(draft ? 28 : v.crf),
      "-maxrate",
      v.bitrate,
      "-bufsize",
      v.bitrate,
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      output,
    );
    await command(ff, final, cancel);
    await stage("Validating playable MP4");
    const info = await probe(output);
    const size = (await stat(output)).size;
    if (
      info.videoCodec !== "h264" ||
      info.audioCodec !== "aac" ||
      info.width !== w ||
      info.height !== h ||
      !info.duration ||
      Math.abs(info.duration - duration(doc, v)) > 0.15 ||
      size < 100
    )
      throw Error("Final output failed validation");
    const mp4Key = storageKey("exports", "mp4"),
      srtKey = storageKey("exports", "srt"),
      vttKey = storageKey("exports", "vtt");
    await storage.put(mp4Key, await readFile(output), "video/mp4");
    await storage.put(
      srtKey,
      Buffer.from(subtitleFile(doc, v, "srt")),
      "text/plain",
    );
    await storage.put(
      vttKey,
      Buffer.from(subtitleFile(doc, v, "vtt")),
      "text/vtt",
    );
    if (!(await storage.get(mp4Key)).length)
      throw Error("Export is not available in durable storage");
    return {
      mp4Key,
      srtKey,
      vttKey,
      duration: info.duration,
      width: w,
      height: h,
      bytes: size,
      variantId: v.id,
      draft,
    };
  } finally {
    await cleanupTemp(dir);
  }
}
