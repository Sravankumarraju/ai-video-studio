import { describe, it, expect } from "vitest";
import {
  seriesTemplates,
  createVideoDocument,
  applySeriesUpdates,
  buildFullPrompt,
  validateGenerated,
  applyGenerated,
  videoStatus,
  resolveVideo,
  suggestEpisodes,
} from "../lib/series";
import { seriesSettingsSchema } from "../lib/series-schema";

const series = (templateId: keyof typeof seriesTemplates, revision = 1) => ({ id: `series-${templateId}`, revision, settings: structuredClone(seriesTemplates[templateId]) });
const gitaVideo = () => createVideoDocument(series("bhagavad-gita"), "కర్మయోగం · 2.47–2.48", { topic: "నిష్కామ కర్మ", references: "2.47, 2.48" });

const scene = (narration: string, extra = {}) => ({ narration, visual: "Krishna teaching Arjuna", imagePrompt: "Krishna and Arjuna on the chariot at dawn, no text", ...extra });
const verse = (reference: string, original: string) => ({ reference, original, meaning: "నీకు కర్మ చేయడంలోనే అధికారం", source: "Bhagavad Gita" });
const v47 = "కర్మణ్యేవాధికారస్తే మా ఫలేషు కదాచన";
const v48 = "యోగస్థః కురు కర్మాణి సంగం త్యక్త్వా ధనంజయ";
function gitaJson(overrides: Record<string, unknown> = {}) {
  return {
    title: "నిష్కామ కర్మ రహస్యం",
    sources: [{ type: "scripture", reference: "Bhagavad Gita 2.47–2.48" }],
    verses: [verse("2.47", v47), verse("2.48", v48)],
    sections: [
      { id: "intro", title: "పరిచయం", scenes: [scene("ఫలితం గురించి ఆలోచించకుండా పని చేయగలమా?")] },
      { id: "context", title: "సందర్భం", scenes: [scene("అర్జునుడు యుద్ధభూమిలో సందేహంలో ఉన్నాడు.")] },
      { id: "recitation", title: "శ్లోక పఠనం", contentKind: "scripture", scenes: [scene(`${v47}. ${v48}.`)] },
      { id: "meaning", title: "అర్థం", contentKind: "translation", scenes: [scene("నీకు పని చేయడంలోనే అధికారం ఉంది.")] },
      { id: "explanation", title: "వివరణ", contentKind: "commentary", scenes: [scene("వ్యాఖ్యాతలు దీనిని నిష్కామ కర్మ అంటారు.")] },
      { id: "examples", title: "ఉదాహరణలు", contentKind: "illustration", scenes: [scene("ఇది ఒక ఉదాహరణ మాత్రమే. ఒక విద్యార్థి పరీక్షకు చదువుతాడు.")] },
      { id: "conclusion", title: "ముగింపు", scenes: [scene("ఈ వారం ఒక పని ఫలితం ఆశించకుండా చేయండి.")] },
    ],
    metadata: { youtubeTitles: ["కర్మణ్యేవాధికారస్తే అర్థం"], description: "భగవద్గీత 2.47–2.48", hashtags: ["#BhagavadGita", "#Telugu"] },
    ...overrides,
  };
}

