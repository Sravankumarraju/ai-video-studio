import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {sessionToken} from '../lib/security';
async function main(){
 const origin=process.env.APP_ORIGIN||'http://localhost:3000',headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 async function api(path:string,method='GET',body?:unknown){const r=await fetch(origin+'/api/'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});assert(r.ok,`Local series ${method} failed (${r.status})`);return r.json();}
 const name='భగవద్గీత · సంపూర్ణ అధ్యాయాలు · Divine Wisdom Telugu';
 const series=await api('series');let s=series.find((s:{name:string})=>s.name===name);
 if(!s)s=await api('series','POST',{templateId:'custom',name});s=await api('series/'+s.id);
 const prompt=await readFile('data/productions/divine-wisdom/GITA-FULL-CHAPTER-SERIES-PROMPT.md','utf8');
 const settings=structuredClone(s.settings);settings.description='Separate full-chapter series: 18 chapters, one complete Telugu long-form video per chapter. Individual-shloka episodes belong to a different series.';settings.subject='Bhagavad Gita — full chapter Telugu meanings and significance';
 settings.formats=[{id:'complete-chapter',name:'Complete chapter — Telugu meaning and significance',contentType:'scripture',verses:{mode:'none',min:0,max:0,label:'శ్లోకం'},structure:[{id:'welcome',title:'Channel welcome and chapter name',kind:'intro',purpose:'Verified chapter title and 2–3 sentences explaining it',required:true},{id:'complete-meaning',title:'Every verse in order',kind:'meaning',purpose:'Cover all verses without omissions; no Sanskrit recitation',required:true},{id:'next-chapter',title:'Next complete chapter',kind:'teaser',purpose:'Preview the next chapter only',required:true},{id:'closing',title:'Closing invitation',kind:'cta',purpose:'Subscribe, like, share and comment',required:true}],instructions:prompt}];settings.defaultFormatId='complete-chapter';settings.narration.instructions=prompt;settings.defaults.aspect='landscape';
 settings.defaults.voiceId='sJrRcQEpUbZehhGBdEbD';settings.defaults.channelName='Divine Wisdom Telugu';settings.defaults.targetDuration=null;
 settings.intro.instructions='Welcome, verified chapter number and traditional title, then 2–3 simple Telugu sentences explaining the title. Follow the saved full-chapter prompt.';
 settings.closing.instructions='Preview the next complete chapter by number and title. Never preview an individual-shloka episode in this series.';
 settings.cta.enabled=true;settings.cta.instructions='Preserve mid-video and final subscribe, like, share and comment invitations.';
 settings.visual.style='Approved devotional illustrations; gentle pans with smooth starts and stops; no animation. Reuse appropriate existing assets.';
 settings.narration.pronunciation='అర్జున విషాద యోగం; సాంఖ్య యోగం; చూడాలని కోరుతున్నాడు. Clearly pronounce initial consonants and chapter names; check spoken output as well as caption spelling.';
 if(!settings.defaults.logoAssetId){let logo=s.media.find((a:{name:string})=>a.name==='01-lotus-book.png');if(!logo){assert(s.libraryProjectId);logo=JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/upload-owner-asset.ts',s.libraryProjectId,'data/branding/divine-wisdom/logo-samples/01-lotus-book.png'],{encoding:'utf8'}));}settings.defaults.logoAssetId=logo.id;}
 for(const c of settings.visual.characters)delete c.referenceAssetId;
 s=await api('series/'+s.id,'PATCH',{revision:s.revision,settings});
 const projectId='145e1dd0-9b7f-4077-aded-f9fe3485888a';await api('projects/'+projectId+'/series','POST',{seriesId:s.id});
 await writeFile('data/productions/divine-wisdom/GITA-FULL-CHAPTER-SERIES.json',JSON.stringify({seriesId:s.id,name:s.name,chapter1ProjectId:projectId,promptFile:'GITA-FULL-CHAPTER-SERIES-PROMPT.md',youtubeModified:false},null,2));console.log(JSON.stringify({seriesId:s.id,chapter1Grouped:true,youtubeModified:false}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
