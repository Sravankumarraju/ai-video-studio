from pathlib import Path
import json, zipfile, shutil
R=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
p=json.loads((R/'plan.json').read_text(encoding='utf-8'))
t=json.loads((R/'timeline.json').read_text(encoding='utf-8'))
desc='''అయిగిరి నందిని — శ్రీ మహిషాసురమర్దిని స్తోత్రం, పూర్తి 21 శ్లోకాలు, తెలుగు లిపితో.
సంస్కృత పఠనాన్ని పెద్ద తెలుగు అక్షరాలతో అనుసరించండి. సంక్షిప్త తెలుగు స్వాగతం తర్వాత 21 శ్లోకాలు క్రమంగా వినిపిస్తాయి.

వీడియో భాగాలు:
'''+(R/'chapters.txt').read_text(encoding='utf-8')+'''
మూలపాఠం:
'''+p['source']+'''
Selected edition: all 21 numbered stanzas; main readings retained and bracketed alternatives omitted. Traditional Sanskrit prayer shown in Telugu script. Modern Telugu meanings are not included.

New AI-assisted devotional recitation using the Srirama V library voice. Existing channel Durga illustration with gentle image movement. No commercial song recording is reused.

పారాయణాలు, స్తోత్రాలు, భక్తి గీతాలు, భగవద్గీత వివరణల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.

#AigiriNandini #MahishasuraMardini #TeluguDevotional #DivineWisdomTelugu

పఠనం లేదా ఉచ్చారణలో పొరపాటు కనిపిస్తే సరైన మూలం, సమయంతో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.
'''
(R/'youtube-description.txt').write_text(desc,encoding='utf-8')
(R/'youtube-metadata.json').write_text(json.dumps({'title':p['title'],'description':desc,'privacyStatus':'private','language':'te','tags':['Aigiri Nandini Telugu','Mahishasura Mardini Stotram','అయిగిరి నందిని','మహిషాసురమర్దిని స్తోత్రం','Durga Stotram Telugu','Divine Wisdom Telugu'],'published':False,'pronunciationReviewPending':True},ensure_ascii=False,indent=2),encoding='utf-8')
if (R/'VERIFICATION.json').exists():
    shutil.copyfile(p['art'],R/'durga-art.png')
    shutil.copyfile(p['logo'],R/'channel-logo.png')
    keep=['plan.json','recitation-telugu-script.txt','source-audit.json','timeline.json','captions.json','chapters.txt','youtube-description.txt','youtube-metadata.json','telugu-captions.srt','telugu-captions.vtt','thumbnail.jpg','finished-audio-master.mp3','durga-art.png','channel-logo.png','VERIFICATION.json','audio-level-check.json','Mahishasura-Mardini-Telugu-1080p-DRAFT.mp4']
    with zipfile.ZipFile(R/'Mahishasura-Mardini-Review-Package.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
        for name in keep:z.write(R/name,name)
print(json.dumps({'metadataPrepared':True,'reviewPackageCreated':(R/'VERIFICATION.json').exists(),'seconds':t['seconds']}))
