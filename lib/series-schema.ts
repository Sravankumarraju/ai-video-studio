import { z } from "zod";

// A "series" is what the UI calls a project: a devotional channel or topic (Bhagavad Gita,
// Lord Vishnu, Lord Shiva, custom) whose settings every new video inherits. Videos are the
// existing Project rows; they keep a snapshot of these settings so later edits to the series
// never change a saved video until the owner explicitly applies them.

export const contentTypes = ["scripture", "story", "stotra", "teaching", "custom"] as const;
export const contentTypeNames: Record<(typeof contentTypes)[number], string> = {
  scripture: "Scripture explanation",
  story: "Devotional story",
  stotra: "Stotra meaning",
  teaching: "Thematic teaching",
  custom: "Custom",
};
export const sectionKinds = [
  "intro",
  "context",
  "verses",
  "recitation",
  "meaning",
  "explanation",
  "story",
  "symbolism",
  "example",
  "lesson",
  "conclusion",
  "cta",
  "teaser",
  "custom",
] as const;

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/, "Use lowercase letters, digits and hyphens");
const longText = z.string().max(20000);

export const sectionSchema = z.object({
  id: slug,
  title: z.string().min(1).max(100),
  kind: z.enum(sectionKinds),
  purpose: z.string().max(3000).default(""),
  required: z.boolean().default(true),
});
export type SectionTemplate = z.infer<typeof sectionSchema>;

// Verse requirements apply only when a format uses verses; stories are never forced to have any.
export const verseRuleSchema = z
  .object({
    mode: z.enum(["none", "optional", "exact", "range"]).default("none"),
    exact: z.number().int().min(1).max(20).optional(),
    min: z.number().int().min(0).max(50).default(0),
    max: z.number().int().min(0).max(50).default(0),
    label: z.string().max(40).default("శ్లోకం"),
  })
  .refine((r) => r.mode !== "exact" || !!r.exact, "Set the exact verse count")
  .refine((r) => r.mode !== "range" || r.min <= r.max, "Minimum verses cannot exceed maximum")
  .refine((r) => r.mode !== "optional" || r.max >= 1, "Set the maximum optional verses");
export type VerseRule = z.infer<typeof verseRuleSchema>;

export const formatSchema = z
  .object({
    id: slug,
    name: z.string().min(1).max(100),
    contentType: z.enum(contentTypes),
    structure: z.array(sectionSchema).min(1).max(30),
    verses: verseRuleSchema.default({}),
    instructions: longText.default(""),
  })
  .refine((f) => new Set(f.structure.map((s) => s.id)).size === f.structure.length, "Section IDs must be unique");
export type VideoFormat = z.infer<typeof formatSchema>;

export const characterRefSchema = z.object({
  id: slug,
  name: z.string().min(1).max(100),
  description: z.string().max(3000).default(""),
  referenceAssetId: z.string().max(80).optional(),
});

export const seriesSettingsSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    templateId: z.enum(["bhagavad-gita", "vishnu", "shiva", "custom"]).default("custom"),
    name: z.string().min(1).max(200),
    description: z.string().max(5000).default(""),
    subject: z.string().max(500).default(""),
    audience: z.string().max(500).default("Telugu-speaking devotional audience"),
    // This phase produces Telugu videos only.
    language: z.literal("te").default("te"),
    sources: z
      .object({
        texts: longText.default(""),
        preferences: longText.default(""),
        // Verses per chapter, when the text has numbered chapters; lets the app suggest next episodes.
        chapterVerses: z.array(z.number().int().min(1).max(500)).max(200).default([]),
      })
      .default({}),
    formats: z.array(formatSchema).min(1).max(12),
    defaultFormatId: slug,
    narration: z
      .object({
        tone: z.string().max(2000).default(""),
        pronunciation: longText.default(""),
        instructions: longText.default(""),
      })
      .default({}),
    visual: z
      .object({
        style: z.string().max(3000).default(""),
        characters: z.array(characterRefSchema).max(50).default([]),
        imageRules: longText.default(""),
      })
      .default({}),
    defaults: z
      .object({
        voiceId: z.string().max(100).default(""),
        aspect: z.enum(["landscape", "vertical"]).default("landscape"),
        // Optional guide only; the complete narration decides the real runtime.
        targetDuration: z.number().int().min(10).max(7200).nullable().default(null),
        channelName: z.string().max(200).default(""),
        titleOverlay: z.string().max(200).default(""),
        logoAssetId: z.string().max(80).optional(),
      })
      .default({}),
    intro: z.object({ instructions: longText.default("") }).default({}),
    closing: z.object({ instructions: longText.default("") }).default({}),
    cta: z.object({ enabled: z.boolean().default(true), instructions: longText.default("") }).default({}),
  })
  .refine((s) => s.formats.some((f) => f.id === s.defaultFormatId), "Default format must be one of the formats")
  .refine((s) => new Set(s.formats.map((f) => f.id)).size === s.formats.length, "Format IDs must be unique");
export type SeriesSettings = z.infer<typeof seriesSettingsSchema>;

export const videoInputsSchema = z.object({
  topic: z.string().max(2000).default(""),
  description: z.string().max(5000).default(""),
  // Verse numbers, story name or stotra name chosen by the owner. Scripture references in the
  // imported script must come from here; the external AI may not invent them.
  references: z.string().max(2000).default(""),
  sourceNotes: longText.default(""),
  instructions: longText.default(""),
  targetDuration: z.number().int().min(10).max(7200).nullable().default(null),
});
export type VideoInputs = z.infer<typeof videoInputsSchema>;

export const videoOverridesSchema = z
  .object({
    structure: z.array(sectionSchema).min(1).max(30).optional(),
    verses: verseRuleSchema.optional(),
    aspect: z.enum(["landscape", "vertical"]).optional(),
    voiceId: z.string().max(100).optional(),
  })
  .default({});

export const videoMetaSchema = z.object({
  seriesId: z.string().max(80),
  // Episode number within the project; videos are listed in this order.
  episode: z.number().int().min(0).max(9999).optional(),
  formatId: slug,
  settings: seriesSettingsSchema,
  settingsRevision: z.number().int().positive(),
  overrides: videoOverridesSchema,
  inputs: videoInputsSchema.default({}),
  importedAt: z.string().max(40).optional(),
  generated: z.unknown().optional(),
  review: z
    .object({ sourcesChecked: z.boolean().default(false), versesChecked: z.boolean().default(false) })
    .default({}),
});
export type VideoMeta = z.infer<typeof videoMetaSchema>;
