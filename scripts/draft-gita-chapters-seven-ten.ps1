$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'D:/Projects/Claude Projects/ai-video-studio'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
foreach ($chapterNumber in 7..10) {
 $chapterDir="data/productions/divine-wisdom/gita-chapter-$chapterNumber/story-v1"
 do {
  $chapterState=Get-Content -LiteralPath "$chapterDir/state.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  $audioReady=@($chapterState.batches | Where-Object { !$chapterState.finished.PSObject.Properties[$_.id] }).Count -eq 0
  $artReady=Test-Path -LiteralPath "$chapterDir/art-review.json"
  if (!$audioReady -or !$artReady) { Start-Sleep -Seconds 10 }
 } while (!$audioReady -or !$artReady)
 foreach ($chapterMode in @('media','assemble')) {
  node scripts/divine-long-episode.mjs $chapterDir $chapterMode
  if ($LASTEXITCODE -ne 0) { throw "Chapter $chapterNumber $chapterMode failed" }
 }
 node scripts/apply-story-music.mjs $chapterDir
 if ($LASTEXITCODE -ne 0) { throw "Chapter $chapterNumber music setup failed" }
 node scripts/divine-long-episode.mjs $chapterDir draft
 if ($LASTEXITCODE -ne 0) { throw "Chapter $chapterNumber draft queue failed" }
}
Write-Output 'All four chapter drafts queued. Inspect drafts before full renders.'
