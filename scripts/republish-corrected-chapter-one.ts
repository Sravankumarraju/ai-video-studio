import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ownerApi} from './youtube-owner';
const root='data/productions/divine-wisdom/gita-chapter-1/audio-corrected-v5';
async function read(file:string){return JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));}
async function main(){
 const status=await ownerApi('status');assert(status.connected&&status.channelId==='UCZCidygC9i89ye1PEI_nh2Q');
 const verification=await read(`${root}/verification-full.json`);assert(verification.completeDecodePassed);
 const prior=await read('data/productions/divine-wisdom/gita-chapter-1/story-v4/youtube-private-batch.json');
 const publishing=await read(`${root}/publishing.json`),old=prior.videos[0];
 assert(old.projectId==='145e1dd0-9b7f-4077-aded-f9fe3485888a'&&old.thumbnailAssetId);
 const chapters=publishing.chapters.split('\n').map((line:string)=>{const verse=line.match(/శ్లోకం (\d+)/);return verse?`${line.split(' ')[0]} శ్లోకం ${verse[1]}`:line}).join('\n');
 assert.equal(chapters.split('\n').length,48);
 const description=`Divine Wisdom Telugu\nభగవద్గీత అధ్యాయం 1 — అర్జున విషాద యోగం\n\nమొదటి అధ్యాయంలోని మొత్తం 47 శ్లోకాల తాత్పర్యాన్ని సులభమైన తెలుగులో కథలా వినండి. కురుక్షేత్రంలో అర్జునుని దుఃఖం, ధర్మసందేహం, సంబంధాలు, బాధ్యతల మధ్య సంఘర్షణను రోజువారీ ఉదాహరణలతో వివరిస్తాం. సంస్కృత మూల శ్లోకాలను పఠించకుండా వాటి అర్థం, సందర్భం, ప్రాధాన్యాన్ని వివరిస్తున్నాం.\n\nఇది సంపూర్ణ అధ్యాయాల ప్రత్యేక సిరీస్. తదుపరి వీడియో: అధ్యాయం 2 — సాంఖ్య యోగం. ఒక్కో శ్లోకాన్ని విడిగా వివరించే సిరీస్ వేరుగా ఉంటుంది.\n\nవీడియో భాగాలు:\n${chapters}\n\nమూలాలు:\nhttps://www.holy-bhagavad-gita.org/chapter/1/\nhttps://www.gitasupersite.iitk.ac.in/\n\nAI disclosure: Illustrations and narration are AI-generated. Visuals are artistic interpretations, not historical photographs. ఆధునిక ఉదాహరణలు ఆచరణ కోసం ఇచ్చిన అన్వయాలు.\n\nసబ్‌స్క్రైబ్, లైక్, షేర్ చేయండి. మీరు నేర్చుకున్న విషయాన్ని కామెంట్‌లో చెప్పండి.\n\n#BhagavadGita #BhagavadGitaTelugu #ArjunaVishadaYoga #DivineWisdomTelugu\n\nఉచ్చారణ, అనువాదం లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.`;
 const metadata={...old.metadata,title:'భగవద్గీత అధ్యాయం 1: అర్జున విషాద యోగం | పూర్తి తాత్పర్యం | Divine Wisdom Telugu',description};
 assert([...metadata.title].length<=100);assert(Buffer.byteLength(metadata.description)<=5000,'Description exceeds upload limit');
 const manifest={privacy:'private',selection:'Corrected complete Chapter 1 only; preserve older upload',videos:[{episode:'Chapter 1 complete corrected',projectId:old.projectId,renderJobId:verification.jobId,thumbnailAssetId:old.thumbnailAssetId,metadata}]};
 await writeFile(`${root}/youtube-private-batch.json`,JSON.stringify(manifest,null,2));
 const u=await ownerApi('uploads',{renderJobId:verification.jobId,thumbnailAssetId:old.thumbnailAssetId,expectedChannelId:status.channelId,metadata});
 await writeFile(`${root}/youtube-upload-progress.json`,JSON.stringify(u,null,2));
 console.log(JSON.stringify({channel:status.channelTitle,id:u.id,state:u.state,stage:u.stage,videoId:u.videoId}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
