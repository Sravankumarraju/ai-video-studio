# Story Studio

A private, single-owner video studio for Telugu, Hindi and English stories. Next.js/TypeScript provides the studio and protected API; PostgreSQL stores projects, revisions, assets, profiles and job records; BullMQ/Redis coordinates a separate FFmpeg worker. Manual production works without AI credentials.

Connect a compatible AI client from **MCP Connectors** to let its chosen model write scripts, edit scenes, import media, render variants and download MP4s. HTTP and desktop stdio setup, separate permissions and cloud compatibility limits are in [docs/MCP.md](docs/MCP.md). Paid generation is a separate opt-in permission; providers remain independently configured.

## Start locally

Use Node.js 22.12+ or 24, Docker Desktop, FFmpeg and ffprobe on PATH. The complete container setup includes FFmpeg and fonts, so host FFmpeg is only needed for running the app outside containers.

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set `ENCRYPTION_KEY` to the generated 64-character hex value. Generate a separate random value for `SESSION_SECRET`. Set a unique `OWNER_PASSWORD` with at least 12 characters. Keep `.env` private. There are no provider keys required for setup. Set `APP_ORIGIN` to the exact browser origin.

```powershell
docker compose up --build -d
docker compose exec app npm run sample
```

Open [Story Studio](http://localhost:3000) and sign in with your `OWNER_PASSWORD`. The labeled demo contains an original geometric illustration and a quiet calibration tone, **not generated narration**. Replace the tone with uploaded narration. Compose persists database, queue and media in named volumes.

For development, run these in separate terminals:

```powershell
npm ci
docker compose up -d db redis
npm run db:generate
npm run db:migrate
npm run sample
npm run dev
```

```powershell
npm run worker
```

Dedicated development ports are PostgreSQL `55432`, Redis `56379` and application `3000`. Change `POSTGRES_PORT`, `REDIS_PORT` and the matching host URLs when necessary. Container service URLs are set by Compose. To stop services without removing your data: `docker compose stop`.

## Produce a manual video

The New Project wizard requires target video length in minutes and seconds, with presets of 30, 60, 90 seconds and 3, 5, 10 minutes plus Custom. Long videos and Shorts/Reels have separate targets. Each saved output variant can override its target independently. These are planning goals, distinct from provider clip limits and platform warning limits.

Timeline shows target length, actual overlap-adjusted duration and measured narration. Accept the actual duration, adjust scene timing/pauses, or shorten/expand the selected variant's narration and regenerate its affected recordings. Rewrite and narration jobs require explicit paid confirmation. Uploaded narration is also supported. Voice audio is never sped up to force the target. Existing projects load unchanged; missing variant targets inherit the project's long/short target. No database migration is needed for these backward-compatible JSON fields.

1. Create a project, choose language, output formats and **manual** mode.
2. Paste a script. Separate paragraphs become editable scenes, or add scenes yourself. Review sources and devotional account classification.
3. Upload PNG/JPEG/WebP images or MP4/WebM clips. Assign every file to a scene explicitly. Bulk uploads do not guess destinations.
4. Upload MP3/WAV narration per scene. Use measured duration. If you change narration, review/regenerate the dependent recording and captions.
5. Add/edit phrase captions, or paste translated captions while preserving their timing. Approximate phrases are explicitly labeled. Review stale timing before exporting.
6. Choose motion, transitions, clip policy, focal points, volume and fades in Timeline. Select music, ducking, effects and overlays. Each output variant can have its own timing and framing.
7. Queue a draft in Preview & exports. The playable rendered draft is the authoritative preview. Queue a full export, then download MP4/SRT/WebVTT. Completed exports remain available when a new revision marks them stale.

Exports use H.264/AAC, 48 kHz stereo, configurable frame rate, CRF and bitrate ceiling. Full targets are 1920×1080 and 1080×1920. Drafts are 640×360 and 360×640. Crossfade overlap is subtracted from the timeline, and final duration/resolution/codecs/file size are checked with ffprobe before success.

## AI setup

In AI Providers, create independent profiles for script, image, video, voice and transcription. Multiple profiles may use the same provider with different encrypted keys. Defaults, project overrides and scene overrides are independent. Changing a profile does not remove assets. Each queued job freezes provider configuration and an encrypted credential snapshot.

Adapters included:

- ZenMux: OpenAI-compatible chat/images/transcription plus **native** `POST /videos`, `GET /videos/{id}`.
- OpenAI-compatible: chat completions, images, and verbose JSON transcription. Enable only endpoints your provider/model actually supports.
- ElevenLabs: model and voice discovery, language validation, scene narration, character timestamps and phrase/word alignment.

Check without generation only lists models where supported. It does not prove that a model supports a generation endpoint. Manual model entry is available. The separate paid test requires an explicit action and is subject to project cost policy. Unknown pricing defaults to **block**. Allow it deliberately or enter estimated per-call pricing. Estimates are not billing guarantees; provider-reported costs are recorded where returned.

Automatic mode queues script/storyboard, then missing visuals and narration, and ends in a draft preview. With review checkpoints enabled, continue in Usage & jobs after reviewing each stage. With checkpoints disabled, the worker advances after completed child jobs. Hybrid scene input overrides can pause for uploads. Press Reload in the project after a job completes to load its applied output. Editing while a generation runs preserves the new project revision and saves the generated asset for manual assignment.

No live provider calls were made during implementation. Integrations were checked with isolated contract fixtures. Configure real credentials and explicitly authorize paid tests to verify your account, selected models and credit limits.

Official references checked September 30, 2026:

- [ZenMux quickstart](https://zenmux.ai/docs/guide/quickstart)
- [ZenMux image generation](https://zenmux.ai/docs/api/openai/generate-an-image.html)
- [ZenMux native video generation](https://zenmux.ai/docs/api/zenmux/generate-videos-native.html)
- [ElevenLabs speech with timing](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- [ElevenLabs model language coverage](https://elevenlabs.io/docs/overview/models)

The documented Seedance native model has a 10-second limit; its slug is accepted as manual input rather than advertised as available to every account. Other model identifiers and parameters must come from discovery or official model documentation. ElevenLabs language support is checked dynamically; Telugu is not assumed for every model.

## Hosting and security

The app and worker need the same PostgreSQL, Redis, encryption key and media storage. Run the worker on a persistent container/VM with FFmpeg, ffprobe, libass, HarfBuzz and fonts, enough CPU/RAM/disk for your video durations, and graceful shutdown. Rendering never runs inside a request handler. Short-lived serverless functions cannot replace this worker.

The owner session is signed, expiring, HttpOnly and SameSite=Strict. HTTPS origins get Secure cookies. Login attempts are rate limited. Provider calls happen server-side. Keys use AES-256-GCM, are masked in profile responses, omitted from job responses, and excluded from portable project exports. Keep `ENCRYPTION_KEY` backed up; changing it without re-encrypting stored profiles and job credentials makes those secrets unreadable.

Provider base URLs and downloads require public HTTPS destinations. DNS answers are checked and pinned to the actual socket; redirects, private/reserved IPs, URL credentials and unbounded responses are blocked. `ALLOW_LOCAL_PROVIDERS=true` is an explicit development-only escape hatch and has no effect in production. API requests validate structured inputs; uploads have a configurable byte limit, signature checking and ffprobe inspection. FFmpeg receives argument arrays. Temporary cleanup checks its resolved directory before removing it.

For S3-compatible storage set `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Objects stay private and are served through authenticated endpoints. S3 code is implemented but not live verified. Local disk storage requires a shared persistent volume for app/worker. Back up PostgreSQL, media and encryption configuration separately. Portable project backup includes editable structure and media, but deliberately excludes provider credentials and bindings.

## Verification

```powershell
npm run typecheck
npm test
npm run build
npm audit
```

With app, database and worker running:

```powershell
npm run test:acceptance
```

Stop the normal worker before the recovery test; it manages its own workers and deliberately kills one:

```powershell
npm run test:recovery
```

Generated fixtures and reports go under ignored `test-output/`. The API acceptance script creates clearly labeled test projects and isolated profile keys, and removes its test provider profiles. It resets global defaults, so run it against a development database. Do not run it against your working production studio. Rendering tests synthesize their own media and never call AI providers.

See [architecture](docs/ARCHITECTURE.md), [adapter guide](docs/PROVIDERS.md) and [verification report](docs/VERIFICATION.md) for implementation detail and limits.
