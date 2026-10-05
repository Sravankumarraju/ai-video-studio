import test from 'node:test';
import assert from 'node:assert/strict';
import {navaratriPublishing} from './navaratri-publishing.mjs';
import {assertAuthorizedNarrationBatchCount,assertNavaratriVisualReferences} from './divine-production-policy.mjs';
test('Durga-only introduction rejects generic filler even when its asset is current',()=>{
 const config={productionKind:'navaratri',deviOnlyIntro:true,prefix:'nav',sections:[{id:'meaning',image:'reflection'}]};
 assert.throws(()=>assertNavaratriVisualReferences(config,{images:{reflection:'current'}},[{id:'nav-meaning',assetId:'current'}]),/only reviewed Durga/);
 config.sections[0].image='grace';
 assert.doesNotThrow(()=>assertNavaratriVisualReferences(config,{images:{grace:'durga'}},[{id:'nav-meaning',assetId:'durga'}]));
});
test('a revised Navaratri export cannot retain an obsolete background',()=>{
 const config={productionKind:'navaratri',prefix:'nav',sections:[{id:'reflection',image:'reflection'}]};
 const state={images:{reflection:'reviewed-devi-background-v2'}};
 assert.throws(()=>assertNavaratriVisualReferences(config,state,[{id:'nav-reflection',assetId:'obsolete-gita-background'}]),/Outdated/);
 assert.doesNotThrow(()=>assertNavaratriVisualReferences(config,state,[{id:'nav-reflection',assetId:'reviewed-devi-background-v2'}]));
});
test('new series cannot reuse an exhausted narration approval',()=>{
 assert.throws(()=>assertAuthorizedNarrationBatchCount({productionKind:'navaratri'},{batches:[{}]}),/own explicit credit approval/);
 assert.throws(()=>assertAuthorizedNarrationBatchCount({productionKind:'navaratri',authorizedNarrationCalls:4},{batches:Array(5).fill({})}),/approved call limit/);
});
test('Navaratri metadata has regional calendar guidance and no inherited Gita content',()=>{
 const p=navaratriPublishing({productionKind:'navaratri',navaratri:{form:1,nextName:'బ్రహ్మచారిణి',calendarNote:'Saptami repeats in 2026'},videoTitle:'శైలపుత్రి',descriptionSummary:'అమ్మవారి కథ',sources:['https://example.org/source']},'00:00 స్వాగతం','Approved prompt');
 assert(!/భగవద్గీత|undefined|1\.2/.test(p.description));
 assert(p.description.includes('వీడియో సంఖ్య పూజ తేదీ కాదు'));
 assert(p.description.includes('AI-generated'));
 assert(p.description.endsWith('సరిచేస్తాం.'));
});
