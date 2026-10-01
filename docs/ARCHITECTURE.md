# Architecture

## Implementation sequence

1. Empty repository inspected; owner access, Prisma migration, versioned project documents, profiles and manual inputs created.
2. Local/S3 storage adapters, inspected uploads and independent FFmpeg rendering added.
3. OpenAI-compatible text/images/transcription and ElevenLabs speech/timestamps implemented with isolated contracts.
4. Native ZenMux async video polling and automatic stage orchestration added.
5. Timeline variants, captions, stale dependencies, budgets, retries, cancellation, browser QA and worker recovery verification added.

## Boundaries

`components/studio.tsx` handles interaction, state, autosave and undo/redo. It never imports provider transport or credentials. `app/api/[...path]/route.ts` authenticates and validates, stores edits/assets/settings, and creates jobs. It does not render or wait for AI generation. `lib/providers.ts` registers capability adapters; `lib/storage.ts` isolates storage; `lib/prompts.ts` expands versioned instructions. `lib/timeline.ts` is the shared timing authority. `worker/index.ts` consumes persistent jobs, applies outputs with revision checks, and orchestrates stages. `worker/render.ts` normalizes/composes/renders/validates selected media.

## MCP

`lib/mcp-server.ts` exposes the editor's project schema and saved revisions through the official MCP SDK. `/api/mcp` is a stateless authenticated Streamable HTTP endpoint; `scripts/mcp-bridge.mjs` proxies it for stdio clients. `McpConnection` stores only token digests and read/edit/render/generate permissions. Every tool rechecks revocation and permission, while token administration requires the owner session. The connector reuses project saves, the existing upload pipeline and background queue. File access is limited to authenticated assets and render exports. It exposes no credential administration, shell or arbitrary filesystem tool. See [MCP.md](MCP.md) for compatibility and setup.

## Persistence

Relational tables hold owner defaults, provider profiles, prompt templates/history, projects/revisions, assets and jobs. Versioned JSON project documents hold language settings, scripts, outlines, source classification, characters, stable scene IDs, dialogue notes, asset/narration selections, captions, prompt overrides, variants and publishing metadata. This intentionally keeps a single project revision atomic instead of scattering autosave across dozens of small tables. PostgreSQL migrations version the relational structure; `schemaVersion` versions portable documents. Future breaking changes must add an explicit document upgrader before parsing.

Scene deletion does not delete assets. Project duplication copies media bytes and remaps IDs. Scene alternatives retain prior visual assets; narration versions remain in the asset library. Every project save captures the previous document revision. Template saves capture prior template content. Restoring creates a new revision rather than changing history.

## Jobs and reconciliation

PostgreSQL job creation is an outbox. Worker recovery adds missing queued/running job IDs back to BullMQ. Redis AOF and named storage survive restarts. BullMQ leases recover stalled work. Profile concurrency uses expiring job leases shared across workers. Paid requests are marked submitted before the network call; native video IDs are persisted before polling. Completed response text/URLs or returned bytes are checkpointed before import/application. Assets retain job ID, profile ID, model, prompt, supported settings, timestamp and alignment, never the credential.

Job states include queued, running, waiting-for-input, completed, failed, cancelled and stale. Progress uses real named stages; there is no fabricated percentage. Retries use bounded exponential backoff. Known rejections such as 429 can retry; an ambiguous submission without a provider ID or saved output requires owner reconciliation. Supply its provider ID where possible. An explicitly authorized new attempt can incur another charge. Cancellation stops new local work and terminates active FFmpeg. It cannot guarantee provider cancellation or refunds.

Budget/call limits are checked while holding the project row lock. Known pending costs reserve budget. Unknown costs require a saved allow policy. Provider results can report actual cost; otherwise billing remains unknown or estimated. Defaults never silently switch to another provider.

Generation application compares the captured project revision. If the project changed, the output is saved without overwriting edits. Completed render jobs are marked stale after edits; old files remain downloadable. Narration edits flag recordings and captions; audio replacements flag unchanged caption timing. Users explicitly review or regenerate dependencies.

## Preview/render contract

Variants save scene inclusion/order, independent scene overrides, framing, aspect, caption appearance, frame rate and render settings. Shared timeline calculations subtract overlap and offset scene-relative captions. The editing monitor shows scene/caption timing and image motion; a rendered draft is the authoritative audio, transition, framing and caption preview. Export reuses the same renderer, with different resolution/quality settings.

Each scene is normalized to matching dimensions/fps/time base and 48 kHz stereo. Short video policies are explicit: reject, freeze, loop, or apply a duration trim. Images use overscaled zoom/pan without exposing blank edges. Narration uses loudness normalization and optional volume/fades/mute. Crossfades overlap visual and audio tracks. Music is looped and faded, with sidechain ducking. Effects are delayed to their timeline positions. libass/HarfBuzz with Noto fonts shapes exported captions; browser fonts shape editing captions separately. MP4 success requires storage availability, H.264/AAC, expected dimensions and measured duration within tolerance.

## Operational limits

This is a single-owner deployment. Media delivery buffers objects and supports byte ranges; it is practical for personal projects but should become streaming/range-backed storage for very large libraries. Portable JSON backups include base64 assets and are bounded on import by the configured upload limit. Long renders consume significant CPU and intermediate disk. Crash-orphaned temporary directories are not yet reclaimed automatically. Deploy behind HTTPS, keep worker credentials private, and monitor persistent disk usage.