describe("project templates", () => {
  it("ships Bhagavad Gita, Lord Vishnu, Lord Shiva and a blank custom template, all Telugu", () => {
    expect(Object.keys(seriesTemplates).sort()).toEqual(["bhagavad-gita", "custom", "shiva", "vishnu"]);
    for (const t of Object.values(seriesTemplates)) {
      expect(seriesSettingsSchema.parse(t).language).toBe("te");
      expect(t.defaults.targetDuration).toBeNull();
    }
    const gita = seriesTemplates["bhagavad-gita"].formats[0];
    expect(gita.verses).toMatchObject({ mode: "exact", exact: 2 });
    const story = seriesTemplates.vishnu.formats.find(f => f.id === "story")!;
    expect(story.structure.map(s => s.id)).toEqual(["intro", "source-context", "story", "meaning", "lesson", "conclusion"]);
    expect(story.verses.mode).toBe("optional");
    const stotra = seriesTemplates.shiva.formats.find(f => f.id === "stotra")!;
    expect(stotra.structure.map(s => s.id)).toEqual(["intro", "selected-verses", "recitation", "meaning", "explanation", "takeaway"]);
    expect(stotra.verses).toMatchObject({ mode: "range", min: 1 });
  });
  it("rejects an exact verse rule without a count and a default format that does not exist", () => {
    const bad = structuredClone(seriesTemplates.custom);
    bad.formats[0].verses = { mode: "exact", min: 0, max: 0, label: "x" };
    expect(seriesSettingsSchema.safeParse(bad).success).toBe(false);
    expect(seriesSettingsSchema.safeParse({ ...seriesTemplates.custom, defaultFormatId: "missing" }).success).toBe(false);
  });
});

describe("video inheritance", () => {
  it("snapshots project settings so later project edits leave existing videos unchanged", () => {
    const s = series("bhagavad-gita");
    const doc = createVideoDocument(s, "Video", { references: "2.47, 2.48" });
    s.settings.narration.tone = "Changed tone";
    s.settings.formats[0].structure.pop();
    expect(doc.video!.settings.narration.tone).not.toBe("Changed tone");
    expect(resolveVideo(doc.video!).structure).toHaveLength(8);
    expect(doc.language).toBe("te");
    expect(doc.video!.settingsRevision).toBe(1);
  });
  it("applies project updates only on request, keeping the video's inputs and overrides", () => {
    const doc = createVideoDocument(series("vishnu"), "Gajendra Moksham", { topic: "గజేంద్ర మోక్షం" }, "story", { aspect: "vertical" });
    const updated = series("vishnu", 4);
    updated.settings.narration.pronunciation = "గజేంద్రుడు";
    const next = applySeriesUpdates(doc, updated);
    expect(next.video!.settingsRevision).toBe(4);
    expect(next.pronunciation).toBe("గజేంద్రుడు");
    expect(next.video!.inputs.topic).toBe("గజేంద్ర మోక్షం");
    expect(resolveVideo(next.video!).aspect).toBe("vertical");
  });
  it("lets a video choose another of its project's formats", () => {
    const doc = createVideoDocument(series("shiva"), "Ganga story", {}, "story");
    expect(resolveVideo(doc.video!).verses.mode).toBe("optional");
    expect(() => createVideoDocument(series("shiva"), "x", {}, "missing")).toThrow("formats");
  });
});

describe("Copy Full Prompt JSON", () => {
  it("combines project, source rules, video inputs, structure, preferences and the output schema", () => {
    const prompt = buildFullPrompt(gitaVideo());
    for (const part of ["## 1. Project", "## 2. Content template and source rules", "## 3. This video", "## 4. Required script structure", "## 5. Narration and visual preferences", "## 6. Output JSON schema"])
      expect(prompt).toContain(part);
    expect(prompt).toContain("Bhagavad Gita · Telugu");
    expect(prompt).toContain("References chosen by the owner (use these exactly; do not substitute others): 2.47, 2.48");
    expect(prompt).toContain('exactly 2 items');
    expect(prompt).toContain('id "recitation"');
    expect(prompt).toContain("Never invent scripture quotations");
    expect(prompt).toContain("Sri Krishna:");
    expect(prompt).toContain('"youtubeTitles"');
    expect(prompt).toContain("no fixed duration");
  });
  it("never forces verses into a story and states an optional target length as a guide", () => {
    const doc = createVideoDocument(series("vishnu"), "Prahlada", { topic: "ప్రహ్లాదుడు", targetDuration: 420 }, "story");
    const prompt = buildFullPrompt(doc);
    expect(prompt).toContain("Verses are optional");
    expect(prompt).toContain("Do not force a verse into a story");
    expect(prompt).toContain("about 7 minutes");
    expect(prompt).toContain("guide only");
    expect(prompt).not.toContain("exactly 2 items");
  });
});

