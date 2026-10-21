import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='output/sri-venkateswara-full-approved-2026-10-20';
await mkdir(`${root}/requests`,{recursive:true});
const sourceRoot='data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3';
let text=(await readFile(`${sourceRoot}/complete-lyrics-telugu.txt`,'utf8')).trim();
const corrections=[['పూర్వాసంధ్యా','పూర్వా సంధ్యా'],['పాత్రావసిష్ట','పాత్రావశిష్ట'],['ఝుంకార','ఝంకార'],['గతాళివర్గాః','గతాలివర్గాః'],['నిజాంగలక్ష్మ్యాః','నిజాంగలక్ష్మ్యా'],['మహిమాధిక','మహిమాదిక'],['కావ్యశౌరి','కావ్యసౌరి'],['తత్-పాదధూళి','త్వత్పాదధూళి'],['గుణామృతాబ్దే','గుణామృతాబ్ధే'],['దేవాదిదేవ','దేవాధిదేవ'],['కుట్మల','కుడ్మల'],['సుగంధి తీర్థం','సుగంధ తీర్థం']];
for(const [from,to] of corrections)text=text.replaceAll(from,to);
text=text.replaceAll('-','').replace(/ +\n/g,'\n');
const verses=text.split(/\n\s*\n/).map((text,index)=>({verse:index+1,text}));assert.equal(verses.length,29);
await writeFile(`${root}/complete-lyrics-telugu.txt`,verses.map(v=>v.text).join('\n\n')+'\n');
const approved=JSON.parse(await readFile('output/sri-venkateswara-female-chant-v3-2026-10-20/request.json','utf8'));
const reference=JSON.parse(await readFile('output/sri-venkateswara-female-chant-v3-2026-10-20/song-attempt.json','utf8'));
const units=verses.slice(2).flatMap(v=>v.text.split('\n').filter(Boolean).map((text,index)=>({verse:v.verse,line:index+1,text,
 duration_ms:Math.round(Math.max(5500,Math.min(9500,text.replace(/[\s।॥]/g,'').length/7.2*1000))/100)*100})));
assert.equal(units.length,108);
const batches=[];
for(let start=0;start<units.length;start+=28){
 const part=units.slice(start,start+28);const index=batches.length+1;
 const request={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
 composition_plan:{chunks:part.map((u,i)=>({text:u.text,duration_ms:u.duration_ms,
 positive_styles:[...approved.composition_plan.chunks[0].positive_styles.filter(s=>!/first word immediately|four chunks|four consecutive|approximately four and a half/.test(s)),
 'Continue the same original female chant identity, comfortable middle register, compact pitch range, continuous syllabic articulation and soft tanpura texture as the approved supplied original reference',
 'This is the next consecutive line of the prayer: complete every supplied syllable, short breath only at the complete line ending, preserve Sanskrit long vowels and consonant clusters',
 index===4&&i===part.length-1?'Complete the final word and resolve briefly':'Flow into the next complete lyric line without a new introduction or instrumental interlude'],
 negative_styles:approved.composition_plan.chunks[0].negative_styles,context_adherence:'high',
 conditioning_ref:{song_id:reference.songId,range:{start_ms:100,end_ms:21240}},condition_strength:'high'}))}};
 await writeFile(`${root}/requests/batch-${index}.json`,JSON.stringify(request,null,2));
 batches.push({index,firstVerse:part[0].verse,lastVerse:part.at(-1).verse,seconds:part.reduce((n,u)=>n+u.duration_ms,0)/1000,units:part,request:`requests/batch-${index}.json`,state:'not_submitted'});
}
const remainingSeconds=batches.reduce((n,b)=>n+b.seconds,0);
const plan={state:'awaiting_elevenlabs_credits',title:'Sri Venkateswara Suprabhatham',channelName:'Divine Wisdom Telugu',
 teluguTitle:'శ్రీ వేంకటేశ్వర సుప్రభాతం',totalVerses:29,approvedOpeningVerses:[1,2],remainingVerses:[3,29],
 approvedOpening:'output/sri-venkateswara-female-chant-v3-2026-10-20/song.mp3',approvedOpeningSongId:reference.songId,
 requestedDirection:'Approved compact original female rhythmic stotra chant, clear complete syllables, short line-end breaths, no time-stretching',
 remainingSecondsEstimate:remainingSeconds,fullSecondsEstimate:remainingSeconds+22.104+6,
 generationCreditsEstimate:Math.ceil(remainingSeconds*15),suggestedBalanceIncludingVerification:Math.ceil(remainingSeconds*15)+1500,
 lastCheckedCredits:571,creditsAreEstimateNotQuote:true,continuationCallsSubmitted:0,batches,
 logo:'data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',logoPosition:{anchor:'top-right',width:220,right:28,top:28},
 teluguRendering:'All Telugu including static titles, captions and ending must use libass complex shaping and Noto Sans Telugu; never Pillow for Telugu',
 captions:'Use actual audio word timing, independently transcribe each generated batch and review discrepancies before assembling. Corrected word spacing and phrase grouping.',
 ending:'Reuse the approved six-second bilingual ending and all four calls to action',publishApproved:false,
 sourceTextBase:`${sourceRoot}/complete-lyrics-telugu.txt`,sourceCrossCheck:'https://stotranidhi.com/venkateshwara-suprabhatam-in-telugu/',
 textCorrections:corrections,sourceEditionDifferencesMayRemain:true,pronunciationListeningReviewRequired:true};
await writeFile(`${root}/full-production-plan.json`,JSON.stringify(plan,null,2));
await copyFile('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',`${root}/channel-logo.png`);
console.log(JSON.stringify({verses:29,continuationBatches:batches.length,remainingSeconds,estimatedGenerationCredits:plan.generationCreditsEstimate,suggestedBalance:plan.suggestedBalanceIncludingVerification,state:plan.state}));
