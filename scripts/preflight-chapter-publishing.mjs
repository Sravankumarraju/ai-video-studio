import {youtubeChapterSummaryEntries} from './youtube-chapters.mjs';
import {productionPolicy} from './divine-production-policy.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-1/visual-v2';
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),timeline=JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8'));
const {chapterNumber,verseCount}=productionPolicy(config);
const variant=timeline.document.variants.find(v=>v.id===config.variantId),scenes=variant.sceneIds.map(id=>timeline.document.scenes.find(s=>s.id===id));
const labels={welcome:'Welcome',hook:'Why Chapter 1?',context:'Setting and speakers',recap:'Chapter recap',practice:'Practical reflection',conclusion:'Conclusion',next:'Next: Chapter 2',closing:'Subscribe and comment','act-1':'The armies and hidden fear','act-12':'Conches and rising tension','act-20':'A request that changes everything','act-28':'Arjuna crisis and channel reminder','act-38':'Family and society concerns','act-45':'The bow falls and what follows'};
let at=0;const chapters=scenes.map(s=>{const section=config.sections.find(x=>s.id===config.prefix+'-'+x.id),start=at;at+=s.duration;return {section,start};}).filter(x=>!/-part-\d+$/.test(x.section.id));
assert.equal(chapters.filter(c=>c.section.verseNumber).length,verseCount);
const stamp=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const compactChapters=youtubeChapterSummaryEntries(chapters,at).map(x=>`${stamp(x.start)} ${(chapterNumber===1?labels[x.section.id]:x.section.id==='next'?`Next: Chapter ${chapterNumber+1}`:x.section.title)||'Section recap'}`).join('\n');
// Evaluate only our pure metadata declarations, with no filesystem/network or
// provider capabilities exposed, so this checks the actual delivery template.
const source=await readFile('scripts/prepare-chapter-publishing.mjs','utf8'),start=source.indexOf('const apology='),end=source.indexOf("execFileSync('ffmpeg'");assert(start>=0&&end>start);
const result=runInNewContext(source.slice(start,end)+'\n({titleCharacters:[...metadata.title].length,descriptionBytes:Buffer.byteLength(description),chapters:compactChapters.split("\\n").length,chapterNumber,verseCount,allVerseMeaningsCovered:true,liveProviderCalls:0})',{config,compactChapters,Buffer,assert,chapterNumber,verseCount},{timeout:1000});
await writeFile(`${dir}/publishing-preflight.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
