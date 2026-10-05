$ErrorActionPreference='Stop'
while (!(Test-Path -LiteralPath 'data/productions/divine-wisdom/EPISODES_011_014_REPORT.json')) { Start-Sleep -Seconds 15 }
node --import tsx scripts/youtube-owner.ts upload-manifest data/productions/divine-wisdom/youtube-private-011-014-batch.json
exit $LASTEXITCODE
