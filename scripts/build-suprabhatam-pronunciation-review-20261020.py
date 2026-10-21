from pathlib import Path
import json,html,csv,difflib
from rapidfuzz.fuzz import ratio

ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
audit=json.loads((ROOT/'independent-lyric-audit.json').read_text(encoding='utf8'))
selection=json.loads((ROOT/'audio-selection.json').read_text(encoding='utf8'))
source=(ROOT/'complete-lyrics-telugu.txt').read_text(encoding='utf8').strip().split('\n\n')
timeline=json.loads((ROOT/'full-timeline.json').read_text(encoding='utf8')) if (ROOT/'full-timeline.json').exists() else None
def esc(s):return html.escape(str(s))
def norm(s):
 s=''.join(chr(ord(c)-0x300) if '\u0c00'<=c<='\u0c7f' else c for c in s).replace('ळ','ल').replace('ङ्','ं').replace('ञ्','ं').replace('म्','ं')
 return ''.join(c for c in s if '\u0900'<=c<='\u0963')
openingAsr=json.loads(Path('data/branding/divine-wisdom/production-presets/suprabhatam-female-chant-approved-2026-10-20/voice-independent-transcript.json').read_text(encoding='utf8'))
cards=[];records=[]
for verse in range(1,30):
 name=selection.get(str(verse),'opening')
 a=next((r for r in audit if r['file']==name),None)
 if verse<=2 and timeline:
  u=timeline['verses'][verse-1]
  heard=' '.join(w['text'] for w in openingAsr['words'] if w['type']=='word' and u['start']<=(w['start']+w['end'])/2<u['end'])
  expected,actual=norm(source[verse-1]),norm(heard)
  matcher=difflib.SequenceMatcher(None,expected,actual,autojunk=False)
  a={'lyricTranscript':heard,'characterSimilarity':round(ratio(expected,actual),2),'differences':[{'kind':tag,'expected':expected[i:j],'recognized':actual[k:l]} for tag,i,j,k,l in matcher.get_opcodes() if tag!='equal']}
 audio=f'audio/{name}.wav' if (ROOT/'audio'/f'{name}.wav').exists() else (f'{name}.mp3' if verse>2 else 'audio/opening.wav')
 if verse<=2 and timeline:
  openingVerse=timeline['verses'][verse-1]
  audio+=f"#t={openingVerse['start']},{openingVerse['end']}"
 gapfile=ROOT/'audio'/f'{name}-gap-audit.json'
 gap=json.loads(gapfile.read_text(encoding='utf8')) if gapfile.exists() else None
 differences=a['differences'] if a else []
 flags=[]
 for d in differences:
  pair=d['expected']+d['recognized']
  kind='Missing or extra syllables / recognition uncertainty'
  if any(c in pair for c in 'ािीुूृॄेैोौ'):kind='Vowel length or vowel identity — listen'
  elif any(c in pair for c in 'खघछझठढथधफभशषसङञणक्ष'):kind='Aspiration, sibilant or consonant cluster — listen'
  flags.append({**d,'listeningCategory':kind})
 record={'verse':verse,'recording':name,'intendedTelugu':source[verse-1],
 'independentTranscript':a['lyricTranscript'] if a else 'Opening verses; see the word timing record.',
 'transcriptCharacterSimilarity':a['characterSimilarity'] if a else None,
 'status':'LISTENING_REVIEW_REQUIRED','flags':flags,'gapAudit':gap,
 'captionTimingBasis':'Provider timestamps mapped to supplied words; independent ASR is a screening comparison, not phoneme alignment.'}
 records.append(record)
 diff=''.join(f'<li><b>{esc(d["listeningCategory"])}</b>: expected <code>{esc(d["expected"] or "∅")}</code> → recognized <code>{esc(d["recognized"] or "∅")}</code></li>' for d in flags)
 score=f'{a["characterSimilarity"]}%' if a else 'Opening verses'
 rows=''
 if gap:
  rows=''.join(f'<tr><td>{esc(g["after"])}</td><td>{esc(g["location"])}</td><td>{g["originalGapSeconds"]:.2f}s</td><td>{g["editedGapSeconds"]:.2f}s</td></tr>' for g in gap['gaps'] if g['location']=='printed-line-boundary' or g['originalGapSeconds']>.45)
 cards.append(f'''<article id="verse-{verse}"><h2>శ్లోకం {verse} <small>Listening review required</small></h2>
 <audio controls preload="none" src="{esc(audio)}"></audio><p class="source">{esc(source[verse-1])}</p>
 <details><summary>Independent transcript and word flags · character match {score}</summary><p>{esc(record['independentTranscript'])}</p><ul>{diff or '<li>No differences detected by this text comparison. Listen for pronunciation.</li>'}</ul></details>
 <details><summary>Breath placement and gap edits</summary><p>Printed line endings guide breath placement. Durations are editorial targets, not exact measurements of the reference. Check every join by ear.</p><table><tr><th>After word</th><th>Location</th><th>Before</th><th>After</th></tr>{rows}</table></details>
 <fieldset><legend>Listening checklist</legend>{''.join(f'<label><input type="checkbox" data-key="v{verse}-{i}"> {esc(s)}</label>' for i,s in enumerate(['Every supplied word audible once, in order','Short / long vowels and vocalic ṛ correct','Aspirates, ś / ṣ / s, retroflexes and conjuncts clear','Word endings and visarga / anusvāra correct','Breaths at full-line boundaries; no clipped syllables','Caption highlights follow the audible words','Singer and drone continuous across joins']))}<textarea data-key="v{verse}-notes" placeholder="Timestamp + word + correction needed"></textarea></fieldset></article>''')