describe("Import Generated JSON validation", () => {
  it("accepts a complete two-shloka script, with or without code fences", () => {
    const doc = gitaVideo();
    const result = validateGenerated("```json\n" + JSON.stringify(gitaJson()) + "\n```", doc);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.estimatedSeconds).toBeGreaterThan(0);
  });
  it("enforces exactly two shlokas for the Bhagavad Gita template", () => {
    const r = validateGenerated(gitaJson({ verses: [verse("2.47", v47)] }), gitaVideo());
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("exactly 2");
  });
  it("rejects verse references the owner did not request", () => {
    const r = validateGenerated(gitaJson({ verses: [verse("2.47", v47), verse("2.50", v48)] }), gitaVideo());
    expect(r.errors.join(" ")).toContain('"2.50" is not one you requested');
  });
  it("requires required sections, template order and Telugu narration", () => {
    const base = gitaJson();
    const missing = { ...base, sections: base.sections.filter(s => s.id !== "recitation") };
    expect(validateGenerated(missing, gitaVideo()).errors.join(" ")).toContain('"recitation"');
    const swapped = { ...base, sections: [base.sections[1], base.sections[0], ...base.sections.slice(2)] };
    expect(validateGenerated(swapped, gitaVideo()).errors.join(" ")).toContain("template order");
    const english = { ...base, sections: [{ id: "intro", scenes: [scene("Welcome to the channel")] }, ...base.sections.slice(1)] };
    expect(validateGenerated(english, gitaVideo()).errors.join(" ")).toContain("must be in Telugu");
    expect(validateGenerated({ ...base, sections: [...base.sections, { id: "bonus", scenes: [scene("అదనపు")] }] }, gitaVideo()).errors.join(" ")).toContain('"bonus"');
  });
  it("warns when the recitation does not speak the quoted verse", () => {
    const base = gitaJson();
    const sections = base.sections.map(s => s.id === "recitation" ? { ...s, scenes: [scene(v47)] } : s);
    const r = validateGenerated({ ...base, sections }, gitaVideo());
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toContain("verse 2.48");
  });
  it("lets stories have no verses but requires verses for a stotra", () => {
    const story = createVideoDocument(series("vishnu"), "Gajendra", {}, "story");
    const sections = ["intro", "source-context", "story", "meaning", "lesson", "conclusion"].map(id => ({ id, contentKind: id === "lesson" ? "illustration" : "tradition", scenes: [scene("గజేంద్రుడు శ్రీహరిని ప్రార్థించాడు.")] }));
    const ok = validateGenerated({ title: "గజేంద్ర మోక్షం", sources: [{ type: "tradition", reference: "Srimad Bhagavatam, Canto 8" }], sections }, story);
    expect(ok.errors).toEqual([]);
    const stotra = createVideoDocument(series("shiva"), "Panchakshara", {}, "stotra");
    const stotraSections = ["intro", "selected-verses", "recitation", "meaning", "explanation", "takeaway"].map(id => ({ id, scenes: [scene("నమః శివాయ")] }));
    expect(validateGenerated({ title: "పంచాక్షరి", sections: stotraSections }, stotra).errors.join(" ")).toContain("1–8 verses");
  });
  it("explains invalid JSON instead of throwing", () => {
    expect(validateGenerated("{ not json", gitaVideo()).errors[0]).toContain("not valid JSON");
  });
});

