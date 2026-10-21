from pathlib import Path
import json,re
base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12');root=base/'video-02-recitation';root.mkdir(exist_ok=True)
source=(base/'02-recitation-devanagari.txt').read_text(encoding='utf-8');source=source[source.index('॥ न्यासः ॥'):]
intro,main=source.split('ॐ श्रीमाता',1);main='ॐ श्रीमाता'+main
nyasa,dhyana=intro.split('॥ ध्यानम् ॥');nyasa=nyasa.replace('॥ न्यासः ॥','').strip();dhyana=[x.strip()+' ॥' for x in dhyana.strip().split('॥') if x.strip()];assert len(dhyana)==4
verses=[];start=0
for m in re.finditer(r'॥\s*([०-९]+)\s*॥',main):
 number=int(m.group(1).translate(str.maketrans('०१२३४५६७८९','0123456789')));assert number==len(verses)+1
 verses.append({'verse':number,'text':main[start:m.end()].strip().replace(m.group(0),'॥')});start=m.end()
assert len(verses)==182
closing=main[start:].strip();assert closing.startswith('श्रीशिवा') and 'ललिताम्बिका' in closing
batches=[{'index':0,'chunks':[{'name':'nyasa','text':nyasa,'seconds':90}]+[{'name':f'dhyana-{i+1}','text':s,'seconds':40} for i,s in enumerate(dhyana)]+[{'name':'stotram-001-006-approved-sample','kind':'reference','seconds':75,'text':'\n'.join(v['text'] for v in verses[:6]),'verses':list(range(1,7))}]}]
remaining=verses[6:]
for group in range(0,len(remaining),40):
 subset=remaining[group:group+40];chunks=[]
 for i in range(0,len(subset),8):
  rows=subset[i:i+8];chunks.append({'name':f'stotram-{rows[0]["verse"]:03}-{rows[-1]["verse"]:03}','text':'\n'.join(v['text'] for v in rows),'seconds':len(rows)*12.5,'verses':[v['verse'] for v in rows]})
 batches.append({'index':len(batches),'chunks':chunks})
batches[-1]['chunks'].append({'name':'stotram-183-half-and-closing','text':closing,'seconds':50,'verses':[183]})
plan={'title':'శ్రీ లలితా సహస్రనామ స్తోత్రం | సంపూర్ణ పారాయణం | తెలుగు లిపిలో','language':'sa','captionScript':'Telugu','model':'music_v2_5','batches':batches,'plannedSeconds':sum(c['seconds'] for b in batches for c in b['chunks']),'maximumGenerationCalls':len(batches),'source':'https://sanskritdocuments.org/doc_devii/lalita.html','sampleApprovedByUser':True,'competentReciterReviewClaimed':False,'exclude':['separate purvapeethika','full phalashruti chapter'],'userInstruction':'start next; create playlist and upload on youtube create timestamp also; thumbnails also'}
assert [n for b in batches for c in b['chunks'] for n in c.get('verses',[])]==list(range(1,184))
assert all(sum(c['seconds'] for c in b['chunks'])<=600 and all(c['seconds']<=120 for c in b['chunks']) for b in batches)
(root/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'batches':len(batches),'plannedSeconds':plan['plannedSeconds'],'verseUnits':183,'includesFourDhyana':True}))
