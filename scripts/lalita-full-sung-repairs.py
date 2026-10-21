from pathlib import Path
import json
import math
import subprocess
import sys

ROOT = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/full-sung-v2-approved-2026-10-15')
FPS = 24


def load(name):
    return json.loads((ROOT / f'{name}.json').read_text(encoding='utf-8'))


def save(name, value):
    (ROOT / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def run(arguments):
    subprocess.run(arguments, check=True)


def prepare():
    if (ROOT / 'repair-plan.json').exists():
        print(json.dumps({'stage': 'repair-plan-saved'}), flush=True)
        return
    plan = load('plan')
    flagged = set()
    for batch in plan['batches']:
        audit = load(f"batch-{batch['index']:02}-audit")
        flagged.update(word['verse'] for word in audit['collapsedWords'])
    assert not flagged.intersection({1, 2, 3, 4}), 'Approved opening must remain intact'
    selected = [unit for unit in plan['units'] if unit['verse'] in flagged]
    groups = [{'units': selected[index:index + 24]} for index in range(0, len(selected), 24)]
    save('repair-plan', {'reason': 'Collapsed acoustic word timings in selected verses; replacement with more time for complete Sanskrit words',
                         'flaggedVerses': sorted(flagged), 'groups': groups, 'secondsPerVerse': 20,
                         'maximumNewMusicCalls': len(groups), 'originalsPreserved': True})
    print(json.dumps({'stage': 'repair-plan', 'verses': sorted(flagged), 'musicCalls': len(groups), 'seconds': len(selected) * 20}), flush=True)


def assemble():
    plan = load('plan')
    repair = load('repair-plan')
    flagged = set(repair['flaggedVerses'])
    pieces = ROOT / 'repaired-audio-pieces-v2'
    pieces.mkdir(exist_ok=True)
    for verse in flagged:
        if not (ROOT / f'repair-verse-{verse:03}-alignment.json').exists():
            continue
        alignment = load(f'repair-verse-{verse:03}-alignment')
        collapsed = [word for word in alignment['words'] if word['end'] - word['start'] < .02 and any('\u0c00' <= character <= '\u0c7f' for character in word['text'])]
        assert not collapsed, f'Repaired verse {verse} still has collapsed words'
    for batch in plan['batches']:
        if not any(unit['verse'] in flagged for unit in batch['units']):
            continue
        if any(unit['verse'] in flagged and not (ROOT / f"repair-verse-{unit['verse']:03}-alignment.json").exists() for unit in batch['units']):
            continue
        stem = f"batch-{batch['index']:02}"
        timing = load(f'{stem}-units-timed')
        original = [character for character in load(f'{stem}-alignment')['characters'] if character['text'] != '\r']
        characters = []
        concat = []
        source_offset = 0
        target_offset = 0
        for index, unit in enumerate(batch['units']):
            verse = unit['verse']
            if verse in flagged:
                source = ROOT / f'repair-verse-{verse:03}.mp3'
                selected = [character for character in load(f'repair-verse-{verse:03}-alignment')['characters'] if character['text'] != '\r']
                assert ''.join(character['text'] for character in selected) == unit['text']
                start = 0
                seconds = 20
            else:
                source = ROOT / f'{stem}.mp3'
                start = timing['cuts'][index]
                seconds = timing['cuts'][index + 1] - start
                selected = original[source_offset:source_offset + len(unit['text'])]
                assert ''.join(character['text'] for character in selected) == unit['text']
            duration = math.ceil(seconds * FPS) / FPS
            wave = pieces / f'verse-{verse:03}.wav'
            if not wave.exists():
                run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(start), '-i', str(source), '-t', str(duration),
                     '-af', f'aresample=48000,atrim=duration={seconds},apad,atrim=duration={duration}', '-ac', '2', '-c:a', 'pcm_s24le', str(wave)])
            concat.append(f"file 'repaired-audio-pieces-v2/{wave.name}'")
            if characters:
                characters.append({'text': '\n', 'start': target_offset, 'end': target_offset})
            for character in selected:
                characters.append({**character,
                    'start': max(0, min(duration, character['start'] - start)) + target_offset,
                    'end': max(0, min(duration, character['end'] - start)) + target_offset})
            target_offset += duration
            source_offset += len(unit['text']) + 1
        assert ''.join(character['text'] for character in characters) == batch['text']
        manifest = ROOT / f'{stem}-repair-v2-concat.txt'
        manifest.write_text('\n'.join(concat) + '\n', encoding='utf-8')
        output = ROOT / f'{stem}-repaired-v2.wav'
        if not output.exists():
            run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', str(manifest), '-c', 'copy', str(output)])
        save(f'{stem}-repaired-v2-alignment', {'characters': characters, 'loss': None, 'source': 'Original aligned sections and independently aligned verse replacements', 'repairedVerses': [unit['verse'] for unit in batch['units'] if unit['verse'] in flagged]})
        print(json.dumps({'stage': 'repaired-batch-assembled', 'batch': batch['index'], 'seconds': target_offset}), flush=True)
    pending = sorted(verse for verse in flagged if not (ROOT / f'repair-verse-{verse:03}-alignment.json').exists())
    save('REPAIR-ASSEMBLY', {'repairedVerses': sorted(flagged - set(pending)), 'pendingVerses': pending, 'originalSourceAudioPreserved': True, 'pronunciationApproved': False})


if __name__ == '__main__':
    {'prepare': prepare, 'assemble': assemble}[sys.argv[1]]()
