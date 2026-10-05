$ErrorActionPreference = 'Stop'
$chapterDirectory = 'data/productions/divine-wisdom/gita-chapter-1/visual-v2'
$env:STORY_STUDIO_MCP_TOKEN = [Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN', 'User')
while ($true) {
    if ((Test-Path -LiteralPath "$chapterDirectory/verification-full.json") -and (Test-Path -LiteralPath "$chapterDirectory/README.md")) {
        $readme = Get-Content -LiteralPath "$chapterDirectory/README.md" -Raw -Encoding UTF8
        if ($readme.Contains('Completed 1080p 16:9')) { break }
    }
    Start-Sleep -Seconds 15
}
& 'C:/Users/sravankumar.raju/.agents/skills/gstack/browse/dist/browse.exe' goto http://localhost:3000
node scripts/divine-browser-login.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/check-chapter-browser.mjs full $chapterDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/check-chapter-visual-reuse.mjs $chapterDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/prepare-chapter-publishing.mjs $chapterDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python scripts/package-chapter-delivery.py $chapterDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
ffmpeg -v error -y -ss 105.5 -i "$chapterDirectory/gita-chapter-1-full.mp4" -frames:v 1 "$chapterDirectory/caption-label-full-check.png"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
ffmpeg -v error -y -ss 2000 -i "$chapterDirectory/gita-chapter-1-full.mp4" -frames:v 1 "$chapterDirectory/context-caption-full-check.png"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$report = @'
# Chapter 1 revised visual edition

Completed 39:16 Telugu video, 1080p 16:9 H.264/AAC. All 47 verse meanings in order, without Sanskrit recitation, music or Shorts. Revised edition uses 34 distinct existing generated illustrations across 100 scenes, averaging 23.6 seconds per scene. Historical scenes and symbolic devotional reflections are artistic interpretations.

The original 30 narration recordings and all 3,348 caption words retain exactly the same timing. No new image or voice provider calls were made. Gentle eased pans, large Telugu word highlighting, logo welcome and subscribe/like/share/comment ending retained. Earlier edition and assets preserved.

Whole draft and Full HD files decoded, 47-verse coverage and continuous audio checked. Original image hashes and exact narration/caption timings checked. Actual browser playback and seeking passed at beginning, middle and ending. See visual-reuse-verification.json, verification-full.json and browser-full-verification.json.

Files in visual-v2: gita-chapter-1-full.mp4, captions, editable script and image prompts, visual-plan.json, thumbnail, measured chapter timestamps, Telugu YouTube metadata with AI disclosure and correction/apology note, and publishing-package.zip. Package CRC checked, no credentials included.

Open http://localhost:3000, complete Chapter 1 project, Preview & exports, choose “Chapter 1 · 34 illustrations · Visual V2”. Start app: docker compose up -d. Resume: node scripts/render-chapter-one.mjs data/productions/divine-wisdom/gita-chapter-1/visual-v2. No schema migration.

Private YouTube upload remains pending because the connected channel returned uploadLimitExceeded for Episode 1.10. No successful upload of this chapter is claimed.
'@
Set-Content -LiteralPath "$chapterDirectory/COMPLETION_REPORT.md" -Value $report -Encoding UTF8
Add-Content -LiteralPath PROJECT_OVERVIEW_AND_IMPLEMENTATION.md -Encoding UTF8 -Value "`n### Chapter 1 revised visual edition`n`nThe preferred chapter edition is visual-v2: 39:16, 34 distinct reused illustrations across 100 scenes (23.6 seconds on average), all 47 meanings, unchanged narration and exact caption timing. Fully decoded and browser-verified. No new provider calls or schema migration. Earlier edition preserved. Private YouTube upload remains blocked by the channel upload limit. Report: data/productions/divine-wisdom/gita-chapter-1/visual-v2/COMPLETION_REPORT.md.`n"
Write-Output 'Revised chapter video verified and packaged; private YouTube upload remains pending.'
