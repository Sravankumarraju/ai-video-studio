import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='data/productions/divine-wisdom';
const dir=`${root}/question-shorts-week-01`;
const source=await readFile(`${root}/channel-growth-agent/DAILY-QUESTIONS-WEEK-01.md`,'utf8');
const blocks=source.split('## Day ').slice(1,6);
const closing='మీ ఆలోచనను వ్యాఖ్యలో చెప్పండి. ఇలాంటి విషయాల కోసం Divine Wisdom Teluguను అనుసరించండి.';
const previousClosings=[
 'ఈ భావాన్ని విస్తృతంగా తెలుసుకోవాలంటే మన పూర్తి రెండో అధ్యాయం వీడియో చూడండి.',
 'పూర్తి రెండో అధ్యాయంలో ఈ భావాన్ని వినండి.',
 'కర్మయోగం గురించి మన పూర్తి మూడో అధ్యాయం వీడియోలో తెలుసుకోండి.',
 'మన పూర్తి నాలుగో అధ్యాయం వీడియో మీ పరిశీలనకు ఒక ప్రారంభం.',
 'పూర్తి ఐదో అధ్యాయం వీడియోలో మరింత వినండి.'
];
await mkdir(dir,{recursive:true});
const shorts=[];
for(const block of blocks){
 const index=Number(block.match(/^\d+/)[0]);
 const title=block.split('\n')[0].replace(/^\d+\s*—\s*/,'').trim();
 const reference=block.match(/Reference: ([^.]+)\./)[1];
 const original=block.split('**Narration draft**')[1].split('**Visual prompts**')[0].trim();
 if(!original.endsWith(previousClosings[index-1]))throw Error('Unexpected closing');
 const narration=original.slice(0,-previousClosings[index-1].length).trim()+' '+closing;
 const prompts=block.split('**Visual prompts**')[1].trim();
 const item={id:`question-short-${String(index).padStart(3,'0')}`,title,reference,narration,characters:narration.length,sha256:createHash('sha256').update(narration).digest('hex'),plannedCalls:1,aspectRatio:'9:16',targetSeconds:[45,60],paidNarrationAuthorized:false,youtubeUploadAuthorized:false,visualPrompts:prompts};
 shorts.push(item);
 await writeFile(`${dir}/${item.id}.json`,JSON.stringify(item,null,2));
 await writeFile(`${dir}/${item.id}-script.txt`,narration+'\n');
}
const plan={status:'frozen_awaiting_separate_narration_approval',voiceId:'sJrRcQEpUbZehhGBdEbD',plannedCalls:shorts.length,characters:shorts.reduce((s,x)=>s+x.characters,0),unknownPriceApprovalRequired:true,paidNarrationAuthorized:false,uploadHold:true,shorts};
await writeFile(`${dir}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));
await writeFile(`${dir}/README.md`,['# Five Telugu question Shorts — prepared scripts','',...shorts.map(x=>`- ${x.title} (${x.reference}): ${x.characters} characters, one planned narration call.`),'',`Total: ${plan.plannedCalls} calls / ${plan.characters} characters. Paid narration has not started. Separate approval is required; provider credit cost is unavailable.`, '', 'Portrait 9:16, target 45–60 seconds, question in the first second, three relevant visual beats, readable highlighted Telugu captions and a closing comment question. Timing must be measured after narration. Modern examples are explicitly distinguished from scripture. No link to a private chapter is included. Artwork prompts are editable; new portrait artwork and rendering remain pending.', '', 'All uploads remain on hold. No scheduling or visibility change is authorized.'].join('\n'));
console.log(JSON.stringify({directory:dir,calls:plan.plannedCalls,characters:plan.characters,shorts:shorts.map(x=>({title:x.title,characters:x.characters}))}));
