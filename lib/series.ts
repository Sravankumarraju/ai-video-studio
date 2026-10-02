import { z } from "zod";
import {
  seriesSettingsSchema,
  contentTypeNames,
  type SeriesSettings,
  type VideoFormat,
  type VideoInputs,
  type VideoMeta,
  type SectionTemplate,
  type VerseRule,
} from "./series-schema";
import { projectSchema, newScene, variantSchema, type ProjectDoc } from "./schema";

const section = (id: string, title: string, kind: SectionTemplate["kind"], purpose: string, required = true): SectionTemplate => ({ id, title, kind, purpose, required });

const respectful =
  "Respectful devotional Indian painting in a cinematic painterly style: warm gold lamp and sunrise light, deep indigo shadows, rich traditional fabrics, natural anatomy and hands, dignified expressions.";
const imageRules =
  "One image per scene, describing the concept of that moment. Never put words, letters, captions, logos or watermarks in an image; the editor adds captions. Keep each recurring figure's appearance identical to the character references. Depict deities and saints reverently: no gore, no mockery, no modern props in scriptural scenes. Keep the bottom fifth of the frame darker and uncluttered for captions.";
const accuracy =
  "Use only the sources given here or well-known traditional sources you can name. Never invent scripture quotations, verse numbers or source references. Where traditions or texts differ, say which version this video follows.";

