import {describe,it,expect} from 'vitest';
import {layoutCaptions} from '../lib/caption-layout';
import {newScene,projectSchema,variantSchema} from '../lib/schema';
import {assFile} from '../worker/render';

const cue={id:'verse',start:0,end:6,text:'కౌసల్యా సుప్రజా ।\nరామ ॥ 1 ॥',display:'full-verse' as const,accuracy:'aligned' as const,
 words:[{text:'కౌసల్యా',start:.5,end:1.5},{text:'సుప్రజా',start:2,end:3},{text:'రామ',start:3.5,end:4.5}]};
describe('complete verse word highlighting',()=>{
 it('holds the complete numbered verse while retaining only audible-word timing',()=>{
  const pages=layoutCaptions([cue],{maxWidthPx:1600,fontPx:82});
  expect(pages).toHaveLength(1);expect(pages[0]).toMatchObject({start:0,end:6,held:true,timed:true});
  expect(pages[0].lines.map(line=>line.map(w=>w.text).join(' '))).toEqual(cue.text.split('\n'));
  expect(pages[0].lines.flat().filter(w=>w.start!==undefined)).toEqual(cue.words);
  expect(pages[0].lines.flat().find(w=>w.text==='1')?.start).toBeUndefined();
 });
 it('keeps a verse without supplied word timings static',()=>{
  const [page]=layoutCaptions([{...cue,words:undefined}],{maxWidthPx:1600,fontPx:82});expect(page.held).toBe(true);expect(page.timed).toBe(false);
 });
 it('retains the whole verse through breath pauses with no highlighted punctuation or number',()=>{
  const scene={...newScene(),duration:6,captions:[cue]};
  const variant=variantSchema.parse({id:'full',name:'Full verse',aspect:'landscape',sceneIds:[scene.id],fontSize:82,wordHighlight:true});
  const doc=projectSchema.parse({title:'Full verse',language:'te',subtitleLanguage:'te',scenes:[scene],variants:[variant]});
  const events=assFile(doc,variant,1920,1080).split('\n').filter(line=>line.startsWith('Dialogue:'));
  expect(events.every(line=>line.includes(',Verse,')&&line.replace(/\{[^}]*\}/g,'').includes('రామ ॥ 1 ॥'))).toBe(true);
  const during=events.find(line=>line.includes('0:00:00.50,0:00:01.50'))!;
  expect(during).toContain('{\\c&H004AD5FF}కౌసల్యా');
  const pause=events.find(line=>line.includes('0:00:01.50,0:00:02.00'))!;
  expect(pause).not.toContain('{\\c');expect(pause).toContain('కౌసల్యా సుప్రజా');
  expect(events.join('\n')).not.toContain('{\\c&H004AD5FF}1');
 });
});
