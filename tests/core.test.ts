import "dotenv/config";
import { describe, it, expect } from "vitest";
import {
  projectSchema,
  newScene,
  variantSchema,
  invalidate,
  providerSchema,
} from "../lib/schema";
import {
  timeline,
  duration,
  subtitleFile,
  approximateCaptions,
} from "../lib/timeline";
import {
  encrypt,
  decrypt,
  sessionToken,
  authorized,
  safeUrl,
} from "../lib/security";
import { expandPrompt } from "../lib/prompts";
import { validateStructure } from "../lib/projects";
import { portableDocument, remapMedia, safeProvenance } from "../lib/backup";
function fixture() {
  const scenes = [
    { ...newScene(), duration: 5 },
    {
      ...newScene(2),
      duration: 4,
      transition: "crossfade" as const,
      overlap: 0.5,
    },
  ];
  const variant = variantSchema.parse({
    id: crypto.randomUUID(),
    name: "Test",
    aspect: "landscape",
    sceneIds: scenes.map((s) => s.id),
  });
  return projectSchema.parse({ title: "Test", scenes, variants: [variant] });
}
describe("shared timing and project safety", () => {
  it("remaps portable media in both base scenes and independent variants once", () => {
    const d = fixture();
    d.providers = { image: "secret-profile" };
    d.scenes[0].assetId = "old-image";
    d.scenes[0].audioId = "old-audio";
    d.scenes[0].providers = { voice: "private-profile" };
    d.variants[0].sceneOverrides[d.scenes[0].id] = {
      ...d.scenes[0],
      alternatives: ["old-image"],
    };
    const result = remapMedia(portableDocument(d), {
      "old-image": "new-image",
      "old-audio": "new-audio",
    });
    expect(result.scenes[0].assetId).toBe("new-image");
    expect(result.scenes[0].audioId).toBe("new-audio");
    expect(
      result.variants[0].sceneOverrides[d.scenes[0].id].alternatives,
    ).toEqual(["new-image"]);
    expect(result.providers).toEqual({});
    expect(result.variants[0].sceneOverrides[d.scenes[0].id].providers).toEqual(
      {},
    );
    expect(d.scenes[0].assetId).toBe("old-image");
  });
  it("exports provenance without credentials or secret parameters", () => {
    expect(
      safeProvenance({
        model: "test",
        encryptedKey: "private",
        parameters: { temperature: 0.5, api_key: "private" },
        prompt: "Scene",
      }),
    ).toEqual({
      model: "test",
      parameters: { temperature: 0.5 },
      prompt: "Scene",
    });
  });
  it("invalidates narration edits in variant overrides without changing the base timeline", () => {
    const old = fixture();
    old.variants[0].sceneOverrides[old.scenes[0].id] = {
      ...old.scenes[0],
      audioId: "audio",
      narration: "Before",
    };
    const next = structuredClone(old);
    next.variants[0].sceneOverrides[old.scenes[0].id].narration = "After";
    const result = invalidate(old, next);
    expect(
      result.variants[0].sceneOverrides[old.scenes[0].id].narrationStale,
    ).toBe(true);
    expect(result.scenes[0].narrationStale).toBe(false);
  });
  it("subtracts transition overlap exactly once", () => {
    const d = fixture();
    expect(duration(d, d.variants[0])).toBe(8.5);
    expect(timeline(d, d.variants[0])[1].start).toBe(4.5);
  });
  it("invalidates narration/captions while preserving old media and locked scenes", () => {
    const old = fixture();
    old.scenes[0] = {
      ...old.scenes[0],
      audioId: "audio-1",
      captions: [
        { id: "caption-1", start: 0, end: 2, text: "Old", accuracy: "manual" },
      ],
    };
    old.scenes[1].locked = true;
    const next = structuredClone(old);
    next.scenes[0].narration = "Changed";
    const applied = invalidate(old, next);
    expect(applied.scenes[0].narrationStale).toBe(true);
    expect(applied.scenes[0].captionsStale).toBe(true);
    expect(applied.scenes[0].audioId).toBe("audio-1");
    expect(applied.scenes[1]).toEqual(old.scenes[1]);
  });
  it("retains Unicode graphemes in caption exports and translated timing", () => {
    const d = fixture();
    d.scenes[1].captions = [
      {
        id: "c",
        start: 0.2,
        end: 1,
        text: "తెలుగు కథ · हिंदी कहानी",
        accuracy: "manual",
      },
    ];
    const srt = subtitleFile(d, d.variants[0], "srt");
    expect(srt).toContain("00:00:04,700 --> 00:00:05,500");
    expect(srt).toContain("తెలుగు కథ · हिंदी कहानी");
    expect(subtitleFile(d, d.variants[0], "vtt")).toMatch(/^WEBVTT/);
  });
  it("labels estimated timing and preserves full phrase text", () => {
    const s = newScene(1, "ప్రతి అడుగు ఒక ఆరంభం. हर कदम एक शुरुआत है।");
    const c = approximateCaptions(s);
    expect(c.every((c) => c.accuracy === "approximate")).toBe(true);
    expect(c.map((c) => c.text).join(" ")).toBe(s.narration);
  });
  it("rejects duplicated and missing scene references", () => {
    const d = fixture();
    d.variants[0].sceneIds = ["missing"];
    expect(() => validateStructure(d)).toThrow();
  });
  it("isolates image and video defaults and strips secrets from project imports", () => {
    const d = fixture();
    d.providers = {
      image: "image-key-profile",
      voice: "voice-key-profile",
      video: "video-key-profile",
    };
    const next = projectSchema.parse({
      ...d,
      apiKey: "secret",
      providers: { ...d.providers, image: "new-image" },
    });
    expect(next.providers.voice).toBe("voice-key-profile");
    expect(next.providers.video).toBe("video-key-profile");
    expect(JSON.stringify(next)).not.toContain("secret");
  });
  it("expands scene prompt overrides with project context", () => {
    const d = fixture();
    d.language = "te";
    d.scenes[0].promptOverrides.image = "Illustrate {{title}}: {{narration}}";
    expect(expandPrompt("image", d, d.scenes[0])).toContain("Language: te");
    expect(expandPrompt("image", d, d.scenes[0])).toContain("Illustrate Test");
  });
});
describe("secrets and owner access", () => {
  it("encrypts with fresh nonces and authenticates ciphertext", () => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    const a = encrypt("private-key"),
      b = encrypt("private-key");
    expect(a).not.toBe(b);
    expect(a).not.toContain("private-key");
    expect(decrypt(a)).toBe("private-key");
    const bytes = Buffer.from(a, "base64");
    bytes[15] ^= 1;
    expect(() => decrypt(bytes.toString("base64"))).toThrow();
  });
  it("uses signed expiring owner sessions", () => {
    process.env.SESSION_SECRET = "a".repeat(40);
    const token = sessionToken();
    expect(
      authorized(
        new Request("http://localhost", {
          headers: { cookie: `studio_session=${token}` },
        }),
      ),
    ).toBe(true);
    expect(
      authorized(
        new Request("http://localhost", {
          headers: { cookie: `studio_session=${token.slice(0, -1)}z` },
        }),
      ),
    ).toBe(false);
  });
  it("blocks loopback, credentials and metadata endpoints", async () => {
    process.env.ALLOW_LOCAL_PROVIDERS = "false";
    for (const u of [
      "http://127.0.0.1",
      "https://127.0.0.1",
      "https://[::1]",
      "https://169.254.169.254",
      "https://user:secret@example.com",
    ])
      await expect(safeUrl(u)).rejects.toThrow();
  });
  it("validates independent capability profiles", () => {
    const image = providerSchema.parse({
      name: "Images",
      type: "openai-compatible",
      baseUrl: "https://example.com/v1",
      capabilities: ["image"],
      model: "manual-model",
    });
    const video = providerSchema.parse({
      ...image,
      name: "Video",
      type: "zenmux",
      capabilities: ["video"],
    });
    expect(image.capabilities).toEqual(["image"]);
    expect(video.capabilities).toEqual(["video"]);
  });
});