// Ready-made project templates. Every value is editable after the project is created.
export const seriesTemplates: Record<SeriesSettings["templateId"], SeriesSettings> = {
  "bhagavad-gita": seriesSettingsSchema.parse({
    templateId: "bhagavad-gita",
    name: "Bhagavad Gita · Telugu",
    description: "The Bhagavad Gita explained two shlokas at a time, with recitation, meaning, explanation, practical examples and what to follow.",
    subject: "Srimad Bhagavad Gita",
    sources: {
      texts: "Srimad Bhagavad Gita (Sanskrit original, chapter and verse numbering of the standard 700-verse text).",
      preferences: `${accuracy} Quote each shloka exactly from the Sanskrit original, written in Telugu script. Give meaning as translation; label any commentator's view as commentary and name the tradition or commentator when known.`,
      // Verses per chapter (Swami Mukundananda numbering: chapter 13 has 35), as in the series catalogue.
      chapterVerses: [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78],
    },
    formats: [
      {
        id: "two-shlokas",
        name: "Two shlokas",
        contentType: "scripture",
        verses: { mode: "exact", exact: 2, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Open with a short hook drawn from the two shlokas, then welcome viewers to the channel. Say which chapter and shlokas this video covers."),
          section("context", "సందర్భం · Context", "context", "Who is speaking to whom, and where these shlokas sit in the conversation. Briefly recall the previous shlokas if relevant."),
          section("recitation", "శ్లోక పఠనం · Recitation", "recitation", "Recite both shlokas exactly as written in the verses array, in Telugu script, slowly and clearly."),
          section("meaning", "అర్థం · Meaning", "meaning", "For each shloka: key word meanings, then the overall meaning in simple Telugu."),
          section("explanation", "వివరణ · Explanation", "explanation", "Explain the teaching. Clearly label traditional commentary as commentary."),
          section("examples", "ఉదాహరణలు · Practical examples", "example", "One or two modern, relatable examples. State that they are illustrations, not stories from the Gita."),
          section("conclusion", "ముగింపు · What to follow", "conclusion", "Conclude with concrete things the viewer can follow or practise this week."),
          section("closing", "ముగింపు మాట · Closing", "cta", "Thank viewers, ask one specific comment question, invite like and subscribe, and tease the next shlokas.", false),
        ],
      },
    ],
    defaultFormatId: "two-shlokas",
    narration: {
      tone: "Calm, warm, reverent Telugu, like a respected teacher speaking to family. Simple spoken sentences; Sanskrit terms explained the first time.",
      pronunciation: "భగవద్గీత; శ్రీకృష్ణుడు; అర్జునుడు; ధర్మం; కర్మయోగం; Recite shlokas with correct Sanskrit pronunciation and natural pauses at each pada.",
      instructions: "Write numbers and chapter/verse references as words where they will be spoken.",
    },
    visual: {
      style: `${respectful} Kurukshetra battlefield, chariots and royal courts for scriptural scenes; contemporary Indian homes and workplaces for examples.`,
      characters: [
        { id: "krishna", name: "Sri Krishna", description: "Serene, blue-complexioned, peacock feather in the crown, yellow silk garments, gentle smile; never comical." },
        { id: "arjuna", name: "Arjuna", description: "Young warrior prince, strong build, golden armour over white and saffron silk, Gandiva bow; earnest, searching expression." },
        { id: "dhritarashtra", name: "Dhritarashtra", description: "Elderly blind king, gently closed eyes, silver hair and beard, restrained golden crown, rich maroon silk, seated on a carved throne." },
        { id: "sanjaya", name: "Sanjaya", description: "Adult royal adviser and charioteer, short dark beard, cream and saffron robes, rudraksha beads; calm, articulate narrator." },
        { id: "duryodhana", name: "Duryodhana", description: "Tall, powerful Kuru prince in his forties, proud strong jaw, dark wavy shoulder-length hair, trimmed black beard, golden crown with a single ruby, crimson-and-gold armour over deep maroon silk, heavy gold mace." },
        { id: "drona", name: "Dronacharya", description: "Elderly brahmin warrior-teacher, long white beard, white hair in a topknot, sandalwood tilak, sacred thread, saffron dhoti and white upper cloth, bronze chest armour, great bow over one shoulder; calm, stern, wise." },
        { id: "bhishma", name: "Bhishma", description: "Grand old commander, very tall, long white beard and hair, white and silver armour, great bow; dignified and serene." },
      ],
      imageRules,
    },
    defaults: { aspect: "landscape", targetDuration: null, channelName: "Divine Wisdom Telugu", titleOverlay: "" },
    intro: { instructions: "Hook first (no more than two sentences), then welcome to the channel." },
    closing: { instructions: "Summarise the two shlokas in one line before closing." },
    cta: { enabled: true, instructions: "Ask a specific question about applying today's shlokas, then like and subscribe." },
  }),
  vishnu: seriesSettingsSchema.parse({
    templateId: "vishnu",
    name: "Lord Vishnu · Telugu",
    description: "Stories, teachings and avatars of Lord Vishnu, with selected verses and devotional explanations.",
    subject: "Lord Vishnu: stories, teachings, avatars and selected verses",
    sources: {
      texts: "Vishnu Purana, Srimad Bhagavatam, Mahabharata (including Vishnu Sahasranama), Ramayana, and other Puranas as named per video.",
      preferences: `${accuracy} For each story, name the text (and book or canto when known) it comes from. Distinguish scripture, translation, commentary, traditional retellings and our own illustrative examples.`,
    },
    formats: [
      {
        id: "story",
        name: "Devotional story",
        contentType: "story",
        verses: { mode: "optional", max: 3, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "A short hook from the story's key moment, then welcome."),
          section("source-context", "మూలం · Source context", "context", "Which text tells this story, where it sits, and which version this video follows if accounts differ."),
          section("story", "కథ · Story", "story", "Tell the story vividly but faithfully to the named source."),
          section("meaning", "అంతరార్థం · Meaning", "meaning", "The meaning and devotional significance of the story; label interpretations."),
          section("lesson", "జీవిత పాఠం · Practical lesson", "lesson", "One practical lesson for daily life; examples are illustrations."),
          section("conclusion", "ముగింపు · Conclusion", "conclusion", "Close with a devotional reflection and a specific comment question."),
        ],
      },
      {
        id: "avatar",
        name: "Avatar",
        contentType: "story",
        verses: { mode: "optional", max: 3, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Hook and welcome; name the avatar."),
          section("source-context", "మూలం · Source context", "context", "Texts that describe this avatar, and the version followed."),
          section("story", "అవతార కథ · Avatar story", "story", "Why and how the Lord took this form, faithful to the named source."),
          section("symbolism", "సంకేతార్థం · Symbolism", "symbolism", "Traditional symbolism of the form and its attributes; label interpretations."),
          section("lesson", "జీవిత పాఠం · Practical lesson", "lesson", "One practical lesson for daily life."),
          section("conclusion", "ముగింపు · Conclusion", "conclusion", "Devotional reflection and a specific comment question."),
        ],
      },
      {
        id: "teaching",
        name: "Teaching with verses",
        contentType: "teaching",
        verses: { mode: "range", min: 1, max: 4, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Hook and welcome; name the teaching."),
          section("context", "సందర్భం · Context", "context", "Source and setting of the teaching."),
          section("verses", "శ్లోకాలు · Selected verses", "recitation", "Recite the selected verses exactly as given in the verses array."),
          section("explanation", "వివరణ · Explanation", "explanation", "Meaning and explanation of the verses; label commentary."),
          section("lesson", "జీవిత పాఠం · Practical lesson", "lesson", "How to apply it; examples are illustrations."),
          section("conclusion", "ముగింపు · Conclusion", "conclusion", "Devotional takeaway and a specific comment question."),
        ],
      },
    ],
    defaultFormatId: "story",
    narration: {
      tone: "Devotional, gentle and engaging Telugu storytelling, like an elder narrating a Purana katha.",
      pronunciation: "శ్రీమహావిష్ణువు; నారాయణుడు; లక్ష్మీదేవి; వైకుంఠం; దశావతారాలు",
      instructions: "",
    },
    visual: {
      style: `${respectful} Vaikuntha in soft blue and gold light; ocean of milk; lotus motifs.`,
      characters: [
        { id: "vishnu", name: "Lord Vishnu", description: "Four-armed, blue-complexioned, serene, holding conch (shankha), discus (chakra), mace (gada) and lotus; yellow silk, Kaustubha gem, crown." },
        { id: "lakshmi", name: "Goddess Lakshmi", description: "Radiant, gentle, red and gold silk saree, seated on or holding a lotus." },
      ],
      imageRules,
    },
    defaults: { aspect: "landscape", targetDuration: null, channelName: "", titleOverlay: "" },
    cta: { enabled: true, instructions: "Ask which part of the story moved the viewer, then like and subscribe." },
  }),
  shiva: seriesSettingsSchema.parse({
    templateId: "shiva",
    name: "Lord Shiva · Telugu",
    description: "Stories, teachings, symbolism and selected stotras of Lord Shiva, with practical lessons.",
    subject: "Lord Shiva: stotras, stories, symbolism and teachings",
    sources: {
      texts: "Shiva Purana, Linga Purana, Skanda Purana, and stotras such as Shiva Panchakshara Stotram, Lingashtakam, Bilvashtakam and Shiva Tandava Stotram, as named per video.",
      preferences: `${accuracy} Quote stotra verses exactly from the named stotra, in Telugu script, with the verse number.`,
    },
    formats: [
      {
        id: "stotra",
        name: "Stotra meaning",
        contentType: "stotra",
        verses: { mode: "range", min: 1, max: 8, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Hook and welcome; name the stotra and its traditional author if known."),
          section("selected-verses", "ఎంచుకున్న శ్లోకాలు · Selected verses", "verses", "Introduce the selected verses: where they come from and why they matter."),
          section("recitation", "పఠనం · Recitation", "recitation", "Recite the selected verses exactly as given in the verses array, in Telugu script."),
          section("meaning", "అర్థం · Meaning", "meaning", "Word meanings and overall meaning of each verse."),
          section("explanation", "వివరణ · Explanation", "explanation", "Explanation and symbolism; label commentary and tradition."),
          section("takeaway", "భక్తి సందేశం · Devotional takeaway", "conclusion", "A devotional takeaway and a simple practice; a specific comment question."),
        ],
      },
      {
        id: "story",
        name: "Devotional story",
        contentType: "story",
        verses: { mode: "optional", max: 3, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Hook and welcome."),
          section("source-context", "మూలం · Source context", "context", "Which text tells this story and which version is followed."),
          section("story", "కథ · Story", "story", "Tell the story faithfully to the named source."),
          section("symbolism", "సంకేతార్థం · Symbolism", "symbolism", "Traditional symbolism; label interpretations."),
          section("lesson", "జీవిత పాఠం · Practical lesson", "lesson", "Practical lesson for daily life."),
          section("conclusion", "ముగింపు · Conclusion", "conclusion", "Devotional reflection and a specific comment question."),
        ],
      },
      {
        id: "symbolism",
        name: "Symbolism teaching",
        contentType: "teaching",
        verses: { mode: "optional", max: 2, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Hook and welcome; name the symbol (for example the third eye, Ganga, the crescent moon)."),
          section("symbol", "సంకేతం · The symbol", "symbolism", "Describe the symbol and its sources."),
          section("explanation", "వివరణ · Explanation", "explanation", "Traditional meanings; label interpretations."),
          section("lesson", "జీవిత పాఠం · Practical lesson", "lesson", "Practical lesson; examples are illustrations."),
          section("conclusion", "ముగింపు · Conclusion", "conclusion", "Devotional takeaway and a specific comment question."),
        ],
      },
    ],
    defaultFormatId: "stotra",
    narration: {
      tone: "Deep, meditative and reverent Telugu; steady pace with pauses after each verse.",
      pronunciation: "పరమశివుడు; పార్వతీదేవి; కైలాసం; పంచాక్షరి (నమః శివాయ); రుద్రుడు",
      instructions: "",
    },
    visual: {
      style: `${respectful} Kailasa in snow and moonlight; temple sanctums with lamps and bilva leaves.`,
      characters: [
        { id: "shiva", name: "Lord Shiva", description: "Serene meditative form, ash-smeared blue-grey skin, matted locks with crescent moon and Ganga, third eye, serpent around the neck, rudraksha, tiger skin, trident (trishula) and damaru." },
        { id: "parvati", name: "Goddess Parvati", description: "Graceful, gentle, red and green silk saree, traditional jewellery, compassionate expression." },
      ],
      imageRules,
    },
    defaults: { aspect: "landscape", targetDuration: null, channelName: "", titleOverlay: "" },
    cta: { enabled: true, instructions: "Invite viewers to chant the verse with you and comment one line that touched them; like and subscribe." },
  }),
  custom: seriesSettingsSchema.parse({
    templateId: "custom",
    name: "Custom devotional project",
    description: "",
    subject: "",
    sources: { texts: "", preferences: accuracy },
    formats: [
      {
        id: "custom",
        name: "Custom video",
        contentType: "custom",
        verses: { mode: "optional", max: 4, label: "శ్లోకం" },
        structure: [
          section("intro", "పరిచయం · Introduction", "intro", "Hook and welcome."),
          section("main", "ప్రధాన భాగం · Main content", "custom", "The main content of the video."),
          section("conclusion", "ముగింపు · Conclusion", "conclusion", "Takeaway and a specific comment question."),
        ],
      },
    ],
    defaultFormatId: "custom",
    visual: { style: respectful, characters: [], imageRules },
    defaults: { aspect: "landscape", targetDuration: null },
  }),
};

