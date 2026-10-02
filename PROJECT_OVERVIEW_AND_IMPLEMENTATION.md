# Story Studio: project overview and implementation report

Updated: 2 October 2026, Asia/Kolkata.

This report describes the implemented application, completed videos, verified behavior and remaining work. Implemented provider support is distinguished from actual successful live calls. The current 16:9 update is separated from already exported videos.

## Main goal: a reusable, project-based devotional video system

Story Studio must support **many independent devotional video projects**, not one application hardcoded around the Bhagavad Gita. The Telugu Bhagavad Gita workflow is one project template among several. **In this phase every project produces Telugu videos.**

### Projects and templates

Example projects:

- **Bhagavad Gita:** two shlokas per video, with recitation, meaning, explanation, practical examples, and a conclusion on what to follow.
- **Lord Vishnu:** stories, teachings, avatars, selected verses and devotional explanations.
- **Lord Shiva:** stories, teachings, symbolism, selected stotras and practical lessons.
- **Custom:** any other devotional topic, with its own sources, structure, visual style and narration instructions.

Ready-made templates exist for Bhagavad Gita, Lord Vishnu and Lord Shiva, plus a blank custom template. Every template can be customized. Each project stores its own:

- name, description, subject and intended audience;
- content type: scripture explanation, devotional story, stotra meaning, thematic teaching or custom;
- source texts and reference preferences;
- default video structure, with an editable section order;
- verse count, only where relevant;
- Telugu narration tone and pronunciation guidance;
- visual style, character appearance references and image-prompt rules;
- default voice, aspect ratio, optional target duration and channel branding;
- intro, closing and optional call-to-action instructions.

### Videos inside a project

Users create individual videos inside a project. Each video inherits the project settings and can override them for that video:

- A Bhagavad Gita video inherits the two-shloka structure.
- A Lord Vishnu story uses introduction → source context → story → meaning → practical lesson → conclusion.
- A Lord Shiva stotra video uses introduction → selected verses → recitation → meaning → explanation → devotional takeaway.

Stories are never forced to contain shlokas. There is no fixed duration: the complete narration decides the runtime, and a target duration is only an optional guide. Changes to project defaults apply to new videos. Existing videos keep their saved settings until the owner explicitly applies the updates.

### Manual prompt workflow (every project)

**Select Project → Create Video → Fill Details → Copy Full Prompt JSON → Import Generated JSON → Review → Upload Images → Generate Telugu Voice → Preview → Render → Download**

"Copy Full Prompt JSON" builds one self-contained prompt for any external AI tool. It combines:

1. the project's instructions;
2. its content template and source rules;
3. the video's title, topic, description and other inputs;
4. the required script structure;
5. the visual and narration preferences;
6. the expected output JSON schema.

The external AI returns the complete Telugu script, metadata, scene plan and concept-based image prompts. The imported JSON is validated against the video's template. For example, the Bhagavad Gita template requires exactly two shlokas, and stotra videos need at least one verse. Stories need none.

### Source accuracy and respectful presentation

- Content is labelled as scripture, translation, commentary, traditional story or newly created illustrative example.
- For Vishnu, Shiva and other projects, the source or tradition is named where available. Where accounts differ, the chosen version is stated.
- Scripture quotations, verse numbers and source references are never invented. Imported verse references must match the references the owner entered.
- Depictions stay consistent within a project, while individual videos or stories can differ deliberately.

### Organization

The application provides:

- a project dashboard with project cards, and a video list inside each project;
- project settings and editable templates;
- project-specific media, pronunciation notes and visual references;
- video statuses: **Draft, Script Ready, Images Pending, Voice Ready, Ready to Render, Completed**;
- duplication of a project or of a video draft.

Each project's scripts, images, audio, settings and videos stay separate. JSON export/import, image upload, Telugu voice generation, captions, preview, rendering and download work the same in every project.

### Implementation status (2 October 2026)

**Built and deployed** (database migration `202610020001_series` applied):