describe("applying an import", () => {
  it("creates one scene per planned scene with prompts, voice, publishing data and a version", () => {
    const doc = gitaVideo();
    doc.video!.settings.defaults.voiceId = "te-voice";
    const data = validateGenerated(gitaJson(), doc).data!;
    const next = applyGenerated(doc, data);
    expect(next.scenes).toHaveLength(7);
    expect(next.scenes[0]).toMatchObject({ voiceId: "te-voice", promptOverrides: { section: "intro" } });
    expect(next.scenes[2].imagePrompt).toContain("Krishna");
    expect(next.variants).toHaveLength(1);
    expect(next.variants[0].sceneIds).toEqual(next.scenes.map(s => s.id));
    expect(next.publishing.titles[0]).toBe("కర్మణ్యేవాధికారస్తే అర్థం");
    expect(next.sources).toContain("[scripture] Bhagavad Gita 2.47–2.48");
    expect(next.video!.importedAt).toBeTruthy();
  });
  it("refuses to discard uploaded images or voice unless replacing is confirmed", () => {
    const doc = gitaVideo();
    const data = validateGenerated(gitaJson(), doc).data!;
    const once = applyGenerated(doc, data);
    once.scenes[0].assetId = "image-1";
    expect(() => applyGenerated(once, data)).toThrow("Confirm replacing");
    expect(applyGenerated(once, data, true).scenes[0].assetId).toBeUndefined();
  });
});

describe("episodes", () => {
  it("suggests the next two-shloka episodes after the furthest verse already covered", () => {
    const plan = suggestEpisodes(seriesTemplates["bhagavad-gita"], "two-shlokas", "1.2, 1.3", 3, 3);
    expect(plan.map(p => p.references)).toEqual(["1.4, 1.5", "1.6, 1.7", "1.8, 1.9"]);
    expect(plan.map(p => p.episode)).toEqual([3, 4, 5]);
    expect(plan[0].title).toContain("1.4–1.5");
    expect(plan[0].verses).toBeUndefined();
  });
  it("keeps episodes inside a chapter, giving a leftover verse its own episode and verse count", () => {
    // Chapter 1 has 47 verses: 1.46–1.47 is the last pair, then chapter 2 begins.
    const plan = suggestEpisodes(seriesTemplates["bhagavad-gita"], "two-shlokas", "1.44, 1.45", 2, 24);
    expect(plan.map(p => p.references)).toEqual(["1.46, 1.47", "2.1, 2.2"]);
    // Chapter 5 has 29 verses: after 5.28 only 5.29 remains.
    const odd = suggestEpisodes(seriesTemplates["bhagavad-gita"], "two-shlokas", "5.27, 5.28", 2, 1);
    expect(odd[0]).toMatchObject({ references: "5.29", verses: { mode: "exact", exact: 1 } });
    expect(odd[1].references).toBe("6.1, 6.2");
  });
  it("starts at 1.1 when nothing is covered and returns nothing for projects without chapters", () => {
    expect(suggestEpisodes(seriesTemplates["bhagavad-gita"], "two-shlokas", "", 1, 1)[0].references).toBe("1.1, 1.2");
    expect(suggestEpisodes(seriesTemplates.vishnu, "story", "", 3, 1)).toEqual([]);
  });
  it("names the episode number in the full prompt", () => {
    const doc = gitaVideo();
    doc.video!.episode = 2;
    expect(buildFullPrompt(doc)).toContain("Episode: 2");
  });
});

describe("video status", () => {
  it("moves through Draft → Script Ready → Images Pending → Voice Ready → Ready to Render → Completed", () => {
    const doc = gitaVideo();
    expect(videoStatus(doc)).toBe("Draft");
    const next = applyGenerated(doc, validateGenerated(gitaJson(), doc).data!);
    expect(videoStatus(next)).toBe("Script Ready");
    next.scenes[0].assetId = "a";
    expect(videoStatus(next)).toBe("Images Pending");
    next.scenes.forEach(s => { s.assetId = "a"; });
    expect(videoStatus(next)).toBe("Voice Ready");
    next.scenes.forEach(s => { s.audioId = "v"; s.captions = [{ id: "c", start: 0, end: 1, text: "x", accuracy: "aligned" }]; });
    expect(videoStatus(next)).toBe("Ready to Render");
    expect(videoStatus(next, [{ kind: "render", state: "completed", result: { draft: true } }])).toBe("Ready to Render");
    expect(videoStatus(next, [{ kind: "render", state: "completed", result: { draft: false } }])).toBe("Completed");
  });
});
