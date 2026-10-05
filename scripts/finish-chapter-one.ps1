$ErrorActionPreference = 'Stop'
$chapterDirectory = 'data/productions/divine-wisdom/gita-chapter-1/meaning-v1'
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
node scripts/check-chapter-browser.mjs full
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/prepare-chapter-publishing.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python scripts/package-chapter-delivery.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
ffmpeg -v error -y -ss 105.5 -i "$chapterDirectory/gita-chapter-1-full.mp4" -frames:v 1 "$chapterDirectory/caption-label-full-check.png"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
ffmpeg -v error -y -ss 2000 -i "$chapterDirectory/gita-chapter-1-full.mp4" -frames:v 1 "$chapterDirectory/context-caption-full-check.png"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$verified = Get-Content -LiteralPath "$chapterDirectory/verification-full.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$browser = Get-Content -LiteralPath "$chapterDirectory/browser-full-verification.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $verified.decodedEntireFile -or -not $verified.all47VerseMeaningsCovered -or $browser.samples.Count -ne 3 -or $browser.error) { throw 'Chapter verification incomplete' }
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
$report = @"
# Complete Bhagavad Gita Chapter 1: Telugu meaning and significance

Completed video: 39:16, 1920×1080 H.264/AAC, Telugu long-form only. All 47 verse meanings individually explained in order; no Sanskrit recitation, music or sound effects. Original 60-section script includes channel welcome, hook, setting, verse-by-verse meanings, contextual recaps, practical reflection, Chapter 2 invitation and subscribe/like/share/comment closing.

Actual authorized ElevenLabs narration succeeded in 30 batches with selected voice sJrRcQEpUbZehhGBdEbD. Configured model retained; no claim that Eleven v4 is supported or verified. Seven new generated images including thumbnail; approved logo/supporting illustrations reused. Gentle eased pans, large Telugu captions and gold spoken-word highlighting. Numeric verse labels retain their complete aligned time ranges.

Entire draft and Full HD MP4 files decoded successfully. All 3,348 aligned caption words, continuous narration slices, all 47 sections, no recitation overlays, no music and asset persistence checked. Actual browser playback and seeking passed at beginning, middle and ending for both exports. Eleven focused coverage, duration, numeric-label and media-readiness regression checks passed. Existing Episode 1.10 still passes the single-verse export checks. Previous projects, provider profiles and assets preserved; no schema migration.

Files in meaning-v1: gita-chapter-1-full.mp4, SRT/VTT, editable script/config/prompts, coverage.json, measured CHAPTERS.txt, thumbnail PNG/JPEG, YouTube metadata/description, publishing-package.zip and verification JSON. Package CRC and file inventory checked; no credentials included.

Open http://localhost:3000 → Devotional projects → Bhagavad Gita · Telugu → complete Chapter 1 → Preview & exports. Start: docker compose up -d from the project repository. Resume by keeping state.json and saved jobs, then run node scripts/render-chapter-one.mjs. Serialize checkpoint-writing stages.

Private YouTube publishing is prepared but not uploaded: the connected channel returned uploadLimitExceeded for Episode 1.10. Episodes 1.1–1.9 and the introduction previously succeeded privately; this chapter and Episode 1.10 have no successful upload IDs. Do not retry indefinitely or claim live upload success.

Primary textual source: https://sanskritdocuments.org/doc_giitaa/bhagvadnew.html . Original Telugu explanation and modern applications, not copied contemporary commentary. All speakers and historical social terms explained in context; 1.10 alternate readings acknowledged. Supporting references and Telugu correction/apology note included in descriptions.
"@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'data/productions/divine-wisdom/gita-chapter-1/CHAPTER_ONE_COMPLETION_REPORT.md'), $report, $utf8WithoutBom)
Add-Content -LiteralPath PROJECT_OVERVIEW_AND_IMPLEMENTATION.md -Encoding UTF8 -Value "`n### Complete Chapter 1 final delivery`n`nThe complete Telugu meaning-only Chapter 1 video is completed and verified: 39:16, 1080p 16:9, all 47 verses in order, no Sanskrit recitation or music. Actual whole-file decoding and browser start/middle/end playback passed. Thumbnail, description, 60 measured chapters, SEO tags, AI disclosure and correction note are packaged. Private upload is prepared but blocked by the connected channel's uploadLimitExceeded. Completion report: data/productions/divine-wisdom/gita-chapter-1/CHAPTER_ONE_COMPLETION_REPORT.md. Eleven focused regression checks passed; no project migration.`n"
Write-Output 'Complete Chapter 1 exported, browser-verified and packaged. YouTube upload remains blocked by channel limit.'
