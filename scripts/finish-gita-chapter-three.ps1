$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'D:/Projects/Claude Projects/ai-video-studio'
$chapterDirectory='data/productions/divine-wisdom/gita-chapter-3/story-v1'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
$chapterConfig=Get-Content -LiteralPath "$chapterDirectory/episode.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if ($chapterConfig.authorizedNarrationCalls -ne 23) { throw 'Chapter 3 counted narration approval is required before paid calls.' }
foreach ($chapterMode in @('voice','finish')) {
  node scripts/divine-long-episode.mjs $chapterDirectory $chapterMode
  if ($LASTEXITCODE -ne 0) { throw "Chapter 3 $chapterMode failed; preserve saved jobs and resume without duplicates." }
}
$chapterPrompts=Get-Content -LiteralPath "$chapterDirectory/image-prompts.json" -Raw -Encoding UTF8 | ConvertFrom-Json
while (@($chapterPrompts | Where-Object { !(Test-Path -LiteralPath "$chapterDirectory/$($_.name).png") }).Count -gt 0 -or !(Test-Path -LiteralPath "$chapterDirectory/thumbnail.png")) { Start-Sleep -Seconds 15 }
foreach ($chapterMode in @('media','assemble')) {
  node scripts/divine-long-episode.mjs $chapterDirectory $chapterMode
  if ($LASTEXITCODE -ne 0) { throw "Chapter 3 $chapterMode failed." }
}
node scripts/apply-story-music.mjs $chapterDirectory
if ($LASTEXITCODE -ne 0) { throw 'Chapter 3 music setup failed.' }
node scripts/render-chapter-one.mjs $chapterDirectory
if ($LASTEXITCODE -ne 0) { throw 'Chapter 3 render or complete-file verification failed.' }
Write-Output 'Chapter 3 draft and full export decoded; review frames, browser playback, and final publishing package still required.'
