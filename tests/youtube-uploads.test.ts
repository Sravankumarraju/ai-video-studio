import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ job: vi.fn(), project: vi.fn(), asset: vi.fn(), upsert: vi.fn(), add: vi.fn(), status: vi.fn(), current: vi.fn() }));
vi.mock("../lib/db", () => ({ db: { job: { findUniqueOrThrow: mock.job }, project: { findUniqueOrThrow: mock.project }, asset: { findUniqueOrThrow: mock.asset }, youtubeUpload: { upsert: mock.upsert } } }));
vi.mock("../lib/queue", () => ({ redis: () => ({}) }));
vi.mock("bullmq", () => ({ Queue: class { add = mock.add; } }));
vi.mock("../lib/youtube", () => ({ youtubeStatus: mock.status }));
vi.mock("../lib/projects", () => ({ renderIsCurrent: mock.current }));
vi.mock("../lib/schema", () => ({ projectSchema: { parse: (value: unknown) => value } }));
import { queueYoutubeUpload } from "../lib/youtube-uploads";
const input = { renderJobId: "11111111-1111-4111-8111-111111111111", thumbnailAssetId: "22222222-2222-4222-8222-222222222222", expectedChannelId: "correct-channel", metadata: { title: "Reviewed episode", description: "AI illustrations", tags: [] } };
describe("private upload queue validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.status.mockResolvedValue({ connected: true, channelId: "correct-channel" });
    mock.job.mockResolvedValue({ id: input.renderJobId, projectId: "project", kind: "render", state: "completed", snapshot: { doc: {}, options: { variantId: "approved", draft: false } }, result: { mp4Key: "exports/video.mp4" } });
    mock.project.mockResolvedValue({ document: {} }); mock.current.mockReturnValue(true);
    mock.asset.mockResolvedValue({ id: input.thumbnailAssetId, projectId: "project", kind: "image", mime: "image/jpeg", bytes: 1000 });
  });
  it("does not queue a thumbnail from a different project", async () => {
    mock.asset.mockResolvedValue({ id: input.thumbnailAssetId, projectId: "different-project", kind: "image", mime: "image/jpeg", bytes: 1000 });
    await expect(queueYoutubeUpload(input)).rejects.toThrow("project thumbnail"); expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("does not upload a render whose reviewed inputs have changed", async () => {
    mock.current.mockReturnValue(false);
    await expect(queueYoutubeUpload(input)).rejects.toThrow("outdated"); expect(mock.add).not.toHaveBeenCalled();
  });
  it("cannot queue a different destination channel", async () => {
    await expect(queueYoutubeUpload({ ...input, expectedChannelId: "wrong-channel" })).rejects.toThrow("intended YouTube channel"); expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("repeated requests reuse a completed upload without enqueueing another video", async () => {
    mock.upsert.mockResolvedValue({ id: "saved-upload", state: "completed", videoId: "existing-video", encryptedSession: "secret", metadata: input.metadata });
    const result = await queueYoutubeUpload(input);
    expect(result.videoId).toBe("existing-video"); expect(result).not.toHaveProperty("encryptedSession"); expect(mock.add).not.toHaveBeenCalled();
    expect(mock.upsert.mock.calls[0][0].update).toEqual({});
  });
});
