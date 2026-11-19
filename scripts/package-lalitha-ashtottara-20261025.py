from pathlib import Path
import json,subprocess,zipfile,shutil
R=Path('data/productions/divine-wisdom/lalitha-ashtottara-2026-10-25')
p=json.loads((R/'plan.json').read_text(encoding='utf-8'))
t=json.loads((R/'timeline.json').read_text(encoding='utf-8'))
desc='''శ్రీ లలితా అష్టోత్తర శతనామావళి — 108 నామాలు, తెలుగు లిపితో.
రజతాచలశృంగాగ్రమధ్యస్థాయై అనే నామంతో ప్రారంభమయ్యే సంప్రదాయ నామావళిని ఆలకించండి. సంస్కృత పఠనాన్ని తెలుగు లిపిలో అనుసరించవచ్చు. ఇది తెలుగు అనువాదం లేదా నామాల అర్థ వివరణ కాదు.

ఈ వీడియోలో: ప్రారంభ బీజాక్షరాలు ఒకసారి, పూర్తి 108 నామాలు, సంక్షిప్త తెలుగు స్వాగతం మరియు ముగింపు. అదనపు ధ్యానం, న్యాసం, ఫలశ్రుతి చేర్చలేదు.

వీడియో భాగాలు:
'''+(R/'chapters.txt').read_text(encoding='utf-8')+'''
మూలపాఠం:
'''+p['source']+'''
Traditional Sanskrit prayer, displayed in Telugu script. New AI-assisted rhythmic recitation using the licensed Srirama V library voice; original channel devotional illustration and newly generated thumbnail. Gentle image motion is used; these are devotional illustrations, not historical footage.

మరిన్ని పారాయణాలు, భక్తి గీతాలు, భగవద్గీత వివరణల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.

#LalithaAshtottaram #TeluguDevotional #DivineWisdomTelugu

పఠనం లేదా ఉచ్చారణలో పొరపాటు కనిపిస్తే సరైన మూలం, సమయంతో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.
'''
(R/'youtube-description.txt').write_text(desc,encoding='utf-8')
(R/'youtube-metadata.json').write_text(json.dumps({'title':p['title'],'description':desc,'privacyStatus':'private','language':'te','tags':['Lalitha Ashtottara Shatanamavali','Lalitha Ashtottaram Telugu','108 names of Lalitha','లలితా అష్టోత్తరం','Divine Wisdom Telugu'],'published':False,'pronunciationReviewPending':True},ensure_ascii=False,indent=2),encoding='utf-8')
master=R/'recitation-master.mp3'
if not master.exists():subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/'recitation-master.wav'),'-c:a','libmp3lame','-b:a','192k',str(master)],check=True)
if (R/'VERIFICATION.json').exists():
    shutil.copyfile(p['art'],R/'lalitha-art.png')
    shutil.copyfile(p['logo'],R/'channel-logo.png')
    keep=['plan.json','recitation-telugu-script.txt','source-audit.json','timeline.json','captions.json','chapters.txt','youtube-description.txt','youtube-metadata.json','telugu-captions.srt','telugu-captions.vtt','thumbnail.jpg','finished-audio-master.mp3','lalitha-art.png','channel-logo.png','VERIFICATION.json','audio-level-check.json','Sri-Lalitha-Ashtottara-Telugu-1080p-DRAFT.mp4']
    with zipfile.ZipFile(R/'Lalitha-Ashtottara-Review-Package.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
        for name in keep:z.write(R/name,name)
print(json.dumps({'packaged':True,'seconds':t['seconds'],'descriptionBytes':len(desc.encode('utf-8'))}))
