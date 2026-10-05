"use client";
import { useEffect, useState } from "react";
import { api, Button, Field } from "./ui";
type Status = {
  configured: boolean;
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  callback: string;
};
type Upload = {
  id: string;
  projectId: string;
  state: string;
  stage: string;
  bytesUploaded: number;
  totalBytes: number;
  videoId?: string;
  error?: string;
  metadata: { title: string };
};
export function YoutubeSettings() {
  const [status, setStatus] = useState<Status>(),
    [uploads, setUploads] = useState<Upload[]>([]),
    [error, setError] = useState("");
  const refresh = async () => {
    setStatus(await api<Status>("youtube/status"));
    setUploads(await api<Upload[]>("youtube/uploads"));
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const timer = setInterval(
      () => void refresh().catch((e) => setError(e.message)),
      5000,
    );
    return () => clearInterval(timer);
  }, []);
  async function act(fn: () => Promise<unknown>) {
    try {
      setError("");
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="panel">
      <h2>YouTube · private uploads</h2>
      <p>
        Connect your Google account, confirm the channel, and upload completed
        long videos with a thumbnail. Every upload is private.
      </p>
      <Field label="Google OAuth web-client JSON (stored encrypted)">
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              void act(async () => {
                if (file.size > 65536) throw Error("Client JSON is too large");
                await api(
                  "youtube/client",
                  "POST",
                  JSON.parse(await file.text()),
                );
              });
            e.target.value = "";
          }}
        />
      </Field>
      <p className="help">Registered callback: {status?.callback}</p>
      <Button
        disabled={!status?.configured}
        onClick={() => {
          window.location.href = "/api/youtube/connect";
        }}
      >
        {status?.connected
          ? "Reconnect Google account"
          : "Connect Google account"}
      </Button>
      {status?.connected && (
        <p>
          Connected channel: <strong>{status.channelTitle}</strong> ·{" "}
          {status.channelId}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <h3>Upload history</h3>
      {uploads.length === 0 && (
        <p>
          No uploads yet. Open a video's Publishing tab to prepare an upload.
        </p>
      )}
      {uploads.map((u) => (
        <article key={u.id} className="panel">
          <strong>{u.metadata.title}</strong>
          <p>
            {u.state} · {u.stage}
          </p>
          <progress value={u.bytesUploaded} max={u.totalBytes || 1} />
          <p>
            {u.totalBytes
              ? Math.round((u.bytesUploaded / u.totalBytes) * 100)
              : 0}
            % · Private
          </p>
          {u.videoId && (
            <a
              href={`https://www.youtube.com/watch?v=${u.videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open uploaded video
            </a>
          )}
          {u.error && <p role="alert">{u.error}</p>}
          {["failed", "cancelled"].includes(u.state) && (
            <Button
              secondary
              onClick={() =>
                void act(() => api(`youtube/uploads/${u.id}/retry`, "POST", {}))
              }
            >
              Resume existing upload
            </Button>
          )}
          {["queued", "running"].includes(u.state) && (
            <Button
              secondary
              onClick={() =>
                void act(() =>
                  api(`youtube/uploads/${u.id}/cancel`, "POST", {}),
                )
              }
            >
              Stop upload
            </Button>
          )}
        </article>
      ))}
    </section>
  );
}
export function YoutubeUploadControls({
  projectId,
  variantId,
  jobs,
  assets,
  publishing,
}: {
  projectId: string;
  variantId?: string;
  jobs: any[];
  assets: any[];
  publishing: { titles: string[]; description: string };
}) {
  const [status, setStatus] = useState<Status>(),
    [renderId, setRenderId] = useState(""),
    [thumbnailId, setThumbnailId] = useState(""),
    [title, setTitle] = useState(publishing.titles[0] || ""),
    [description, setDescription] = useState(publishing.description),
    [tags, setTags] = useState("Bhagavad Gita Telugu, Divine Wisdom Telugu"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<Status>("youtube/status")
      .then(setStatus)
      .catch((e) => setMessage(e.message));
  }, []);
  const renders = jobs.filter(
    (j) =>
      j.projectId === projectId &&
      j.kind === "render" &&
      j.state === "completed" &&
      j.result?.draft === false &&
      (!variantId || j.result?.variantId === variantId),
  );
  const thumbs = assets.filter(
    (a) =>
      a.projectId === projectId &&
      a.kind === "image" &&
      ["image/jpeg", "image/png"].includes(a.mime) &&
      a.bytes <= 2 * 1024 * 1024,
  );
  const bytes = new TextEncoder().encode(description).length;
  async function upload() {
    try {
      setBusy(true);
      setMessage("");
      const result = await api<any>("youtube/uploads", "POST", {
        renderJobId: renderId,
        thumbnailAssetId: thumbnailId,
        expectedChannelId: status?.channelId,
        metadata: {
          title,
          description,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      setMessage(
        `Private upload ${result.state}. Follow progress in YouTube uploads.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>Upload this version to YouTube · Private</h3>
      <p>
        {status?.connected
          ? `Destination: ${status.channelTitle} (${status.channelId})`
          : "Connect your account in YouTube uploads first."}
      </p>
      <Field label="Completed full render">
        <select value={renderId} onChange={(e) => setRenderId(e.target.value)}>
          <option value="">Choose render</option>
          {renders.map((j) => (
            <option key={j.id} value={j.id}>
              {new Date(j.createdAt).toLocaleString()} · {j.result?.width}×
              {j.result?.height}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Thumbnail · JPEG/PNG below 2 MB">
        <select
          value={thumbnailId}
          onChange={(e) => setThumbnailId(e.target.value)}
        >
          <option value="">Choose thumbnail</option>
          {thumbs.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="YouTube title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={`YouTube description · ${bytes}/5000 UTF-8 bytes`}>
        <textarea
          rows={7}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="SEO tags · comma separated">
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
      </Field>
      <p className="help">
        Add source links, hashtags, an AI illustration/narration disclosure and
        a correction/apology note to the description. The video is declared to
        contain synthetic media.
      </p>
      <Button
        disabled={
          busy ||
          !status?.connected ||
          !renderId ||
          !thumbnailId ||
          bytes > 5000
        }
        onClick={() => void upload()}
      >
        Upload privately to this channel
      </Button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
