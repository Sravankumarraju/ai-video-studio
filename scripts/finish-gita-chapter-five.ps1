$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'D:/Projects/Claude Projects/ai-video-studio'
$chapterDirectory='data/productions/divine-wisdom/gita-chapter-5/story-v1'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
$chapterConfig=Get-Content -LiteralPath "$chapterDirectory/episode.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if ($chapterConfig.authorizedNarrationCalls -ne 19) { throw 'Chapter 5 counted narration approval is required before paid calls.' }
foreach ($chapterMode in @('prepare','voice','finish')) {
  node scripts/divine-long-episode.mjs $chapterDirectory $chapterMode
  if ($LASTEXITCODE -ne 0) { throw "Chapter 5 $chapterMode failed; preserve saved jobs and resume without duplicates." }
}
$chapterPrompts=Get-Content -LiteralPath "$chapterDirectory/image-prompts.json" -Raw -Encoding UTF8 | ConvertFrom-Json
while (@($chapterPrompts | Where-Object { !(Test-Path -LiteralPath "$chapterDirectory/$($_.name).png") }).Count -gt 0 -or !(Test-Path -LiteralPath "$chapterDirectory/thumbnail.png")) { Start-Sleep -Seconds 15 }
foreach ($chapterMode in @('media','assemble')) {
  node scripts/divine-long-episode.mjs $chapterDirectory $chapterMode
  if ($LASTEXITCODE -ne 0) { throw "Chapter 5 $chapterMode failed." }
}
node scripts/apply-story-music.mjs $chapterDirectory
if ($LASTEXITCODE -ne 0) { throw 'Chapter 5 music setup failed.' }
node scripts/render-chapter-one.mjs $chapterDirectory
if ($LASTEXITCODE -ne 0) { throw 'Chapter 5 render or complete-file verification failed.' }
Write-Output 'Chapter 5 draft and full export decoded; review frames, browser playback, and final publishing package still required.'
