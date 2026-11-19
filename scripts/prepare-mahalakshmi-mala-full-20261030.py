from pathlib import Path
import re,json,math
R=Path('data/productions/divine-wisdom/mahalakshmi-mala-full-2026-10-30');(R/'requests').mkdir(exist_ok=True);(R/'art').mkdir(exist_ok=True)
def clean(t):
 t=re.sub(r'\[[^\]]*\]','',t)
 return re.sub(r'[ \t]+',' ',t.strip()).replace(' |','').strip()
ma=(R/'sources/mahalakshmi.txt').read_text(encoding='utf8');ma=ma[ma.index('నమస్తేఽస్తు'):ma.index('ఇతి శ్రీ')]
# Editorial alternative yogajñe is not part of the chosen sung edition.
ma=re.sub(r'\[[^\]]*\]','',ma)
m=[clean(t) for t in re.split(r'\|\|\s*[౦-౯0-9]+\s*\|\|',ma) if t.strip()]
assert len(m)==11,len(m)
ka=(R/'sources/kanakadhara.txt').read_text(encoding='utf8');ka=ka[ka.index('అంగం హరేః'):ka.index('ఇతి శ్రీమత్')]
# Choose the documented 21-verse edition: main 18 plus the three namostu verses.
blocks=list(re.finditer(r'\[\*.*?\*\]',ka,re.S));assert len(blocks)==3
for b in reversed(blocks[1:]):ka=ka[:b.start()]+ka[b.end():]
ka=re.sub(r'\[\* అధిక శ్లోకాః –\s*','',ka).replace('*]','')
k=[clean(t) for t in re.split(r'\|\|(?:\s*[౦-౯0-9]+\s*\|\|)?',ka) if t.strip()]
assert len(k)==21,len(k)
# Join typographical cross-line compound breaks before singing.
k=[re.sub(r'-\s*\n-?','',v) for v in k]
asht=(R/'sources/ashtalakshmi.txt').read_text(encoding='utf8');asht=asht[asht.index('ఆదిలక్ష్మీ –'):asht.index('ఇతి అష్టలక్ష్మీ')]
a=[];names=[]
for part in re.split(r'\|\|\s*[౦-౯0-9]+\s*\|\|',asht):
 if not part.strip():continue
 lines=part.strip().splitlines();names.append(lines[0].replace(' –',''));a.append(clean('\n'.join(lines[1:])))
assert len(a)==8,len(a)
base=json.loads(Path('data/productions/divine-wisdom/mahalakshmi-mala-sample-2026-10-30/request.json').read_text(encoding='utf8'))
ref=json.loads(Path('data/productions/divine-wisdom/mahalakshmi-mala-sample-2026-10-30/sample-attempt.json').read_text(encoding='utf8'))
assert [re.sub(r'[^\u0c00-\u0c7f]','',t) for t in m[:2]]==[re.sub(r'[^\u0c00-\u0c7f]','',t['text']) for t in base['composition_plan']['chunks']]
sections=[{'id':'mahalakshmi','title':'శ్రీ మహాలక్ష్మ్యష్టకం','verses':m,'secondsPerVerse':20,'source':'https://stotranidhi.com/mahalakshmi-ashtakam-in-telugu/','edition':'8 stotra verses and 3 phalashruti verses; approved opening two reused'}, {'id':'kanakadhara','title':'కనకధారా స్తోత్రం','verses':k,'secondsPerVerse':30,'source':'https://stotranidhi.com/kanakadhara-stotram-in-telugu/','edition':'21-verse edition: main 18 with 3 additional namostu verses; separate Ganesha prelude omitted'}, {'id':'ashtalakshmi','title':'అష్టలక్ష్మీ స్తోత్రం','verses':a,'verseNames':names,'secondsPerVerse':40,'source':'https://stotranidhi.com/ashtalakshmi-stotram-in-telugu/','edition':'All eight forms in source order'}]
batches=[]
for section in sections:
 start=2 if section['id']=='mahalakshmi' else 0
 stride=7 if section['id']=='kanakadhara' else 9
 for cursor in range(start,len(section['verses']),stride):
  vs=section['verses'][cursor:cursor+stride];name=f'batch-{len(batches)+1:02}'
  positive=[s for s in base['composition_plan']['chunks'][0]['positive_styles'] if not s.startswith('Precise Sanskrit') and not s.startswith('Begin first') and not s.startswith('Original South')]
  positive += ['Original South Indian devotional female sung stotram, graceful auspicious lyrical Carnatic melody at 72 BPM; preserve the approved reference singer identity and tone', 'Precise Sanskrit diction from Telugu script. Sing EVERY supplied syllable in exact order without omitted, repeated, replaced or added words; clear long vowels and conjunct consonants', 'Foreground solo voice well above quiet veena, tanpura and sparse mridangam; no instrumental interlude between verses, natural short breath at phrase ends', 'Continue coherently from the supplied original reference; no new introduction; only resolve after the last complete supplied word']
  request={'model_id':'music_v2_5','with_timestamps':True,'store_for_inpainting':True,'composition_plan':{'chunks':[{'text':v,'duration_ms':section['secondsPerVerse']*1000,'positive_styles':positive,'negative_styles':base['composition_plan']['chunks'][0]['negative_styles'],'context_adherence':'high','conditioning_ref':{'song_id':ref['songId'],'range':{'start_ms':100,'end_ms':19500}},'condition_strength':'high'} for v in vs]}}
  (R/'requests'/f'{name}.json').write_text(json.dumps(request,ensure_ascii=False,indent=2),encoding='utf8')
  batches.append({'name':name,'section':section['id'],'firstVerse':cursor+1,'lastVerse':cursor+len(vs),'seconds':len(vs)*section['secondsPerVerse'],'reserveCredits':math.ceil(len(vs)*section['secondsPerVerse']*18)})
plan={'title':'శ్రీ మహాలక్ష్మి స్తోత్ర మాలిక','model':'music_v2_5','sections':sections,'batches':batches,'totalVerses':40,'requestedSongSeconds':1170,'approvedSampleSeconds':40,'includedCreditsReserve':sum(b['reserveCredits'] for b in batches),'authorization':'User approved the female sample and requested full video with five to six powerful images. Full three-stotra collection; use included ElevenLabs credits only; no topup, overage or publishing.','humanPronunciationReviewPending':True}
assert sum(len(s['verses']) for s in sections)==40
(R/'full-production-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
(R/'lyrics-telugu.txt').write_text('\n\n'.join(s['title']+'\n\n'+'\n\n'.join(s['verses']) for s in sections)+'\n',encoding='utf8')
print(json.dumps({'verses':[len(m),len(k),len(a)],'seconds':1170,'batches':batches,'creditReserve':plan['includedCreditsReserve']}))
