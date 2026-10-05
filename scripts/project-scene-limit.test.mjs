import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceNarrationSourcesWithFinalScenes} from './project-scene-limit.mjs';

test('Chapter 2 assembly replaces temporary narration sources before applying the 200-scene limit',()=>{
 const sources=Array.from({length:31},(_,i)=>({id:`source-${i}`}));
 const finals=Array.from({length:170},(_,i)=>({id:`final-${i}`}));
 assert.equal(sources.length+finals.length,201);
 const scenes=replaceNarrationSourcesWithFinalScenes(sources,sources.map(s=>s.id),finals);
 assert.equal(scenes.length,170);
 assert.deepEqual(scenes.map(s=>s.id),finals.map(s=>s.id));
});

test('unrelated project scenes remain and the final limit is still enforced',()=>{
 const sources=[{id:'source'}],unrelated=[{id:'existing'}],finals=Array.from({length:199},(_,i)=>({id:`final-${i}`}));
 assert.equal(replaceNarrationSourcesWithFinalScenes([...unrelated,...sources],['source'],finals).length,200);
 assert.throws(()=>replaceNarrationSourcesWithFinalScenes([...unrelated,{id:'existing-2'},...sources],['source'],finals));
});
