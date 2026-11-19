from pathlib import Path
import json,zipfile,shutil
R=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25/female-full-v3')
p=json.loads((R/'full-production-plan.json').read_text(encoding='utf-8'));t=json.loads((R/'timeline.json').read_text(encoding='utf-8'))
description='''అయిగిరి నందిని — శ్రీ మహిషాసురమర్దిని స్తోత్రం | పూర్తి 21 శ్లోకాలు | స్త్రీ స్వరంలో భక్తి పారాయణం.
ప్రతి పూర్తి శ్లోకం తెలుగు లిపిలో తెరపై కనిపిస్తుంది; పఠిస్తున్న పదాలు బంగారు రంగులో హైలైట్ అవుతాయి. ప్రధాన స్వరం స్పష్టంగా వినిపించేలా నేపథ్య సంగీతాన్ని తగ్గించాము.

వీడియో భాగాలు:
'''+(R/'chapters.txt').read_text(encoding='utf-8')+'''
మూలపాఠం: '''+p['source']+'''
Selected traditional Sanskrit edition: all 21 stanzas in Telugu script, main readings only. Bracketed alternatives and modern Telugu meanings are excluded.

Original AI-assisted female devotional chant created with Eleven Music; Telugu female spoken welcome and closing. The approved opening performance guides the continuation. Vocals and accompaniment were separated locally, and the accompaniment was reduced in the final mix. No commercial reference recording is reused.
Durga illustration with gentle image motion; full transparent Divine Wisdom Telugu logo. Word highlights follow provider-returned timestamps. Full pronunciation listening review is pending for this draft.

ఈ వీడియో నచ్చితే లైక్ చేయండి, షేర్ చేయండి, Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. మీ అభిప్రాయాలను కామెంట్లలో తెలియజేయండి.

#AigiriNandini #MahishasuraMardini #TeluguDevotional #DivineWisdomTelugu
'''
(R/'youtube-description.txt').write_text(description,encoding='utf-8')
(R/'youtube-metadata.json').write_text(json.dumps({'title':p['title'],'description':description,'tags':['Aigiri Nandini Telugu','Mahishasura Mardini Stotram','Female devotional chanting','అయిగిరి నందిని','మహిషాసురమర్దిని స్తోత్రం','Divine Wisdom Telugu'],'language':'te','privacyStatus':'private','published':False},ensure_ascii=False,indent=2),encoding='utf-8')
(R/'recitation-telugu-script.txt').write_text('\n\n'.join(f"{v['number']}. {v['text']}" for v in p['verses'])+'\n',encoding='utf-8')
shutil.copyfile(R.parent/'thumbnail.jpg',R/'thumbnail.jpg')
shutil.copyfile(R.parent/'source-audit.json',R/'source-audit.json')
if (R/'VERIFICATION.json').exists():
 keep=['full-production-plan.json','recitation-telugu-script.txt','source-audit.json','timeline.json','chapters.txt','youtube-description.txt','youtube-metadata.json','telugu-captions.srt','telugu-captions.vtt','thumbnail.jpg','finished-audio-master.mp3','VERIFICATION.json','mix-report.json','caption-timing-overrides.json','verse-16-audio-repair.json','Aigiri-Nandini-Female-Chant-Full-Shlokas-1080p.mp4']
 with zipfile.ZipFile(R/'Aigiri-Nandini-Female-Full-Review-Package.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
  for name in keep:
   source=R/'thumbnail-clickable-v2.jpg' if name=='thumbnail.jpg' and (R/'thumbnail-clickable-v2.jpg').exists() else R/name
   z.write(source,name)
  if (R/'thumbnail-brief.json').exists():z.write(R/'thumbnail-brief.json','thumbnail-brief.json')
  z.write(p['logo'],'channel-logo-transparent.png');z.write(p['art'],'durga-art.png')
print(json.dumps({'metadataPrepared':True,'reviewPackageCreated':(R/'VERIFICATION.json').exists(),'seconds':t['seconds']}))
