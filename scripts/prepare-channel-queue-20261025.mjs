// Offline editorial preparation. Does not generate media, connect accounts or publish.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('data/productions/divine-wisdom/channel-plan-2026-10-25');
const recitation = 'data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const song = 'data/productions/divine-wisdom/govinda-namalu-full-2026-10-20';
const rows = [
 ['lalitha-ashtottara','శ్రీ లలితా అష్టోత్తర శతనామావళి | 108 నామాలు | తెలుగు లిపితో','recitation',[8,15],recitation,'new_draft','Direct Studio audience-topic suggestion and adjacent to both leading Lalitha videos.'],
 ['mahishasura-mardini','అయిగిరి నందిని | మహిషాసురమర్దిని స్తోత్రం | తెలుగు లిపితో','recitation',[12,16],recitation,'new_draft','Studio topic suggestion; related content suggests existing Lalitha video. Telugu acceleration unverified.'],
 ['lingashtakam','లింగాష్టకం | తెలుగు లిపితో సంపూర్ణ పఠనం','recitation',[4,7],recitation,'continue_research','Existing research starter; Shiva channel traction and suggesting-content adjacency.'],
 ['mahalakshmi-ashtakam','శ్రీ మహాలక్ష్మీ అష్టకం | శుక్రవారం పారాయణం | తెలుగు లిపితో','recitation',[5,8],recitation,'continue_research','Existing research starter; adjacent Devi listening experiment.'],
 ['om-namah-shivaya-108','ఓం నమః శివాయ 108 సార్లు | తెలుగు లిపితో మంత్రజపం','counted_chant',[15,25],'output/om-namah-shivaya-108-2026-10-23','inspect_existing','Existing 108/1008 productions found: inspect render and upload state before further generation.'],
 ['bilvashtakam','బిల్వాష్టకం | తెలుగు లిపితో సంపూర్ణ పఠనం','recitation',[5,8],recitation,'continue_research','Existing research backlog; distinct companion to Lingashtakam.'],
 ['ayyappa-ashtottara','అయ్యప్ప అష్టోత్తర శతనామావళి | స్వామియే శరణం అయ్యప్ప','namavali',[8,15],song,'new_draft','Recent Ayyappa song realtime traction; test namavali separately from existing Deeksha explanation.'],
 ['venkateswara-suprabhatam','శ్రీ వేంకటేశ్వర సుప్రభాతం | తెలుగు లిపితో సంపూర్ణ పఠనం','recitation',[20,30],'output/venkateswara-suprabhatam-2026-10-22','inspect_existing','Existing samples found: select approved voice and complete scope before production.'],
 ['karthika-shiva-original','హర హర శంభో | కార్తీక భక్తి గీతం | Original Telugu Shiva Song','original_song',[3,5],'data/productions/divine-wisdom/shiva-tandavam-2026-10-15','new_draft','Follow-up experiment to Shiva song traction; check existing Karthika production for overlap.'],
 ['gita-anger-practical','కోపం వచ్చినప్పుడు ఎలా స్పందించాలి? | భగవద్గీత చెప్పే 3 ఆలోచనలు','explanation',[4,6],'data/productions/divine-wisdom/gita-1-2/devotional-v2','new_draft','Practical Gita Shorts engagement; check motivation-shorts catalogue for duplicate scripts.'],
];
const common = {
 aspect:'16:9', width:1920, height:1080, displayScript:'Telugu',
 captions:'Large Noto Sans Telugu; gold active-word highlight only after actual audio alignment.',
 visuals:'Preserve approved gold/indigo identity, readable safe areas and gentle existing movement.',
 opening:'Brief identity; begin promised content promptly. Do not place CTAs inside recitation.',
 audio:'Use the matching existing production treatment; do not reuse Gita narration settings for musical chants.',
 deliverables:['editable script','source/edition register','audio and voice selection','caption alignment','1080p video','thumbnail','Telugu description','measured chapters','source credits and AI disclosure'],
 publication:'Private draft for review; no automatic public upload or scheduling.',
};
await mkdir(root,{recursive:true});
const items=[];
for(const [index,row] of rows.entries()){
 const [id,titleTe,format,estimatedMinutes,referencePath,action,rationale]=row;
 await access(referencePath);
 const item={rank:index+1,id,titleTe,format,estimatedMinutes,referencePath,action,rationale,status:'preproduction',publishReady:false,mediaGenerated:false,...common,
  language:format==='original_song'||format==='explanation'?'Telugu':'Sanskrit recitation in Telugu script; Telugu bookends',
  music:format==='explanation'?'No music, matching existing Gita format':'Match the selected existing chant/song reference after listening review',
  sections:format==='explanation'?['specific everyday hook','accurately referenced Gita teaching','three original practical examples','reflection and brief closing']:['brief title/bookend','complete selected core text or original song','optional separately labelled closing'],
  text:{status:'not_yet_selected',recitation:null,verifiedCount:null,edition:null,notes:'Select the exact complete edition and scope; keep original explanation separate. No invented verses or timestamps.'},
  nextAction:action==='inspect_existing'?'Inspect existing assets, verification and upload status; resume the same production.':'Select text/creative scope, compare existing catalogue, then prepare a reviewable script.',
  review:['source and edition scope','pronunciation and count','actual voice/sample','caption shaping and sync','audio levels and joins','thumbnail legibility','full playback and final metadata'],
 };
 items.push(item); await writeFile(path.join(root,`${String(index+1).padStart(2,'0')}-${id}.json`),JSON.stringify(item,null,2)+'\n');
}
const queue={preparedOn:'2026-10-25',channel:'Divine Wisdom Telugu',channelId:'UCZCidygC9i89ye1PEI_nh2Q',basis:'Owner-approved channel audit and ten-video shortlist in this chat',analyticsWindow:{start:'2026-09-26',end:'2026-10-23',views:27263,watchHours:982.3,netSubscribers:75,impressions:380935,ctrPercent:2.6},items};
await writeFile(path.join(root,'production-queue.json'),JSON.stringify(queue,null,2)+'\n');
await writeFile(path.join(root,'START-HERE.txt'),`DIVINE WISDOM TELUGU - PRODUCTION QUEUE - 25 OCTOBER 2026\n\n${items.map(x=>`${x.rank}. ${x.titleTe}\n   ${x.action}; ${x.estimatedMinutes.join('-')} minutes estimated\n   Reference: ${x.referencePath}\n   Next: ${x.nextAction}`).join('\n\n')}\n\nThese are saved production briefs, not rendered videos or queued paid jobs. Start with item 1. Match each format's existing treatment. Existing Shiva chants and Suprabhatam samples must be inspected before creating replacements. All timings remain estimates until recorded.\n`);
for(const item of items){const saved=JSON.parse(await readFile(path.join(root,`${String(item.rank).padStart(2,'0')}-${item.id}.json`),'utf8'));if(saved.id!==item.id||saved.publishReady!==false)throw Error('Queue verification failed');}
console.log(JSON.stringify({root,items:items.length,verified:true,paidCalls:0}));
