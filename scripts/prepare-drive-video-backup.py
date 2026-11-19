"""Stage completed delivery exports and publishing assets, without credentials."""
import json, os, pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / '.tmp/completed-video-drive-backup'
DEST.mkdir(parents=True, exist_ok=True)
previous_manifest = DEST / 'BACKUP_MANIFEST.json'
previous_assets = {}
if previous_manifest.exists():
    previous_assets = {a['relativePath']:a for a in json.loads(previous_manifest.read_text(encoding='utf-8'))['assets']}
videos = {}
excluded_words = re.compile(r'(?i)(draft|sample|preview|candidate|logo-welcome|bookend|opening)')

def resolve(value, base):
    p = pathlib.Path(value)
    if not p.is_absolute():
        p = base / p
    try:
        p = p.resolve()
        p.relative_to(ROOT)
    except (OSError, ValueError):
        return None
    return p if p.is_file() else None

def add(value, base, evidence):
    p = resolve(value, base)
    if p and p.suffix.lower() == '.mp4' and not excluded_words.search(p.name):
        videos.setdefault(p, set()).add(str(evidence.relative_to(ROOT)))

def walk(value, base, evidence):
    if isinstance(value, str) and value.lower().endswith('.mp4'):
        add(value, base, evidence)
    elif isinstance(value, dict):
        for item in value.values(): walk(item, base, evidence)
    elif isinstance(value, list):
        for item in value: walk(item, base, evidence)

for area in ('data/productions', 'output'):
    for p in (ROOT / area).rglob('*'):
        if not p.is_file(): continue
        if p.name == 'FINAL_DELIVERY.json' or p.name.endswith('delivery-manifest.json'):
            try: walk(json.loads(p.read_text(encoding='utf-8-sig')), p.parent, p)
            except (ValueError, OSError): pass
        elif p.name == 'FINAL_DELIVERY.md':
            text = p.read_text(encoding='utf-8-sig')
            for value in re.findall(r'[\w.-]+\.mp4', text): add(value, p.parent, p)
        elif p.name == 'verification-full.json':
            try:
                check=json.loads(p.read_text(encoding='utf-8-sig'))
                checks=check if isinstance(check,list) else [check]
                if any(isinstance(c,dict) and any(c.get(k) is True for k in ('decodedEntireFile','completeDecodePassed','entireFileDecoded')) for c in checks):
                    for video in p.parent.glob('*full*.mp4'): add(video.name,p.parent,p)
            except (ValueError,OSError): pass

assets = {}
def stage(p, kind):
    rel = p.relative_to(ROOT)
    target = DEST / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        if kind in ('video','final-image'): os.link(p, target)
        else: shutil.copy2(p, target)
    assets[str(rel)] = {'relativePath':str(rel).replace('\\','/'), 'file':str(target), 'bytes':p.stat().st_size, 'kind':kind}
    old = previous_assets.get(str(rel).replace('\\','/'), {})
    if old.get('bytes') == p.stat().st_size:
        for key in ('sha256','md5'):
            if key in old: assets[str(rel)][key]=old[key]

detail_pattern = re.compile(r'(?i)(youtube.*(?:metadata|upload|details|title|description|tags|chapters)|publishing\.json$|description-te|CHAPTERS\.txt|FINAL_DELIVERY\.)')
unsafe = re.compile(r'(?i)(token|secret|password|credential|encrypt|session|authorization)')
def scrub(value):
    if isinstance(value, dict): return {k:scrub(v) for k,v in value.items() if not unsafe.search(k)}
    if isinstance(value, list): return [scrub(v) for v in value]
    return value

image_extensions = ('.jpg','.jpeg','.png','.webp')
review_image = re.compile(r'(?i)(draft|preview|sample|screenshot|proof|contact.sheet|review|before|backup|frame[-_]?\d|verification)')
def referenced_images(value, base):
    if isinstance(value, str) and value.lower().endswith(image_extensions):
        image = resolve(value, base) or resolve(value, ROOT)
        if image and not review_image.search(image.name):
            stage(image,'thumbnail' if 'thumbnail' in image.name.lower() else 'final-image')
    elif isinstance(value, dict):
        for item in value.values(): referenced_images(item,base)
    elif isinstance(value,list):
        for item in value: referenced_images(item,base)

for video, evidence in sorted(videos.items()):
    stage(video, 'video')
    for name in ('completed-timeline.json','art-provenance.json','illustrated-production-settings.json','image-prompts.json'):
        source=video.parent/name
        if source.is_file():
            try: referenced_images(json.loads(source.read_text(encoding='utf-8-sig')),video.parent)
            except (ValueError,OSError): pass
    for directory in (video.parent,video.parent/'illustrations',video.parent/'images',video.parent/'art'):
        if directory.is_dir():
            for image in directory.iterdir():
                if image.is_file() and image.suffix.lower() in image_extensions and not review_image.search(image.name):
                    stage(image,'thumbnail' if 'thumbnail' in image.name.lower() else 'final-image')
    for p in video.parent.iterdir():
        if not p.is_file(): continue
        if p.suffix.lower() in ('.jpg','.jpeg','.png','.webp') and re.search(r'(?i)thumbnail',p.name) and not re.search(r'(?i)(before|backup)',p.name):
            stage(p, 'thumbnail')
        elif p.suffix.lower() in ('.json','.txt','.md') and detail_pattern.search(p.name) and not unsafe.search(p.name):
            if p.suffix.lower() == '.json':
                try:
                    clean=scrub(json.loads(p.read_text(encoding='utf-8-sig')))
                    target=DEST / p.relative_to(ROOT)
                    target.parent.mkdir(parents=True,exist_ok=True)
                    target.write_text(json.dumps(clean,ensure_ascii=False,indent=2),encoding='utf-8')
                    assets[str(p.relative_to(ROOT))]={'relativePath':str(p.relative_to(ROOT)).replace('\\','/'),'file':str(target),'bytes':target.stat().st_size,'kind':'youtube-details'}
                except (ValueError,OSError): pass
            else: stage(p,'youtube-details')

delivery=ROOT/'data/productions/divine-wisdom/CHAPTERS_7_10_YOUTUBE_DELIVERY_2026-10-21.json'
stage(delivery,'youtube-details')
manifest={'scope':'Completed final video exports identified in delivery records, generated final artwork, associated thumbnails and sanitized YouTube details. No drafts, review screenshots, audio sources, credentials or render intermediates.', 'driveFolderId':'1lIpvxetxBwDk5koYDq8394dqW9OhyhHt','videos':len(videos),'assets':list(assets.values()),'videoEvidence':[{'file':str(p.relative_to(ROOT)).replace('\\','/'),'evidence':sorted(e)} for p,e in sorted(videos.items())]}
(DEST/'BACKUP_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'stagingFolder':str(DEST),'videos':len(videos),'finalImages':sum(a['kind']=='final-image' for a in assets.values()),'thumbnails':sum(a['kind']=='thumbnail' for a in assets.values()),'assets':len(assets),'GB':round(sum(a['bytes'] for a in assets.values())/1024**3,2),'videosOverConnectorLimit':sum(p.stat().st_size>512*1024**2 for p in videos)}))
