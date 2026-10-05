import { describe, it, expect } from "vitest";
import {
  acknowledgedOffset,
  privateVideoMetadata,
  publicUpload,
  validUploadSession,
} from "../lib/youtube-policy";
describe("private YouTube uploads", () => {
  it("counts Telugu description bytes, not characters", () => {
    const metadata = {
      title: "భగవద్గీత 1.1",
      description: "త".repeat(1666),
      tags: [],
    };
    expect(() => privateVideoMetadata(metadata)).not.toThrow();
    expect(() =>
      privateVideoMetadata({ ...metadata, description: "త".repeat(1667) }),
    ).toThrow();
  });
  it("cannot publish publicly through injected metadata", () => {
    const result = privateVideoMetadata({
      title: "Test",
      description: "AI illustrations",
      tags: [],
      status: { privacyStatus: "public" },
    });
    expect(result.status.privacyStatus).toBe("private");
    expect(result.status.containsSyntheticMedia).toBe(true);
  });
  it("resumes from the server's byte acknowledgement, including a lost chunk acknowledgement", () => {
    expect(acknowledgedOffset(null, 1000)).toBe(0);
    expect(acknowledgedOffset("bytes=0-511", 1000)).toBe(512);
    expect(acknowledgedOffset("bytes=0-999", 1000)).toBe(1000);
    expect(() => acknowledgedOffset("bytes=0-1000", 1000)).toThrow();
    expect(() => acknowledgedOffset("bytes=8-511", 1000)).toThrow();
  });
  it("rejects upload-session host substitution and hides bearer-like session URLs", () => {
    expect(() =>
      validUploadSession("https://evil.example/upload/youtube/v3/videos"),
    ).toThrow();
    expect(() =>
      validUploadSession(
        "https://www.googleapis.com@evil.example/upload/youtube/v3/videos",
      ),
    ).toThrow();
    expect(
      publicUpload({ encryptedSession: "secret", metadata: {}, id: "upload" }),
    ).not.toHaveProperty("encryptedSession");
  });
  it("counts separators and quotes in tags with spaces", () => {
    expect(() =>
      privateVideoMetadata({
        title: "Test",
        description: "",
        tags: Array(5).fill("a ".repeat(49) + "a"),
      }),
    ).toThrow();
  });
});