export type ResolvedVideo = {
  settings: SeriesSettings;
  format: VideoFormat;
  structure: SectionTemplate[];
  verses: VerseRule;
  aspect: "landscape" | "vertical";
  voiceId: string;
  targetDuration: number | null;
};

// Video settings = its saved series snapshot, its chosen format, then its own overrides.
export function resolveVideo(meta: VideoMeta): ResolvedVideo {
  const settings = meta.settings;
  const format = settings.formats.find((f) => f.id === meta.formatId) || settings.formats.find((f) => f.id === settings.defaultFormatId)!;
  return {
    settings,
    format,
    structure: meta.overrides.structure || format.structure,
    verses: meta.overrides.verses || format.verses,
    aspect: meta.overrides.aspect || settings.defaults.aspect,
    voiceId: meta.overrides.voiceId ?? settings.defaults.voiceId,
    targetDuration: meta.inputs.targetDuration ?? settings.defaults.targetDuration,
  };
}

export function createVideoDocument(
  series: { id: string; revision: number; settings: SeriesSettings },
  title: string,
  inputs: Partial<VideoInputs>,
  formatId?: string,
  overrides: VideoMeta["overrides"] = {},
): ProjectDoc {
  const s = seriesSettingsSchema.parse(series.settings);
  const format = s.formats.find((f) => f.id === (formatId || s.defaultFormatId));
  if (!format) throw Error("Choose one of this project's video formats");
  return projectSchema.parse({
    title,
    topic: inputs.topic || "",
    category: "Devotional",
    language: s.language,
    subtitleLanguage: s.language,
    style: s.visual.style.slice(0, 200),
    styleGuide: [s.visual.style, s.visual.imageRules].filter(Boolean).join("\n"),
    audience: s.audience.slice(0, 200),
    sources: [s.sources.texts, inputs.sourceNotes].filter(Boolean).join("\n"),
    sourceClassification: format.contentType === "story" ? "traditional" : "interpretation",
    pronunciation: s.narration.pronunciation,
    targetDuration: inputs.targetDuration ?? s.defaults.targetDuration ?? 300,
    characters: s.visual.characters.map((c) => ({ id: c.id, name: c.name, description: c.description, referenceAssetId: c.referenceAssetId })),
    logoId: s.defaults.logoAssetId,
    video: { seriesId: series.id, formatId: format.id, settings: s, settingsRevision: series.revision, overrides, inputs },
  });
}

