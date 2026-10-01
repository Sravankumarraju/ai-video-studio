import { describe, it, expect, vi, beforeEach } from "vitest";
import { providerSchema } from "../lib/schema";
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("../lib/security", () => ({ safeFetch: mockFetch }));
import { registry, verify, ProviderError } from "../lib/providers";
const ctx = (type: "zenmux" | "openai-compatible" | "elevenlabs") => ({
  key: "isolated-test-secret",
  config: providerSchema.parse({
    name: "Contract test",
    type,
    baseUrl: "https://provider.example/v1",
    capabilities: [type === "elevenlabs" ? "voice" : "image"],
    model: "contract-model",
    voiceId: "voice-1",
  }),
});
beforeEach(() => mockFetch.mockReset());
describe("isolated provider contracts: no live calls", () => {
  it("checks voice after model permission failure and hides raw provider errors", async () => {
    mockFetch.mockResolvedValueOnce(Response.json({ detail: { status: "missing_permissions", message: "isolated-test-secret" } }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ detail: { status: "voice_not_found", message: "isolated-test-secret" } }, { status: 400 }));
    const result = await verify(ctx("elevenlabs"));
    expect(result.model).toBe("unverified");
    expect(result.voice).toBe("unavailable");
    expect(result.generation).toBe("not-tested");
    expect(result.diagnostics).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("isolated-test-secret");
    expect(mockFetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
  });
  it("reports model and voice access without claiming speech generation is verified", async () => {
    const c = ctx("elevenlabs");
    mockFetch.mockResolvedValueOnce(Response.json([{ model_id: c.config.model, can_do_text_to_speech: true, languages: [{ language_id: "te" }] }]))
      .mockResolvedValueOnce(Response.json({ voice_id: c.config.voiceId }));
    const result = await verify(c);
    expect(result.model).toBe("available");
    expect(result.voice).toBe("accessible");
    expect(result.generation).toBe("not-tested");
    expect(result.diagnostics).toEqual([]);
  });
  it("routes Eleven v4 Telugu narration through the documented dialogue timestamp endpoint", async () => {
    const c = ctx("elevenlabs");
    c.config.model = "eleven_v4";
    const alignment = {
      characters: ["గ", "ీ"],
      character_start_times_seconds: [0, 0.1],
      character_end_times_seconds: [0.1, 0.2],
    };
    mockFetch
      .mockResolvedValueOnce(
        Response.json([
          {
            model_id: "eleven_v4",
            can_do_text_to_speech: true,
            languages: [{ language_id: "tel" }],
          },
        ]),
      )
      .mockResolvedValueOnce(
        Response.json({
          audio_base64: Buffer.from("audio").toString("base64"),
          alignment,
        }),
      );
    const result = await registry.elevenlabs.generate(
      c,
      {
        prompt: "గీ",
        language: "te",
        duration: 1,
        aspect: "9:16",
        previousText: "a".repeat(200),
        nextText: "b".repeat(200),
      },
      "voice",
    );
    expect(result.alignment).toEqual(alignment);
    expect(mockFetch.mock.calls[1][0]).toBe(
      "https://provider.example/v1/text-to-dialogue/with-timestamps",
    );
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body).toMatchObject({
      inputs: [{ text: "గీ", voice_id: "voice-1" }],
      model_id: "eleven_v4",
      language_code: "te",
    });
    expect(body.previous_text).toHaveLength(100);
    expect(body.next_text).toHaveLength(100);
    expect(body).not.toHaveProperty("voice_settings");
  });
  it("rejects oversized Eleven v4 chunks before a paid submission", async () => {
    const c = ctx("elevenlabs");
    c.config.model = "eleven_v4";
    mockFetch.mockResolvedValueOnce(
      Response.json([
        {
          model_id: "eleven_v4",
          can_do_text_to_speech: true,
          languages: [{ language_id: "te" }],
        },
      ]),
    );
    await expect(
      registry.elevenlabs.generate(
        c,
        {
          prompt: "x".repeat(2001),
          language: "te",
          duration: 1,
          aspect: "9:16",
        },
        "voice",
      ),
    ).rejects.toThrow("2,000 characters");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  it("uses native ZenMux video content and persisted-ID polling contract", async () => {
    mockFetch
      .mockResolvedValueOnce(
        Response.json({ id: "native-job", status: "queued" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "succeeded",
          content: { video_url: "https://cdn.example/output.mp4" },
        }),
      );
    const c = ctx("zenmux");
    const submitted = await registry.zenmux.generate(
      c,
      { prompt: "A sunrise", language: "en", duration: 5, aspect: "9:16" },
      "video",
    );
    expect(submitted.jobId).toBe("native-job");
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://provider.example/v1/videos",
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      content: [{ type: "text", text: "A sunrise" }],
      duration: 5,
      ratio: "9:16",
    });
    expect(await registry.zenmux.poll!(c, submitted.jobId!)).toEqual({
      state: "succeeded",
      url: "https://cdn.example/output.mp4",
    });
    expect(mockFetch.mock.calls[1][0]).toContain("/videos/native-job");
  });
  it("handles base64 and URL image responses", async () => {
    mockFetch
      .mockResolvedValueOnce(
        Response.json({
          data: [{ b64_json: Buffer.from("test").toString("base64") }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: [{ url: "https://cdn.example/image.png" }] }),
      );
    const input = {
      prompt: "sunrise",
      language: "en",
      duration: 5,
      aspect: "16:9",
    };
    expect(
      (
        await registry["openai-compatible"].generate(
          ctx("openai-compatible"),
          input,
          "image",
        )
      ).bytes?.toString(),
    ).toBe("test");
    expect(
      (await registry.zenmux.generate(ctx("zenmux"), input, "image")).url,
    ).toBe("https://cdn.example/image.png");
  });
  it("checks model discovery without spending generation credits", async () => {
    mockFetch.mockResolvedValue(
      Response.json({ data: [{ id: "contract-model" }] }),
    );
    const v = await verify(ctx("zenmux"));
    expect(v.credentials).toBe("accepted");
    expect(v.generation).toBe("not-tested");
    expect(mockFetch.mock.calls[0][0]).toContain("/models");
    expect(mockFetch.mock.calls[0][1].method).toBe("GET");
  });
  it("checks Telugu model support before voice generation", async () => {
    mockFetch.mockResolvedValue(
      Response.json([
        {
          model_id: "contract-model",
          can_do_text_to_speech: true,
          languages: [{ language_id: "en" }],
        },
      ]),
    );
    await expect(
      registry.elevenlabs.generate(
        ctx("elevenlabs"),
        { prompt: "తెలుగు", language: "te", duration: 5, aspect: "16:9" },
        "voice",
      ),
    ).rejects.toThrow("does not list");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  it("retains ElevenLabs precise character timestamps", async () => {
    const alignment = {
      characters: ["హ", "ా"],
      character_start_times_seconds: [0, 0.1],
      character_end_times_seconds: [0.1, 0.2],
    };
    mockFetch
      .mockResolvedValueOnce(
        Response.json([
          {
            model_id: "contract-model",
            can_do_text_to_speech: true,
            languages: [{ language_id: "te" }],
          },
        ]),
      )
      .mockResolvedValueOnce(
        Response.json({
          audio_base64: Buffer.from("audio").toString("base64"),
          alignment,
        }),
      );
    const r = await registry.elevenlabs.generate(
      ctx("elevenlabs"),
      { prompt: "హా", language: "te", duration: 1, aspect: "16:9" },
      "voice",
    );
    expect(r.alignment).toEqual(alignment);
    expect(mockFetch.mock.calls[1][0]).toContain(
      "/text-to-speech/voice-1/with-timestamps",
    );
    expect(mockFetch.mock.calls[1][1].headers["xi-api-key"]).toBe(
      "isolated-test-secret",
    );
  });
  it("classifies ambiguous upstream paid failures without leaking key or upstream errors", async () => {
    mockFetch.mockResolvedValue(
      Response.json({ error: "isolated upstream diagnostic" }, { status: 503 }),
    );
    let caught: unknown;
    try {
      await registry.zenmux.generate(
        ctx("zenmux"),
        { prompt: "test", language: "en", duration: 1, aspect: "16:9" },
        "image",
      );
    } catch (e) {
      caught = e;
    }
    expect({
      status: (caught as ProviderError).status,
      ambiguous: (caught as ProviderError).ambiguous,
    }).toEqual({ status: 503, ambiguous: true });
    expect(String((caught as Error).message)).not.toContain(
      "upstream diagnostic",
    );
  });
});
