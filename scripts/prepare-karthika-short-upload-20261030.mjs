import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/karthika-short-2026-10-29';
const metadata={
 title:'దీపం వెలిగిస్తాం… కానీ మనసులో? 🪔 | కార్తీక మాసం | Telugu Devotional #Shorts',
 description:[
  'ఇంట్లో దీపం… మనసులో దయ. 🪔 ఓం నమః శివాయ!',
  'కార్తీక మాసంలో వెలిగించే దీపాన్ని స్ఫూర్తిగా తీసుకుని, కోపాన్ని తగ్గించుకుని ప్రేమను పెంచుకోవడం, ప్రశాంతంగా దైవాన్ని స్మరించడం, అందరి క్షేమాన్ని కోరుకోవడం గురించి ఒక చిన్న స్వతంత్ర తెలుగు భక్తి సందేశం.',
  'ఇది గ్రంథంలోని శ్లోకం లేదా నిర్దిష్ట పూజా విధానం కాదు; మన రోజువారీ జీవితానికి అన్వయించిన స్వతంత్ర భక్తి భావన. అద్భుత ఫలితాల హామీలు ఇవ్వడం లేదు.',
  'Divine Wisdom Telugu | తెలుగు భక్తి సందేశాలు',
  'మీకు నచ్చిన భావాన్ని కామెంట్‌లో చెప్పండి. మరిన్ని తెలుగు భక్తి సందేశాల కోసం సబ్‌స్క్రైబ్ చేయండి.',
  'దృశ్యాలు ఊహాత్మక AI చిత్రాలు; వాయిస్ ఓవర్ AI సహాయంతో రూపొందించబడింది. ఆలయ ప్రత్యక్ష చిత్రీకరణ కాదు.',
  '#Shorts #KarthikaMasam #TeluguDevotional #OmNamahShivaya #DivineWisdomTelugu',
  'ఈ వీడియోలో ఉచ్చారణ లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.'
 ].join('\n\n'),
 tags:['Karthika Masam','Telugu devotional','Karthika Deepam','Om Namah Shivaya','Shiva Telugu','Telugu Shorts','Divine Wisdom Telugu','కార్తీక మాసం','కార్తీక దీపం','తెలుగు భక్తి']
};
assert([...metadata.title].length<=100&&Buffer.byteLength(metadata.description)<=5000);
await writeFile(`${root}/youtube-metadata.json`,JSON.stringify(metadata,null,2));
let s=await readFile('scripts/upload-dakshinamurthy-20261023.ts','utf8');
s=s.replace(/const entries=\[.*?\];/,'const entries='+JSON.stringify([{kind:'karthika-short',root,file:'karthika-telugu-short-powerful-v2.mp4',thumbnail:'powerful-review-01s.jpg',metadata:'youtube-metadata',verification:'powerful-verification'}])+';');
s=s.replace("selection:'Sri Dakshinamurthy Stotram final 1080p video only'","selection:'Final 33-second Karthika Telugu Short with audio and powerful portrait images'");
s=s.replace("await writeFile('data/productions/divine-wisdom/dakshinamurthy-2026-10-23/youtube-duplicate-check.json'",`await writeFile('${root}/youtube-duplicate-check.json'`);
s=s.replace('User explicitly requested upload of this completed Sri Dakshinamurthy Stotram video to YouTube as Private; prepared title, description and thumbnail; October 23, 2026','User requested upload of the finished Karthika Telugu Short in this chat on October 30, 2026. Existing studio private-upload workflow; completed powerful-v2 video with approved narration.');
s=s.replace("body.snippet.categoryId=entry.kind==='ayyappa-deeksha'?'27':'10';body.snippet.defaultAudioLanguage=['dakshinamurthy'].includes(entry.kind)?'sa':'te';","body.snippet.categoryId='27';body.snippet.defaultAudioLanguage='te';");
assert(!s.includes("selection:'Sri Dakshinamurthy"));
await writeFile('scripts/upload-karthika-short-20261030.ts',s);
console.log(JSON.stringify({prepared:true,title:metadata.title,descriptionBytes:Buffer.byteLength(metadata.description),visibility:'private'}));