// Explicit "apply project updates": new defaults replace the snapshot; the video's own
// inputs, overrides and imported script stay as they are.
export function applySeriesUpdates(doc: ProjectDoc, series: { revision: number; settings: SeriesSettings }): ProjectDoc {
  if (!doc.video) throw Error("This video does not belong to a project");
  const s = seriesSettingsSchema.parse(series.settings);
  const formatId = s.formats.some((f) => f.id === doc.video!.formatId) ? doc.video.formatId : s.defaultFormatId;
  return projectSchema.parse({
    ...doc,
    styleGuide: [s.visual.style, s.visual.imageRules].filter(Boolean).join("\n"),
    pronunciation: s.narration.pronunciation,
    characters: s.visual.characters.map((c) => ({ id: c.id, name: c.name, description: c.description, referenceAssetId: c.referenceAssetId })),
    logoId: s.defaults.logoAssetId ?? doc.logoId,
    video: { ...doc.video, formatId, settings: s, settingsRevision: series.revision },
  });
}

const verseRuleText = (r: VerseRule, label: string) =>
  r.mode === "exact"
    ? `Exactly ${r.exact} ${label} (verses). The "verses" array must contain exactly ${r.exact} items.`
    : r.mode === "range"
      ? `Between ${r.min} and ${r.max} verses.`
      : r.mode === "optional"
        ? `Verses are optional (at most ${r.max}). Include one only if it genuinely belongs to the named source; otherwise return an empty "verses" array. Do not force a verse into a story.`
        : `No verses. Return an empty "verses" array.`;

export const outputSchemaExample = {
  title: "Telugu video title",
  summary: "One-paragraph summary in Telugu",
  versionNote: "Which version of the account this video follows, if accounts differ (Telugu or English)",
  sources: [{ type: "scripture | translation | commentary | tradition | illustration", reference: "Text, chapter/verse or tradition", note: "How it is used" }],
  verses: [{ reference: "e.g. 2.47", original: "Exact verse in Telugu script", transliteration: "Optional Roman transliteration", meaning: "Simple Telugu meaning", source: "Text the verse is quoted from" }],
  sections: [
    {
      id: "section id from the required structure",
      title: "Section title",
      contentKind: "scripture | translation | commentary | tradition | illustration | narration",
      scenes: [
        {
          narration: "Telugu narration spoken over this scene (1–4 sentences)",
          visual: "What the viewer sees, in English",
          imagePrompt: "Concept-based image prompt in English, self-contained, following the visual rules",
          videoPrompt: "Optional image-to-video prompt: camera move and subtle motion",
          characters: ["Character names from the references that appear"],
        },
      ],
    },
  ],
  metadata: {
    youtubeTitles: ["3 title options in Telugu (may include English keywords)"],
    description: "YouTube description in Telugu with sources",
    hashtags: ["#Telugu", "#..."],
    chapters: "0:00 ... (leave empty if unsure; timings are set after recording)",
    thumbnailPrompt: "Thumbnail image concept without text",
  },
};

