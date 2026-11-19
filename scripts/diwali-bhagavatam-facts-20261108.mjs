import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
export const root='data/productions/divine-wisdom/diwali-bhagavatam-facts-2026-11-08';
const previous='data/productions/divine-wisdom/diwali-special-2026-11-08';
const original=JSON.parse(await readFile(`${previous}/plan.json`,'utf8'));
const rows=[
['భాగవతంలోని 3 విశేషాలు','దీపావళితో ముడిపడిన నరకాసుర కథలో, భాగవతం చెప్పే మూడు విశేషాలు తెలుసా?','facts-book','BHAGAVATAM 10.59'],
['1. నరకాసురునికి మరో పేరు','ఒకటి. నరకాసురుణ్ణి భౌముడు అని కూడా పిలుస్తారు. భాగవతం అతడిని భూదేవి కుమారుడిగా వర్ణిస్తుంది.','facts-book','BHAGAVATAM 10.59.14'],
['2. గరుడునిపై ప్రయాణం','రెండు. శ్రీకృష్ణుడు సత్యభామతో కలిసి గరుడునిపై ప్రాగ్జ్యోతిషపురానికి వెళ్లాడని ఈ గ్రంథం చెబుతుంది.','facts-garuda','BHAGAVATAM 10.59.2-3'],
['3. ఐదు తలల మురుడు','మూడు. ఈ కథలో మురుడు అనే ఐదు తలల అసురుడు కూడా ఉన్నాడు. కృష్ణుడి పాంచజన్య శంఖనాదం విని అతడు నీటిలోంచి లేచాడని వర్ణన.','facts-conch','BHAGAVATAM 10.59.6'],
['గ్రంథంలో చెప్పిన విశేషాలు','ఇవి శ్రీమద్భాగవతం దశమ స్కంధం, యాభై తొమ్మిదవ అధ్యాయంలోని విశేషాలు. దీపావళి ఆచారాలు ప్రాంతాన్ని బట్టి మారుతాయి.','facts-book','BHAGAVATAM 10.59'],
['డివైన్ విజ్డమ్ తెలుగు',original.short.at(-1).text,'facts-book','']
];
await mkdir(`${root}/art`,{recursive:true});
const sources=[
{verse:'10.59.14',claim:'Naraka is described as the son of the earth (dhara-suta). The chapter also calls him Bhauma/Bhaumasura.',url:'https://vedabase.io/en/library/sb/10/59/14/'},
{verse:'10.59.2-3',claim:'Krishna takes Satyabhama and travels on Garuda to Pragjyotisha.',url:'https://vedabase.io/en/library/sb/10/59/2-3/'},
{verse:'10.59.6',claim:'Five-headed Mura rises from the moat water at the sound of Panchajanya.',url:'https://vedabase.io/en/library/sb/10/59/6/'}
];
const plan={title:'దీపావళి నరకాసుర కథలో 3 విశేషాలు | భాగవతం ఆధారంగా',language:'te',model:original.model,voiceId:original.voiceId,short:rows.map(([title,text,image,source],index)=>({index,title,text,image,source})),long:[],sources,editorialNotes:['Original Telugu paraphrase, not a verbatim translation.','The textual narratives are attributed to the Bhagavata Purana, not represented as established historical facts.','Chapter 10.59 is used for the Naraka narrative; we do not claim it establishes all present-day Diwali practices.','Manuscript and conch artwork are symbolic illustrations, not images of a verified historical manuscript or relic.','No claim that these facts are unknown to everyone.']};
await writeFile(`${root}/plan.json`,JSON.stringify(plan,null,2));
await writeFile(`${root}/short-script-te.txt`,plan.short.map(s=>s.text).join('\n\n')+'\n');
await writeFile(`${root}/research.md`,'# Bhagavata Purana: Naraka narrative\n\nVerified 8 November 2026.\n\n'+sources.map(s=>`- [Bhagavatam ${s.verse}](${s.url}): ${s.claim}`).join('\n')+'\n\n'+plan.editorialNotes.map(s=>'- '+s).join('\n')+'\n');
await copyFile(`${previous}/art/channel-logo-transparent.png`,`${root}/art/channel-logo-transparent.png`);
for(const ext of ['.mp3','-alignment.json'])await copyFile(`${previous}/short-voice-05-sindhuja${ext}`,`${root}/short-voice-05-sindhuja${ext}`);
console.log(JSON.stringify({root,characters:rows.map(s=>s[1]).join('').length,existingOutroReused:true}));
