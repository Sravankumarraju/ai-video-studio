# Verification report

## Divine Wisdom: ordered Bhagavad Gita 1.1 editions

Prepared equivalent eight-section scripts in Telugu, Hindi and English, with the exact channel names Divine Wisdom Telugu, Divine Wisdom Hindi and Divine Wisdom English. All three editions share the same image IDs and sequence. Verse 1.1 is correctly attributed to Dhritarashtra speaking to Sanjaya; interpretation and the modern example are distinguished from the original verse. Sources, scripts and image prompts are retained in `data/productions/divine-wisdom/gita-1-1`.

Twelve authorized ElevenLabs v4 narration requests returned recordings, including an initial long Telugu recording with an unusable ending. Its validated prefix was retained; remaining sections used smaller chunks. One separate forced-alignment diagnostic confirmed collapsed ending timing and was not used in the exports. Original audio remains saved. All final scene words match the reviewed scripts; all 24 enhanced WAV durations were checked within 25 ms. Voice IDs are listed in `DIVINE-WISDOM.md`. Provider prices/actual billing were not independently verified.

The three draft jobs completed with H.264 video and AAC audio at 360x640: Telugu 228.5 s, Hindi 242.469 s, English 209.834 s. Actual overview caption frames for all three and the Telugu Sanskrit recitation frame were inspected. Full audio tracks decoded successfully. Mean/peak levels: Telugu -17.3/-1.1 dB, Hindi -18.2/-0.1 dB, English -17.8/-0.2 dB. The resulting lengths are natural recordings, without speeding speech to force the target. Sanskrit and native-language pronunciation have not been independently reviewed.

Real-browser checks verified language switching shows that edition's welcome narration, exact channel title, shaped caption font and shared image, with a reset playhead. Captions use `white-space: pre-line`. Fixed timeline controls retaining an unrelated scene when changing variants; edits now require a scene belonging to the selected variant.

Fixed two failures found in production: collapsed provider timing now leaves the paid recording saved but marks narration/captions stale for review; valid large base64 media imports no longer exhaust the regex stack. Renderer output encoders are explicitly limited to two threads at each stage. Still images now feed the whole motion sequence from one scaled frame. A 90-frame full-resolution comparison produced identical decoded frames, with the cached path faster in both measured runs (33.16 vs 12.84 seconds; 17.46 vs 11.22 seconds under changing concurrent load). Regression coverage compares all 45 raw frames for both zoom and pan motion, including the one-second boundary. The final complete regression suite passed **60 tests in 11 files**, including actual FFmpeg landscape/vertical exports, three shaped caption languages, timing, import limits, thread limits, MCP permissions and project/version preservation. Production build and TypeScript passed. No persisted-schema migration was needed.

`draft-verification.json` records the draft checks; `verification.json` records full-export decoding and dimensions once downloaded. The ordered local playlist is generated from saved export state. Remaining verses stay planned. App image/video/transcription provider calls and platform publishing were not verified by this production.

Full portrait export jobs: Telugu `b28f69dc-f6ad-4850-9f2f-b505be4b5561`, Hindi `614f4ee3-b7c8-4f8f-aff4-d29303345b0f`, English `6499ba61-ebaf-4e0c-a812-5ee2ecee6712`. All three completed on their first attempt, downloaded, and passed full video/audio decoding and scene/caption assertions: respectively 66,540,449, 67,518,886 and 63,320,793 bytes, all 1080x1920 H.264/AAC. Full-resolution verse/meaning and modern-example caption frames were inspected in each language. Authenticated Chromium playback reached readyState 4, advanced beyond one second without errors, and reported correct dimensions/duration for the three files (playback was muted). A fresh browser session correctly received HTTP 401 until owner sign-in completed.

Actual downloaded SRT and VTT files also passed script-word matching, ordered cue timing, total-duration bounds and the two-line limit: Telugu 103 cues/342 words, Hindi 155 cues/539 words, English 153 cues/526 words. The three local M3U8 playlists each contain the exported first episode; the complete planning index remains ordered with 1.2 next. These exports were completed without restarting the active worker. The tested still-image optimization is deployed for subsequent renders.

