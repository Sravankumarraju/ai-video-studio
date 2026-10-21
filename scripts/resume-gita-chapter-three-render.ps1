$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'D:/Projects/Claude Projects/ai-video-studio'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
node scripts/render-chapter-one.mjs data/productions/divine-wisdom/gita-chapter-3/story-v1
if ($LASTEXITCODE -ne 0) { throw 'Chapter 3 resumed render failed; retain saved jobs.' }
