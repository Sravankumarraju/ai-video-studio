import type { ProjectDoc, Scene } from "./schema";
import { durationPlan } from "./duration";
export const templates: Record<string, string> = {
  research:
    "Create an outline from these supplied sources: {{sources}}. Distinguish traditional accounts, interpretation and fiction. Never fabricate quotations or citations.",
  script:
    "Write only the narration script with a hook, opening, story, conclusion and a closing call to action asking viewers to like, subscribe, and comment on what they learned today. Use {{language}}. Topic: {{topic}}. Sources: {{sources}}. Classification: {{sourceClassification}}. Do not invent scripture quotations or citations.",
  storyboard:
    "Convert the following script into JSON only, an array of objects with title, narration, visual, imagePrompt, videoPrompt, duration (seconds), mediaType (image or video). Divide into coherent scenes. Script: {{script}}",
  image:
    "Create an illustration: {{visual}}. {{styleGuide}}. Character details: {{characters}}. Avoid text and watermarks.",
  video:
    "Create a cinematic clip: {{visual}}. Camera and motion: {{motion}}. {{styleGuide}}.",
  voice:
    "Read naturally with clear pronunciation and coherent delivery. Pronunciation notes: {{pronunciation}}. Narration: {{narration}}",
  thumbnail:
    "Create an expressive, clear thumbnail illustration for {{title}}. Leave space for a title. {{styleGuide}}.",
  publishing:
    "Return JSON only with titles (array of strings), description, hashtags (string), thumbnailPrompt, chapters (string). Project: {{title}}. Script: {{script}}. Do not claim sources beyond those supplied.",
};
export const aspectLabel = (a: "landscape" | "vertical") =>
  a === "vertical" ? "vertical 9:16" : "landscape 16:9";
export function expandPrompt(
  stage: string,
  doc: ProjectDoc,
  scene?: Scene,
  global?: string,
  aspect?: "landscape" | "vertical",
) {
  const template =
    scene?.promptOverrides[stage] ||
    doc.promptOverrides[stage] ||
    global ||
    templates[stage] ||
    "";
  const ctx: Record<string, unknown> = {
    ...doc,
    ...scene,
    title: doc.title,
    sceneTitle: scene?.title || "",
    // Only the characters assigned to this scene; every character otherwise.
    characters: JSON.stringify(
      scene?.characterIds.length
        ? doc.characters.filter((c) => scene.characterIds.includes(c.id))
        : doc.characters,
    ),
  };
  const plan = durationPlan(doc.targetDuration);
  return (
    `Language: ${doc.language}; audience: ${doc.audience}; target duration: ${doc.targetDuration}s; style: ${doc.style}; aspect: ${aspectLabel(aspect || doc.variants[0]?.aspect || "landscape")}; subtitle language: ${doc.subtitleLanguage}. Planning guide: approximately ${plan.minimumWords}-${plan.maximumWords} words and ${plan.suggestedScenes} coherent scenes, adjusted for this language and natural delivery. Never speed up narration to force a target. Scene clip limits are independent of total video length.\n` +
    template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(ctx[k] ?? ""))
  );
}
