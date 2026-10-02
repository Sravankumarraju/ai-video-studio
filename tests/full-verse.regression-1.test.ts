import { it, expect } from "vitest";
import { projectSchema, newScene, variantSchema } from "../lib/schema";
import { layoutCaptions, textWidthEm } from "../lib/caption-layout";
import { assFile, captionGeometry } from "../worker/render";
import { subtitleFile, renderInputs } from "../lib/timeline";
import { remapMedia } from "../lib/backup";

const verse = "ధృతరాష్ట్ర ఉవాచ ।\nధర్మక్షేత్రే కురుక్షేత్రే సమవేతా యుయుత్సవః ।\nమామకాః పాండవాశ్చైవ కిమకుర్వత సంజయ ॥";
const scene = {...newScene(), duration: 20, captions: [
  {id: "verse", start: .02, end: 10.42, text: verse, accuracy: "manual", display: "full-verse"},
  {id: "meaning", start: 10.5, end: 20, text: "Meaning", accuracy: "manual"},
]};
const doc = projectSchema.parse({title: "Verse hold", scenes: [scene], variants: [variantSchema.parse({id: "te", name: "Telugu", aspect: "landscape", sceneIds: [scene.id], captions: false, wordHighlight: true, fontSize: 68})]});

it("keeps the complete shloka in one event only during recitation while ordinary captions are disabled", () => {
  for (const [w,h] of [[640,360], [1920,1080]]) {
    const v = doc.variants[0], g = captionGeometry(v,w,h);
    const [page] = layoutCaptions([doc.scenes[0].captions[0]],g);
    expect(page.lines.map(l => l.map(w => w.text).join(" ")).join("\n")).toBe(verse);
    expect(page.timed).toBe(false);
    expect(page.start).toBe(.02); expect(page.end).toBe(10.42);
    for (const line of page.lines) expect(textWidthEm(line.map(w => w.text).join(" ")) * g.fontPx * page.scale).toBeLessThanOrEqual(g.maxWidthPx + 1e-8);
    const events = assFile(doc,v,w,h).split("\n").filter(l => l.startsWith("Dialogue:"));
    expect(events).toHaveLength(1);
    expect(events[0]).toContain("0:00:00.02,0:00:10.42");
    expect(events[0]).toContain(verse.replace(/\n/g,"\\N"));
    expect(events[0]).toContain("{\\an5}");
    expect(events[0]).not.toContain("Meaning");
    expect(events[0]).not.toContain("{\\c");
  }
  expect(subtitleFile(doc,doc.variants[0],"srt")).toContain("00:00:00,020 --> 00:00:10,420\n" + verse);
});

it("preserves inherited and disabled logos on backup while remapping each version's logo", () => {
  const d = structuredClone(doc); d.logoId = "global";
  d.variants.push({...d.variants[0],id: "other",logoId: "selected", logoStart: 3});
  d.variants.push({...d.variants[0],id: "disabled",logoId: null});
  const before = renderInputs(d,"te");
  d.variants[1].logoId = "new";
  expect(renderInputs(d,"te")).toBe(before);
  const mapped = remapMedia(d,{global: "global-copy",new: "new-copy"});
  expect(mapped.logoId).toBe("global-copy");
  expect(mapped.variants[0].logoId).toBeUndefined();
  expect(mapped.variants[1].logoId).toBe("new-copy");
  expect(mapped.variants[1].logoStart).toBe(3);
  expect(mapped.variants[2].logoId).toBeNull();
});
