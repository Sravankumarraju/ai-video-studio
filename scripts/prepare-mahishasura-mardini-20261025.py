from pathlib import Path
from bs4 import BeautifulSoup
import json, re, math

ROOT = Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
soup = BeautifulSoup((ROOT/'source-stotranidhi.html').read_text(encoding='utf-8'), 'html.parser')
paragraphs = [p.get_text('\n', strip=True) for p in soup.select('.entry-content p')
              if re.search(r'\|\|\s*[౦-౯]+\s*\|\|', p.get_text())]
assert len(paragraphs) == 21
verses = []
for i, paragraph in enumerate(paragraphs, 1):
    match = re.search(r'\|\|\s*([౦-౯]+)\s*\|\|', paragraph)
    assert int(match[1].translate(str.maketrans('౦౧౨౩౪౫౬౭౮౯','0123456789'))) == i
    clean = re.sub(r'\[[^\]]*\]', '', paragraph)
    clean = re.sub(r'\|\|\s*[౦-౯]+\s*\|\|', '॥', clean)
    lines = [re.sub(r'\s+', ' ', x).strip().replace('|', '।') for x in clean.splitlines() if x.strip()]
    assert len(lines) == 4 and lines[-1].startswith('జయ జయ హే మహిషాసురమర్దిని')
    verses.append({'number':i, 'text':'\n'.join(lines), 'displayText':'\n'.join(lines), 'lines':lines})

intro = 'డివైన్ విజ్డమ్ తెలుగు. శ్రీ మహిషాసురమర్దిని స్తోత్రం. తెలుగు లిపిని అనుసరిస్తూ భక్తితో వినండి.'
closing = 'ఇతి శ్రీ మహిషాసురమర్దిని స్తోత్రమ్. శ్రీ దుర్గాదేవ్యై నమః. మరిన్ని పారాయణాల కోసం డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.'
batches = []
def add(text, units, prayer):
    prefix = '[rhythmic devotional chanting] [reverent]\n' if prayer else ''
    offset = len(prefix)
    for unit in units:
        unit['startCharacter'] += offset
        unit['endCharacter'] += offset
    batches.append({'index':len(batches), 'text':prefix+text, 'units':units, 'prayer':prayer})

add(intro, [{'number':None,'kind':'welcome','text':intro,'displayText':intro,'startCharacter':0,'endCharacter':len(intro)}], False)
for verse in verses:
    units = []
    cursor = 0
    # Each metrical line receives a separate readable caption page; no words are omitted.
    for line_index, line in enumerate(verse['lines']):
        units.append({'number':verse['number'], 'line':line_index+1, 'text':line, 'displayText':line,
                      'startCharacter':cursor, 'endCharacter':cursor+len(line)})
        cursor += len(line)+1
    add(verse['text'], units, True)
add(closing, [{'number':None,'kind':'closing','text':closing,'displayText':closing,'startCharacter':0,'endCharacter':len(closing)}], False)
characters = sum(len(b['text']) for b in batches)
cap = math.ceil(characters*2/1000)*1000
plan = {'title':'అయిగిరి నందిని | మహిషాసురమర్దిని స్తోత్రం | తెలుగు లిపితో',
        'source':'https://stotranidhi.com/mahishasuramardini-stotram-in-telugu/',
        'editionScope':'All 21 numbered stanzas of the selected Stotra Nidhi edition, main readings only; bracketed alternate readings omitted. Sanskrit recitation in Telugu script with original Telugu bookends. Modern meanings are excluded.',
        'reuseBasis':'Traditional Sanskrit prayer; no modern translations or commentary copied.',
        'preparedOn':'2026-10-25','verses':verses,'batches':batches,'verifiedTextCount':21,
        'voiceId':'EohubqvAiTiSkWCp1vu7','voiceName':'Srirama V - Interactive, Warm Professor',
        'model':'eleven_v4','language':'te','characters':characters,'creditCap':cap,
        'maximumGenerationCalls':len(batches),'authorization':None,'generationAuthorized':False,
        'delivery':'Rhythmic devotional recitation; no commercial recording or added background music. Final pronunciation needs listening review.',
        'format':{'width':1920,'height':1080,'fps':24,'font':'Noto Sans Telugu','fontSize':88,'activeColor':'#FFD54A','inactiveColor':'#FFFFFF','captionPages':'One complete metrical line, wrapped for legibility; timing will come from actual recording.'},
        'art':'data/productions/divine-wisdom/durgamma-song-2026-10-15/durga-lion-original.png',
        'logo':'data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',
        'estimatedMinutes':[12,16],'expertPronunciationReviewed':False,'published':False}
(ROOT/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'recitation-telugu-script.txt').write_text('\n\n'.join(f"{v['number']}. {v['text']}" for v in verses)+'\n',encoding='utf-8')
(ROOT/'recording-script.txt').write_text('\n\n'.join(b['text'] for b in batches)+'\n',encoding='utf-8')
(ROOT/'source-audit.json').write_text(json.dumps({'source':plan['source'],'verseCount':21,'sequentialNumberingVerified':True,'fourLinesPerVerse':True,'captionLines':84,'alternateReadings':'Bracketed alternatives omitted; main reading retained.','modernTranslationCopied':False,'expertReviewClaimed':False},ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'START-HERE.txt').write_text('NEXT VIDEO: Mahishasura Mardini / Aigiri Nandini\n21 verses prepared and source numbering verified.\nSee recitation-telugu-script.txt for the prayer and plan.json for the production brief.\n23 recording batches: welcome, 21 verses, closing.\nPaid recording has NOT started. New credit consent is required for this video.\nFinal length and captions will be measured from the recording. No public upload.\n',encoding='utf-8')
print(json.dumps({'verses':21,'captionLines':84,'batches':len(batches),'characters':characters,'conservativeCreditEstimate':characters*2,'requestedCreditCap':cap}))
