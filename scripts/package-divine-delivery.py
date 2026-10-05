"""Package reviewed publishing files; never includes keys or credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import sys

root = Path("data/productions/divine-wisdom")
for episode in (tuple(map(int, sys.argv[1:])) if len(sys.argv) > 1 else (3, 4, 5, 6)):
    folder = root / f"gita-1-{episode}" / "devotional-v1"
    names = ["README.md", "script-te.md", "description-te.md", "CHAPTERS.txt",
             "publishing.json", "image-prompts.json", "youtube-description-te.txt",
             "youtube-metadata.json", "thumbnail-upload.jpg",
             f"episode-{episode:03d}-full.srt", f"episode-{episode:03d}-full.vtt",
             "verification-full.json"]
    if (folder / "THUMBNAIL-PROMPT.md").is_file():
        names.append("THUMBNAIL-PROMPT.md")
    for name in ["FINAL_DELIVERY.json", "YOUTUBE_UPLOAD.json", "browser-full-verification.json"]:
        if (folder / name).is_file():
            names.append(name)
    target = folder / "publishing-package.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for name in names:
            archive.writestr(name, (folder / name).read_bytes())
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == set(names)
        assert json.loads(archive.read("verification-full.json"))["decodedEntireFile"]
    print(json.dumps({"episode": f"1.{episode}", "files": len(names), "bytes": target.stat().st_size, "verified": True}))
