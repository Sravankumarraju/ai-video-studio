# Landscape videos, external AI assets, and resumable production

Start from this project folder with `docker compose up -d`. Open http://localhost:3000 and sign in with your existing owner password. Keep `.env`, the database, Redis and media volumes; do not reset them.

Current Divine Wisdom production preference: long-form 16:9 content only; do not create Shorts or promotional derivatives. Enable the approved large centered Telugu captions with gold spoken-word highlighting. Every new displayed title/chapter/verse label needs corresponding narration. Previous approved editions stay preserved. The series introduction and publishing package are in `data/productions/divine-wisdom/gita-series-intro`; future YouTube integration is planned in `docs/YOUTUBE-CHANNEL-INTEGRATION-PLAN.md`.

## Episode 001 = Bhagavad Gita 1.1

The updated Telugu landscape edition is a new version. Earlier Telugu, Hindi and English videos, assets, prompts and voice recordings remain saved. New landscape artwork can be generated using the exported prompt pack; the first landscape render reuses the existing illustrations with alternating zoom and framing.

## Manual / frontier model workflow

1. Open the project, choose Timeline, and select the language edition you want.
2. Click **New 16:9 version · 8-second shots**. This copies the selected version into independent scenes, divides long sections into equal shots of at most eight seconds, and retains the original voice recordings using source timestamps. It alternates zoom in/out. Existing audio fades and crossfades must be disabled before splitting; the app refuses to silently shorten or fade your narration.
3. Click **Download timed prompts for any AI**. The JSON includes a `metaPrompt` that asks a frontier model to refine the supplied prompts, plus each shot's ID, narration, start/end, aspect ratio, image prompt and video prompt. Generate one distinct asset per shot, using its scene ID as the filename. Keep the supplied scripture speaker and meaning correct. Chapter 1.1 is Dhritarashtra speaking to Sanjaya.
4. Use any image/video model you choose outside the app. Ask for 16:9 illustrations without text, watermarks, logos or captions. For video, check that provider's clip length limits; choose freeze/loop/trim explicitly if necessary.
5. Upload the results in **Assets**. In Timeline select each shot and choose its **Image / video for this shot**. Edit and save the image/video prompt there. Changing a visual preserves the audio ID, recording timestamp, volume and captions. Choose a motion preset and strength for still images. Video clips retain their own motion.
6. Click **Add subscribe / like / comment** to append an editable outro in the project's language. Edit its narration, voice ID and image. Generate its voice take, or upload narration, then rebuild/review captions. The scene asks viewers what they learned today, to like, and to subscribe. It is a separate scene so it never replaces the scripture recording.
7. Generate a draft in **Preview & exports**, review it, then render the full MP4. A full landscape export is 1920×1080, H.264 video and AAC audio. The editing monitor is a timing/framing view; the exported draft is the authority for sound and transitions.

## Different audio with timestamps

Each scene supports its own voice ID, provider override, recorded takes and source timestamp. In Timeline, **Recording start timestamp (seconds)** chooses the start in the source recording. Scene duration chooses how much is used. The player starts at this source timestamp. New generated/uploaded recordings reset the offset to zero. Previously imported recordings remain in Assets and can be reassigned.

Changing a recording or its timestamp invalidates unchanged captions; review or rebuild timing before export. For a sliced source recording, use manually timed captions for the audible slice, or generate a new scene recording with fresh alignment. Do not transcribe the entire long source and assume those captions match one slice. Different voice takes may change duration; inspect the timeline and regenerate only affected material. Keep project and subtitle language appropriate to the edition before generating voice or captions.

Narration gain is preserved when changing images. Disabled audio fades now omit FFmpeg's fade filter entirely: `afade=d=0` previously still applied a default sample-count fade, reducing voice level after cuts. Audio is normalized once across the complete mix, rather than independently at every scene. Explicit nonzero fades, mute, scene volume and background music remain available.

## Automatic AI / resume

Configure text, image, video, voice and transcription profiles independently in **AI Providers**. Enter API keys yourself in their encrypted key fields. Configure model IDs and costs that your provider actually supports. This feature does not claim an unconfigured or untested live integration works.