- **Projects, templates and inheritance.** Bhagavad Gita, Lord Vishnu, Lord Shiva and Custom templates, each with editable formats, section order, verse rules, sources, narration, visual style, characters, defaults and CTA (`lib/series-schema.ts`, `lib/series.ts`).
  - Internally a devotional project is a `Series`; each video is an existing `Project` row linked to it.
  - Videos keep a snapshot of the project's settings. **Apply project updates** brings in later changes, while the video's own inputs and overrides are kept.
- **Dashboard and project pages.** The dashboard shows devotional project cards. Each project page has three tabs:
  - **Videos:** status chips, open, duplicate a draft, and move an existing video into the project.
  - **Settings & template:** a full settings editor with section reordering.
  - **Media & references:** character reference images and logo. Each new video receives its own copy.
  - The page also has New video, Duplicate project and Delete project actions (`components/series.tsx`).
- **Plan & import stage.** This is the first stage of every project video:
  - edit the video's details;
  - **Copy Full Prompt JSON** (copy, download or preview);
  - **Import Generated JSON** (paste or file);
  - **Review**: errors, warnings, verses, sources and labels, plus confirmations that verses and sources were checked;
  - then the existing Assets → Voice & captions → Timeline → Preview & exports stages.
- **Import validation per template.**
  - Exactly two shlokas for the Gita; 1–8 verses for a stotra; optional verses for stories.
  - Required sections and their order; Telugu narration.
  - Verse references must match the references the owner entered.
  - A scripture source is required whenever a verse is quoted; the recitation must match the quoted verse.
- **Video statuses.** Draft → Script Ready → Images Pending → Voice Ready → Ready to Render → Completed, computed from the video's real state.
- **Captions for both 16:9 and 9:16** (`lib/caption-layout.ts`, `worker/render.ts`):
  - centred, at most two lines, and words are never split;
  - long cues become timed pages, and over-long Sanskrit compounds shrink to fit;
  - only the word being spoken is highlighted, in a selectable colour;
  - vertical captions sit above the Shorts/Reels controls;
  - captions can be turned on or off per version.
  - A rendered-frame test checks that long Telugu captions stay inside and centred in both frames.
- **Editor.** In Timeline, the selected scene's inspector edits its narration and prompts and shows its current image. **Upload my own image / video** assigns your file to that scene and keeps its recording and captions.
- **Seeded projects** (`scripts/seed-devotional.ts`, safe to re-run): *Bhagavad Gita · Telugu*, *Lord Vishnu · Telugu* and *Lord Shiva · Telugu*, each with the Telugu voice and the Divine Wisdom Telugu channel name. Starter videos:
  - Gita 1.2–1.3 (two shlokas; Episode 002 under the new template);
  - Gajendra Moksham (story);
  - Shiva Panchakshara Stotram verses 1–2 (stotra).
  - Their full prompts are saved in `data/productions/devotional/<template>/`.

All 107 tests in 18 files and TypeScript passed before deployment; the series and caption tests (25) passed again after the final template change. The new pages have not yet been tested in a signed-in browser.

## Architecture

| Component | Implementation | Responsibility |
|---|---|---|
| Web studio | Next.js 16.3.7, React, TypeScript | Sign-in, wizard, scene editing, prompts, assets, voice/captions, timeline and exports |
| Protected API | Next.js route handlers | Project revisions, uploads, providers, jobs, downloads and backups |
| Database | PostgreSQL and Prisma | Persistent projects, versions, asset metadata, provider profiles, connector permissions and jobs |
| Queue | BullMQ and Redis | Background generation/render scheduling, polling and restart recovery |
| Worker | Separate TypeScript process | Applies provider outputs, orchestrates production and renders videos |
| Renderer | FFmpeg and ffprobe | Framing, motion, transitions, audio mix, shaped captions and MP4 validation |
| Storage | Shared local media volume; optional S3 adapter | Assets, exports and new render checkpoints |
| AI client connector | MCP HTTP endpoint and desktop stdio bridge | Compatible clients can inspect/edit projects and request permitted generation/rendering |

Docker Compose runs `app`, `worker`, `db` and `redis`. App and worker share media storage. A browser tab can close while a background job continues.

## Implemented application features

