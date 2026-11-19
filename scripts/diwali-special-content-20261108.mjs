import {mkdir,writeFile} from 'node:fs/promises';
export const root='data/productions/divine-wisdom/diwali-special-2026-11-08';
const short=[
['దీపావళి ఎందుకు జరుపుకుంటాం?','దీపావళి అంటే దీపాలు, మిఠాయిలు గుర్తొస్తాయి. కానీ ఈ పండుగను ఎందుకు జరుపుకుంటామో తెలుసా?','short-lamps'],
['దీపాల వరుస','దీపావళి అంటే దీపాల వరుస. చీకటిపై వెలుగు, చెడుపై మంచి గెలుపును గుర్తుచేసే పండుగ ఇది.','short-lamps'],
['ప్రాంతానికో సంప్రదాయం','ఉత్తర భారతంలో శ్రీరాముడు అయోధ్యకు తిరిగి వచ్చిన ఆనందంతో ఈ పండుగను అనుసంధానిస్తారు. దక్షిణాదిలో నరకాసుర వధను స్మరించే సంప్రదాయాలు ఉన్నాయి.','short-family'],
['లక్ష్మీపూజ భావం','ఎన్నో కుటుంబాలు లక్ష్మీదేవిని పూజించి శుభం, సమృద్ధిని కోరుకుంటాయి. ఇళ్లను అలంకరించి, ఆత్మీయులతో మిఠాయిలు పంచుకుంటాయి.','short-lamps'],
['మనసులోనూ వెలుగు','ఈసారి ఇంట్లో దీపంతో పాటు మనసులో దయను కూడా వెలిగిద్దాం. ఒకరికి సహాయం చేద్దాం. ఆప్యాయంగా పలకరిద్దాం. మీ కుటుంబానికి దీపావళి శుభాకాంక్షలు!','short-family']
];
const long=[
['ఒక చిన్న దీపం చెప్పే కథ','ఒక్క చిన్న దీపం వెలిగిస్తే చుట్టూ ఉన్న చీకటి కొంత దూరమవుతుంది. మరి ప్రతి సంవత్సరం మనం ఇన్ని దీపాలు ఎందుకు వెలిగిస్తాం? దీపావళి వెనుక ఉన్న కథ ఏమిటి? లక్ష్మీదేవిని ఎందుకు పూజిస్తాం? ఈ పండుగ మన జీవితానికి ఏం గుర్తుచేస్తుంది? నమస్కారం. డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఈ దీపావళి ప్రత్యేక వీడియోలో, కథలు, సంప్రదాయాలు, వాటిలో మనం తీసుకోగల మంచి భావాలను సరళంగా తెలుసుకుందాం.','long-home-v2'],
['దీపావళి అంటే ఏమిటి?','దీపావళి అనే పేరుకు దీపాల వరుస అనే అర్థం ఉంది. గుమ్మం దగ్గరా, ఆవరణలోనూ వెలిగే దీపాలు ఈ పండుగకు ప్రత్యేక అందాన్ని ఇస్తాయి. వెలుగు చీకటిని తొలగించినట్టే, జ్ఞానం అజ్ఞానాన్ని తొలగించాలని ఈ పండుగను అర్థం చేసుకుంటారు. చెడుపై మంచి విజయం అనే భావం కూడా దీపావళిలో కనిపిస్తుంది. అయితే దేశమంతటా ఒకే కథను, ఒకే విధానాన్ని అనుసరించరు. ప్రాంతాన్ని బట్టి, కుటుంబాన్ని బట్టి ఆచారాలు మారుతాయి. ఈ వైవిధ్యాన్ని తెలుసుకుంటే పండుగ మరింత ఆసక్తికరంగా కనిపిస్తుంది.','long-home-v2'],
['శ్రీరాముని అయోధ్య ఆగమనం','ఉత్తర భారతంలోని ప్రసిద్ధ సంప్రదాయంలో దీపావళిని శ్రీరాముని అయోధ్య ఆగమనంతో అనుసంధానిస్తారు. పద్నాలుగు సంవత్సరాల వనవాసం తరువాత సీతాదేవి, లక్ష్మణునితో కలిసి శ్రీరాముడు తిరిగి వచ్చిన ఆనందాన్ని ప్రజలు దీపాలతో వ్యక్తం చేశారని భక్తి సంప్రదాయం చెబుతుంది. ఈ కథలో మనకు కనిపించేది స్వాగతం, ఆశ, ధర్మవిజయం. కష్టకాలం ఎంత పొడవుగా ఉన్నా మంచి కోసం నిలబడాలనే ప్రేరణను మనం తీసుకోవచ్చు. ఇది పండుగకు సంబంధించిన ఒక ప్రసిద్ధ సంప్రదాయ వివరణ. అన్ని ప్రాంతాలవారి ఆచారాలకు ఇదొక్కటే వివరణ కాదు.','long-rama'],
['నరక చతుర్దశి సంప్రదాయం','దక్షిణ భారతంలోని అనేక సంప్రదాయాల్లో నరకాసుర వధకు ప్రత్యేక స్థానం ఉంది. శ్రీకృష్ణుడు నరకాసురుని సంహరించిన కథను ఈ సందర్భంలో స్మరిస్తారు. తెలుగు ప్రజలకు పరిచయమైన కొన్ని కథనాల్లో సత్యభామ పాత్రను కూడా ప్రముఖంగా చెబుతారు. కథనాల్లో వివరాలు మారవచ్చు. నరక చతుర్దశి రోజున తెల్లవారుజామున అభ్యంగన స్నానం చేసే ఆచారం కూడా అనేక కుటుంబాల్లో ఉంటుంది. ఈ కథ నుంచి మనం తీసుకోగల భావం ఏమిటి? ఇతరులను బాధించే అహంకారం తగ్గాలి. అన్యాయాన్ని ఎదుర్కొనే ధైర్యం పెరగాలి. మన బలం ఇతరులకు మేలు చేయాలి.','long-krishna'],
['లక్ష్మీదేవిని ఎందుకు పూజిస్తాం?','దీపావళి వేళ ఎన్నో కుటుంబాలు లక్ష్మీదేవిని పూజిస్తాయి. సంప్రదాయంలో ఆమెను శుభం, సంపద, సమృద్ధితో అనుసంధానిస్తారు. ఇళ్లను శుభ్రం చేసి, పూలతో అలంకరించి, దీపాలు వెలిగించి అమ్మవారిని ఆరాధిస్తారు. ఇక్కడ మన జీవితానికి ఒక మంచి అన్వయాన్ని తీసుకోవచ్చు. సంపద అంటే డబ్బుతో పాటు మనకు ఉన్న సమయం, నైపుణ్యం, కుటుంబ ప్రేమ కూడా. వాటిని కృతజ్ఞతతో గుర్తించి, బాధ్యతగా ఉపయోగించుకోవాలి. పూజ మన భక్తిని వ్యక్తం చేసే మార్గం. మనం చేసే నిజాయితీ పని, పొదుపు, ఇతరులకు సహాయం కూడా జీవితంలో ముఖ్యమైనవే.','long-lakshmi'],
['ఆచారాల వెనుక ఆప్యాయత','దీపావళికి ముందు ఇల్లు శుభ్రం చేసుకోవడం, గుమ్మానికి అలంకారం చేయడం, ముగ్గులు వేయడం చాలా కుటుంబాల్లో కనిపిస్తాయి. మిఠాయిలు పంచుకోవడం వల్ల బంధువులు, స్నేహితులు ఒకరినొకరు పలకరించుకునే అవకాశం కలుగుతుంది. పిల్లలకు పండుగ కథలు చెప్పడం ద్వారా కుటుంబ జ్ఞాపకాలు తరువాతి తరానికి చేరతాయి. అనేక ప్రాంతాల్లో దీపావళి వేడుకలు పలు రోజుల పాటు సాగుతాయి. ధన త్రయోదశి, నరక చతుర్దశి, లక్ష్మీపూజ వంటి సందర్భాలకు వేర్వేరు ప్రాధాన్యాలు ఉంటాయి. అయితే వాటి క్రమం, పేర్లు, ఆచారాలు ప్రతిచోటా ఒకేలా ఉండవు. మీ ఇంటి సంప్రదాయం కూడా ఈ గొప్ప వైవిధ్యంలో ఒక భాగమే.','long-home-v2'],
['ఈసారి మనం ఏం చేయవచ్చు?','మరి ఈ దీపావళిని మనం ఎలా అర్థవంతంగా చేసుకోవచ్చు? మీ కుటుంబంతో కలిసి కొంత సమయం గడపండి. ఇంట్లో పెద్దవారిని మీ చిన్నప్పటి దీపావళి ఎలా ఉండేదని అడగండి. వారి జ్ఞాపకాలు వినండి. మీకు వీలైతే అవసరంలో ఉన్నవారికి భోజనం లేదా అవసరమైన వస్తువులు అందించండి. స్థానిక కుమ్మరులు చేసిన మట్టి దీపాలు కొనడం వారి పనికి తోడ్పడుతుంది. దీపాలను స్థిరమైన చోట ఉంచి, పిల్లలు పెద్దల పర్యవేక్షణలో ఉండేలా చూసుకోండి. ఆనందాన్ని పంచుకునేటప్పుడు చుట్టుపక్కలవారి ప్రశాంతతను కూడా గౌరవిద్దాం. ఇవి ఈ పండుగ కోసం మనం చేసుకోగల చిన్న మంచి సంకల్పాలు.','long-home-v2'],
['ఇంట్లో దీపం, మనసులో దయ','దీపావళి కథలు ప్రాంతానికో విధంగా ఉండవచ్చు. మన ఇంటి ఆచారాలు పక్కింటివారితో భిన్నంగా ఉండవచ్చు. అయినా వెలుగు, శుభం, ఆప్యాయతను పంచుకునే అవకాశం మనందరికీ ఉంది. ఈసారి ఒక దీపం వెలిగించేటప్పుడు ఒక మంచి సంకల్పం కూడా చేసుకుందాం. కోపం వచ్చినప్పుడు ఆలోచించి మాట్లాడతాను. నేర్చుకున్నది పంచుకుంటాను. నాకు వీలైన సహాయం చేస్తాను. ఇలా పండుగ స్ఫూర్తిని రోజువారీ జీవితంలోకి తీసుకురావచ్చు. మీ ఇంట్లో దీపావళికి ఏ సంప్రదాయం ప్రత్యేకం? కామెంట్‌లో చెప్పండి. ఈ వీడియో ఉపయోగపడితే మీ కుటుంబంతో పంచుకోండి. మీ అందరికీ దీపావళి శుభాకాంక్షలు!','long-lakshmi']
];
const outro=['డివైన్ విజ్డమ్ తెలుగు','భక్తి కథలు, పండుగల విశేషాల కోసం డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియో నచ్చితే లైక్ చేసి, షేర్ చేయండి. మీ ఇంటి దీపావళి విశేషాన్ని కామెంట్‌లో చెప్పండి.','short-lamps'];
short.push(outro);
long.push([outro[0],outro[1],'long-lakshmi']);
await mkdir(root,{recursive:true});
const sources=[
{url:'https://ebooks.tirumala.org/download.php?id=25136',supports:'TTD Sapthagiri October 2024, search-index excerpt describes Krishna and Satyabhama together in the Narakasura tradition. PDF direct fetch timed out; full text not inspected.'},
{url:'https://www.utsav.gov.in/major-festival/diwali',supports:'Name meaning; Naraka Chaturdashi and Narakasura; regional festivities. Search index accessed; direct fetch failed.'},
{url:'https://delhitourism.gov.in/dt/festivals/diwali.html',supports:'Rama return tradition; cleaning, decoration and Lakshmi worship.'},
{url:'https://asia.si.edu/whats-on/events/celebrations/diwali/',supports:'Light symbolism; family activities; rangoli and Lakshmi.'},
{url:'https://www.incredibleindia.gov.in/en/festivals-and-events/diwali',supports:'Multiple festival days; diversity of activities.'},
{url:'https://apnews.com/article/a3a728c371f4d3b46dffcbf06f83773e',supports:'Northern Rama and southern Krishna traditions; early morning oil bath. 2024 article used for stable cultural background, not current dates.'}
];
const plan={title:'దీపావళి ఎందుకు జరుపుకుంటాం? | కథలు, దీపాలు, లక్ష్మీపూజ',language:'te',created:'2026-11-08',model:'eleven_v4',voiceId:'9dQiWzuJKan0MNO2wA8U',short:short.map(([title,text,image],index)=>({index,title,text,image})),long:long.map(([title,text,image],index)=>({index,title,text,image})),sources,editorialNotes:['Religious narratives are presented as traditions, not verified historical events.','Personal values and suggested acts of kindness are editorial interpretations, not mandatory rituals.','Satyabhama is qualified as a regional retelling, not an exclusive claim about who killed Narakasura.','No claim that lamps or fireworks cure disease or guarantee wealth.','Illustrated narrated videos, not live footage.','Art generated specifically for this production.']};
await writeFile(`${root}/plan.json`,JSON.stringify(plan,null,2));
for(const variant of ['short','long']){
await writeFile(`${root}/${variant}-script-te.txt`,plan[variant].map(s=>s.text).join('\n\n')+'\n');
await writeFile(`${root}/${variant}-storyboard-te.md`,'# '+(variant==='short'?'దీపావళి ఎందుకు జరుపుకుంటాం? — Short':plan.title)+'\n\n'+plan[variant].map(s=>`## ${s.index+1}. ${s.title}\n\n${s.text}\n\nదృశ్యం: art/${s.image}.png`).join('\n\n')+'\n');
}
await writeFile(`${root}/research.md`,'# Diwali research and editorial choices\n\nChecked 8 November 2026.\n\n'+sources.map(s=>`- [Source](${s.url}): ${s.supports}`).join('\n')+'\n\n'+plan.editorialNotes.map(s=>'- '+s).join('\n')+'\n');
console.log(JSON.stringify({root,shortCharacters:short.map(s=>s[1]).join('').length,longCharacters:long.map(s=>s[1]).join('').length}));


