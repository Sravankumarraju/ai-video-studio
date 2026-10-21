from pathlib import Path
import json,difflib,statistics
from rapidfuzz.fuzz import ratio
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
def norm(s):
 s=''.join(chr(ord(c)-0x300) if '\u0c00'<=c<='\u0c7f' else c for c in s)
 s=s.replace('ळ','ल').replace('ङ्','ं').replace('ञ्','ं').replace('म्','ं')
 return ''.join(c for c in s if '\u0900'<=c<='\u0963')
timeline=json.loads((ROOT/'full-timeline.json').read_text(encoding='utf8'))
asr=json.loads((ROOT/'full-approved-chant-master-transcription.json').read_text(encoding='utf8'))
words=[w for w in asr['words'] if w['type']=='word']
records=[]
for verse in timeline['verses']:
 heard=[w for w in words if verse['start']<=((w['start']+w['end'])/2)<verse['end']]
 expected=norm(verse['text']);actual=norm(''.join(w['text'] for w in heard))
 blocks=difflib.SequenceMatcher(None,expected,actual,autojunk=False).get_matching_blocks()
 actualTimes=[]
 for w in heard:
  text=norm(w['text'])
  actualTimes.extend(w['start']+(w['end']-w['start'])*i/len(text) for i in range(len(text)))
 cursor=0;timings=[]
 for w in verse['words']:
  text=norm(w['text'])
  block=next((b for b in blocks if b.a<=cursor and cursor+len(text)<=b.a+b.size),None)
  if block and text:
   index=block.b+cursor-block.a
   timings.append({'word':w['text'],'captionStart':w['start'],'asrEstimatedStart':round(actualTimes[index],3),'deltaSeconds':round(w['start']-actualTimes[index],3)})
  cursor+=len(text)
 records.append({'verse':verse['verse'],'textCharacterSimilarity':round(ratio(expected,actual),2),'independentMasterTranscript':' '.join(w['text'] for w in heard),'matchedWordTimingEstimates':timings,'timingFlags':[t for t in timings if abs(t['deltaSeconds'])>.8],'listeningReviewRequired':True})
report={'scope':'Independent transcription of the assembled audio after gap editing.','limitations':'Text similarity and estimated word timing screen for problems; neither certifies Sanskrit pronunciation. ASR interpolation is not phonetic alignment.','all29VersesScreened':len(records)==29,'verses':records}
(ROOT/'assembled-audio-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'verses':len(records),'timingFlags':sum(len(v['timingFlags']) for v in records),'textMatches':[{'verse':v['verse'],'match':v['textCharacterSimilarity']} for v in records]}))
