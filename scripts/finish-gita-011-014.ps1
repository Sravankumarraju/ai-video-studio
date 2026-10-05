$ErrorActionPreference='Stop'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
while (!(Test-Path -LiteralPath 'data/productions/divine-wisdom/gita-chapter-1/story-v4/FINAL_DELIVERY.json')) { Start-Sleep -Seconds 15 }
while (!(Test-Path -LiteralPath 'data/productions/divine-wisdom/gita-chapter-1/story-v4/publishing-package.zip')) { Start-Sleep -Seconds 2 }
node scripts/prepare-gita-011-014.mjs
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
foreach ($shlokaNumber in 11,12,13,14) {
 $episodeDirectory="data/productions/divine-wisdom/gita-1-$shlokaNumber/devotional-v1"
 node scripts/divine-long-episode.mjs $episodeDirectory prepare
 if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
 node --import tsx scripts/authorize-production.ts $episodeDirectory
 if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
 foreach ($productionStage in 'voice','finish','media','assemble','draft') {
  node scripts/divine-long-episode.mjs $episodeDirectory $productionStage
  if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
 }
}
node scripts/render-next-gita.mjs 11 12 13 14
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
foreach ($shlokaNumber in 11,12,13,14) {
 & 'C:/Users/sravankumar.raju/.agents/skills/gstack/browse/dist/browse.exe' goto http://localhost:3000
 node scripts/divine-browser-login.mjs
 if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
 node scripts/check-chapter-browser.mjs full "data/productions/divine-wisdom/gita-1-$shlokaNumber/devotional-v1"
 if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
}
node scripts/prepare-next-youtube.mjs 11 12 13 14
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
node scripts/finalize-gita-011-014.mjs
exit $LASTEXITCODE
