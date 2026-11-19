from pathlib import Path
import json,shutil
R=Path('data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30');(R/'requests').mkdir(parents=True,exist_ok=True);(R/'art').mkdir(exist_ok=True)
S=Path('data/productions/divine-wisdom/lakshmi-prayer-clear-flow-v2-2026-10-30');A=Path('data/productions/divine-wisdom/mahalakshmi-mala-full-2026-10-30')
epithets=['కమలవాసిని కరుణారూపిణి','మంగళదాయిని మాధవకామిని','పద్మవిలోచని పావనరూపిణి','హరిహృదయేశ్వరి హితవిధాయిని','శుభగుణవర్ధిని శాంతివిధాయిని','సరసిజలోచని సౌమ్యవిలాసిని','భక్తమనోహరి భవ్యవిలాసిని','సుమనసపూజితే సుమధురభాషిణి','అమృతసాగరజే అభయప్రదాయిని','కనకవిభూషితే కమలకరే','మృదులమనోహరి ముక్తివిధాయిని','సకలశుభంకరి సద్గతిదాయిని','హరిప్రియే హృదయనివాసిని','పద్మప్రియే పరమదయామయి','సౌభాగ్యదాయిని సౌమ్యమనోహరి','మంగళరూపిణి మానసవాసిని','శరణాగతవత్సలే శుభకరే','దీనజనప్రియే దివ్యవిలాసిని','సుకృతవివర్ధిని సుందరరూపిణి','ఆశ్రితపాలిని ఆనందదాయిని','నిత్యప్రసన్నే నిర్మలరూపిణి','సదయవిలోచని సకలహితైషిణి','సుమధురహాసిని సుజనసుపూజితే','కమలనిలయే కాంతిమయి']
themes=[
 ('భక్తి మరియు శాంతి',['మమ హృదయే భక్తిం దేహి','మమ మనసి శాంతిం దేహి','మమ మనసి శ్రద్ధాం దేహి']),
 ('కరుణ మరియు క్షమ',['మమ హృదయే దయాం దేహి','మమ చిత్తే కరుణాం దేహి','మమ హృదయే క్షమాం దేహి']),
 ('జ్ఞానం మరియు వివేకం',['మమ బుద్ధౌ జ్ఞానం దేహి','మమ మనసి వివేకం దేహి','మమ బుద్ధౌ స్పష్టతాం దేహి']),
 ('ధైర్యం మరియు స్థైర్యం',['మమ చిత్తే ధైర్యం దేహి','మమ మనసి స్థైర్యం దేహి','మమ పథి రక్షాం దేహి']),
 ('వినయం మరియు మాధుర్యం',['మమ చిత్తే వినయం దేహి','మమ వచసి మాధుర్యం దేహి','మమ హృదయే సౌమ్యతాం దేహి']),
 ('కుటుంబ సౌఖ్యం',['మమ గేహే సౌఖ్యం దేహి','మమ జీవనే ప్రీతిం దేహి','మమ గేహే శాంతిం దేహి']),
 ('సేవ మరియు దానం',['మమ కర్మసు సేవాం దేహి','మమ హృదయే దానభావం దేహి','మమ కర్మసు కౌశలం దేహి']),
 ('కృతజ్ఞత మరియు తృప్తి',['మమ హృదయే కృతజ్ఞతాం దేహి','మమ చిత్తే తుష్టిం దేహి','మమ మనసి సంతోషం దేహి']),
 ('సత్యం మరియు శుద్ధి',['మమ వచసి సత్యం దేహి','మమ కర్మసు శుద్ధిం దేహి','మమ హృదయే నిర్మలతాం దేహి']),
 ('మైత్రి మరియు సమత',['మమ మనసి మైత్రీం దేహి','మమ దృష్టౌ సమతాం దేహి','మమ హృదయే సుహృద్భావం దేహి']),
 ('ఆశ మరియు వెలుగు',['మమ హృదయే ఆశాం దేహి','మమ పథి దీప్తిం దేహి','మమ జీవనే సార్థకతాం దేహి']),
 ('సమర్పణ మరియు మంగళం',['మమ హృదయే భక్తిం దేహి','మమ మనసి శాంతిం దేహి','మమ జీవనే మంగళం దేహి'])]
