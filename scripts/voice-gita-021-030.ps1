$ErrorActionPreference='Stop'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
node --import tsx scripts/authorize-gita-021-030.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
foreach ($verseNumber in 21..30) {
 $episodeDirectory="data/productions/divine-wisdom/gita-1-$verseNumber/devotional-v1"
 foreach ($stage in 'prepare','voice','finish') {
  node scripts/divine-long-episode.mjs $episodeDirectory $stage
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
 }
}
Write-Output 'All planned Shlokas 21-30 narration calls and voice finishing complete. Artwork review and render stages remain.'
