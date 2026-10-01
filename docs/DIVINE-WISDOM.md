# Divine Wisdom production playlist

The channel names are exactly **Divine Wisdom Telugu**, **Divine Wisdom Hindi** and **Divine Wisdom English**, without a tagline. The first ordered series is Bhagavad Gita: episode 001 = 1.1, episode 002 = 1.2, then continue in chapter/verse order. Other sacred books can have their own series later.

Every episode uses eight sections: channel welcome, overview, book context, reading and meaning, detailed explanation, a modern example, conclusion, and the next-verse teaser. Telugu, Hindi and English convey the same concepts and use the same eight-image sequence. Voices and captions differ. The desired length is about 3–4 minutes; actual recordings determine timing.

## Start and review

Run `docker compose up -d` from the project directory, then visit http://localhost:3000. Open the existing Telugu Bhagavad Gita project. Its original scenes, assets, provider profiles and earlier exports remain available. In **Prompts** or **Preview & exports**, choose the variant named for the desired Divine Wisdom channel and Bhagavad Gita 1.1. Saved scene image prompts can be reviewed and edited; create an independent video version before changing a finished edition.

The original recordings, enhanced scene WAVs, scripts, sources, image prompts, timing and job IDs are retained in `data/productions/divine-wisdom/gita-1-1`. The local playlist lives at `data/productions/divine-wisdom/playlist.html`, with `playlists.json` and three M3U8 files. These are local production playlists, not published YouTube playlists. The 701-reference index follows the selected chapter-13 numbering; remaining episodes are planned, not individually reviewed or generated.

Voice configuration stays in the independent encrypted ElevenLabs provider profile. Telugu uses the selected `sJrRcQEpUbZehhGBdEbD`; Hindi uses `DkFYBwV0B5HQkFUvqL2y`; English uses `nPczCjzI2devNBz1zQrb`. This production uses `eleven_v4`. Bass is raised 3 dB near 120 Hz, pitch by 0.5 semitone with tempo unchanged, and editor narration volume to 1.25. Finishing is baked into new WAV assets; regenerating narration requires repeating the finishing step.

## Compatibility and checks

No persisted schema change or migration is required. The existing editor has project-level language settings. Before manually regenerating a Hindi or English scene, set **Setup** language and subtitle language to match that edition and retain its scene voice ID; restore Telugu when returning to the original project. Recorded language editions already have their own audio and shaped caption fonts.

Captions preserve complete words and Unicode graphemes, use at most two lines/four words per cue, and keep the reviewed script text. Automated timing checks and rendered frame inspection do not certify Sanskrit pronunciation or substitute for native-speaker review. The modern family example is our application, not a quoted incident from scripture.

The longer initial Telugu request returned collapsed timing at its end. Its complete, timed prefix was retained, and the rest was recorded in smaller chunks. A forced-alignment diagnostic confirmed that the unusable ending could not be recovered; its output is retained for diagnosis and is not used for export. The app now retains a recording with invalid timing but marks narration/captions stale for review, preventing a misleading export. MCP media imports now validate large base64 payloads without exhausting the regex stack. Renderer output encoders are limited to two threads per stage. Still-image motion reuses one scaled input frame; decoded-frame comparisons verify the motion remains unchanged.

## Production helper

The helpers read `STORY_STUDIO_MCP_TOKEN` from the current process environment; they do not contain or print API keys. Load your saved Windows user variable into the PowerShell session if needed. `scripts/divine-wisdom.mjs` supports `generate`, `assemble`, `drafts`, `fulls`, `status` and `download`. State saves job IDs so repeated runs do not blindly submit paid calls. Do not repeat `prepare` or the one-time `recover-chunks` operation on the finished episode. `node scripts/divine-wisdom-playlist.mjs` refreshes the local playlist from saved export state.

New episodes require their own researched script, verse reference, reviewed translations and explicit visual plan before voice generation. Use a separate project per episode as the series grows: the current persisted schema supports at most 20 variants per project. Each new project needs its owner-configured generation budget; do not automatically increase existing limits. Keep spending limits and provider credentials intact. No live app image/video/transcription provider integration was verified by this production; shared artwork was generated with the built-in image tool and imported as images with camera motion.
