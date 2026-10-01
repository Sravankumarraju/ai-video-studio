# Story Studio MCP connector

Owners can enable or disable paid generation on an existing active connection in **MCP Connectors → Connections**. The permission button preserves the token and all other scopes. Revoked connections cannot be reactivated this way. Changes apply to subsequent tool calls without restarting the client. Project spending policies and explicit consent for each requested generation still apply. No database migration is required.

Open Story Studio → **MCP Connectors**, name your client, choose its permissions and create a token. Copy it immediately: the database stores only a SHA-256 digest, and the token is never returned again. Revoke a connection from this screen to disable its next request immediately. Each client should have its own token. The connector token is separate from the owner password and from all AI provider API keys.

## Desktop and HTTP clients

The Streamable HTTP endpoint is `http://localhost:3000/api/mcp`. Configure `Authorization: Bearer <your connector token>` in a client that supports custom bearer headers. The endpoint is stateless and returns JSON; it does not need persistent SSE connections. The host and any Origin header must match `APP_ORIGIN`.

For Codex, set `STORY_STUDIO_MCP_TOKEN` in the environment used to start the client, then add this to its `config.toml`:

```toml
[mcp_servers.story_studio]
url = "http://localhost:3000/api/mcp"
bearer_token_env_var = "STORY_STUDIO_MCP_TOKEN"
```

For Claude Desktop, Cursor and other clients that accept stdio servers, configure the included bridge. Install Node.js and run `npm ci` in this repository first if dependencies are missing. Use an absolute path to the bridge on your machine:

```json
{
  "mcpServers": {
    "story-studio": {
      "command": "node",
      "args": ["D:/Projects/Claude Projects/ai-video-studio/scripts/mcp-bridge.mjs"],
      "env": {
        "STORY_STUDIO_MCP_URL": "http://localhost:3000/api/mcp",
        "STORY_STUDIO_MCP_TOKEN": "<your connector token>"
      }
    }
  }
}
```

The bridge uses the HTTP endpoint; the app and worker must remain running. It exposes only MCP tools, resources and prompts, writes diagnostics to stderr, and does not expose a shell or direct filesystem access. Protect the client's configuration file and never commit a real token.

Models use MCP through their host client. The connector is independent of which model you choose there. Compatibility is with MCP clients, not a guarantee that every model service accepts an MCP URL. Cloud clients cannot access localhost: deploy the complete app behind HTTPS and configure its public `APP_ORIGIN` before connecting remotely. Clients that require OAuth need an OAuth gateway; this application currently implements owner-issued bearer authentication, not OAuth. No cloud deployment or tunnel is automatically created.

## Permissions and tools

| Permission | Tools |
| --- | --- |
| read | `list_projects`, `get_project`, `list_provider_profiles`, `get_job`, `list_jobs`, `get_exports`, file downloads, workflow resource and prompt |
| edit | `create_project`, `update_project`, `upsert_scene`, `create_variant`, `import_asset` |
| render | `queue_render` |
| generate | `queue_generation` |

The default read/edit/render permissions let an agent write scripts, create scenes, assemble real uploaded images and narration, apply motion, edit captions, render variants and download MP4s without buying AI generation. They grant access across this personal owner's workspace. There is no project-specific scope in this version.

`get_project` returns the document, asset IDs and latest revision. Saves require `expectedRevision`; conflicts return a tool error so the agent can reload and merge. `upsert_scene` changes only supplied fields. `update_project` replaces the complete document: preserve unrelated fields. Both use the existing editor's version history, locks and dependency invalidation. Media references must belong to the project, including references inside variant overrides. The connector does not delete projects or media. Add variants after creating scene IDs; variant selections are explicit.

`import_asset` accepts exactly one public HTTPS URL or base64 payload, up to 8 MiB. It uses the same signature detection, probing and persistent storage as manual uploads. Remote URLs use bounded, DNS-pinned requests with private destinations and redirects blocked. For larger clips, use the editor's upload control. Importing media does not assign it automatically: patch a scene's `assetId` / `audioId` afterward. Imported calibration fixtures are test media, not synthesized narration.

Text, image, video, voice and transcription provider profiles remain independent. `list_provider_profiles` returns only public configuration and verification state; keys remain encrypted on the server. Paid generation requires a separately granted generate permission and `paidConfirmed: true` for each call. The client must obtain explicit consent for the requested spend. Existing budget, generation count and unknown-cost checks still apply. Clients cannot change a saved project's spending limits. New connector-created projects are capped at $10 and 50 generations and block unknown costs; the owner can change these limits in the manual editor.

`queue_render` defaults to a draft. Set `draft: false` for full landscape/vertical exports. Poll `get_job` for actual state/stage; MCP requests do not wait for rendering. `get_exports` returns MP4/SRT/VTT URLs only for completed or stale render jobs. Downloads require the same bearer token with read permission, or the owner's signed-in browser session. Links never include credentials. Range requests are supported for playback; stale exports are labeled.

Try: **“Use Story Studio to create a video from my brief. Write the script and scenes, use my uploaded media, apply motion and captions, render landscape and vertical MP4s, and show me the downloads. Ask before spending on a provider.”**

## Migration, startup and verification

The additive `202610010001_mcp` migration creates `McpConnection`; it does not rewrite existing project documents, assets or provider profiles. Existing project schema version 1 remains compatible.

```sh
docker compose build app
docker compose up -d --no-build
```

Both app and worker apply pending migrations at startup. Open `http://localhost:3000/`, sign in and choose **MCP Connectors**. For local source development, run `npm run db:migrate`, `npm run dev` and `npm run worker` as described in the README.

```sh
npm run typecheck
npm test -- --configLoader native
docker compose exec -T app npm run test:mcp
```

The MCP acceptance script creates labeled test projects and revokes its temporary tokens. It uses the official SDK over HTTP and the actual stdio bridge, imports original image/audio fixtures, edits motion/captions, renders full 1920×1080 and 1080×1920 H.264/AAC files, downloads and probes them, checks subtitles/ranges, validates missing credentials and foreign Origin rejection, rejects stale revisions/read-only edits/paid calls, checks token redaction and immediate revocation, and verifies existing project revisions remain unchanged. Artifacts and the report are saved to the app container's `/app/test-output` (copy out with `docker compose cp`). It makes no paid provider calls.

Verified SDK and bridge behavior does not verify each third-party client UI or any live AI provider. OAuth-only cloud clients and live generation remain unverified/unsupported as described above.
