// Lays burned-in captions out for the actual frame so no line runs off-screen in 16:9 or 9:16.
// Words are never split; long cues become several timed pages of at most two lines; a single
// word wider than the line (long Sanskrit compounds) is scaled down to fit instead of cut.

export type LayoutWord = { text: string; start?: number; end?: number };
export type CaptionCue = { start: number; end: number; text: string; words?: LayoutWord[]; display?: "phrases" | "full-verse" };
export type CaptionLine = LayoutWord[];
export type CaptionPage = { start: number; end: number; lines: CaptionLine[]; scale: number; timed: boolean; held?: boolean };

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : undefined;
const graphemes = (s: string) => (segmenter ? Array.from(segmenter.segment(s), (g) => g.segment) : Array.from(s));

// Conservative advance widths in em per grapheme cluster (Noto Sans faces): over-estimating
// only makes lines shorter, never lets them overflow.
export function textWidthEm(text: string) {
  let em = 0;
  for (const g of graphemes(text)) {
    if (/\s/u.test(g)) em += 0.3;
    else if (/[ఀ-౿]/u.test(g)) em += 0.82;
    else if (/[ऀ-ॿ]/u.test(g)) em += 0.68;
    else if (/[A-ZMW@%]/u.test(g)) em += 0.72;
    else em += 0.6;
  }
  return em;
}

export function layoutCaptions(cues: CaptionCue[], options: { maxWidthPx: number; fontPx: number; maxLines?: number }): CaptionPage[] {
  const maxLines = options.maxLines ?? 2, maxEm = options.maxWidthPx / options.fontPx, space = 0.3;
  const pages: CaptionPage[] = [];
  for (const cue of cues) {
    if (cue.display === "full-verse") {
      const lines = cue.text.split(/\r?\n/u).filter(l => l.trim()).map(l => l.trim().split(/\s+/u).map(text => ({ text })));
      if (!lines.length) continue;
      const widest = Math.max(...lines.map(l => textWidthEm(l.map(w => w.text).join(" "))));
      // Preserve authored line breaks and every word for the entire recitation. Never paginate.
      const scale = Math.min(1, maxEm / Math.max(widest, 1), 6 / lines.length);
      pages.push({ start: cue.start, end: cue.end, lines, scale, timed: false, held: true });
      continue;
    }
    const timed = !!cue.words?.length && cue.words.every((w) => w.start !== undefined && w.end !== undefined);
    const words: LayoutWord[] = timed ? cue.words!.filter((w) => w.text.trim()) : cue.text.split(/\s+/u).filter(Boolean).map((text) => ({ text }));
    if (!words.length) continue;
    const groups: { lines: CaptionLine[]; scale: number }[] = [];
    let lines: CaptionLine[] = [[]], width = 0, scale = 1;
    const close = () => { if (lines[0].length) groups.push({ lines, scale }); lines = [[]]; width = 0; scale = 1; };
    for (const word of words) {
      const w = textWidthEm(word.text);
      const line = lines[lines.length - 1];
      if (!line.length) {
        line.push(word); width = w;
      } else if (width + space + w <= maxEm) {
        line.push(word); width += space + w;
      } else if (lines.length < maxLines) {
        lines.push([word]); width = w;
      } else {
        close(); lines[0].push(word); width = w;
      }
      if (w > maxEm) scale = Math.min(scale, maxEm / w);
      // Sentence ends start a new page so a cue never shows two half-sentences.
      if (/[.!?।॥]$/u.test(word.text) && word !== words[words.length - 1]) close();
    }
    close();
    // Untimed cues share their duration by length; timed pages start at their first word.
    const total = groups.reduce((n, g) => n + g.lines.flat().reduce((m, w) => m + graphemes(w.text).length, 0), 0) || 1;
    let cursor = cue.start;
    groups.forEach((g, i) => {
      const first = g.lines[0][0], last = i === groups.length - 1;
      const start = i === 0 ? cue.start : timed ? first.start! : cursor;
      const share = (g.lines.flat().reduce((m, w) => m + graphemes(w.text).length, 0) / total) * (cue.end - cue.start);
      const end = last ? cue.end : timed ? groups[i + 1].lines[0][0].start! : start + share;
      cursor = end;
      if (end > start) pages.push({ start, end, lines: g.lines, scale: g.scale, timed });
    });
  }
  return pages;
}