| Area | Completed implementation |
|---|---|
| Project setup | Topic, title, language, source classification, style, audience and manual/hybrid/automatic modes |
| Video length | Minutes/seconds and presets, separate long/short targets, script/scene planning, actual narration timing and duration adjustment |
| Scripts and storyboard | Editable narration/scenes, source notes, scene locking and project/scene provider overrides |
| Visual prompts | Saved editable image/video prompts, templates, regeneration/review and new timed external-model prompt packs |
| Media | Images, video clips and narration upload, explicit assignment, persisted originals and alternate takes |
| Motion | Zoom in/out, pans, strength, focal controls and explicit short-clip policies |
| Narration | Independent voice profiles, scene voice IDs, uploads, saved takes, generation and new timestamped source slices |
| Captions | Editable timed phrases, alignment, Telugu/Hindi/English fonts, background/outline, optional word highlighting, SRT/VTT |
| Versions | Landscape/vertical variants, independent cloned scenes, framing/timing/caption settings and preserved earlier versions |
| Audio mix | Gain/mute, explicit fades, music, ducking and timestamped effects |
| Jobs | Saved provider results/IDs, deduplication, budgets/call limits, cancellation, retry/Resume and restart recovery |
| Exports | Draft/full H.264 video, AAC audio, protected downloads and stale-export labels |
| Backups | Portable project/media import/export with asset remapping and secret-free project backups |
| Publishing preparation | Titles, descriptions, hashtags, thumbnails and chapters for manual publication |
| MCP | Bearer authentication, per-connection permissions and separate authorization for paid generation |

## Completed videos and playlists

Episode 001 was exported in all three languages with the same eight-section visual sequence and separate voices/captions.

| Edition | Duration | Completed video |
|---|---:|---|
| Telugu | 3:48 | [gita-1-1-te.mp4](data/productions/divine-wisdom/gita-1-1/gita-1-1-te.mp4) (re-exported 1 Oct) |
| Hindi | 4:02 | [gita-1-1-hi.mp4](data/productions/divine-wisdom/gita-1-1/gita-1-1-hi.mp4) (re-exported 1 Oct) |
| English | 3:30 | [gita-1-1-en.mp4](data/productions/divine-wisdom/gita-1-1/gita-1-1-en.mp4) |

All are 1080×1920, 30 fps, H.264/yuv420p with AAC 48 kHz stereo. SRT/VTT files are alongside them. Actual browser playback, complete audio/video decoding and caption timing/words/line limits were checked. Native pronunciation and Sanskrit recitation still need qualified human listening review.

**Correction:** the original Telugu and Hindi exports burned captions with broken conjuncts (for example ధర్మ shown as ధర్ + మ, धर्मक्षेत्रे split with visible viramas). The earlier glyph check missed it. The cause and fix are described under *Caption shaping, dashboard and job recovery fixes* below. Telugu and Hindi were re-rendered with the fix and their verse caption frames inspected; the earlier files are kept in `gita-1-1/superseded-shaping-bug/`. English is unaffected.

Authorized ElevenLabs `eleven_v4` narration calls succeeded. The selected Telugu voice is `sJrRcQEpUbZehhGBdEbD`. Hindi/English have separate saved IDs. These calls verify the requests actually made, not every model, voice, billing rate or provider.

Earlier cosmic Krishna and standalone 2.47 videos remain saved. Three-language local playlists and a 701-reference planning catalogue exist. Remaining references are planned, not completed videos or reviewed translations. Nothing has been published to YouTube.

See [production instructions](docs/DIVINE-WISDOM.md), [local playlist](data/productions/divine-wisdom/playlist.html), [research](docs/BHAGAVAD-GITA-VIDEO-RESEARCH.md) and [verification](docs/VERIFICATION.md).

## Current 16:9 and resume update

The following changes are implemented in source:

