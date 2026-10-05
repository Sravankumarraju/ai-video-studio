import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const state = vi.hoisted(() => ({ find: vi.fn(), consume: vi.fn() }));
vi.mock("../lib/db", () => ({ db: { youtubeConnection: { findUniqueOrThrow: state.find, updateMany: state.consume } } }));
import { finishYoutube } from "../lib/youtube";
describe("YouTube OAuth callback protection", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn()); state.find.mockResolvedValue({ encryptedVerifier: "encrypted", stateHash: createHash("sha256").update("state").digest("hex"), stateExpiresAt: new Date(Date.now() + 60000) }); });
  it("rejects a callback from a different browser cookie without exchanging a code", async () => {
    await expect(finishYoutube("state", "different-state", "code")).rejects.toThrow("Invalid OAuth callback");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects an expired authorization without contacting Google", async () => {
    state.find.mockResolvedValue({ encryptedVerifier: "encrypted", stateHash: createHash("sha256").update("state").digest("hex"), stateExpiresAt: new Date(Date.now() - 1000) });
    await expect(finishYoutube("state", "state", "code")).rejects.toThrow("expired");
    expect(state.consume).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("an atomic state claim rejects a replay/racing callback before token exchange", async () => {
    state.consume.mockResolvedValue({ count: 0 });
    await expect(finishYoutube("state", "state", "code")).rejects.toThrow("already used");
    expect(fetch).not.toHaveBeenCalled();
  });
});
