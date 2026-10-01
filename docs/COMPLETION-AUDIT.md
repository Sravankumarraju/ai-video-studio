# Story Studio completion audit

Audit performed October 1, 2026 against the original build request and the explicit video-length addition. The complete Docker application runs at http://localhost:3000 with PostgreSQL, Redis and a separate FFmpeg worker. Existing database and media volumes were preserved.

## Verified functionality

| Requirement                       | Evidence and result                                                                                                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manual production without AI keys | Created projects/scenes, uploaded and inspected PNG/WAV files, explicitly assigned assets, edited caption text, selected motion and transitions, and rendered both formats.                                                            |
| Actual downloadable video         | Full 1920×1080 and 1080×1920 MP4s downloaded through authenticated endpoints and probed as H.264/AAC. Actual overlap-adjusted duration is validated; targets never force speech speed.                                                 |
| Video-length input                | Required minutes/seconds, 30/60/90-second and 3/5/10-minute presets plus Custom. Independent long/vertical targets persist. Browser rejects zero and saves 3:15 long plus 0:30 vertical.                                               |
| Target versus actual              | Timeline displays target, actual scene/overlap timing and measured narration. Users can accept actual length, edit pauses/duration, or request a paid variant rewrite and regenerate/upload affected narration.                        |
| Provider independence             | Separate script/image/video/voice/transcription profiles, encrypted credential snapshots, defaults and project/scene overrides. Isolated contract checks pass; provider changes preserve existing assets.                              |
| Persistent jobs and costs         | BullMQ outbox, durable job/configuration records, bounded polling/retries, cancellation, budget/call reservation and deduplication. Abrupt worker termination recovers a render; saved generation output resumes without resubmission. |
| Revisions and dependencies        | Narration/caption edits mark dependent output stale while retaining previous assets and downloadable renders. Independent variants retain the original script and media.                                                               |
| Secrets and storage               | Owner access, masked/encrypted keys, protected media/jobs, secret-free portable backups, remapped media on import, bounded uploads/downloads and DNS-pinned SSRF checks.                                                               |
| Languages and rendering           | Separate English, Telugu and Hindi FFmpeg fixtures; bundled Noto fonts with licenses; editable phrases and timed word highlighting.                                                                                                    |
| Setup and hosting                 | Prisma migration, complete Compose image/startup, shared media volume, worker hosting guidance and local/S3 adapter configuration documented in README.                                                                                |

## Fixes made during the audit

1. Added the missing explicit video-length controls and saved per-output targets. Planning prompts include approximate word/scene guidance without forcing pacing.
2. Implemented safe variant script shortening/expansion and variant-only narration regeneration. Original scenes, visuals and recordings remain available.
3. Fixed scene deletion leaving dangling variant overrides/framing references. A focused regression verifies saving still succeeds and shared media is preserved.
4. Fixed still images being center-cropped before applying a focal point. A real FFmpeg regression verifies opposite focal points produce different vertical pixels at the required dimensions.
5. Added restart policies for PostgreSQL and Redis after finding they were stopped while app/worker restarted.
6. During initial verification, fixed backup double remapping, retained safe provenance, cleared invalid word timing on text edits, and reserved new costs for explicitly approved ambiguous paid retries.

## Checks

- 35 automated unit, contract and real FFmpeg checks pass in the production Linux image.
- 12 API acceptance checks pass, covering owner access, encrypted independent keys, persistence, job deduplication, MP4 ranges, portable backups and invalidation.
- Six manual completion checks pass for scene/media/caption creation, independent targets, full landscape/vertical downloads and caption files.
- Three restart/recovery checks passed during the implementation session.
- TypeScript and production builds pass. Production dependency audit reports zero vulnerabilities.
- Browser wizard, uploads, explicit scene assignment, caption controls, timeline and export navigation tested; fresh production console checked.

Reproduce the checks with `npm test`, `npm run test:acceptance`, `npm run test:recovery`, and `node --import tsx scripts/completion-audit.ts`. In Docker use `docker compose exec app npm test -- --configLoader native`. Acceptance scripts create clearly labeled test projects and temporarily exercise global defaults; use a disposable development instance.

## Remaining unverified or limited

- No authorized live ZenMux, ElevenLabs or S3 calls were made. Authentication, account/model availability, generation quality, billing and real rate limits remain unverified. Paid provider tests require configured credentials and explicit confirmation.
- The browser editing monitor approximates motion/crossfades and does not reproduce the full audio mix. A rendered draft is the authoritative preview; full export uses the same saved timeline and renderer.
- Visual reference images are stored for manual use but are not sent by the current AI adapters. Language narration versions use project duplication/revisions. One voice is rendered per scene; mixed dialogue needs separate scenes or uploaded audio.
- Media responses buffer files; very large libraries need streaming/object-backed delivery. Crash-orphaned temporary directories and finer-grained render caching need further operational work.
- Platform publishing is not implemented; publishing metadata, files and captions are available for manual upload. No automatic publication occurs.

These limitations are described in the UI/README and are not represented as live-verified integrations. See VERIFICATION.md for additional practical limits.

## Start

With Docker Desktop running and `.env` configured, run `docker compose up --build -d`, then open http://localhost:3000. Initial sample creation is `docker compose exec app npm run sample`. For the already built local stack, `docker compose up -d --no-build` starts all services. The local owner credential is configured in the ignored `.env`; provider credentials are optional for manual work.

The new duration fields are backward-compatible JSON additions. Existing project target lengths remain intact and variants without an explicit target inherit the long/short project target. No relational migration is required.