// One self-contained prompt for any external AI: project instructions, template and source
// rules, this video's inputs, the structure, visual and narration preferences, and the schema.
export function buildFullPrompt(doc: ProjectDoc): string {
  if (!doc.video) throw Error("Create this video inside a project to build its prompt");
  const r = resolveVideo(doc.video), s = r.settings, i = doc.video.inputs;
  const lines = (title: string, body: (string | false | undefined)[]) => `## ${title}\n${body.filter(Boolean).join("\n")}`;
  const characters = s.visual.characters.map((c) => `- ${c.name}: ${c.description}`).join("\n");
  return [
    `You are an expert Telugu devotional scriptwriter, scripture-accuracy reviewer and storyboard artist. Produce a complete Telugu video script, metadata, scene plan and concept-based image prompts for the video below. Respond with ONE JSON object only, no commentary and no code fences, following the schema at the end exactly.`,
    lines("1. Project", [
      `Project: ${s.name}`,
      s.description && `Description: ${s.description}`,
      s.subject && `Subject: ${s.subject}`,
      `Audience: ${s.audience}`,
      `Language: Telugu (all narration, titles and metadata in Telugu script; English is allowed only in visual/image prompts and the "visual" field).`,
      s.defaults.channelName && `Channel: ${s.defaults.channelName}`,
    ]),
    lines("2. Content template and source rules", [
      `Video format: ${r.format.name} (${contentTypeNames[r.format.contentType]})`,
      r.format.instructions && `Format instructions: ${r.format.instructions}`,
      s.sources.texts && `Source texts: ${s.sources.texts}`,
      s.sources.preferences && `Reference preferences: ${s.sources.preferences}`,
      `Classify every source and every section's content as scripture (original text), translation, commentary, tradition (traditional story or retelling), illustration (a newly created example) or narration (linking speech).`,
      `Never invent scripture quotations, verse numbers or references. If you are not certain of a verse's exact wording, do not include it.`,
      `Where accounts differ between texts or traditions, choose one, follow it consistently, and describe it in "versionNote".`,
      `Mark modern or invented examples as illustrations in the narration itself (for example: "ఇది ఒక ఉదాహరణ మాత్రమే").`,
    ]),
    lines("3. This video", [
      doc.video.episode !== undefined && `Episode: ${doc.video.episode}`,
      `Title: ${doc.title}`,
      i.topic && `Topic: ${i.topic}`,
      i.description && `Description: ${i.description}`,
      i.references && `References chosen by the owner (use these exactly; do not substitute others): ${i.references}`,
      i.sourceNotes && `Source notes: ${i.sourceNotes}`,
      i.instructions && `Additional instructions: ${i.instructions}`,
      r.targetDuration
        ? `Target length: about ${Math.round(r.targetDuration / 60)} minutes of natural Telugu narration (roughly ${Math.round(r.targetDuration * 2)} words). This is a guide only; completeness matters more than length.`
        : `Length: no fixed duration. Let the complete narration decide the runtime; do not pad or cut content to reach a length.`,
    ]),
    lines("4. Required script structure", [
      `Use these sections in this order. Use the given "id" for each section. Optional sections may be omitted; do not add other sections.`,
      ...r.structure.map((x, n) => `${n + 1}. id "${x.id}" · ${x.title} · ${x.required ? "required" : "optional"}${x.purpose ? ` · ${x.purpose}` : ""}`),
      `Verses: ${verseRuleText(r.verses, r.verses.label)}`,
      r.verses.mode !== "none" && `Put each verse in the "verses" array with its exact reference and its original text in Telugu script. Any recitation section must speak the verse text exactly as written there.`,
      `Split every section into scenes of roughly 6–15 seconds of narration each; each scene gets its own image.`,
      s.intro.instructions && `Introduction: ${s.intro.instructions}`,
      s.closing.instructions && `Closing: ${s.closing.instructions}`,
      s.cta.enabled ? `Call to action: ${s.cta.instructions || "Ask a specific comment question, then invite viewers to like and subscribe."}` : `Do not include a like/subscribe call to action.`,
    ]),
    lines("5. Narration and visual preferences", [
      s.narration.tone && `Telugu narration tone: ${s.narration.tone}`,
      s.narration.pronunciation && `Pronunciation guidance (spell names this way): ${s.narration.pronunciation}`,
      s.narration.instructions && `Narration instructions: ${s.narration.instructions}`,
      `Write narration as natural spoken Telugu for a voice actor: short sentences, no stage directions, no emojis, no markdown.`,
      s.visual.style && `Visual style: ${s.visual.style}`,
      characters && `Character references (repeat the relevant description inside every image prompt that shows that character, because image models do not remember earlier prompts):\n${characters}`,
      s.visual.imageRules && `Image prompt rules: ${s.visual.imageRules}`,
      `Aspect ratio: ${r.aspect === "vertical" ? "vertical 9:16" : "landscape 16:9"}. Consecutive scenes should vary shot type (wide, medium, close-up) and angle.`,
    ]),
    lines("6. Output JSON schema", [
      `Return exactly this shape (values below are descriptions):`,
      JSON.stringify(outputSchemaExample, null, 2),
    ]),
  ].join("\n\n");
}