## Bhagavad Gita 2.47 and readable Telugu captions

Nine authorized ElevenLabs narration calls completed for eight new episode scenes, including one grammar correction retake. Voice `sJrRcQEpUbZehhGBdEbD`, model `eleven_v4`. Separate WAV assets add 3 dB bass at 120 Hz and raise pitch 0.5 semitone with formants preserved and tempo unchanged; each processed duration was checked against its original recording (within 25 ms). Original recordings and earlier scenes remain intact. Narration volume is 1.25.

Caption review produced 45 short cues, no more than four words and two lines each. Production assertions verified all original words, Telugu grapheme line lengths, valid nonoverlapping timing, and unchanged earlier scenes. One awkward closing sentence was corrected in both the script and regenerated narration. The browser caption CSS now preserves explicit line breaks. Exported draft `f5ba6068-8bc2-4b36-ba06-230ee8d81af5` completed: 360x640, 120 seconds, H.264/AAC. Actual recitation and explanation frames were inspected. Complete audio decoded successfully, mean -17.9 dB, peak -1.5 dB. Sanskrit pronunciation has not been independently verified by a human reciter.

Research covers the full 18-chapter map and production plan; the 701-reference catalogue follows the selected publisher's numbering. The standalone 2.47 sample and ordered 1.1 scripts are reviewed. Remaining catalogue entries are explicitly planned, not individually researched translations. Sources are linked in `BHAGAVAD-GITA-VIDEO-RESEARCH.md`.

## Cosmic visual versions and new voice

Full export job `ae096e06-12b4-469b-ba54-c4b497ff1e4e` completed for independent version `faad366a-4067-48e8-ad16-19e81dab5b30`. MP4, SRT and VTT downloaded successfully as `cosmic-krishna-new-voice.*`: 51,077,106-byte MP4, H.264/AAC, 1080x1920, 30 fps, exactly 120 seconds. The entire audio track decoded without errors (mean -19.6 dB, peak -3.4 dB). The final browser screenshot confirmed the portrait image remains fully visible beside its saved editable prompt.

Authorized `eleven_v4` Telugu scene calls succeeded with voice `sJrRcQEpUbZehhGBdEbD`. A persisted provider response whose caption endpoint slightly exceeded measured audio was recovered without submitting new generation: caption/word endpoints now clamp to measured duration for overshoot up to 0.25 seconds, while larger mismatches remain errors. Four focused checks across alignment duration, independent visual version copying and existing scene reconciliation passed, along with strict type checking and a Next.js production build.

Three original cosmic Krishna images were generated with Codex's built-in imagegen, imported into durable project assets, and their exact prompts saved in scene fields and `data/productions/bhagavad-gita-telugu/cosmic-image-prompts.json`. Actual browser review verified the saved prompt/image controls and **Create new video version**: eight independent scene copies were created with original scenes unchanged. The completed two-minute draft decoded with non-silent AAC audio (mean -19.6 dB, peak -3.4 dB); a rendered frame was inspected for Telugu captions and cosmic artwork. No live app image-provider generation was performed; that action requires an independently configured image profile. No schema migration was needed.

## October 1, 2026: authorized Telugu narration

Final render job `29a800f7-d018-46a0-8e7f-eaa090ec90d6` completed and downloaded successfully: H.264/AAC, vertical 1080×1920, 30 fps, exactly 120 seconds. The entire AAC track decoded for volume measurement (mean -19.6 dB, peak -1.6 dB), confirming non-silent audio. A rendered frame was inspected for Telugu captions and original Krishna artwork. MP4, SRT and VTT are saved under `data/productions/bhagavad-gita-telugu/`.

Actual authorized ElevenLabs `eleven_v4` calls succeeded with voice `RoLT1qx7XJRXxWSIG5hS`: eight original scenes and eight shortened scenes were generated, stored durably, and applied with character-aligned Telugu captions. The shortened narration measured 116.793469 seconds; small inter-scene pauses bring its vertical timeline to 120 seconds without speeding audio. Subscription balance, billed cost, production rate limits and other models remain unverified. Owner-only existing-connector permission updates passed 13 focused connector/authentication checks and the production build. Earlier no-live-call statements below describe the initial audit, before these calls.

