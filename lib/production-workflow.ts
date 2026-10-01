import { newScene, projectSchema, type ProjectDoc, type Scene } from "./schema";
import { createVideoVersion } from "./project-edit";
import { timeline } from "./timeline";

export const callsToAction = {
  te: "ఈ వీడియో ద్వారా మీరు ఈ రోజు ఏం నేర్చుకున్నారు? కామెంట్‌లో చెప్పండి. వీడియో నచ్చితే లైక్ చేయండి. మరిన్ని జ్ఞాన విషయాల కోసం మన ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.",
  hi: "इस वीडियो से आज आपने क्या सीखा? कमेंट में बताइए। वीडियो अच्छा लगा तो लाइक कीजिए। ऐसी और सीख के लिए हमारे चैनल को सब्सक्राइब कीजिए।",
  en: "What did you learn from today's video? Tell us in the comments. If this helped you, like this video and subscribe to our channel for more wisdom.",
};

// Keeps the paid recording intact. Only the visual boundaries and source offsets change.
export function splitVisualScene(scene: Scene, seconds: number): Scene[] {
  if (!Number.isFinite(seconds) || seconds < 2 || seconds > 60) throw Error("Shot length must be 2–60 seconds");
  if (scene.transition === "crossfade" || scene.fadeIn || scene.fadeOut) throw Error("Use cut transitions and zero audio fades before splitting narration into visual shots");
  const count = Math.ceil(scene.duration / seconds);
  const size = scene.duration / count;
  return Array.from({ length: count }, (_, i) => {
    const start = size * i, end = i === count - 1 ? scene.duration : size * (i + 1);
    const captions = scene.captions.filter(c => c.start < end && c.end > start).map(c => ({
      ...structuredClone(c), id: crypto.randomUUID(), start: Math.max(0, c.start - start), end: Math.min(end, c.end) - start,
      words: c.words?.filter(w => w.start < end && w.end > start).map(w => ({ ...w, start: Math.max(0, w.start - start), end: Math.min(end, w.end) - start })),
    }));
    return { ...structuredClone(scene), id: crypto.randomUUID(), title: `${scene.title} · shot ${i + 1}/${count}`,
      duration: end - start, audioStart: scene.audioStart + start, audioSlice: true, captions, transition: "cut", overlap: 0,
      motion: i % 2 ? "zoom-out" : "zoom-in", fadeIn: 0, fadeOut: 0,
      focalY: i % 2 ? 0.55 : 0.35,
      // Preserve the reviewed script on the original scene; each shot describes its audible passage.
      narration: captions.map(c => c.words?.map(w => w.text).join(" ") || c.text).join(" ") || scene.narration,
      imagePrompt: `${scene.imagePrompt || scene.visual}\nShot ${i + 1}/${count}: show a distinct composition appropriate to this passage: ${captions.map(c => c.text).join(" ")}. Wide 16:9 composition; no text or watermark.`,
    };
  });
}

export function landscapeShotVersion(doc: ProjectDoc, variantId: string, seconds = 8) {
  const copy = createVideoVersion(doc, variantId, "16:9 · visual shots");
  const shots = copy.variant.sceneIds.flatMap(id => splitVisualScene(copy.document.scenes.find(s => s.id === id)!, seconds));
  const variant = { ...copy.variant, aspect: "landscape" as const, sceneIds: shots.map(s => s.id), sceneOverrides: {}, framing: {}, fontSize: 48, maxDuration: 7200 };
  const document = projectSchema.parse({ ...copy.document, scenes: [...doc.scenes, ...shots], variants: [...doc.variants, variant] });
  return { document, variant };
}

export function addCallToAction(doc: ProjectDoc, variantId: string) {
  const v = doc.variants.find(v => v.id === variantId);
  if (!v) throw Error("Select an output variant");
  const last = timeline(doc, v).at(-1)!.scene;
  if (last.title === "Subscribe · like · comment") throw Error("This version already has a closing call to action");
  const scene = { ...newScene(), title: "Subscribe · like · comment", narration: callsToAction[doc.language],
    assetId: last.assetId, imagePrompt: last.imagePrompt, visual: last.visual, mediaType: last.mediaType,
    voiceId: last.voiceId, providers: structuredClone(last.providers), modes: structuredClone(last.modes), duration: 15 };
  return { document: projectSchema.parse({ ...doc, scenes: [...doc.scenes, scene], variants: doc.variants.map(x => x.id === v.id ? { ...x, sceneIds: [...x.sceneIds, scene.id] } : x) }), scene };
}

export function visualPromptPack(doc: ProjectDoc, variantId: string) {
  const v = doc.variants.find(v => v.id === variantId);
  if (!v) throw Error("Select an output variant");
  return { project: doc.title, aspect: v.aspect === "landscape" ? "16:9" : "9:16", language: doc.language,
    instruction: "Generate each asset separately. Keep character identity and style consistent. Return filenames using sceneId. Never add captions, logos or watermarks; the editor adds those. Upload the results in Assets and assign by sceneId. Video clip duration limits depend on your provider.",
    metaPrompt: "Act as a film storyboard artist. Review the timed shots below. Refine each image and video prompt into a distinct, historically respectful composition, preserving the stated speaker, scripture reference, narration meaning, character identity, style and aspect ratio. Return JSON with sceneId, imagePrompt and videoPrompt. Never invent scripture text or place rendered text in an image. Do not combine shots into one image. Keep the supplied timing and scene IDs.",
    shots: timeline(doc, v).map(t => ({ sceneId: t.scene.id, title: t.scene.title, start: t.start, end: t.end,
      duration: t.scene.duration, narration: t.scene.narration, audioStart: t.scene.audioStart,
      imagePrompt: t.scene.imagePrompt || `${t.scene.visual}. ${doc.style}. ${doc.styleGuide}. ${v.aspect === "landscape" ? "16:9" : "9:16"}; no text or watermarks.`,
      videoPrompt: t.scene.videoPrompt || `${t.scene.visual}. ${doc.style}. Slow cinematic camera movement, ${t.scene.duration.toFixed(2)} seconds, ${v.aspect === "landscape" ? "16:9" : "9:16"}; no dialogue, no text, no watermark.`,
      motion: t.scene.motion, assetId: t.scene.assetId, audioId: t.scene.audioId })),
  };
}