- Create an independent **16:9 version with shots of at most eight seconds**, alternating zoom and framing while preserving previous editions.
- Reuse original voice recordings through `audioStart` and `audioSlice`; clip/rebase captions to the visual shot boundaries.
- Replace a shot's image/video without changing its recording, timestamp, gain or captions.
- Export a timed prompt pack with scene IDs, narration, start/end, durations, image/video prompts, aspect and motion. Its meta-prompt asks a frontier model to refine distinct compositions while preserving meaning and character identity.
- Append an editable Telugu/Hindi/English **subscribe / like / comment** outro with its own recording and voice ID.
- Set a source-recording start timestamp, preview it, reassign saved takes or generate another scene voice take.
- Run automatic production through the **selected version**, preserving present assets; unrelated historical failures no longer block that production.
- Remember the editor stage/version/scene in this browser. Project stages, assets and jobs remain persisted on the server.
- Save normalized scene render clips in media storage and validate/reuse them when the **same render job** resumes. An unfinished scene or final composition/mix/caption burn can restart.

### Audio issue: reproduced and fixed

The renderer inserted FFmpeg `afade` filters even when duration was zero. FFmpeg still applied its default sample-count fade, reducing voice volume after scene changes. A real rendered-audio regression reproduced the drop. Disabled fades now omit the filter entirely. The complete mix is normalized once instead of independently at each scene.

The focused rerun passed **22 tests**, including actual audio levels across a cut, MP4 rendering, interrupted render checkpoint recovery, source timestamps, preserved versions, caption boundaries, prompt packs and multilingual outro text.

### Current production status

The final full regression rerun passed **68 tests in 12 files**, TypeScript passed, and the final production image was built and deployed to app/worker. The new version `gita-1-1-te-landscape-v2` has 33 short visual shots and a separate outro. The actual ElevenLabs outro request completed successfully on its first attempt, with a 12.20-second recording and six readable caption cues.

Full 1920×1080 render job `bf32cc60-4ec7-4bf3-b79b-0ee54fa63aaa` completed after the stalled-job and memory fixes: [gita-1-1-te-landscape-v2.mp4](data/productions/divine-wisdom/gita-1-1/landscape-v2/gita-1-1-te-landscape-v2.mp4), 4:01, H.264 1920×1080 with AAC, plus SRT/VTT. Sampled frames show correctly shaped Telugu captions. Review finding: because this version crops the existing 9:16 artwork to 16:9, some shots cut off faces (for example, Dhritarashtra's and Sanjaya's heads at about 0:48). Use per-shot framing in Timeline, or import landscape artwork from the saved prompts, before publishing.

An actual worker restart during that render preserved 24 completed scene checkpoints. The same job resumed on attempt 2 and advanced to scene 29 without another voice request. Reopening the project restored its Timeline stage and selected landscape version. [Recovery evidence](data/productions/divine-wisdom/gita-1-1/landscape-v2/recovery-verification.json) and [browser evidence](data/productions/divine-wisdom/gita-1-1/landscape-v2/ui-verification.json) are saved beside the production.

External-model prompts are already saved: [readable timed prompts](data/productions/divine-wisdom/gita-1-1/landscape-v2/frontier-prompts.md) and [JSON prompt pack](data/productions/divine-wisdom/gita-1-1/landscape-v2/visual-prompts.json).

Detailed steps: [manual / automatic production guide](docs/MANUAL-AUTO-WORKFLOW.md).

### Caption shaping, dashboard and job recovery fixes

