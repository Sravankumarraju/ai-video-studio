import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22';
const out=`${root}/youtube-package`;await mkdir(out,{recursive:true});
const timeline=JSON.parse(await readFile(`${root}/timeline.json`,'utf8'));
const verification=JSON.parse(await readFile(`${root}/VERIFICATION.json`,'utf8'));
const current=JSON.parse(await readFile(`${root}/youtube-metadata.json`,'utf8'));
assert(verification.fullDecodePassed&&verification.allMainVersesInOrder);
const title='విష్ణు సహస్రనామం పూర్తి | Vishnu Sahasranamam Telugu Lyrics | పూర్వపీఠిక & ఫలశ్రుతి';
const chapters=current.chapters.map(c=>({...c,start:Math.floor(c.start)}));
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const chapterText=chapters.map(c=>`${time(c.start)} ${c.title}`).join('\n');
assert(chapters.length>=3&&chapters[0].start===0);
assert(chapters.every((c,i)=>(chapters[i+1]?.start??timeline.seconds)-c.start>=10));
const description=`శ్రీ విష్ణు సహస్రనామం పూర్తి పారాయణం — పూర్వపీఠిక, న్యాసం, ధ్యానం, సహస్రనామ స్తోత్రం మరియు ఫలశ్రుతితో ఆలకించండి. పూర్తి తెలుగు శ్లోకాలు, పలికే పదాల హైలైటింగ్, మధురమైన మహిళా గానం మరియు మృదువైన భక్తి సంగీతంతో అనుసరించండి.

Vishnu Sahasranamam full recitation with Telugu lyrics, female devotional chanting and word highlighting. Includes the opening prayers, Nyasam, Dhyanam, complete Sahasranama Stotram and Phalashruti.

సంస్కృత స్తోత్రం తెలుగు లిపిలో | Sanskrit prayer displayed in Telugu script.

సమయ సూచికలు / CHAPTERS
${chapterText}

ఈ వీడియోలో / IN THIS VIDEO
• పూర్వపీఠిక, కరన్యాసం, అంగన్యాసం మరియు ధ్యానం
• సహస్రనామ స్తోత్రం — మొత్తం 108 సంఖ్యాంకిత శ్లోక భాగాలు
• ఫలశ్రుతి, ముగింపు ప్రార్థనలు మరియు సమర్పణ
• ప్రతి పూర్తి శ్లోకం తెరపై కనిపిస్తూ, పలికే పదాలు బంగారు రంగులో హైలైట్ అవుతాయి
• శ్రీమహావిష్ణువు భక్తి చిత్రాలతో ప్రశాంతమైన పారాయణ అనుభవం

ఓం నమో నారాయణాయ 🙏
మీకు ఇష్టమైన విష్ణు నామాన్ని కామెంట్‌లో రాయండి. ఈ పారాయణం మీకు నచ్చితే వీడియోను లైక్ చేయండి, మీ కుటుంబ సభ్యులు మరియు స్నేహితులతో షేర్ చేయండి. మరిన్ని తెలుగు భక్తి వీడియోల కోసం డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.

సాంప్రదాయ సాహిత్య మూలం / TRADITIONAL TEXT SOURCE
Olympia Hindu Temple and Cultural Center:
https://www.ohtccwa.org/pooja_library/vishnu_sahasranamam_te

సృష్టి వివరాలు / PRODUCTION NOTE
ఈ వీడియోలో గానం, సంగీతం, ఛానల్ స్వరం మరియు భక్తి చిత్రాలు AI సహాయంతో మా ఛానల్ కోసం రూపొందించబడ్డాయి. ఇది సాంప్రదాయ స్తోత్రానికి మా ఛానల్ రూపొందించిన కొత్త గానం మరియు దృశ్య రూపకల్పన.
Original channel production with AI-assisted vocals, music and devotional artwork.

#VishnuSahasranamam #విష్ణుసహస్రనామం #DivineWisdomTelugu`;
const tags=['vishnu sahasranamam','vishnu sahasranamam telugu','vishnu sahasranamam full','vishnu sahasranamam telugu lyrics','sri vishnu sahasranamam','vishnu sahasranama stotram','vishnu sahasranamam female voice','vishnu sahasranamam phalashruti','telugu devotional songs','om namo narayanaya','narayana','divine wisdom telugu','విష్ణు సహస్రనామం','విష్ణు సహస్రనామ స్తోత్రం'];
const pinnedComment='ఓం నమో నారాయణాయ 🙏 మీకు ఇష్టమైన శ్రీమహావిష్ణు నామాన్ని కామెంట్‌లో రాయండి. పూర్వపీఠిక, సహస్రనామాలు, ఫలశ్రుతికి నేరుగా వెళ్లేందుకు వివరణలో సమయ సూచికలు ఉన్నాయి. ఈ పారాయణం మీకు నచ్చితే లైక్ చేయండి, కుటుంబంతో పంచుకోండి, డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.';
assert([...title].length<=100);assert([...description].length<=5000);assert(tags.join(', ').length<=500);
const metadata={title,description,tags,chapters,defaultLanguage:'te',defaultAudioLanguage:'sa',captionLanguage:'te',channelBookendLanguage:'te',category:'Music',categoryId:'10',containsSyntheticMedia:true,thumbnail:'youtube-package/thumbnail-youtube-v2.jpg',videoFile:'Sri-Vishnu-Sahasranamam-Complete-Telugu-1080p.mp4',duration:timeline.seconds,pinnedCommentDraft:pinnedComment,uploadOrPublishingAuthorized:false,humanPronunciationListeningReviewPending:true};
const entries=[['title.txt',title],['description.txt',description],['tags.txt',tags.join(', ')],['chapters.txt',chapterText],['hashtags.txt','#VishnuSahasranamam #విష్ణుసహస్రనామం #DivineWisdomTelugu'],['pinned-comment-draft.txt',pinnedComment]];
for(const [name,text] of entries)await writeFile(`${out}/${name}`,text+'\n');
await writeFile(`${out}/youtube-metadata.json`,JSON.stringify(metadata,null,2));
const details=`TITLE
${title}

DESCRIPTION — copy this section into YouTube Studio
${description}

TAGS — paste into the separate Tags field
${tags.join(', ')}

PINNED COMMENT DRAFT
${pinnedComment}

VIDEO DETAILS
Channel: Divine Wisdom Telugu
Duration: 27:42
Category: Music
Title and description language: Telugu
Main chant language: Sanskrit
On-screen lyrics and subtitle language: Telugu
Channel intro and outro language: Telugu
Thumbnail: thumbnail-youtube-v2.jpg
Video: Sri-Vishnu-Sahasranamam-Complete-Telugu-1080p.mp4

The full lyric transcript is supplied separately as complete-lyrics-telugu.txt.
`;
await writeFile(`${out}/youtube-details.txt`,details);
await copyFile(`${root}/complete-lyrics-telugu.txt`,`${out}/complete-lyrics-telugu.txt`);
await copyFile(`${root}/telugu-captions.srt`,`${out}/telugu-captions.srt`);
await copyFile(`${root}/telugu-captions.vtt`,`${out}/telugu-captions.vtt`);
await writeFile(`${out}/validation.json`,JSON.stringify({titleCharacters:[...title].length,descriptionCharacters:[...description].length,tagsCharacters:tags.join(', ').length,chapters:chapters.length,allChaptersAtLeastTenSeconds:true,numberedStotramVerses:108,sourceVerifiedBy:'Saved production timeline and verification report',platformReferences:['https://support.google.com/youtube/answer/57407?hl=en','https://support.google.com/youtube/answer/72431?hl=en','https://support.google.com/youtube/answer/9884579?hl=en']},null,2));
// Preserve the earlier assembly metadata and keep the final package as the primary copy.
try{await copyFile(`${root}/youtube-metadata.json`,`${root}/youtube-metadata-before-packaging.json`,0x1);}catch(error){if(error.code!=='EEXIST')throw error;}
await writeFile(`${root}/youtube-metadata.json`,JSON.stringify(metadata,null,2));
await writeFile(`${root}/youtube-description.txt`,description+'\n');
await writeFile(`${root}/chapters.txt`,chapterText+'\n');
console.log(JSON.stringify({title,titleCharacters:[...title].length,descriptionCharacters:[...description].length,tagsCharacters:tags.join(', ').length,chapters:chapters.length,package:out}));
