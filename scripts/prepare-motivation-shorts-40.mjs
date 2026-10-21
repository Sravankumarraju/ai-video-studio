import {ideas} from './motivation-shorts-40-content.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/motivation-shorts-40';
assert.equal(ideas.length,40);
await mkdir(root,{recursive:true});
const existing=await readFile(`${root}/NARRATION-PLAN.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
if(existing){console.log(JSON.stringify({preserved:true,calls:existing.plannedCalls,characters:existing.characters}));process.exit(0);}
const shorts=ideas.map(([title,reference,teaching,example,question,scene],i)=>{
 const chapter=Number(reference.split('.')[0]);
 const chapterNames=['','అర్జున విషాద యోగం','సాంఖ్య యోగం','కర్మ యోగం','జ్ఞాన కర్మ సన్యాస యోగం','కర్మ సన్యాస యోగం','ఆత్మ సంయమ యోగం'];
 const endings=[`ఈ భావాన్ని సందర్భంతో వినాలంటే ${chapterNames[chapter]} పూర్తి పాఠాన్ని ఎంచుకోండి.`,`ఇది ఒక చిన్న పరిచయం. ${chapterNames[chapter]} పూర్తి వివరణలో ఈ బోధనను మరింత వినండి.`,`ఈ ప్రశ్నను మరింత తెలుసుకోవాలంటే ${chapterNames[chapter]} పూర్తి అధ్యాయాన్ని వినండి.`];
 const narration=`${title} ${teaching} మన జీవితానికి ఒక ఉదాహరణ చూద్దాం. ${example} ${question} మీ ఆలోచనను వ్యాఖ్యలో చెప్పండి. ${endings[i%3]}`;
 const id=`motivation-short-${String(i+1).padStart(3,'0')}`;
 assert(narration.length<1000);assert(!/అద్భుత విజయం|ఖచ్చితంగా ధనవంతులు/u.test(narration));
 return {id,title,reference,chapter,narration,characters:narration.length,sha256:createHash('sha256').update(narration).digest('hex'),plannedCalls:1,directory:`${root}/${id}`,targetSeconds:[35,65],aspectRatio:'9:16',visualPrompt:`Portrait 9:16 cinematic devotional realism. ${scene}. Contemporary Telugu Indian setting, dignified natural expressions, believable anatomy, warm light, original distinct composition. Keep lower 25 percent uncluttered for Telugu captions, no text or watermarks. Small contextual devotional detail where appropriate, no sensational claims.`,fullLessonCTA:{chapter,includeLinkOnlyAfterPublicVerification:true},youtubeUploadAuthorized:false};
});
const plan={status:'frozen_preapproved',voiceId:'sJrRcQEpUbZehhGBdEbD',plannedCalls:40,characters:shorts.reduce((s,x)=>s+x.characters,0),paidNarrationAuthorized:true,humanAuthorization:"User requested 40 additional Shorts, clarified Bhagavad Gita motivation encouraging full listening, then said 'preappproved'.",unknownCostPolicy:'allow',providerCostEstimate:null,uploadHold:true,shorts};
for(const s of shorts){await mkdir(s.directory,{recursive:true});await writeFile(`${s.directory}/script-te.md`,`# ${s.title}\n\n${s.narration}\n\nReference: ${s.reference}. Original commentary and explicitly marked modern analogy. Full-lesson URL stays unset until public availability is verified.\n`);await writeFile(`${s.directory}/visual-prompt.txt`,s.visualPrompt);}
await writeFile(`${root}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));
await writeFile(`${root}/RESEARCH.md`,'# Source and editorial scope\n\nPrimary Sanskrit text: https://sanskritdocuments.org/doc_giitaa/bhagvadnew.html\nChecked against established local Chapter 1–6 research and content. Forty original Telugu commentary scripts; modern analogies are explicitly identified. These are thematic interpretations, not verbatim scripture or complete translations. Chapter 1 reflects Arjuna\'s questions rather than presenting them as Krishna\'s instructions. No medical diagnosis, extreme fasting, forced breathing, guaranteed wealth or guaranteed outcomes. The narration invites full chapter listening without asserting any particular private video is publicly available.\n');
await writeFile(`${root}/README.md`,`# Forty additional Bhagavad Gita motivation Shorts\n\n40 original scripts, distinct modern examples, opening questions, viewer prompts and full-lesson invitations. Separate from the five question Shorts.\n\nFrozen narration budget: 40 saved-voice calls / ${plan.characters} Telugu characters. Human preapproval recorded; provider credit price unavailable. Never exceed this budget or repeat completed jobs.\n\nPortrait 9:16, target 35–65 seconds measured after narration, highlighted Telugu captions and distinct reviewed artwork. All uploads remain on hold. No public link is inserted without verification.\n`);
console.log(JSON.stringify({directory:root,calls:40,characters:plan.characters,preapproved:true,uploadHold:true}));
