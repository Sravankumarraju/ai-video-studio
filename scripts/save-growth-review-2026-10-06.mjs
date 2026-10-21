import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base='data/productions/divine-wisdom';
const root=`${base}/channel-growth-agent/editorial/2026-10-06`;
await mkdir(root,{recursive:true});
const cadence=JSON.parse((await readFile(`${base}/RELEASE-CADENCE.json`,'utf8')).replace(/^\uFEFF/u,''));
const plan=JSON.parse(await readFile(`${base}/question-shorts-week-01/NARRATION-PLAN.json`,'utf8'));
const final=JSON.parse(await readFile(`${base}/question-shorts-week-01/FINAL_DELIVERY.json`,'utf8'));
const dates=['2026-10-06','2026-10-08','2026-10-10','2026-10-11'];
const candidates=plan.shorts.map((s,i)=>({id:s.id,planningDate:dates[i]||'2026-10-09',optional:i===4,title:s.title,reference:s.reference,narration:s.narration,characters:s.characters,plannedCalls:1,existingNarrationComplete:true,newPaidCallsRequired:0,mp4:final.deliveries.find(d=>d.id===s.id).mp4,description:`${s.title}\nభగవద్గీత ${s.reference} ఆధారంగా స్వతంత్ర వివరణ, ఆధునిక ఉదాహరణ. AI-assisted visuals and narration. #BhagavadGita #Telugu #Shorts`,visualPrompt:s.visualPrompts,captionPlan:'Existing reviewed word-aligned Telugu captions and gold highlights. 1080x1920, lower-center safe area. Reuse verified export without regenerating.',longVideoURL:null,releaseAuthorized:false,uploadHold:true}));
await writeFile(`${root}/RELEASE-CANDIDATES.json`,JSON.stringify({reviewDate:'2026-10-06',cadence,candidates,uploadHold:true,analytics:{baselineSubscribers:7,baselinePublicWatchHours:3,liveAnalyticsAvailable:false},narration:{newCalls:0,existingCalls:5,existingCharacters:2980}},null,2));
await writeFile(`${root}/EDITORIAL-REVIEW.md`,[
 '# Editorial review — 6 October 2026',
 '',
 'Tuesday is a provisional Short slot. All uploads remain on hold; these dates are editable planning slots, not account schedules. Daily review does not mean daily publishing.',
 '',
 'Five existing question Shorts are verified and packaged. Reuse their completed voice, artwork and exports. No new draft or paid call is needed for this week.',
 '',
 ...candidates.map(c=>`- ${c.planningDate}${c.optional?' (optional fifth)':''}: ${c.title} — ${c.reference}; ${c.id}.`),
 '',
 'Wednesday/Friday individual shlokas and Saturday full chapter remain separate. Choose the next unpublished verified episode or chapter only after checking actual release history. Chapters 1–4 were last verified private on YouTube; Chapters 5–6 local only. No verified public long-video destination is recorded, so retain the standalone question endings.',
 '',
 'Forty additional motivation Shorts are in separately preapproved production. They are backlog, not permission to bulk publish or replace this cadence. Their shorter measured format is distinct from the original 45–60-second question series.',
 '',
 'At manual release, choose one matching publicly accessible related long video after verifying its visibility. For the first week, track Shorts viewed-versus-swiped-away, completion and subscribers gained; separately track long-video viewing duration and returning viewers. No live analytics were read today; retain the owner baseline of 7 subscribers and 3 valid public watch hours without inventing changes.',
 '',
 'One editorial focus this week: make the opening question legible immediately and let the first example arrive before a long introduction. Existing exports already have reviewed caption framing and no title intro delay.'
].join('\n'));
const draftFile=`${base}/channel-growth-agent/DAILY-QUESTIONS-WEEK-01.md`;
let drafts=await readFile(draftFile,'utf8');
drafts=drafts.replace('No paid narration or video production has started.','Production update 6 October 2026: drafts 1–5 were adapted into five verified local question Shorts using the approved 5 calls / 2,980 characters. Reuse those finished exports; do not repeat narration. Drafts 6–7 remain unproduced backlog.');
await writeFile(draftFile,drafts);
console.log(JSON.stringify({datedReview:root,reusedVerifiedShorts:5,newPaidCalls:0,uploadHold:true}));
