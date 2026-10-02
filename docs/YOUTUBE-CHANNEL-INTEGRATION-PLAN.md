# Divine Wisdom publishing plan

Current delivery is a reviewed local publishing package: playable MP4, subtitle files, title options, full description, timestamped chapters, thumbnail and editable image/thumbnail prompts. The owner publishes to YouTube manually. No upload integration or channel access is currently verified.

When the owner supplies channel details, first confirm channel identity and the desired Telugu, Hindi and English organization. Connect through Google OAuth; keep refresh tokens encrypted on the server, independently of generation-provider credentials. Request only the permissions needed for the authorized actions. Never put passwords or keys in video prompts or source files.

Implement resumable background uploads with saved YouTube video IDs, upload progress, clear retry/cancel behavior and prevention of duplicate publishing. Review the actual MP4, title, description, chapters, thumbnail, language, audience and visibility before publishing. Default initial uploads to private for review; public publishing, scheduling, playlist changes and viewer replies require explicit owner instructions.

Planned modules: channel identity/settings, per-language playlists, upload jobs, thumbnail upload, subtitle upload, scheduling, publishing history and read-only performance reports. Comments may be reviewed and reply drafts prepared; do not automatically post replies. Community posts depend on the supported capabilities of the chosen connector and must be checked before promising automation.

Verify current YouTube API documentation, OAuth requirements, quotas and upload restrictions at implementation time. Mark actual channel operations verified only after authorized calls succeed. Preserve existing Story Studio projects, provider profiles, assets, manual export/download workflows and persisted job state.

Production rule from this series introduction onward: all displayed chapter/verse/title cards need corresponding spoken narration. Show exact scripture only during exact recitation. Captions are enabled by default for Divine Wisdom productions, using the approved large centered Telugu layout and spoken-word highlighting. Do not rerender approved older editions solely to add title narration.

The owner explicitly requires only long-form 16:9 videos. Do not automatically create Shorts, short-duration promotional cuts or vertical derivatives. Existing older projects remain preserved.