- **Indic caption shaping.** FFmpeg's `subtitles` filter used libass's simple shaper, so Telugu and Devanagari conjuncts did not form. The renderer now burns captions with `ass=…:shaping=complex` (`worker/render.ts`). A regression test renders a real Telugu frame and checks that complex shaping produces different glyphs from simple shaping.
- **Caption box.** With the background option on, the ASS box takes its colour from OutlineColour, so it was always opaque black. It is now translucent.
- **Prompt aspect and characters.** AI prompts and video requests used the first version's aspect instead of the requested version's, so 16:9 generations were described as vertical. Prompts now also include only the characters assigned to the scene (`lib/prompts.ts`, `lib/jobs.ts`, `worker/index.ts`).
- **Exports going stale.** Every project save marked all of the project's renders stale. That made Episode 001's finished exports disappear from the dashboard count. A render is now stale only when the inputs its own version renders from change (`renderInputs` in `lib/timeline.ts`, `reconcileRenders` in `lib/projects.ts`). The dashboard counts stale full exports as exported videos, and project cards show how many videos each has exported.
- **Jobs stuck at "running".** When a worker froze (here, Docker Desktop's engine hung), BullMQ failed the job as "stalled more than allowable limit" without running the worker's error handler. The database kept saying "running", and Retry refused it. The worker now records queue-level failures, and the recovery loop repairs jobs that are already orphaned (`recordQueueFailure` in `lib/jobs.ts`). Render job `bf32cc60` was repaired this way and retried; it resumed from all 33 saved scene clips.
- **Out-of-memory during composition.** The 33-shot 16:9 render was killed by the Linux OOM killer: FFmpeg reached 3.7 GB in Docker's 8 GB VM, which is shared with other projects' containers. The composition opened every scene clip as a simultaneous input and chained pairwise concat filters. This memory pressure also coincided with both Docker Desktop engine hangs. Cut-only timelines now read clips sequentially through FFmpeg's concat demuxer, and the worker stayed at about 700 MB during the retried composition. Crossfade timelines still use the filter graph. Regression tests cover both paths and audio/video sync across 12 cuts.
- **Known edge case, not fixed:** a render whose scenes are all silent fails in the final pass, because loudnorm emits NaN on pure silence. Episodes with narration are unaffected.

## Manual and automatic workflow

For manual production, choose a language version in Timeline, create its 16:9 shot version, download the timed prompts, generate assets with your chosen external model, upload them in Assets and assign each shot's visual. Review motion/framing, add the outro, generate/upload its voice, review captions, render a draft and export the full MP4.

For automatic production, configure independent providers in AI Providers and choose Hybrid/Automatic in Setup. **Produce / resume** processes the selected version. With review checkpoints enabled, inspect each result and Resume in Jobs. Disable checkpoints for continuation after a completed provider result. Manual per-scene overrides, budgets, generation limits and failure reconciliation still apply.

Paid provider results and provider job IDs are persisted before applying output. Resume uses existing results/polling IDs where available. Unknown submission outcomes require reconciliation rather than silent duplicate spending. Render resume reuses completed normalized clips, not a partially encoded frame. Editing creates a different render snapshot.

## Providers, credentials and MCP

Text, image, video, voice and transcription remain independently configurable, with global defaults and project/scene overrides. Enter keys yourself in the encrypted API key fields. Credentials and job credential snapshots are encrypted; public project/MCP responses omit them. Do not paste keys in chat or commit `.env`.

The local connector URL is `http://localhost:3000/api/mcp`:

```toml
[mcp_servers.story_studio]
url = "http://localhost:3000/api/mcp"
bearer_token_env_var = "STORY_STUDIO_MCP_TOKEN"
```

Set the actual connector token privately, rather than literal placeholder text, and restart the client after an environment change. Cloud clients cannot directly reach your computer's localhost. See [MCP setup](docs/MCP.md).

## Start the existing application

With Docker Desktop running:

```powershell
Set-Location 'D:\Projects\Claude Projects\ai-video-studio'
docker compose up -d
```

Open [Story Studio](http://localhost:3000/) and use your existing owner password. Do not overwrite `.env` or delete the volumes. Manual production does not require provider keys.

After code changes, deploy app and worker together:

```powershell
docker compose build app
docker compose up -d --no-deps app worker
```

Fresh setup, environment values, fonts, migrations and worker operation: [README.md](README.md).

## Checks and schema compatibility

The previous completed production run passed **60 tests in 11 files**, TypeScript/build and real landscape/vertical rendering. The latest focused rerun passed **22 tests** after the audio fix. The full-suite rerun after the caption, staleness and job-recovery fixes passed **80 tests in 15 files**; TypeScript passed; app and worker were rebuilt and deployed. Earlier acceptance/recovery evidence is retained in [the historical audit](docs/COMPLETION-AUDIT.md), without implying fresh live verification of every external provider.

```powershell
npm run typecheck
npm test
```

New timestamp fields are additive JSON fields. Old scenes load with `audioStart=0`, `audioSlice=false`. No SQL migration is required. Deploy both services before saving timestamped shots. Older app versions can strip these fields when saving, so back up before downgrading. The existing limits remain 200 scenes and 20 variants per project; use separate projects for later episodes as the playlist grows.

## Remaining limitations

- Native pronunciation/recitation and editorial interpretations need human review.
- Actual ElevenLabs narration succeeded. Live app text/image/video/transcription adapters, S3, every MCP client brand and production-scale rate limits have not all been verified.
- Stills with FFmpeg motion are distinct from generated video clips. External prompts do not create assets until generation/upload happens.
- The editing monitor does not reproduce the complete audio mix and exact transitions; use a rendered draft.
- The local playlist does not publish or manage a YouTube playlist.
- Render checkpoints need storage retention planning. Media responses currently buffer files; large libraries need further delivery/streaming work.
- Scripture page numbers depend on the edition. Use chapter/verse references without inventing page numbers.

## Implementation map

| Files | Responsibility |
|---|---|
| `components/studio.tsx` | Wizard, editor, prompt/asset/voice/caption controls, timeline and browser resume position |
| `lib/schema.ts` | Document validation and dependency invalidation |
| `lib/production-workflow.ts` | Visual shots, landscape versions, multilingual outro and external AI prompt packs |
| `lib/project-edit.ts` | Independent versions and scene reconciliation |
| `lib/timeline.ts`, `lib/duration.ts` | Scene order, overlaps, captions, timings and duration planning |
| `lib/jobs.ts` | Snapshots, deduplication, spending limits, provider selection and encrypted credentials |
| `worker/index.ts` | Provider output recovery/application and selected-version orchestration |
| `worker/render.ts` | Motion, audio, captions, export validation and durable scene checkpoints |
| `lib/mcp-server.ts` | MCP tools and permission checks |
| `lib/storage.ts`, `lib/security.ts` | Persistent assets, encryption, owner access and safe provider fetching |
| `prisma/schema.prisma` | Owner, connectors, projects, revisions, assets, profiles, templates and jobs |
| `scripts/divine-landscape.ts` | Resumable updated Telugu Episode 001 preparation, narration, render and download |
| `scripts/divine-episode.mjs` | Reusable per-episode pipeline from Episode 002: project creation, paid narration with saved job IDs, shot assembly, 9:16 and 16:9 versions, renders and downloads |

## Episode 002 = Bhagavad Gita 1.2 (in progress)

Project **Divine Wisdom · Bhagavad Gita 1.2** (`4b0ebb3b-d7b5-4dbb-8bc1-bae9616823c2`) has a $10 budget and 50 generation calls. Telugu, Hindi and English scripts follow the same eight sections; section 0 now opens with a hook before the welcome, and the conclusion asks a specific comment question. Scripts: [Telugu](data/productions/divine-wisdom/gita-1-2/script-te.md), [Hindi](data/productions/divine-wisdom/gita-1-2/script-hi.md), [English](data/productions/divine-wisdom/gita-1-2/script-en.md). Thirteen narration batches are prepared (TE 4, HI 4, EN 5). The plan is 10 shots per language, each exported as 9:16 and 16:9 versions that share recordings and captions.

Not yet done: no narration has been generated. The first request was refused before any charge because the project blocks unknown costs; the owner must allow unknown costs in Setup or set a price on the ElevenLabs profile. Eight new images must be generated from [IMAGE-PROMPTS.md](data/productions/divine-wisdom/gita-1-2/IMAGE-PROMPTS.md). Run with `node scripts/divine-episode.mjs data/productions/divine-wisdom/gita-1-2 <generate|assemble|drafts|fulls|download>`.

## Next step

### Bhagavad Gita series introduction

Full export completed and verified: 1920×1080 H.264/AAC, 5:47, 155,983,641 bytes. Entire-file decoding, actual app-browser playback, aligned captions and continuous narrated-scene coverage passed. The preview panel now filters exports by the selected version; removed promotional drafts remain in job history. Focused regression tests, type checking and the production app build passed. No schema migration was needed.

New project `edef3ecc-f6c0-46ae-8ff1-7e31372816b3`, **Divine Wisdom Telugu · భగవద్గీత ఎందుకు? · సిరీస్ పరిచయం**, contains an original researched Telugu introduction with the life-manual analogy, practical examples and a verse-by-verse series invitation. Measured narration is 5:47. The owner explicitly requires only long-form 16:9 content; the promotional version was removed from the active project and no short full export will be made. Production state and the script, illustrations, thumbnail, prompts, description, chapters and verification results are saved in `data/productions/divine-wisdom/gita-series-intro`.

From this production onward, Divine Wisdom captions default on with the approved large Telugu layout and gold spoken-word highlighting. Displayed title/chapter/verse labels need spoken narration; previously approved videos are preserved. YouTube publishing remains manual. The future authorized channel integration plan is in `docs/YOUTUBE-CHANNEL-INTEGRATION-PLAN.md`; uploads, channel access and scheduling are not implemented or verified yet.

### Latest Episode 001 refinement — 2 October 2026

The owner enabled ordinary Telugu captions for the new edition **Divine Wisdom Telugu · 001 / 1.1 · smooth captions · 16:9**, variant `gita-1-1-te-refined-v4`. It uses very gentle eased horizontal pans, large lower-center captions with gold spoken-word highlighting, and an enlarged five-line complete shloka on one calm static background only during recitation. The original 4:08 narration and all previous editions are preserved. No new paid generation was needed for this refinement.

The new edition has an independently editable publishing package, reviewed source reference, actual chapter timestamps and a final Telugu correction/apology line. Production files, job IDs and verification results are in `data/productions/divine-wisdom/gita-1-1/refined-v4`; the reusable description format is `docs/VIDEO-DESCRIPTION-TEMPLATE-TE.md`. Both recreated-v3 and refined-v4 full 1080p MP4s were completed and decoded successfully. Refined-v4 also played successfully in the browser; its enlarged shloka and highlighted captions were visually checked at full resolution. Optional JSON additions do not require a SQL migration. Upgrade app and worker together.

### Current production direction — 2 October 2026

The owner selected logo sample 1 (lotus and book) and requested a recreation of **Episode 001 = Bhagavad Gita 1.1** using the approved original Telugu narration and explanation pattern. The current edition is **Divine Wisdom Telugu · 001 / 1.1 · recreated · 16:9**, variant `gita-1-1-te-recreated-v3`, inside the original project `a39b4823-f4d4-436b-be68-7d6694418d36`.

The current series format supersedes the earlier combined-verse/Shorts production plan: **one shloka per long-form 16:9 video, at most five minutes, no music or musical effects**. Show the selected logo during the spoken welcome, then the title, with a small logo throughout the rest of the video. Use beautiful imaginative devotional visuals for explanation. Keep the exact complete shloka on one calm static background only during its exact recitation, then remove it. Ordinary captions default off; if the owner enables them, use large aligned spoken-word captions. End with subscribe, like, share, and a specific question about what the viewer newly learned.

The recreated video is about **4:08**. Twelve new image prompts and generated assets are saved and editable in the app. Original recordings are reused without shortening or fades at image cuts; the new closing narration was successfully generated with the saved ElevenLabs voice and matched to the original bass/pitch treatment. Previous editions and scenes are preserved. The complete-verse cue and version-specific logo are additive optional JSON fields; no SQL migration is needed. Upgrade the app and worker together before editing these fields.

Production files and resumable state: `data/productions/divine-wisdom/gita-1-1/recreated-v3`. Commands: `scripts/divine-recreate-001.mjs` for production/resume; `node --import tsx scripts/divine-recreate-001-check.mjs draft|full` for real MP4 decoding, timing and preservation checks. The draft MP4 was decoded completely and played successfully in the owner browser; verse display from 1:14.44 to 1:24.84 matches the editor and export. The 1080p export's final verification is recorded in that folder once rendering completes. TypeScript and 38 focused caption/render/MCP checks passed.

Review the latest 16:9 Telugu Episode 001 refinement. Future episodes must follow the owner's updated one-shloka, long-form-only direction. Keep Telugu, Hindi and English equivalent in meaning, with shared reviewed visuals and separate voices/captions; generate only the authorized language versions. Review scripts and narration spending, generate visuals and narration, assemble, review drafts and export. Mark integrations and catalogue entries verified/produced only after actual successful work.
