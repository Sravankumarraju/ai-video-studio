import type { GenerationResult } from "./providers";
export function alignmentCaptions(
  a: NonNullable<GenerationResult["alignment"]>,
  audioDuration?: number,
) {
  if (
    a.characters.length !== a.character_start_times_seconds.length ||
    a.characters.length !== a.character_end_times_seconds.length
  )
    throw Error("Invalid alignment");
  const out: {
    id: string;
    start: number;
    end: number;
    text: string;
    accuracy: "aligned";
    words: { text: string; start: number; end: number }[];
  }[] = [];
  let text = "",
    start = 0,
    word = "",
    wordStart = 0,
    words: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    if (!text) start = a.character_start_times_seconds[i];
    text += ch;
    if (!word && !/\s/u.test(ch))
      wordStart = a.character_start_times_seconds[i];
    if (!/\s/u.test(ch)) word += ch;
    const phraseEnd = /[.!?।\n]/u.test(ch) || i === a.characters.length - 1;
    if ((/\s/u.test(ch) || phraseEnd) && word) {
      words.push({
        text: word,
        start: wordStart,
        end: a.character_end_times_seconds[
          /\s/u.test(ch) ? Math.max(0, i - 1) : i
        ],
      });
      word = "";
    }
    if (phraseEnd) {
      if (text.trim())
        out.push({
          id: crypto.randomUUID(),
          start,
          end: a.character_end_times_seconds[i],
          text: text.trim(),
          accuracy: "aligned",
          words,
        });
      text = "";
      words = [];
    }
  }
  if (out.some(c => c.end <= c.start || c.words.some(w => w.end <= w.start)))
    throw Error("Provider alignment contains collapsed speech timing; review recording and captions");
  if (audioDuration !== undefined) {
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) throw Error("Invalid audio duration");
    const last = Math.max(0, ...a.character_end_times_seconds);
    if (last > audioDuration + 0.25) throw Error("Alignment exceeds recorded audio duration");
    return out.filter(c => c.start < audioDuration).map(c => ({
      ...c,
      end: Math.min(c.end, audioDuration),
      words: c.words.filter(w => w.start < audioDuration).map(w => ({ ...w, end: Math.min(w.end, audioDuration) })),
    }));
  }
  return out;
}

// Keep paid recordings available even when provider timing cannot safely be used.
// Stale flags prevent exporting potentially incomplete speech as reviewed output.
export function narrationTiming(
  alignment: GenerationResult["alignment"],
  duration: number,
) {
  try {
    return {
      captions: alignment ? alignmentCaptions(alignment, duration) : [],
      narrationStale: false,
      captionsStale: false,
      status: "Narration generated",
    };
  } catch {
    return {
      captions: [],
      narrationStale: true,
      captionsStale: true,
      status: "Recording saved; provider timing is invalid. Review narration and rebuild captions before export.",
    };
  }
}