Select the intended output variant, choose Hybrid or Automatic in Setup, and use **Produce / resume**. The runner works through only that selected variant. It preserves present assets and recordings, regenerates stale narration, and pauses for missing manual inputs or stale captions. With review checkpoints enabled, inspect each result and Resume its automatic job from **Usage & jobs**. Disable review checkpoints for automatic continuation after a completed provider result. Budgets, generation limits and manual per-scene overrides still apply; a provider error stops that production and appears in Jobs.

Every provider result and provider job ID is persisted before importing or applying its output. Resume uses saved results and saved polling IDs. A submission with an unknown outcome still requires reconciliation rather than silently charging again. Browser closure does not stop the worker. On restart Redis/database recovery requeues interrupted work.

Rendering now saves normalized scene clips in media storage. Resume of the **same render job** validates and reuses completed clips. An unfinished scene is rendered again; composition, audio mix and final caption burn restart when necessary. Editing the project creates a new render snapshot, so a new version cannot accidentally reuse incompatible checkpoints. Cached render clips consume media storage; keep them until the job no longer needs resume. They are not a new paid provider request.

The app also remembers your editor stage, selected variant and scene in this browser. Stage checkmarks, projects, assets and jobs remain in persistent storage across browser/device sessions. Reopen the project and inspect Jobs to resume on another device.

## Compatibility and checks

### Complete shloka cards and edition branding

In the caption editor, enable **Keep complete verse on screen during this cue** for the exact recitation interval. This uses `display: "full-verse"`: all authored lines stay together, centered, for that cue's start/end times, without pagination or word highlighting. It remains visible when ordinary captions are off. Use a static calm background and split the explanation into a separate scene after recitation. Normal spoken captions remain controlled by the edition's Captions switch.

**Logo for this version** and **Show corner logo after (seconds)** affect the selected edition. A version without `logoId` inherits the original project logo; `null` disables it. A full-screen logo clip can accompany the spoken welcome, followed by the title card. Start the corner logo after the welcome to avoid duplicating the full-screen mark. Backup import remaps edition logos as well as project logos.

These optional JSON fields require no SQL migration. Upgrade the app and worker together. Older builds can strip the fields when saving a project, so export a backup before downgrading. Existing scenes, recordings, projects and provider profiles are preserved.

### Smooth camera movement, Telugu captions and descriptions

Choose a gentle pan with low strength (about 0.025) and **Camera movement → Smooth start and stop**. The optional `motionEasing: "smooth"` uses eased progress and four-times supersampling to reduce small coordinate steps; linear motion remains the legacy default. The editing monitor uses the same easing curve as exports. Keep scripture-reading and title cards static.

Enable **Burn captions into video** and **Highlight the word being spoken** for aligned narration. Caption pages and the selected highlight color now match between the editing monitor and renderer. Use **Caption height above bottom (%)** to lift captions into the lower center. The refined Telugu Episode 001 uses 96px text at 1080p, a dark translucent background for ordinary captions, gold highlights, and 12% bottom clearance. Full shlokas retain authored line breaks in a separate centered, outlined style without caption boxes or pagination.

The Publishing page has a **Publishing version** selector. Its description, title options, chapters and hashtags are saved per edition; editions without a package inherit the project package. Editing descriptions does not invalidate MP4s. Metadata generation now writes to the selected edition when scoped to a version; live paid metadata generation has not been tested for this change. [VIDEO-DESCRIPTION-TEMPLATE-TE.md](VIDEO-DESCRIPTION-TEMPLATE-TE.md) contains the reusable Telugu format and final correction/apology paragraph. Descriptions do not publish automatically.

These are additive optional JSON fields (`motionEasing`, `captionBottom`, `publishing`, `encodingPreset`), without a SQL migration. The refined edition reuses approved assets and narration and uses the fast H.264 preset at the same saved CRF; previous editions retain their encoding settings. App and worker must be upgraded together.

This is an additive document-schema change: old scenes load with `audioStart=0` and `audioSlice=false`. No SQL migration or asset conversion is required. Deploy the updated app and worker together before saving timestamped shots. Older app versions do not understand these fields and can strip them on save; back up the project before downgrading. The existing 200-scene / 20-variant per-project limits still apply; use separate episode projects as your playlist grows.

Run `npm run typecheck` and `npm test`. Regression checks exercise real H.264/AAC rendering, zero-fade audio levels across image cuts, durable scene checkpoint reuse after interruption, source ranges, caption clipping, independent versions, image replacement preservation, prompt packs and multilingual calls to action.
