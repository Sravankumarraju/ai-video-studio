"use client";
import { useEffect, useState } from "react";
type Connection = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  revokedAt: string | null;
  lastUsedAt: string | null;
};
async function request(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json();
  if (!res.ok) throw Error(body.error || "Request failed");
  return body;
}
export function McpSettings() {
  const [connections, setConnections] = useState<Connection[]>([]),
    [name, setName] = useState("My AI client"),
    [scopes, setScopes] = useState(["read", "edit", "render"]),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const endpoint =
    typeof window === "undefined"
      ? "http://localhost:3000/api/mcp"
      : `${window.location.origin}/api/mcp`;
  async function refresh() {
    setConnections(await request("/api/mcp-connections"));
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);
  const desktopConfig = JSON.stringify(
    {
      mcpServers: {
        "story-studio": {
          command: "node",
          args: [
            "D:/Projects/Claude Projects/ai-video-studio/scripts/mcp-bridge.mjs",
          ],
          env: {
            STORY_STUDIO_MCP_URL: endpoint,
            STORY_STUDIO_MCP_TOKEN: "<paste your connector token>",
          },
        },
      },
    },
    null,
    2,
  );
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <h1>MCP Connectors</h1>
          <p>
            Let your connected AI client plan, edit and render videos in this
            workspace.
          </p>
        </div>
      </div>
      <section className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <h2>Create a client connection</h2>
        <p>
          The client uses its own chosen model. Story Studio keeps image, video,
          voice and transcription providers independently configured.
        </p>
        <label>
          Connection name
          <input
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            margin: "16px 0",
          }}
        >
          {["read", "edit", "render", "generate"].map((scope) => (
            <label
              key={scope}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={(e) =>
                  setScopes((current) =>
                    e.target.checked
                      ? [...current, scope]
                      : current.filter((s) => s !== scope),
                  )
                }
              />
              {scope === "generate"
                ? "Paid provider generation"
                : scope[0].toUpperCase() + scope.slice(1)}
            </label>
          ))}
        </div>
        <p>
          Read, edit and render permissions support the complete uploaded-media
          workflow. Paid generation also requires explicit spending consent and
          respects project budgets. Connector clients cannot raise spending
          limits.
        </p>
        <button
          className="btn"
          disabled={busy || !name.trim() || !scopes.length}
          onClick={async () => {
            setBusy(true);
            setError("");
            setToken("");
            try {
              const result = await request("/api/mcp-connections", {
                method: "POST",
                body: JSON.stringify({ name, scopes }),
              });
              setToken(result.token);
              await refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Create connector token
        </button>
        {error && <p role="alert">{error}</p>}
        {token && (
          <div style={{ marginTop: 20 }}>
            <h3>Copy this token now</h3>
            <p>
              Shown only once. Save it in your client's protected configuration.
            </p>
            <input aria-label="New connector token" readOnly value={token} />
            <button
              className="btn secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(token);
                } catch {
                  setError("Select and copy the token manually.");
                }
              }}
            >
              Copy token
            </button>
            <button className="btn secondary" onClick={() => setToken("")}>
              Hide token
            </button>
          </div>
        )}
      </section>
      <section className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <h2>Connect your AI client</h2>
        <p>
          For a client with Streamable HTTP support, use this URL and an
          Authorization header.
        </p>
        <pre>{endpoint + "\nAuthorization: Bearer <your connector token>"}</pre>
        <p>
          For Claude Desktop, Cursor or another stdio client, add the following
          to its MCP configuration. Node.js must be installed. Replace the
          script path if you move the app.
        </p>
        <pre style={{ overflowX: "auto" }}>{desktopConfig}</pre>
        <p>For Codex, add to config.toml:</p>
        <pre>{`[mcp_servers.story_studio]\nurl = "${endpoint}"\nbearer_token_env_var = "STORY_STUDIO_MCP_TOKEN"`}</pre>
        <p>
          Set STORY_STUDIO_MCP_TOKEN in the client's environment, then restart
          or reconnect the client. Ask it: “Use Story Studio to create a video
          from my brief. Prepare scenes, use my uploaded media, render landscape
          and vertical MP4s, and show me the downloads.”
        </p>
        <p>
          Cloud clients cannot reach this localhost URL. Deploy Story Studio
          behind HTTPS first. Clients that require OAuth rather than
          configurable bearer headers need an OAuth gateway; that integration is
          not provided here.
        </p>
      </section>
      <section className="panel" style={{ padding: 24 }}>
        <h2>Connections</h2>
        {!connections.length && <p>No clients connected yet.</p>}
        {connections.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <strong>{c.name}</strong>
              <p>
                {c.prefix}… · {c.scopes.join(", ")} ·{" "}
                {c.revokedAt
                  ? "Revoked"
                  : c.lastUsedAt
                    ? `Last used ${new Date(c.lastUsedAt).toLocaleString()}`
                    : "Not used yet"}
              </p>
            </div>
            <button
              className="btn secondary"
              disabled={!!c.revokedAt || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await request(`/api/mcp-connections?id=${encodeURIComponent(c.id)}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: c.name,
                      scopes: c.scopes.includes("generate")
                        ? c.scopes.filter((scope) => scope !== "generate")
                        : [...c.scopes, "generate"],
                    }),
                  });
                  await refresh();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {c.scopes.includes("generate") ? "Disable paid generation" : "Enable paid generation"}
            </button>
            <button
              className="btn secondary"
              disabled={!!c.revokedAt || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await request(
                    `/api/mcp-connections?id=${encodeURIComponent(c.id)}`,
                    { method: "DELETE" },
                  );
                  setToken("");
                  await refresh();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Revoke
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
