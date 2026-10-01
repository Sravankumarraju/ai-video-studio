# Review images and create video versions

Open a project and select **3 Prompts**. Choose **Video version to review**, then a scene in the prompt workspace. The scene's saved image appears beside its editable **Saved image prompt**. Prompt text is saved in the project and project revision history; generated asset provenance retains its submitted prompt. Changing prompt text alone does not change the image.

Use **Create new video version** before making independent visual changes. It copies the selected version's resolved scenes, prompts, media, narration, captions, timing and framing into new scene IDs. Earlier versions and downloaded exports remain available. Select a replacement using **Reviewed background image**, or upload media under **Assets**. **Generate image from saved prompt** uses the separately configured image provider and requires paid-generation consent and the existing project limits. Built-in Codex image generation is available in this chat, not as a hidden service in the local web app; app generation needs an image provider profile.

Review the resulting images, then select **Preview & export selected version** and **Draft preview** or **Full export**. Only an export with a completed background job is ready to download. Image-only changes retain voice tracks and captions; narration changes invalidate their dependent timing. Existing scene locks are preserved by version copying.

No schema migration is required: versioned visuals use existing variants, independent scenes, image prompts and durable assets. Backups include these fields and media. Keep the previous MP4 when sharing a new version; existing exports preserve their original saved timelines even when marked stale after later project edits.