const contentKind = z.enum(["scripture", "translation", "commentary", "tradition", "illustration", "narration"]);
export const generatedSchema = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().max(5000).default(""),
  versionNote: z.string().max(3000).default(""),
  sources: z
    .array(z.object({ type: z.enum(["scripture", "translation", "commentary", "tradition", "illustration"]), reference: z.string().min(1).max(500), note: z.string().max(2000).default("") }))
    .max(50)
    .default([]),
  verses: z
    .array(z.object({ reference: z.string().min(1).max(100), original: z.string().min(1).max(3000), transliteration: z.string().max(3000).default(""), meaning: z.string().min(1).max(5000), source: z.string().max(500).default("") }))
    .max(50)
    .default([]),
  sections: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().max(200).default(""),
        contentKind: contentKind.default("narration"),
        scenes: z
          .array(z.object({ narration: z.string().min(1).max(3000), visual: z.string().max(3000).default(""), imagePrompt: z.string().min(1).max(5000), videoPrompt: z.string().max(5000).default(""), characters: z.array(z.string().max(100)).max(20).default([]) }))
          .min(1)
          .max(30),
      }),
    )
    .min(1)
    .max(40),
  metadata: z
    .object({
      youtubeTitles: z.array(z.string().max(300)).max(10).default([]),
      description: z.string().max(10000).default(""),
      hashtags: z.union([z.array(z.string().max(100)).max(60), z.string().max(3000)]).default([]),
      chapters: z.string().max(5000).default(""),
      thumbnailPrompt: z.string().max(5000).default(""),
    })
    .default({}),
});
export type GeneratedVideo = z.infer<typeof generatedSchema>;

export type Validation = { ok: boolean; errors: string[]; warnings: string[]; data?: GeneratedVideo; estimatedSeconds?: number };

const telugu = /[ఀ-౿]/;
const refTokens = (s: string) => new Set((s.match(/\d+\s*[.:]\s*\d+/g) || []).map((t) => t.replace(/\s+/g, "").replace(":", ".")));
const squash = (s: string) => s.normalize("NFC").replace(/[\s\p{P}।॥‌‍\d]/gu, "");
// Telugu narration runs at roughly 2 words per second for natural devotional delivery.
export const estimateSeconds = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length / 2;

