import { z } from "zod";
import type { Capability, ProviderConfig } from "./schema";
import { safeFetch } from "./security";
export type Context = { config: ProviderConfig; key: string };
export type Generation = {
  prompt: string;
  language: string;
  duration: number;
  aspect: string;
  voiceId?: string;
  previousText?: string;
  nextText?: string;
  audio?: Buffer;
};
export type GenerationResult = {
  text?: string;
  bytes?: Buffer;
  url?: string;
  jobId?: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  usage?: unknown;
  cost?: number;
};
export interface Adapter {
  capabilities: Capability[];
  discover(c: Context): Promise<{ id: string; languages?: string[] }[]>;
  generate(
    c: Context,
    input: Generation,
    kind: Capability,
  ): Promise<GenerationResult>;
  poll?(c: Context, id: string): Promise<{ state: string; url?: string }>;
  voices?(c: Context): Promise<{ id: string; name: string }[]>;
}
export class ProviderError extends Error {
  constructor(
    public status: number,
    public ambiguous: boolean,
    public reason?: "missing_permissions" | "voice_not_found" | "invalid_api_key",
  ) {
    super(
      `Provider request failed (HTTP ${status || "timeout"}). Check credentials, model and provider diagnostics.`,
    );
  }
}
function params(c: Context) {
  return Object.fromEntries(
    Object.entries(c.config.parameters).filter(
      ([k]) =>
        c.config.supportedParameters.includes(k) &&
        ![
          "model",
          "prompt",
          "messages",
          "content",
          "text",
          "voice_id",
          "model_id",
          "language_code",
        ].includes(k),
    ),
  );
}
async function request(c: Context, endpoint: string, body?: unknown) {
  try {
    const r = await safeFetch(
      `${c.config.baseUrl.replace(/\/$/, "")}${endpoint}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(c.config.type === "elevenlabs"
            ? { "xi-api-key": c.key }
            : { Authorization: `Bearer ${c.key}` }),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(c.config.timeout * 1000),
      },
    );
    if (!r.ok) {
      const error = await r.json().catch(() => null);
      const reason = error?.detail?.status;
      throw new ProviderError(r.status, !!body && r.status >= 500,
        ["missing_permissions", "voice_not_found", "invalid_api_key"].includes(reason)
          ? reason : undefined);
    }
    return await r.json();
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw new ProviderError(0, !!body);
  }
}
const openai: Adapter = {
  capabilities: ["script", "image", "transcription"],
  async discover(c) {
    const r = await request(c, "/models");
    return z.object({ data: z.array(z.object({ id: z.string() })) }).parse(r)
      .data;
  },
  async generate(c, i, kind) {
    if (kind === "script") {
      const r = await request(c, "/chat/completions", {
        ...params(c),
        model: c.config.model,
        messages: [{ role: "user", content: i.prompt }],
      });
      return {
        text: z
          .object({
            choices: z
              .array(z.object({ message: z.object({ content: z.string() }) }))
              .min(1),
          })
          .parse(r).choices[0].message.content,
        usage: r.usage,
        cost: typeof r.usage?.cost === "number" ? r.usage.cost : undefined,
      };
    }
    if (kind === "image") {
      const r = await request(c, "/images/generations", {
        ...params(c),
        model: c.config.model,
        prompt: i.prompt,
        n: 1,
      });
      const d = z
        .object({
          data: z
            .array(
              z.object({
                b64_json: z.string().optional(),
                url: z.string().url().optional(),
              }),
            )
            .min(1),
        })
        .parse(r).data[0];
      if (!d.b64_json && !d.url)
        throw Error("Image response contains no output");
      return {
        bytes: d.b64_json ? Buffer.from(d.b64_json, "base64") : undefined,
        url: d.url,
      };
    }
    if (kind === "transcription" && i.audio) {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(i.audio)]), "narration.mp3");
      form.append("model", c.config.model);
      form.append("language", i.language);
      form.append("response_format", "verbose_json");
      const r = await safeFetch(
        `${c.config.baseUrl.replace(/\/$/, "")}/audio/transcriptions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${c.key}` },
          body: form,
          signal: AbortSignal.timeout(c.config.timeout * 1000),
        },
      );
      if (!r.ok) throw new ProviderError(r.status, r.status >= 500);
      return { text: JSON.stringify(await r.json()) };
    }
    throw Error("Capability is not supported by this adapter");
  },
};
const zenmux: Adapter = {
  ...openai,
  capabilities: ["script", "image", "video", "transcription"],
  async generate(c, i, kind) {
    if (kind !== "video") return await openai.generate(c, i, kind);
    const duration = Math.ceil(i.duration);
    if (c.config.model === "bytedance/doubao-seedance-2.0" && duration > 10)
      throw Error(
        "This documented model supports at most 10 seconds; split the scene",
      );
    const r = await request(c, "/videos", {
      ...params(c),
      model: c.config.model,
      content: [{ type: "text", text: i.prompt }],
      duration,
      ratio: i.aspect,
      generate_audio: false,
    });
    return { jobId: z.object({ id: z.string() }).parse(r).id };
  },
  async poll(c, id) {
    const r = await request(c, `/videos/${encodeURIComponent(id)}`);
    const d = z
      .object({
        status: z.enum(["queued", "running", "succeeded", "failed"]),
        content: z.object({ video_url: z.string().url() }).optional(),
      })
      .parse(r);
    return { state: d.status, url: d.content?.video_url };
  },
};
const eleven: Adapter = {
  capabilities: ["voice"],
  async discover(c) {
    const r = await request(c, "/models");
    return z
      .array(
        z.object({
          model_id: z.string(),
          can_do_text_to_speech: z.boolean(),
          languages: z.array(z.object({ language_id: z.string() })),
        }),
      )
      .parse(r)
      .filter((m) => m.can_do_text_to_speech)
      .map((m) => ({
        id: m.model_id,
        languages: m.languages.map(
          (l) =>
            ({ tel: "te", hin: "hi", eng: "en" })[
              l.language_id as "tel" | "hin" | "eng"
            ] || l.language_id,
        ),
      }));
  },
  async voices(c) {
    const r = await request(c, "/voices");
    return z
      .object({
        voices: z.array(z.object({ voice_id: z.string(), name: z.string() })),
      })
      .parse(r)
      .voices.map((v) => ({ id: v.voice_id, name: v.name }));
  },
  async generate(c, i, kind) {
    if (kind !== "voice") throw Error("Unsupported capability");
    const models = await this.discover(c);
    const model = models.find((m) => m.id === c.config.model);
    if (!model || !model.languages?.includes(i.language))
      throw Error(
        "Selected ElevenLabs model does not list this narration language",
      );
    const voice = i.voiceId || c.config.voiceId;
    if (!voice) throw Error("Select an ElevenLabs voice ID");
    const dialogueModel = ["eleven_v4", "eleven_v4_turbo"].includes(
      c.config.model,
    );
    if (dialogueModel && i.prompt.length > 2000)
      throw Error(
        "Selected ElevenLabs dialogue endpoint requires scene chunks of at most 2,000 characters",
      );
    if (dialogueModel && Object.keys(params(c)).length)
      throw Error(
        "Selected ElevenLabs dialogue model requires an empty voice parameter set; legacy voice_settings are not sent to this endpoint",
      );
    const r = await request(
      c,
      dialogueModel
        ? "/text-to-dialogue/with-timestamps"
        : `/text-to-speech/${encodeURIComponent(voice)}/with-timestamps`,
      dialogueModel
        ? {
            inputs: [{ text: i.prompt, voice_id: voice }],
            model_id: c.config.model,
            language_code: i.language,
            previous_text: i.previousText?.slice(-100),
            next_text: i.nextText?.slice(0, 100),
          }
        : {
            text: i.prompt,
            model_id: c.config.model,
            ...(c.config.model === "eleven_multilingual_v2"
              ? {}
              : { language_code: i.language }),
            voice_settings: params(c),
            previous_text: i.previousText,
            next_text: i.nextText,
          },
    );
    const d = z
      .object({
        audio_base64: z.string(),
        alignment: z
          .object({
            characters: z.array(z.string()),
            character_start_times_seconds: z.array(z.number()),
            character_end_times_seconds: z.array(z.number()),
          })
          .nullable()
          .optional(),
      })
      .parse(r);
    return {
      bytes: Buffer.from(d.audio_base64, "base64"),
      alignment: d.alignment || undefined,
    };
  },
};
export const registry: Record<ProviderConfig["type"], Adapter> = {
  "openai-compatible": openai,
  zenmux,
  elevenlabs: eleven,
};
for (const adapter of Object.values(registry)) {
  const generate = adapter.generate.bind(adapter);
  adapter.generate = async (c, i, kind) => {
    try {
      return await generate(c, i, kind);
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (
        e instanceof Error &&
        /^(Selected ElevenLabs|Select an ElevenLabs|This documented model|Capability is not supported|Unsupported capability)/.test(
          e.message,
        )
      )
        throw e;
      throw new ProviderError(0, true);
    }
  };
}
export async function verify(c: Context) {
  const adapter = registry[c.config.type];
  const supported = c.config.capabilities.every((k) =>
    adapter.capabilities.includes(k),
  );
  if (!c.config.discovery)
    return {
      credentials: "unknown",
      model: "unknown",
      capability: supported ? "adapter-supported" : "unsupported",
      generation: "not-tested",
      message: "Discovery disabled. No paid generation was performed.",
    };
  const diagnostics: string[] = [];
  let models: { id: string; languages?: string[] }[] = [];
  let discoveryPassed = false;
  if (c.config.type !== "elevenlabs") {
    models = await adapter.discover(c);
    discoveryPassed = true;
  } else {
    try {
      models = await adapter.discover(c);
      discoveryPassed = true;
    } catch (e) {
      diagnostics.push(e instanceof ProviderError && e.reason === "missing_permissions"
        ? "Model check failed: enable Models read permission in ElevenLabs."
        : "Model check failed: check your key and provider connection.");
    }
  }
  let voice = "not-applicable";
  if (c.config.type === "elevenlabs") {
    voice = "not-configured";
    if (!c.config.voiceId) diagnostics.push("Enter an accessible default voice ID.");
    else {
      try {
        const result = await request(c, `/voices/${encodeURIComponent(c.config.voiceId)}`);
        const selected = z.object({ voice_id: z.string() }).parse(result);
        voice = selected.voice_id === c.config.voiceId ? "accessible" : "unverified";
      } catch (e) {
        voice = "unavailable";
        diagnostics.push(e instanceof ProviderError && e.reason === "voice_not_found"
          ? "Voice not found: add this voice to My Voices or choose an accessible voice ID."
          : e instanceof ProviderError && e.reason === "missing_permissions"
            ? "Voice check failed: enable Voices read permission in ElevenLabs."
            : "Voice check failed: check the key, voice ID and provider connection.");
      }
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    credentials: discoveryPassed ? "accepted" : "unverified",
    model: !discoveryPassed ? "unverified" : models.some((m) => m.id === c.config.model)
      ? "available"
      : "not-listed",
    capability: supported
      ? "adapter-supported; model support unverified"
      : "unsupported",
    generation: "not-tested",
    voice,
    message: "Read-only connection check. Speech-generation permission and audio output remain unverified; no paid audio was generated.",
    diagnostics,
    models,
  };
}