base=json.loads((S/'request.json').read_text(encoding='utf8'));ref=json.loads((S/'sample-attempt.json').read_text(encoding='utf8'))
units=[];batches=[]
for ti,(name,prayers) in enumerate(themes):
 selected=[]
 for j in range(9):
  e=epithets[(ti*5+j)%len(epithets)]
  text=e+'\n'+prayers[j%3];number=len(units)+1
  u={'number':number,'themeIndex':ti,'theme':name,'text':text,'imageIndex':(ti+j//3)%6};units.append(u)
  if number>2:selected.append(u)
 request={'model_id':'music_v2_5','with_timestamps':True,'store_for_inpainting':True,'composition_plan':{'chunks':[]}}
 for u in selected:
  pos=[s.replace('no pause or instrumental fill between the two chunks','no pause or instrumental fill between consecutive chunks').replace('Continue the second chunk directly from the first','Continue each consecutive chunk directly from the preceding one') for s in base['composition_plan']['chunks'][0]['positive_styles']]
  pos+=['Match the supplied original reference female singer, register, restrained melodic recitation and dry forward vocal texture consistently throughout this continuation. Reference is our own generated opening, not an external performance.','This is one short invocation in a continuous original prayer collection. Sing every supplied word exactly once; no lyric improvisation, omitted syllables or additional refrains.']
  request['composition_plan']['chunks'].append({'text':u['text'],'duration_ms':10000,'positive_styles':pos,'negative_styles':base['composition_plan']['chunks'][0]['negative_styles'],'context_adherence':'high','conditioning_ref':{'song_id':ref['songId'],'range':{'start_ms':640,'end_ms':8240}},'condition_strength':'high'})
 bname=f'batch-{ti+1:02}'
 (R/'requests'/f'{bname}.json').write_text(json.dumps(request,ensure_ascii=False,indent=2),encoding='utf8')
 batches.append({'name':bname,'themeIndex':ti,'theme':name,'firstInvocation':selected[0]['number'],'lastInvocation':selected[-1]['number'],'seconds':len(selected)*10,'reserveCredits':len(selected)*10*18,'units':selected})
assert len(units)==108
assert [u['text'] for u in units[:2]]==[c['text'] for c in base['composition_plan']['chunks']]
welcome='డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. శ్రీ లక్ష్మీ కరుణా ప్రార్థనా మాలికను భక్తితో ఆలకిద్దాం. కొత్తగా రచించిన ఈ ప్రార్థనలో నూట ఎనిమిది ప్రార్థనా పంక్తులు ఉన్నాయి. తెలుగు లిపిలో సాహిత్యాన్ని అనుసరించండి.'
closing='శ్రీ లక్ష్మీదేవి అనుగ్రహం మీ అందరికీ కలగాలి. డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. వీడియోను లైక్ చేయండి, మీ కుటుంబ సభ్యులకు షేర్ చేయండి. మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి.'
plan={'title':'శ్రీ లక్ష్మీ కరుణా ప్రార్థనా మాలిక','subtitle':'108 కొత్త ప్రార్థనలు • స్త్రీ స్వరంలో • తెలుగు సాహిత్యంతో','lyricsOrigin':'Newly authored Sanskrit-style devotional invocation collection in Telugu script, assembled specifically for this project; invocations use recurring short prayer forms and common devotional epithets. Not represented as an ancient scripture or any of the rejected traditional stotras.','totalInvocations':108,'units':units,'themes':[t[0] for t in themes],'batches':batches,'requestedNewMusicSeconds':1060,'approvedOpening':'approved-opening.mp3','approvedOpeningMetadata':'approved-opening-metadata.json','reuseApprovedInvocations':[1,2],'welcome':welcome,'closing':closing,'voiceId':'9dQiWzuJKan0MNO2wA8U','bookendModel':'eleven_v4','maximumNewMusicCalls':12,'musicReserveCredits':sum(b['reserveCredits'] for b in batches),'overallIncludedCreditsReserve':21500,'authorization':'User approved the tighter clear-flow female prayer sample and instructed create full. Complete an original full-length prayer video with six existing original Lakshmi illustrations, complete logo, full-verse word-highlight captions and channel welcome and closing. Use included credits only; no topups, overage, contact with support or publishing.','audioPolicy':'No pitch or tempo change. Shorten only pauses outside both recognized and provider-aligned words. Preserve original source files.','copyrightBlockedTextUsed':False,'published':False,'humanPronunciationReviewPending':True}
(R/'full-production-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
(R/'complete-lyrics-telugu.txt').write_text('\n\n'.join(f"{u['number']}. {u['text']}" for u in units)+'\n',encoding='utf8')
for p in (A/'art').glob('*.png'):shutil.copyfile(p,R/'art'/p.name)
shutil.copyfile(A/'channel-logo-transparent.png',R/'channel-logo-transparent.png');shutil.copyfile(A/'image-prompts.json',R/'image-prompts.json')
shutil.copyfile(S/'lakshmi-prayer-clear-flow-v2-tight.mp3',R/'approved-opening.mp3');shutil.copyfile(S/'sample-metadata-tight.json',R/'approved-opening-metadata.json')
shutil.copyfile(S/'pronunciation-autodetect.json',R/'approved-opening-transcription-source.json')
for n in ['welcome','closing']:
 (R/f'{n}-request.json').write_text(json.dumps({'inputs':[{'text':plan[n],'voice_id':plan['voiceId']}],'model_id':plan['bookendModel'],'language_code':'te'},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'invocations':108,'themes':12,'newMusicSeconds':1060,'musicCreditReserve':plan['musicReserveCredits'],'overallCreditReserve':plan['overallIncludedCreditsReserve'],'approvedOpeningReused':True}))