// Accepts pasted text with or without code fences and checks it against the video's template.
export function validateGenerated(raw: string | unknown, doc: ProjectDoc): Validation {
  if (!doc.video) return { ok: false, errors: ["This video does not belong to a project"], warnings: [] };
  let value: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      value = JSON.parse(text);
    } catch {
      return { ok: false, errors: ["The pasted text is not valid JSON. Paste only the JSON object the AI returned."], warnings: [] };
    }
  }
  const parsed = generatedSchema.safeParse(value);
  if (!parsed.success)
    return { ok: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "JSON"}: ${i.message}`), warnings: [] };
  const data = parsed.data, r = resolveVideo(doc.video), errors: string[] = [], warnings: string[] = [];
  const allowed = new Map(r.structure.map((s, n) => [s.id, n]));
  const ids = data.sections.map((s) => s.id);
  for (const id of ids) if (!allowed.has(id)) errors.push(`Section "${id}" is not part of this video's structure (${r.structure.map((s) => s.id).join(", ")})`);
  if (new Set(ids).size !== ids.length) errors.push("Each section may appear only once");
  for (const s of r.structure) if (s.required && !ids.includes(s.id)) errors.push(`Required section "${s.id}" (${s.title}) is missing`);
  const order = ids.filter((id) => allowed.has(id)).map((id) => allowed.get(id)!);
  if (order.some((n, k) => k > 0 && n < order[k - 1])) errors.push(`Sections must follow the template order: ${r.structure.map((s) => s.id).join(" → ")}`);

  const v = r.verses, count = data.verses.length, label = v.label || "verses";
  if (v.mode === "exact" && count !== v.exact) errors.push(`This template requires exactly ${v.exact} ${label}; the script has ${count}`);
  if (v.mode === "range" && (count < v.min || count > v.max)) errors.push(`This template requires ${v.min}–${v.max} verses; the script has ${count}`);
  if (v.mode === "optional" && count > v.max) errors.push(`At most ${v.max} verses are allowed; the script has ${count}`);
  if (v.mode === "none" && count) errors.push("This format does not use verses; remove them");
  const refs = data.verses.map((x) => x.reference.trim());
  if (new Set(refs).size !== refs.length) errors.push("Each verse reference must be unique");
  const requested = refTokens(doc.video.inputs.references);
  if (requested.size)
    for (const ref of refs) {
      const found = [...refTokens(ref)];
      if (!found.length || found.some((t) => !requested.has(t))) errors.push(`Verse reference "${ref}" is not one you requested (${[...requested].join(", ")}). Scripture references must come from your inputs.`);
    }
  if (count && !data.sources.some((s) => s.type === "scripture")) errors.push("Verses are quoted but no scripture source is listed");
  for (const x of data.verses) if (!telugu.test(x.original)) warnings.push(`Verse ${x.reference} is not written in Telugu script`);

  const recitation = data.sections.filter((s) => r.structure.find((t) => t.id === s.id)?.kind === "recitation");
  if (count && recitation.length) {
    const spoken = squash(recitation.flatMap((s) => s.scenes.map((c) => c.narration)).join(" "));
    for (const x of data.verses) if (!spoken.includes(squash(x.original))) warnings.push(`The recitation does not speak verse ${x.reference} exactly as written in "verses"`);
  } else if (count && r.structure.some((t) => t.kind === "recitation")) errors.push("Verses are quoted but the recitation section is missing");

  data.sections.forEach((s) =>
    s.scenes.forEach((c, n) => {
      if (!telugu.test(c.narration)) errors.push(`Section "${s.id}" scene ${n + 1}: narration must be in Telugu`);
    }),
  );
  for (const s of data.sections) {
    const kind = r.structure.find((t) => t.id === s.id)?.kind;
    if ((kind === "example" || kind === "lesson") && s.contentKind !== "illustration" && s.contentKind !== "narration")
      warnings.push(`Section "${s.id}" is labelled ${s.contentKind}; modern examples should be labelled illustration`);
    if (s.contentKind === "scripture" && !data.sources.some((x) => x.type === "scripture")) warnings.push(`Section "${s.id}" is labelled scripture but no scripture source is listed`);
  }
  if (r.format.contentType === "story" && !data.sources.some((s) => s.type === "scripture" || s.type === "tradition"))
    warnings.push("Name the text or tradition this story comes from in sources");
  if (!data.metadata.youtubeTitles.length) warnings.push("No YouTube title options were returned");
  const estimatedSeconds = estimateSeconds(data.sections.flatMap((s) => s.scenes.map((c) => c.narration)).join(" "));
  if (r.targetDuration && Math.abs(estimatedSeconds - r.targetDuration) > r.targetDuration * 0.4)
    warnings.push(`Estimated narration is about ${Math.round(estimatedSeconds / 60)} min; the target was ${Math.round(r.targetDuration / 60)} min (a guide only)`);
  return { ok: !errors.length, errors, warnings, data, estimatedSeconds };
}

// Replaces the video's scenes with the imported plan. Refuses to discard uploaded media or
// recorded voice unless the owner explicitly asked to replace them.
export function applyGenerated(doc: ProjectDoc, data: GeneratedVideo, replace = false, review = { sourcesChecked: false, versesChecked: false }): ProjectDoc {
  if (!doc.video) throw Error("This video does not belong to a project");
  if (!replace && doc.scenes.some((s) => s.assetId || s.audioId)) throw Error("This video already has images or voice. Confirm replacing the scene plan.");
  const r = resolveVideo(doc.video);
  const byName = new Map(doc.characters.map((c) => [c.name.toLowerCase(), c.id]));
  const scenes = data.sections.flatMap((s) =>
    s.scenes.map((c, n) => ({
      ...newScene(),
      title: `${s.title || r.structure.find((t) => t.id === s.id)?.title || s.id}${s.scenes.length > 1 ? ` · ${n + 1}/${s.scenes.length}` : ""}`,
      narration: c.narration.trim(),
      visual: c.visual,
      imagePrompt: c.imagePrompt,
      videoPrompt: c.videoPrompt,
      duration: Math.min(1800, Math.max(3, Math.round(estimateSeconds(c.narration) * 10) / 10)),
      voiceId: r.voiceId,
      characterIds: c.characters.map((x) => byName.get(x.toLowerCase())).filter((x): x is string => !!x),
      status: "Needs media",
      promptOverrides: { section: s.id, contentKind: s.contentKind },
    })),
  );
  const ids = scenes.map((s) => s.id);
  const variant = variantSchema.parse({
    ...(doc.variants[0] || {}),
    id: doc.variants[0]?.id || crypto.randomUUID(),
    name: doc.variants[0]?.name || (r.aspect === "vertical" ? "Telugu · 9:16" : "Telugu · 16:9"),
    aspect: doc.variants[0]?.aspect || r.aspect,
    sceneIds: ids,
    sceneOverrides: {},
    framing: {},
    maxDuration: 7200,
    targetDuration: r.targetDuration ?? undefined,
    titleOverlay: doc.variants[0]?.titleOverlay ?? r.settings.defaults.titleOverlay,
  });
  const hashtags = Array.isArray(data.metadata.hashtags) ? data.metadata.hashtags.join(" ") : data.metadata.hashtags;
  const sourceLines = data.sources.map((s) => `[${s.type}] ${s.reference}${s.note ? ` · ${s.note}` : ""}`);
  return projectSchema.parse({
    ...doc,
    scenes,
    variants: [variant, ...doc.variants.slice(1).map((v) => ({ ...v, sceneIds: ids, sceneOverrides: {}, framing: {} }))],
    script: data.sections.map((s) => s.scenes.map((c) => c.narration.trim()).join("\n")).join("\n\n"),
    outline: data.summary,
    sources: [...sourceLines, data.versionNote && `Version followed: ${data.versionNote}`, ...data.verses.map((x) => `[verse] ${x.reference}${x.source ? ` · ${x.source}` : ""}`)].filter(Boolean).join("\n"),
    targetDuration: r.targetDuration ?? Math.max(1, Math.round(scenes.reduce((n, s) => n + s.duration, 0))),
    publishing: {
      titles: data.metadata.youtubeTitles.length ? data.metadata.youtubeTitles : [data.title],
      description: data.metadata.description,
      hashtags,
      thumbnailPrompt: data.metadata.thumbnailPrompt,
      chapters: data.metadata.chapters,
    },
    stages: { ...doc.stages, Script: true, Storyboard: true, Prompts: true },
    video: { ...doc.video, importedAt: new Date().toISOString(), generated: data, review },
  });
}

