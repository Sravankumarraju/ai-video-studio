import { z } from "zod";
import { videoMetaSchema } from "./series-schema";
export const capability = z.enum([
  "script",
  "image",
  "video",
  "voice",
  "transcription",
]);
export type Capability = z.infer<typeof capability>;
export const providerSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["zenmux", "openai-compatible", "elevenlabs"]),
  baseUrl: z
    .string()
    .url()
    .refine(
      (s) => !new URL(s).search,
      "Provider base URLs cannot contain query parameters or credentials",
    ),
  capabilities: z.array(capability).min(1),
  model: z.string().min(1).max(200),
  timeout: z.number().int().min(5).max(600).default(120),
  concurrency: z.number().int().min(1).max(16).default(1),
  parameters: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .refine(
      (p) =>
        Object.keys(p).every(
          (k) => !/(key|secret|token|authorization|password)/i.test(k),
        ),
      "Secrets belong in the encrypted API key field",
    )
    .default({}),
  supportedParameters: z.array(z.string()).default([]),
  pricePerCall: z.number().nonnegative().optional(),
  languages: z.array(z.string()).default([]),
  voiceId: z.string().max(100).default(""),
  discovery: z.boolean().default(true),
});
export type ProviderConfig = z.infer<typeof providerSchema>;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().max(50000);
export const publishingSchema = z.object({titles: z.array(z.string()).default([]), description: text.default(""), hashtags: text.default(""), thumbnailPrompt: text.default(""), chapters: text.default("")});
export const captionSchema = z
  .object({
    id,
    start: z.number().nonnegative(),
    end: z.number().positive(),
    text: z.string().max(1000),
    // A scripture/title card stays whole for its exact time range, independently of subtitles.
    display: z.enum(["phrases", "full-verse"]).optional(),
    accuracy: z.enum(["approximate", "aligned", "manual"]).default("manual"),
    words: z
      .array(
        z.object({
          text: z.string(),
          start: z.number().nonnegative(),
          end: z.number().positive(),
        }),
      )
      .optional(),
  })
  .refine((c) => c.end > c.start, "Caption end must follow start");
