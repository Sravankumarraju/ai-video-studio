# Private YouTube uploads

Story Studio now has a separate owner-authenticated YouTube connection and resumable upload worker. Text, image, video, voice and transcription profiles remain independent. Existing projects, media, provider secrets and renders are preserved.

## Start

Run `docker compose build app`, then `docker compose up -d app worker youtube-worker`. The upload worker applies the additive Prisma migration; no reset or reseed is needed. During an existing render, deploy only `app youtube-worker` with `--no-deps` so the render worker stays running.

Open **YouTube uploads**. Import a Google OAuth **web-client** JSON privately, with `http://localhost:3000/api/youtube/callback` registered (or your HTTPS APP_ORIGIN followed by `/api/youtube/callback`). Enable YouTube Data API v3 in that Google Cloud project. If the OAuth app is in testing, add your Google account as a test user. Click **Connect Google account**, complete Google consent, and check the displayed channel name and ID.

Open a video's **Publishing** tab. Select a completed full render, a project thumbnail in JPEG/PNG below 2 MB, title, description and comma-separated SEO tags. Uploads are always **Private**, subscribers are not notified, and synthetic media is declared. Uploading is explicitly separate from rendering. The description supports at most 5,000 UTF-8 bytes; Telugu uses multiple bytes per character. Include source links, hashtags, an AI illustration/narration disclosure and a final correction/apology note.

## Persistence and recovery

Google client secrets, refresh/access tokens, PKCE verifiers and resumable-session URLs are encrypted using the existing ENCRYPTION_KEY. Keep that key when migrating/backing up the database. Tokens and session URLs are excluded from API responses and logs. OAuth state is bound to an HttpOnly SameSite=Lax cookie, expires after ten minutes and can only be consumed once. Starting authorization requires the signed-in owner session. The Google callback uses the owner-initiated state cookie, stored state hash and PKCE verification because the regular owner's SameSite=Strict cookie is omitted on Google's cross-site redirect. All other YouTube endpoints require the regular owner session. Complete authorization in the browser that started it; copying a callback URL into another browser cannot transfer its state cookie.

Upload metadata is frozen when queued. A unique render/channel pair prevents the same rendered file from being queued twice. The worker streams 8 MiB chunks from local media, queries Google's saved offset on restart, saves the returned video ID before applying the thumbnail, and verifies the channel and Private status through the actual API. Retrying thumbnail/verification work reuses the existing video ID. Stop preserves progress and an already uploaded private video. It does not delete channel videos.

An interrupted session-creation acknowledgement or expired session is marked **needs-review**. It is not automatically restarted because this could duplicate a video. Inspect YouTube Studio before deciding to initiate another upload. For a failed upload with a saved session/video ID, use **Resume existing upload**. Changing the connected channel stops jobs intended for another channel. Disconnect is blocked during active uploads.

`YoutubeConnection` and `YoutubeUpload` are additive tables; no project/document schema migration is required. They retain upload records independently of project editing. Database and media backups are still required. With S3 storage, the existing materialization adapter downloads the source before upload; provision enough disk space and memory for that adapter.

## Live verification

Code checks and local queue/security checks are not proof of Google authorization or a successful upload. Only actual authorized API responses verify the channel, upload, thumbnail and Private visibility. YouTube processing may continue after upload; its reported processing state is shown in the history. Custom thumbnails may require channel verification. API/OAuth quota or access failures are shown without leaking credentials.

References: [YouTube resumable uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol), [video metadata](https://developers.google.com/youtube/v3/docs/videos), [upload endpoint](https://developers.google.com/youtube/v3/docs/videos/insert).
