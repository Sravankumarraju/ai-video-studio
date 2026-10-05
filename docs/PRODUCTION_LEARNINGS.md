# Production workflow notes

- Narration and rendering share the worker queue (default concurrency 2). Two Full HD renders can delay a later episode's narration. Prefer finishing all new narration before queuing the batch of Full HD exports. Never cancel successful recordings or delete state.json to overcome queue delays.
- Connector-created projects deliberately start with unknown pricing blocked. Enable the owner setting only after approval, keeping the agreed budget and generation count. Paid generation then uses saved job IDs to avoid duplicate charges on resume.
- In this Windows sandbox, child-process execution through tsx/esbuild and FFmpeg can fail with EPERM. Retry the same resumable command through the approved process execution path; do not recreate projects or queued jobs.
- Quote gstack element references in PowerShell (`'@e26'`). An unquoted reference can be interpreted as PowerShell syntax. After selecting a project, wait for its content to load and reopen Preview & exports before testing a video.
- Format episode numbers with three digits (`010`, not `0010`). Separate new YouTube manifests from earlier uploaded batches so their saved IDs are preserved.
- Bhagavad Gita 1.10 has differing traditional translations. Keep the chosen reading explicit and cite an alternate source when explaining the difference. Modern examples must remain identified as editorial applications.
# Complete chapter production

- Visual changes can reuse the completed chapter narration without paid calls. The visual-v2 edition splits the original 60 sections into 100 scene cuts and reuses 34 unique approved image hashes. Rebuild source-batch section indices while retaining original source text and finished audio IDs. Compare every caption word's absolute start/end time to the earlier edition before rendering. Keep total saved scenes below the 200-scene schema limit and preserve the earlier variant.
- With multiple editions, browser checks must explicitly select the expected variant before locating its render. YouTube chapter lists should omit image-only subdivision labels so every original verse gets one chapter timestamp.
- A single long asynchronous browser evaluation timed out while checking the large revised export. Short synchronous DOM actions with waits in the Node runner succeeded at start, middle and ending. Keep browser automation timeouts separate from actual playback failures; the exported file also passed whole-file decoding.

- Meaning-only Chapter 1 must have 47 numbered verse sections exactly once and in order. Individual verse videos retain a five-minute limit; opt in explicitly to `chapter-meaning` for the longer chapter. Current measured narration is about 39 minutes, not an estimated runtime claim.
- Serialize stages that write the same `state.json`. Running audio finishing and media persistence concurrently caused a later checkpoint save to overwrite media IDs. Database assets survived and were recovered by exact project asset names. The chapter media stage now requires all finished audio; assembly asserts logo and every scene visual before queuing a render.
- Long PCM narration batches exceed MCP's 8 MiB import limit. Use the supported signed-in owner multipart upload for those files; preserve source/finished audio and do not rerun paid narration to solve an import limit.
- ElevenLabs aligned labels such as `1.10` can arrive as separate numeric tokens. Merge only the exact numeric label, retaining first start and last end; reject wrong numbers or changed lexical words. Regression checks cover split labels and missing/extra tokens.
- After ten actual successful channel uploads, Episode 1.10 was rejected with Google's `uploadLimitExceeded` before any bytes. Parse only safe Google error identifiers for diagnosis; never log a response containing resumable URLs or tokens. An explicitly rejected request is different from a lost acknowledgement: preserve the failed record and do not create duplicate videos or retry indefinitely.


## Docker outage during long export (2026-10-03)
Docker engine became unavailable during Chapter 1 Full HD rendering. Desktop restart failed on inaccessible Windows Unix sockets; preserving runtime socket folders allowed startup to advance, but recreated sockets failed too. Do not reset/unregister Docker or recreate the worker: preserve VHDs, checkpoint media and worker temporary output. The engine later recovered without resetting data. The superseded job was cancelled after the owner requested a story rewrite; the new project and its saved job IDs are independent. Saved checkpoints prevent duplicate renders and paid generation.


## Cut-only export efficiency
Normalized cut-only H.264 shots can be joined with video stream copy, while audio remains encoded for precise duration. This avoids another lossy video pass. Crossfades still require encoding. Verified through 33 varied-length cuts and complete regression suite (133 tests).



## Exact cut timing and isolated test fixtures
FFmpeg concat demuxing should receive each planned fractional shot duration explicitly; rounded video frames and AAC container padding otherwise accumulate across many cuts. A 33-shot real-FFmpeg regression covers non-frame-aligned cuts and output A/V duration. Isolate calibration-media directories per concurrent test file: sharing calibration.wav allowed one FFmpeg process to truncate it while another test copied the file. The complete 133-test suite passes after isolation.

## Streaming long exports (2026-10-04)

The completed 1.06 GB Chapter 1 export decoded correctly, but browser seeking stalled because the download route loaded the entire file for every range request. Media responses now read size metadata and stream only the requested bytes. Local storage uses filesystem streams; S3 uses object metadata and ranged GetObject streams. Authentication remains enforced before access. Three focused regressions cover real local ranges, invalid ranges, full responses and HEAD without whole-file buffering. All 136 tests, TypeScript and the Docker production build passed. Actual authenticated 1 KiB requests at the beginning, middle and end returned 206; invalid ranges returned 416 and unauthenticated access returned 401. The real 1080p browser export played and sought successfully at start, middle and ending after deployment. Live S3 calls were not tested.

## Private YouTube delivery and playlists (2026-10-04)

The owner explicitly requested another upload attempt. Episode 1.10's saved zero-byte, explicitly rejected request successfully resumed; the full 36:54 chapter uploaded privately with its thumbnail. Reuse saved upload/video IDs. A fresh Chrome Studio tab recovered after two existing-tab focus timeouts. The existing upload/read-only OAuth scopes can verify playlists but cannot create them; playlist creation and membership were completed through the owner's already signed-in Studio UI, avoiding unnecessary permission expansion. The private playlist is PLG6MJI9Kus00. Read-only YouTube API calls confirmed the actual playlist, ordered members, channel ownership and every member's private visibility. Episode 1.2 lacked descriptionSummary and showed the literal word undefined in its uploaded description. Corrected its description in Studio, verified the exact saved text through the API, and added a source-section fallback for future publishing preparation.

## Render storage and chapter coverage (2026-10-04)

Use the D: worker override for new render temporary files and durable scene checkpoints; preserve existing database and source-media volumes. Windows bind-mount file sizes can stay at zero during an active encode even while container-side size is growing. Check encoder CPU and container-side output before canceling or deleting files. Keep voice generation sequential under the provider's concurrency limit and reuse the saved job IDs after an automatic retry; a rejected first attempt is not proof that another billable call is needed.

Full-chapter coverage cannot reuse Chapter 1's 47-verse rule for Chapter 2, which has 72 verses. The production policy now verifies the selected chapter's complete ordered coverage, rejecting omissions, duplicates and incorrect order. Complete chapters must be grouped into the separate full-chapter series; their ending and publishing labels must name the next chapter rather than an individual verse episode. Existing Chapter 1 configurations retain their default chapter number and legacy verification flag.