export const sceneSchema = z.object({
  id,
  title: z.string().max(200),
  narration: text.default(""),
  dialogue: text.default(""),
  visual: text.default(""),
  imagePrompt: text.default(""),
  videoPrompt: text.default(""),
  duration: z.number().min(0.5).max(1800).default(5),
  mediaType: z.enum(["image", "video"]).default("image"),
  assetId: id.optional(),
  audioId: id.optional(),
  // Source recording offset; visual cuts can reuse one continuous narration.
  audioStart: z.number().nonnegative().default(0),
  audioSlice: z.boolean().default(false),
  alternatives: z.array(id).default([]),
  locked: z.boolean().default(false),
  motion: z
    .enum([
      "static",
      "zoom-in",
      "zoom-out",
      "pan-left",
      "pan-right",
      "pan-up",
      "pan-down",
    ])
    .default("zoom-in"),
  strength: z.number().min(0).max(0.4).default(0.12),
  motionEasing: z.enum(["linear", "smooth"]).optional(),
  focalX: z.number().min(0).max(1).default(0.5),
  focalY: z.number().min(0).max(1).default(0.5),
  transition: z.enum(["cut", "crossfade"]).default("cut"),
  overlap: z.number().min(0).max(2).default(0.4),
  trimStart: z.number().nonnegative().default(0),
  shortClipPolicy: z
    .enum(["reject", "freeze", "loop", "trim"])
    .default("reject"),
  volume: z.number().min(0).max(2).default(1),
  muted: z.boolean().default(false),
  fadeIn: z.number().min(0).max(5).default(0),
  fadeOut: z.number().min(0).max(5).default(0),
  captions: z.array(captionSchema).max(2000).default([]),
  captionsStale: z.boolean().default(false),
  narrationStale: z.boolean().default(false),
  voiceId: z.string().max(100).default(""),
  providers: z.record(capability, id).default({}),
  modes: z.record(capability, z.enum(["manual", "api"])).default({}),
  promptOverrides: z.record(z.string(), text).default({}),
  characterIds: z.array(id).default([]),
  status: z.string().max(100).default("Needs media"),
  error: z.string().max(1000).optional(),
});
export type Scene = z.infer<typeof sceneSchema>;
export const variantSchema = z.object({
  id,
  name: z.string().max(100),
  aspect: z.enum(["landscape", "vertical"]),
  // Undefined inherits the project logo; null explicitly disables it for this edition.
  logoId: id.nullable().optional(),
  logoStart: z.number().nonnegative().optional(),
  publishing: publishingSchema.optional(),
  encodingPreset: z.enum(["medium", "fast"]).optional(),
  captionBottom: z.number().min(0.05).max(0.4).optional(),
  sceneIds: z.array(id).min(1),
  fps: z.number().int().min(24).max(60).default(30),
  crf: z.number().int().min(16).max(35).default(20),
  bitrate: z
    .string()
    .regex(/^\d{1,3}M$/)
    .default("8M"),
  captions: z.boolean().default(true),
  fontSize: z.number().min(12).max(100).default(48),
  font: z
    .enum([
      "automatic",
      "Noto Sans",
      "Noto Sans Telugu",
      "Noto Sans Devanagari",
    ])
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#ffffff"),
  outline: z.number().min(0).max(8).default(2),
  background: z.boolean().default(false),
  position: z.enum(["bottom", "center", "top"]).default("bottom"),
  wordHighlight: z.boolean().default(false),
  // Colour of the word being spoken when word highlighting is on.
  highlightColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#ffd54a"),
  sceneOverrides: z.record(id, sceneSchema).default({}),
  framing: z
    .record(
      id,
      z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
    )
    .default({}),
  maxDuration: z.number().positive().default(180),
  targetDuration: z.number().int().min(1).max(7200).optional(),
  titleOverlay: z.string().max(200).default(""),
});
export type Variant = z.infer<typeof variantSchema>;
export const projectSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  title: z.string().min(1).max(200),
  topic: text.default(""),
  category: z.string().max(100).default("Motivational"),
  language: z.enum(["en", "te", "hi"]).default("en"),
  subtitleLanguage: z.enum(["en", "te", "hi"]).default("en"),
  mode: z.enum(["manual", "hybrid", "automatic"]).default("manual"),
  targetDuration: z.number().min(1).max(7200).default(60),
  shortTargetDuration: z.number().int().min(1).max(7200).default(60),
  style: z.string().max(200).default("Cinematic illustration"),
  audience: z.string().max(200).default("General audience"),
  sources: text.default(""),
  sourceClassification: z
    .enum(["traditional", "interpretation", "fiction"])
    .default("interpretation"),
  pronunciation: text.default(""),
  outline: text.default(""),
  script: text.default(""),
  scenes: z.array(sceneSchema).max(200).default([]),
  variants: z.array(variantSchema).max(20).default([]),
  providers: z.record(capability, id).default({}),
  promptOverrides: z.record(z.string(), text).default({}),
  characters: z
    .array(
      z.object({
        id,
        name: z.string().max(100),
        description: text,
        voiceId: z.string().max(100).default(""),
        referenceAssetId: id.optional(),
      }),
    )
    .default([]),
  styleGuide: text.default(""),
  musicId: id.optional(),
  musicVolume: z.number().min(0).max(1).default(0.15),
  ducking: z.boolean().default(true),
  effects: z
    .array(
      z.object({
        assetId: id,
        start: z.number().nonnegative(),
        volume: z.number().min(0).max(2),
      }),
    )
    .default([]),
  logoId: id.optional(),
  introId: id.optional(),
  outroId: id.optional(),
  budget: z.number().nonnegative().default(10),
  generationLimit: z.number().int().min(0).max(10000).default(50),
  unknownCostPolicy: z.enum(["block", "allow"]).default("block"),
  reviewCheckpoints: z.boolean().default(true),
  stages: z.record(z.string(), z.boolean()).default({}),
  publishing: publishingSchema.default({}),
  // Present on videos created inside a series project; legacy projects omit it.
  video: videoMetaSchema.optional(),
});
export type ProjectDoc = z.infer<typeof projectSchema>;
export function newScene(n = 1, narration = ""): Scene {
  return sceneSchema.parse({
    id: crypto.randomUUID(),
    title: `Scene ${n}`,
    narration,
    visual: "",
    imagePrompt: "",
    videoPrompt: "",
  });
}
export function invalidate(previous: ProjectDoc, next: ProjectDoc): ProjectDoc {
  next.scenes = next.scenes.map((s) => {
    const old = previous.scenes.find((o) => o.id === s.id);
    if (s.locked) return s;
    if (old && previous.script !== next.script && old.audioId === s.audioId)
      return {
        ...s,
        narrationStale: !!s.audioId,
        captionsStale: !!s.captions.length,
      };
    if (old && old.narration !== s.narration)
      return {
        ...s,
        narrationStale: !!s.audioId && s.audioId === old.audioId,
        captionsStale: !!s.captions.length,
      };
    if (
      old &&
      (old.audioId !== s.audioId || old.audioStart !== s.audioStart) &&
      JSON.stringify(old.captions) === JSON.stringify(s.captions)
    )
      return { ...s, captionsStale: !!s.captions.length };
    return s;
  });
  next.variants = next.variants.map((v) => {
    const old = previous.variants.find((x) => x.id === v.id);
    return {
      ...v,
      sceneOverrides: Object.fromEntries(
        Object.entries(v.sceneOverrides).map(([id, s]) => {
          const base =
            old?.sceneOverrides[id] || previous.scenes.find((s) => s.id === id);
          if (!base || s.locked) return [id, s];
          if (base.narration !== s.narration)
            return [
              id,
              {
                ...s,
                narrationStale: !!s.audioId && s.audioId === base.audioId,
                captionsStale: !!s.captions.length,
              },
            ];
          if (
            (base.audioId !== s.audioId || base.audioStart !== s.audioStart) &&
            JSON.stringify(base.captions) === JSON.stringify(s.captions)
          )
            return [id, { ...s, captionsStale: !!s.captions.length }];
          return [id, s];
        }),
      ),
    };
  });
  return next;
}