export const videoStatuses = ["Draft", "Script Ready", "Images Pending", "Voice Ready", "Ready to Render", "Completed"] as const;
export type VideoStatus = (typeof videoStatuses)[number];
export const statusHelp: Record<VideoStatus, string> = {
  Draft: "Copy the full prompt, generate the script with an AI tool and import the JSON",
  "Script Ready": "Review the script, then upload an image for each scene",
  "Images Pending": "Some scenes still need an image",
  "Voice Ready": "All images are in place; generate the Telugu voice",
  "Ready to Render": "Voice and captions are ready; preview and render",
  Completed: "A full export of the current version is available",
};

// Each status names the next step in the manual workflow.
export function videoStatus(doc: ProjectDoc, jobs: { kind: string; state: string; projectId?: string; result?: { draft?: boolean; variantId?: string } | null }[] = []): VideoStatus {
  const scenes = doc.variants[0] ? doc.variants[0].sceneIds.map((id) => doc.scenes.find((s) => s.id === id)).filter((s) => !!s) : doc.scenes;
  if (!scenes.length || !scenes.some((s) => s.narration.trim())) return "Draft";
  if (jobs.some((j) => j.kind === "render" && j.state === "completed" && !j.result?.draft)) return "Completed";
  const images = scenes.filter((s) => s.assetId).length;
  if (images < scenes.length) return images || scenes.some((s) => s.audioId) ? "Images Pending" : "Script Ready";
  const voiced = scenes.every((s) => s.audioId && !s.narrationStale);
  const captioned = scenes.every((s) => s.captions.length && !s.captionsStale);
  return voiced && captioned ? "Ready to Render" : "Voice Ready";
}

export type EpisodePlan = { episode: number; title: string; references: string; verses?: VerseRule };

// Next episodes for a chaptered scripture: continues after the last referenced verse and keeps
// each episode inside one chapter. A chapter's leftover verses get their own episode with a
// matching per-video verse count, instead of crossing into the next chapter.
export function suggestEpisodes(settings: SeriesSettings, formatId: string, after: string, count: number, firstEpisode: number): EpisodePlan[] {
  const format = settings.formats.find((f) => f.id === formatId);
  const chapters = settings.sources.chapterVerses;
  if (!format || !chapters.length) return [];
  const per = format.verses.mode === "exact" ? format.verses.exact! : format.verses.mode === "range" ? Math.max(1, format.verses.max) : 1;
  const refs = (after.match(/\d+\s*[.:]\s*\d+/g) || []).map((t) => t.split(/[.:]/).map((n) => Number(n.trim())));
  let [chapter, verse] = refs.length ? refs.reduce((a, b) => (b[0] > a[0] || (b[0] === a[0] && b[1] > a[1]) ? b : a)) : [1, 0];
  const out: EpisodePlan[] = [];
  while (out.length < count && chapter <= chapters.length) {
    if (verse >= chapters[chapter - 1]) { chapter++; verse = 0; continue; }
    const start = verse + 1, end = Math.min(chapters[chapter - 1], verse + per), n = end - start + 1;
    const references = n === 1 ? `${chapter}.${start}` : `${chapter}.${start}–${chapter}.${end}`;
    out.push({
      episode: firstEpisode + out.length,
      title: `అధ్యాయం ${chapter} · ${n === 1 ? "శ్లోకం" : "శ్లోకాలు"} ${references}`,
      references: Array.from({ length: n }, (_, k) => `${chapter}.${start + k}`).join(", "),
      verses: n !== per ? { mode: "exact", exact: n, min: 0, max: 0, label: format.verses.label } : undefined,
    });
    verse = end;
  }
  return out;
}
