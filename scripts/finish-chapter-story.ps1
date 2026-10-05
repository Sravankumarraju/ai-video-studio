$ErrorActionPreference='Stop'
$storyDirectory='data/productions/divine-wisdom/gita-chapter-1/story-v4'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
while (!(Test-Path -LiteralPath "$storyDirectory/verification-full.json")) { Start-Sleep -Seconds 15 }
while (!(Test-Path -LiteralPath "$storyDirectory/README.md")) { Start-Sleep -Seconds 2 }
& 'C:/Users/sravankumar.raju/.agents/skills/gstack/browse/dist/browse.exe' goto http://localhost:3000
node scripts/divine-browser-login.mjs
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
node scripts/check-chapter-browser.mjs full $storyDirectory
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
node scripts/prepare-chapter-publishing.mjs $storyDirectory
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
node scripts/finalize-chapter-story.mjs
if ($LASTEXITCODE -ne 0) {exit $LASTEXITCODE}
Write-Output 'Chapter 1 story edition finalized, decoded, browser tested and packaged.'
