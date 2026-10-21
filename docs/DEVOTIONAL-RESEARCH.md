# Divine Wisdom Telugu research preparation

Open **Devotional research** in the signed-in studio. Search the 30 imported topics by Telugu or English title or deity; filter P1/P2 or the eight first-experiment works. Each record exposes its production status, language/script distinction, source access, count and rights gaps. This is a read-only research catalogue. It does not create series, edit existing projects, queue generation or publish videos.

The catalogue is maintained in `lib/devotional-backlog.ts`. The UI and authenticated JSON download route use the same data. Run `npm run prepare:devotional` to write the research bundle and Lingashtakam/Mahalakshmi Ashtakam starter drafts under `data/productions/devotional-research/`. That directory follows the project's ignored production-data convention; the generator and source catalogue are versioned. Re-running replaces the generated draft files, so save reviewed editions separately.

## Current research status

The supplied brief is a discovery backlog. Research on 16 October 2026 located two publisher candidates for each first-experiment work. Editorial independence has not been established. Several Vignanam work pages could only be read through search indexing. The Vishnu Sahasranamam and Shiva Panchakshari Vignanam references still point to the Telugu index. Publisher links and retrieval distinctions are preserved in the JSON.

Sanskrit Documents is a verification reference, not a cleared production edition: its [Shiva Panchakshara page](https://sanskritdocuments.org/doc_shiva/panch.html) carries a reuse restriction and a textual variant. [Lingashtakam](https://vignanam.org/telugu/lingashtakam.html) marks alternative readings. The [Mahalakshmi page](https://sanskritdocuments.org/doc_devii/mahaalakshmyashhTakaM.html) includes a separate Lakshmi Stava; scope must be selected explicitly. The two starter packets record these review issues without copying a complete edition or modern translation.

## Complete a starter package

1. Select and record the exact edition, first line, section boundaries and a documented reuse basis. Establish that the second edition is independently edited. Record differences; do not merge readings silently.
2. Replace provisional slots with stable approved verse/name IDs and complete Telugu-script recitation text. Record the verified count separately from a title's implied number. Opening, dhyanam and phalasruti inclusion require review.
3. Write and review original Telugu verse meanings in a separate explanation package. The current Telugu prose is editorial introduction copy, not a verse translation. All verse meanings are intentionally null.
4. Commission or upload cleared original narration/visuals through the existing manual project workflow. AI pronunciation remains a draft until a knowledgeable reviewer approves the actual recording. Keep branding and calls to action outside recitation.
5. Align captions to the actual recording, populate scene times and media IDs, and render a draft through the studio. Review shaping, line breaks, safe areas, clipping, levels, order and omissions before production approval.

The starter packets are planning scaffolds with eight provisional core slots and optional section placeholders. They are **blocked**, have `publish_ready: false`, and have no recitation text, verse meanings, recordings, caption files, measured timings or rendered video. Their status does not gate unrelated studio projects; no unreviewed package is automatically converted to one.

## Measurement and limits

No authorized Studio export was supplied or queried. CTR, retention, impressions and returning viewers remain null. No current public comparable-video table was verified. The proposal is two main videos and two related Shorts per week, with format-specific comparison at 7 and 28 days. This is an editorial experiment, not a platform requirement or forecast.

## Verification

`npx vitest run tests/devotional-backlog.test.ts` checks record completeness, unknown counts, placeholder/media boundaries, stable section links, authenticated downloads and unknown package rejection. It does not establish textual, religious or pronunciation accuracy.

Verification on 16 October 2026: all five new tests passed. The full suite passed 124 tests, with three media-fixture setup timeouts; those three suites then passed all 17 tests when rerun serially with a 60-second hook timeout. The application, worker, tests and new generator passed a scoped TypeScript check. Repository-wide `npm run typecheck` still fails in pre-existing scripts: `complete-video-status.ts`, `inspect-youtube-chapter-playlists.ts`, `recover-gita-nine-recording.ts` and `repair-gita-nine-alignment.ts`. A production build was not verified.

The local Next.js preview was checked with gstack's native browser: navigation, work selection, search, empty results, the first-eight filter, authenticated JSON download and 390px mobile layout. The mobile document had no horizontal overflow. Screenshots and a downloaded draft are under ignored `test-output/`.

Operational note: the installed Windows gstack browser has a native `browse.exe`; the system `bash.exe` can fail with WSL access denied. Use the native executable for browser verification when available.