Verified September 30–October 1, 2026. Live AI credentials were not used and no real provider credits were spent. The requirement audit is in COMPLETION-AUDIT.md.

## Passed

- TypeScript strict check and Next.js production build.
- 45 unit/contract/render/MCP checks, 12 API acceptance checks, six manual completion checks, eight MCP acceptance groups and three worker recovery checks. Abruptly terminated rendering resumes; saved provider responses apply without another paid request.
- Production Docker image, PostgreSQL migration and separate Linux worker startup; full API acceptance against the container stack. Docker tests use `docker compose exec app npm test -- --configLoader native` to keep application source read-only.
- Real FFmpeg rendering of landscape 1920×1080 and vertical 1080×1920 with H.264/AAC, measured duration and crossfade overlap.
- Separate English, Telugu and Hindi rendered-caption fixtures; frames visually inspected for shaped glyphs.
- Original local test assets, no AI credentials required for rendering.
- Core tests for shared timing, Unicode exports, stale narration/captions, prompt expansion, provider independence, encryption/authentication and unsafe URL blocking.
- Isolated ZenMux text/image/native-video and ElevenLabs discovery/timestamp contracts, including base64/URL output and ambiguous upstream failure classification.
- API acceptance: owner access; inspected uploads; persistence after reload; independent profile keys/defaults; encrypted/masked secrets; assets after provider changes; render deduplication; downloadable background MP4; byte-range playback; portable backup/import; locked regeneration prevention; dependent invalidation with preserved old render.
- Browser dashboard, script and timeline navigation; desktop/mobile screenshots; clean console after fresh load.
- MCP official SDK initialization/discovery and actual stdio bridge; media imports, scene motion/captions, independent landscape/vertical renders, protected downloads and byte ranges, stale edit conflicts, scope enforcement, spending policy, secret omission, immediate revocation and unchanged pre-existing project revisions. See [MCP.md](MCP.md) and `npm run test:mcp`.

Command-level reports are generated by `npm test`, `npm run test:acceptance` and `npm run test:recovery`, with integration reports under ignored `test-output/`.

## Not live verified

- ZenMux and ElevenLabs authentication, account-specific model availability, generation, billing and production rate limits.
- S3-compatible deployment with real bucket credentials.
- Individual third-party MCP client interfaces and cloud access. Bearer/stdio clients are supported; OAuth-only cloud clients need an additional OAuth gateway.
- YouTube/Instagram publication, which is deliberately not implemented.

## Practical limits

- The editing monitor approximates framing and crossfade playback. The rendered draft is the exact selected-timeline preview; full exports use the same renderer.
- The initial adapters use text prompts for visual consistency and do not transmit reference images. Reusable character descriptions and uploaded references are stored for manual workflows. Model consistency is not guaranteed.
- Narration is one voice per coherent scene chunk. Assign different character voices across scenes. Multiple alternating speakers within one scene need separate narration chunks/scenes or uploaded mixed dialogue.
- Script language versions can be preserved as project revisions or duplicated projects; there is no simultaneous per-language tab set. Translate captions on the original audio timeline. Create a language-specific narration project for a different audio language.
- Music loops fade at each loop seam and at track start/end; musical phrase selection needs user-prepared music. Audio/video render normalization and ducking are implemented.
- Backup is a portable JSON file containing media; very large libraries should use database/object backups. Import clears unavailable provider bindings.
- Scene/variant edits conservatively stale completed renders for the whole project. Fine-grained dependency caching and automatic garbage collection of crash-orphaned temporary files are future operational improvements.
- Voice alignment is checked structurally, not guaranteed correct for all speech. Phrase text/timing remain editable; word highlighting requires returned word timing.

These limits are not presented as completed advanced features. Provider adapters and storage are documented extension points.
