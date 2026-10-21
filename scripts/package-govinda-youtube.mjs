import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root='data/productions/divine-wisdom/govinda-namalu-full-2026-10-20';
const out=`${root}/youtube-package`;
await mkdir(out,{recursive:true});
const lyrics=(await readFile(`${root}/complete-lyrics-telugu.txt`,'utf8')).trim();
const timeline=JSON.parse(await readFile(`${root}/timeline.json`,'utf8'));
assert.equal(lyrics.split(/\r?\n/).filter(Boolean).length,112);
const title='గోవింద నామాలు | Govinda Namalu Telugu Lyrics | పూర్తి 108 నామాలు | Divine Wisdom Telugu';
const chapters=[{start:0,title:'స్వాగతం • గోవింద నామావళి ప్రారంభం'},
 ...timeline.units.filter(u=>[1,7,13,19,25].includes(u.verse)).map(u=>({start:Math.floor(u.start),title:u.text.split('\n')[0]})),
 {start:Math.floor(timeline.prayerEnd),title:'ముగింపు • గోవిందా గోవిందా'}];
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const chapterText=chapters.map(c=>`${time(c.start)} ${c.title}`).join('\n');
assert.equal(chapters[0].start,0);
assert(chapters.length>=3);
assert(chapters.every((c,i)=>(chapters[i+1]?.start??timeline.seconds)-c.start>=10));
const description=`శ్రీ గోవింద నామాలు — పూర్తి 108 నామాలు, తెలుగు సాహిత్యం, మధురమైన మహిళా గానం మరియు మృదువైన భక్తి సంగీతంతో ఆలకించండి.
Govinda Namalu with complete Telugu lyrics, a single female voice and gentle devotional music.

సమయ సూచికలు / CHAPTERS
${chapterText}

పూర్తి గోవింద నామాలు / COMPLETE TELUGU LYRICS

${lyrics}

సాహిత్య మూలం: https://stotranidhi.com/sri-govinda-namalu/

డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియోను లైక్ చేసి, మీ కుటుంబ సభ్యులు మరియు స్నేహితులతో షేర్ చేయండి. కామెంట్‌లో “గోవిందా గోవిందా” అని రాయండి.

ఈ వీడియోలో గానం, సంగీతం మరియు ఛానల్ స్వరం ElevenLabs సహాయంతో రూపొందించబడ్డాయి. భక్తి చిత్రాలు AI సహాయంతో రూపొందించిన మా ఛానల్ కళాచిత్రాలు. ఇది సాంప్రదాయ నామావళికి కొత్త సంగీత రూపకల్పన.

#GovindaNamalu #గోవిందనామాలు #DivineWisdomTelugu`;
const tags=['govinda namalu','govinda namalu telugu','govinda namalu with lyrics','govinda namalu telugu lyrics','108 govinda namalu','srinivasa govinda','sri venkateswara','venkateswara namalu','tirumala devotional songs','telugu devotional songs','female devotional songs','divine wisdom telugu','గోవింద నామాలు','శ్రీనివాసా గోవిందా','శ్రీ వేంకటేశ్వర స్వామి'];
assert([...title].length<=100);
assert([...description].length<=5000);
assert(tags.join(', ').length<=500);
assert(description.includes(lyrics),'Complete lyrics missing or altered');
const pinnedComment='గోవిందా గోవిందా 🙏 పూర్తి గోవింద నామాలు వీడియో వివరణలో ఉన్నాయి. మీకు నచ్చిన నామాన్ని కామెంట్‌లో రాయండి. డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేసి, ఈ గానాన్ని మీ కుటుంబంతో పంచుకోండి.';
const metadata={title,description,tags,chapters,language:'te',category:'Music',categoryId:'10',containsSyntheticMedia:true,
 thumbnail:'youtube-package/thumbnail-youtube-v2.jpg',videoFile:'Sri-Govinda-Namalu-Telugu-1080p.mp4',
 completeNamams:108,lyricsLinesIncludingRefrains:112,pinnedCommentDraft:pinnedComment,
 uploadOrPublishingAuthorized:false,pronunciationListeningReviewPending:true};
for(const [name,text] of [['title.txt',title],['description-with-complete-namalu.txt',description],['tags.txt',tags.join(', ')],['chapters.txt',chapterText],['pinned-comment-draft.txt',pinnedComment]])await writeFile(`${out}/${name}`,text+'\n');
await writeFile(`${out}/youtube-metadata.json`,JSON.stringify(metadata,null,2));
await writeFile(`${out}/youtube-details.txt`,`TITLE\n${title}\n\nDESCRIPTION — paste this complete section into YouTube Studio\n${description}\n\nTAGS — paste separately into the Tags field\n${tags.join(', ')}\n\nPINNED COMMENT DRAFT\n${pinnedComment}\n\nVIDEO LANGUAGE: Telugu\nCATEGORY: Music\nDURATION: 5:27\nTHUMBNAIL: thumbnail-youtube-v2.jpg\n`, 'utf8');
await writeFile(`${out}/validation.json`,JSON.stringify({titleCharacters:[...title].length,descriptionCharacters:[...description].length,descriptionLimit:5000,all112LyricLinesIncluded:true,namams:108,tagsCharacters:tags.join(', ').length,chapterMinimumTenSeconds:true,descriptionRulesSource:'https://support.google.com/youtube/answer/57407?hl=en',chaptersRulesSource:'https://support.google.com/youtube/answer/9884579?hl=en'},null,2));
// Keep the production's primary metadata files consistent with this final package.
await writeFile(`${root}/youtube-metadata.json`,JSON.stringify(metadata,null,2));
await writeFile(`${root}/youtube-description.txt`,description+'\n');
await writeFile(`${root}/chapters.txt`,chapterText+'\n');
console.log(JSON.stringify({title,titleCharacters:[...title].length,descriptionCharacters:[...description].length,completeLyricLines:112,chapters:chapters.length,package:out}));
