$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'D:/Projects/Claude Projects/ai-video-studio'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
do {
 $chapterState=Get-Content -LiteralPath 'data/productions/divine-wisdom/gita-chapter-10/story-v1/state.json' -Raw -Encoding UTF8 | ConvertFrom-Json
 $audioReady=@($chapterState.finished.PSObject.Properties).Count -eq 20
 if(!$audioReady){Start-Sleep -Seconds 15}
}while(!$audioReady)
npx tsx scripts/resume-rejected-gita-nine.ts
if($LASTEXITCODE -ne 0){throw 'Chapter 9 rejection reconciliation failed'}
$chapterDir='data/productions/divine-wisdom/gita-chapter-9/story-v1'
foreach($stage in @('voice','finish')){node scripts/divine-long-episode.mjs $chapterDir $stage;if($LASTEXITCODE -ne 0){throw "Chapter 9 $stage failed"}}
foreach($chapterNumber in 9..10){
 $chapterDir="data/productions/divine-wisdom/gita-chapter-$chapterNumber/story-v1"
 foreach($stage in @('media','assemble')){node scripts/divine-long-episode.mjs $chapterDir $stage;if($LASTEXITCODE -ne 0){throw "Chapter $chapterNumber $stage failed"}}
 node scripts/apply-story-music.mjs $chapterDir
 if($LASTEXITCODE -ne 0){throw 'Music stage failed'}
 node scripts/divine-long-episode.mjs $chapterDir draft
 if($LASTEXITCODE -ne 0){throw 'Draft queue failed'}
}