checks={'all29SourceVerses':len(source)==29,'allSelectedRecordingsPresent':all((ROOT/f'{name}.mp3').exists() for name in selection.values()),'all29CaptionVersesInOrder':bool(timeline and [v['verse'] for v in timeline['verses']]==list(range(1,30))), 'humanPronunciationApproval':False,'exactReferenceGapTimingsVerified':False}
if timeline:
 checks['positiveCaptionWordDurations']=all(w['end']>w['start'] for v in timeline['verses'] for w in v['words'])
 checks['captionWordsWithinVerse']=all(v['start']-.03<=w['start']<w['end']<=v['end']+.03 for v in timeline['verses'] for w in v['words'])
 checks['wordStartsMonotonic']=all(all(a['start']<=b['start'] for a,b in zip(v['words'],v['words'][1:])) for v in timeline['verses'])
 checks['pitchAndTempoUnchangedByGapPass']=all(r['gapAudit'] is None or (r['gapAudit']['vocalTimingUnstretched'] and not r['gapAudit']['pitchChanged']) for r in records)
report={'purpose':'Thorough pronunciation and caption review, with automated screening and explicit human listening sign-off.', 'limitations':['ASR can accept a wrong pronunciation or reject a correct Sanskrit chant. Character similarity is not a pronunciation score.','Provider lyric timestamps describe supplied text; they do not prove that each sound was performed correctly.','Reference gap locations guide editing. Exact millisecond timing across the reference has not been verified.','No verse has final qualified Sanskrit pronunciation sign-off in this report.'],'checks':checks,'verses':records}
masterAttempt=ROOT/'full-approved-chant-master-transcription-attempt.json'
if masterAttempt.exists():
 state=json.loads(masterAttempt.read_text(encoding='utf8')).get('state')
 report['wholeTrackTranscriptionState']=state
 if state!='completed':report['limitations'].append('The additional whole-track transcription did not return a result. The report uses the individual verse transcripts; it does not claim a completed transcription check after audio gap editing.')
(ROOT/'pronunciation-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
with (ROOT/'pronunciation-validation.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['Verse','Recording','Transcript character match (not pronunciation score)','Flag count','Listening status']);w.writerows([r['verse'],r['recording'],r['transcriptCharacterSimilarity'],len(r['flags']),r['status']] for r in records)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suprabhatham · pronunciation review</title>
<style>@font-face{font-family:Telugu;src:url('../../public/fonts/NotoSansTelugu.ttf')}*{box-sizing:border-box}body{margin:0;background:#162112;color:#f7f1d6;font:17px/1.6 system-ui}main{max-width:1060px;margin:auto;padding:30px}h1,h2{color:#f2d58a}h2{font-size:24px}small{font-size:14px;color:#edbc86;display:block}.notice,article{background:#24341d;border:1px solid #647249;border-radius:12px;padding:24px;margin:20px 0}.source{font:25px/1.9 Telugu,sans-serif;white-space:pre-line}audio{width:100%}summary{cursor:pointer;color:#f2d58a;padding:12px 0}code{font:20px/1.6 sans-serif}label{display:block;margin:8px 0}textarea{width:100%;min-height:80px;padding:12px}fieldset{border:1px solid #647249;margin-top:16px}table{width:100%;border-collapse:collapse}td,th{padding:7px;text-align:left;border-bottom:1px solid #647249}button{padding:12px 20px;cursor:pointer;background:#e6c477;color:#172212;border:0;border-radius:8px}nav a{color:#f2d58a;margin:6px;display:inline-block}</style><main><h1>Sri Venkateswara Suprabhatham</h1><p>Pronunciation, caption and breath placement review · Divine Wisdom Telugu</p>
<div class="notice"><b>Automated screening is complete only where a transcript is shown. Final pronunciation approval is pending.</b><p>Listen against the intended Sanskrit text written in Telugu. Character match measures text agreement; it does not certify sounds. Review long vowels, aspirates, conjuncts, word endings, and each audio join. Gaps follow printed lyric boundaries; exact reference timing has not been established.</p><p>Checkmarks and notes save in this browser. Export them for a review record.</p><button onclick="exportReview()">Export listening decisions</button></div><nav>'''+''.join(f'<a href="#verse-{v}">{v}</a>' for v in range(1,30))+'</nav>'+''.join(cards)+'''<p>Text references: <a href="https://stotranidhi.com/venkateshwara-suprabhatam-in-telugu/">Stotra Nidhi</a> · <a href="https://www.tirumala.org/Suprabhatam.aspx">Tirumala</a></p></main><script>
const controls=[...document.querySelectorAll('[data-key]')];for(const e of controls){const k='suprabhatham-review-'+e.dataset.key;const s=localStorage.getItem(k);if(e.type==='checkbox')e.checked=s==='true';else e.value=s||'';e.addEventListener('input',()=>localStorage.setItem(k,e.type==='checkbox'?e.checked:e.value))}function exportReview(){const decisions=Object.fromEntries(controls.map(e=>[e.dataset.key,e.type==='checkbox'?e.checked:e.value]));const b=new Blob([JSON.stringify({reviewedAt:new Date().toISOString(),decisions},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='suprabhatham-listening-review.json';a.click();URL.revokeObjectURL(a.href)}
</script></html>'''
(ROOT/'pronunciation-review.html').write_text(page,encoding='utf8')
print(json.dumps({'report':str((ROOT/'pronunciation-review.html').resolve()),'checks':checks}))
