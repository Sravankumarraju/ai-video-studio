import test from 'node:test';
import assert from 'node:assert/strict';
import {saveMusicSnapshot} from './story-music-snapshot.mjs';

test('snapshot records live music settings while preserving scenes', async()=>{
  const old={id:'project',document:{scenes:[{id:'scene',narration:'saved voice'}]}};
  const live={...old,document:{...old.document,musicId:'music',ducking:true,musicVolume:.22}};
  let written;
  await saveMusicSnapshot({callTool:async()=>({content:[{type:'text',text:JSON.stringify(live)}]})},old,'music',async p=>{written=p;});
  assert.deepEqual(written,live);
  assert.equal(old.document.musicId,undefined);
});

test('missing music rejects verification snapshot', async()=>{
  const old={id:'project',document:{scenes:[]}};
  let written=false;
  await assert.rejects(saveMusicSnapshot({callTool:async()=>({content:[{type:'text',text:JSON.stringify(old)}]})},old,'music',async()=>{written=true;}));
  assert.equal(written,false);
});
