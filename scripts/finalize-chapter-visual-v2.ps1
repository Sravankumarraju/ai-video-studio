$ErrorActionPreference = 'Stop'
$finalChapterDirectory = 'data/productions/divine-wisdom/gita-chapter-1/visual-v2'
$env:STORY_STUDIO_MCP_TOKEN = [Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN', 'User')
while ($true) {
    if ((Test-Path -LiteralPath "$finalChapterDirectory/app-publishing-verification.json") -and (Test-Path -LiteralPath "$finalChapterDirectory/publishing-package.zip")) {
        $report = Get-Content -LiteralPath "$finalChapterDirectory/COMPLETION_REPORT.md" -Raw -Encoding UTF8
        if ($report.Contains('Completed 39:16 Telugu video')) { break }
    }
    Start-Sleep -Seconds 15
}
node scripts/finalize-chapter-visual-v2.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python scripts/package-chapter-delivery.py $finalChapterDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Add-Content -LiteralPath "$finalChapterDirectory/COMPLETION_REPORT.md" -Encoding UTF8 -Value "`nFinalized at the owner's request: the verified edition is labelled FINAL and is first in the project version list. FINAL_DELIVERY.md and FINAL_DELIVERY.json are included in the checked publishing package. Existing export remains completed; no render or provider call was repeated.`n"
Write-Output 'Final 1080p video labelled, preserved and packaged.'
