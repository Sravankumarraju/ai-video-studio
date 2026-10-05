$ErrorActionPreference = 'Stop'
$env:STORY_STUDIO_MCP_TOKEN = [Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN', 'User')
$productionRoot = 'data/productions/divine-wisdom'
while ($true) {
    $readyEpisodes = @(7..10 | Where-Object { Test-Path -LiteralPath "$productionRoot/gita-1-$_/devotional-v1/verification-full.json" })
    if ($readyEpisodes.Count -eq 4) { break }
    Start-Sleep -Seconds 15
}
node scripts/finalize-next-gita.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/prepare-next-youtube.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python scripts/package-divine-delivery.py 7 8 9 10
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$newBatchPath = "$productionRoot/youtube-private-007-010-batch.json"
npx tsx scripts/youtube-owner.ts upload-manifest $newBatchPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$previousSummary = ''
while ($true) {
    $statusText = npx tsx scripts/youtube-owner.ts status
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $status = $statusText | ConvertFrom-Json
    $newBatch = Get-Content -LiteralPath $newBatchPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $newRows = @($status.uploads | Where-Object { $_.id -in $newBatch.videos.uploadId })
    $summary = $newRows | Select-Object id, state, stage, videoId, bytesUploaded, totalBytes, thumbnailApplied, error, verifiedAt | ConvertTo-Json -Depth 8 -Compress
    if ($summary -ne $previousSummary) { Write-Output $summary; $previousSummary = $summary }
    if (@($newRows | Where-Object { $_.state -in 'failed','needs-review','cancelled' }).Count) { exit 1 }
    if ($newRows.Count -eq 4 -and @($newRows | Where-Object { $_.state -ne 'completed' }).Count -eq 0) {
        foreach ($entry in $newBatch.videos) {
            $row = $newRows | Where-Object id -eq $entry.uploadId
            $entry.videoId = $row.videoId
            $entry.state = $row.state
            if (-not $row.thumbnailApplied -or -not $row.verifiedAt) { throw 'Private upload verification incomplete' }
        }
        $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $newBatchPath), ($newBatch | ConvertTo-Json -Depth 20), $utf8WithoutBom)
        $verifiedRows = $newRows | Select-Object id, projectId, renderJobId, channelId, state, stage, videoId, thumbnailApplied, error, verifiedAt
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) "$productionRoot/youtube-007-010-upload-verification.json"), ($verifiedRows | ConvertTo-Json -Depth 8), $utf8WithoutBom)
        $progressPath = "$productionRoot/episodes-007-010-progress.json"
        $progress = Get-Content -LiteralPath $progressPath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($episode in $progress.episodes) {
            $row = $newRows | Where-Object projectId -eq $episode.projectId
            $episode.status = 'completed-and-private-upload-verified'
            $episode.uploaded = $true
            $episode | Add-Member -NotePropertyName youtubeVideoId -NotePropertyValue $row.videoId -Force
        }
        [System.IO.File]::WriteAllText((Join-Path (Get-Location) $progressPath), ($progress | ConvertTo-Json -Depth 10), $utf8WithoutBom)
        $youtubeLines = @('', '## Private YouTube uploads', '', 'All four uploads are verified against the connected Divine Wisdom Telugu channel. Private visibility and thumbnail application confirmed. YouTube may still be processing playback quality.', '')
        foreach ($entry in $newBatch.videos) { $youtubeLines += "- Episode $($entry.episode): https://www.youtube.com/watch?v=$($entry.videoId)" }
        Add-Content -LiteralPath "$productionRoot/EPISODES_007_010_REPORT.md" -Value ($youtubeLines -join "`n") -Encoding UTF8
        Write-Output 'All four new episodes uploaded privately and verified.'
        break
    }
    Start-Sleep -Seconds 20
}
