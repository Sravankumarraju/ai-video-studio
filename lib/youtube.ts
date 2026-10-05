import { randomBytes, createHash } from "node:crypto";
import { db } from "./db";
import { encrypt, decrypt } from "./security";
const scopes = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];
const callback = () => `${process.env.APP_ORIGIN}/api/youtube/callback`;
type Client = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
};
type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function configureYoutube(value: any) {
  const c = value?.web;
  if (
    !c ||
    typeof c.client_id !== "string" ||
    typeof c.client_secret !== "string" ||
    !Array.isArray(c.redirect_uris) ||
    !c.redirect_uris.includes(callback())
  )
    throw Error(
      "Use a Google web OAuth client with the Story Studio callback registered",
    );
  const old = await db.youtubeConnection.findUnique({ where: { id: "owner" } });
  const same =
    old && JSON.parse(decrypt(old.encryptedClient)).client_id === c.client_id;
  await db.youtubeConnection.upsert({
    where: { id: "owner" },
    create: { encryptedClient: encrypt(JSON.stringify(c)) },
    update: {
      encryptedClient: encrypt(JSON.stringify(c)),
      ...(same
        ? {}
        : { encryptedTokens: null, channelId: null, channelTitle: null }),
      stateHash: null,
      encryptedVerifier: null,
      stateExpiresAt: null,
    },
  });
}
export async function youtubeStatus() {
  const row = await db.youtubeConnection.findUnique({ where: { id: "owner" } });
  return {
    configured: !!row,
    connected: !!row?.encryptedTokens && !!row.channelId,
    channelId: row?.channelId,
    channelTitle: row?.channelTitle,
    callback: callback(),
  };
}
export async function beginYoutube() {
  const row = await db.youtubeConnection.findUniqueOrThrow({
    where: { id: "owner" },
  });
  const c: Client = JSON.parse(decrypt(row.encryptedClient));
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(48).toString("base64url");
  await db.youtubeConnection.update({
    where: { id: "owner" },
    data: {
      stateHash: hash(state),
      encryptedVerifier: encrypt(verifier),
      stateExpiresAt: new Date(Date.now() + 600000),
    },
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: c.client_id,
    redirect_uri: callback(),
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return { url: url.toString(), state };
}
async function tokenRequest(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok)
    throw Error(`Google token request failed (${r.status}); reconnect YouTube`);
  return await r.json();
}
export async function finishYoutube(
  state: string,
  cookieState: string,
  code: string,
) {
  if (
    !state ||
    state !== cookieState ||
    state.length > 100 ||
    !code ||
    code.length > 4096
  )
    throw Error("Invalid OAuth callback");
  const row = await db.youtubeConnection.findUniqueOrThrow({
    where: { id: "owner" },
  });
  if (
    !row.encryptedVerifier ||
    !row.stateExpiresAt ||
    row.stateExpiresAt.getTime() < Date.now() ||
    row.stateHash !== hash(state)
  )
    throw Error("OAuth request expired; reconnect");
  const consumed = await db.youtubeConnection.updateMany({
    where: {
      id: "owner",
      stateHash: hash(state),
      stateExpiresAt: { gt: new Date() },
    },
    data: { stateHash: null, encryptedVerifier: null, stateExpiresAt: null },
  });
  if (consumed.count !== 1) throw Error("OAuth request already used");
  const c: Client = JSON.parse(decrypt(row.encryptedClient));
  const t = await tokenRequest({
    code,
    client_id: c.client_id,
    client_secret: c.client_secret,
    redirect_uri: callback(),
    grant_type: "authorization_code",
    code_verifier: decrypt(row.encryptedVerifier),
  });
  if (
    !scopes.every((s) =>
      String(t.scope || "")
        .split(" ")
        .includes(s),
    )
  )
    throw Error("Required YouTube permissions were not granted");
  const old: Tokens | null = row.encryptedTokens
    ? JSON.parse(decrypt(row.encryptedTokens))
    : null;
  const tokens: Tokens = {
    access_token: t.access_token,
    refresh_token: t.refresh_token || old?.refresh_token,
    expires_at: Date.now() + t.expires_in * 1000,
  };
  if (!tokens.refresh_token)
    throw Error("Google did not grant offline access; reconnect with consent");
  const r = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok)
    throw Error(
      `YouTube channel lookup failed (${r.status}); check API access`,
    );
  const channel = (await r.json()).items?.[0];
  if (!channel?.id) throw Error("No YouTube channel found on this account");
  await db.youtubeConnection.update({
    where: { id: "owner" },
    data: {
      encryptedTokens: encrypt(JSON.stringify(tokens)),
      channelId: channel.id,
      channelTitle: channel.snippet.title,
    },
  });
}
export async function youtubeToken(force = false, expectedChannelId?: string) {
  const row = await db.youtubeConnection.findUniqueOrThrow({
    where: { id: "owner" },
  });
  if (!row.encryptedTokens) throw Error("Connect YouTube first");
  if (expectedChannelId && row.channelId !== expectedChannelId)
    throw Error("Connected channel changed; reconnect the original upload channel");
  let t: Tokens = JSON.parse(decrypt(row.encryptedTokens));
  if (force || t.expires_at < Date.now() + 60000) {
    const c: Client = JSON.parse(decrypt(row.encryptedClient));
    if (!t.refresh_token) throw Error("Reconnect YouTube");
    const next = await tokenRequest({
      client_id: c.client_id,
      client_secret: c.client_secret,
      refresh_token: t.refresh_token,
      grant_type: "refresh_token",
    });
    t = {
      access_token: next.access_token,
      refresh_token: t.refresh_token,
      expires_at: Date.now() + next.expires_in * 1000,
    };
    await db.youtubeConnection.update({
      where: { id: "owner" },
      data: { encryptedTokens: encrypt(JSON.stringify(t)) },
    });
  }
  return t.access_token;
}
export async function googleRequest(url: string, init: RequestInit = {}, expectedChannelId?: string) {
  const send = async (force: boolean) =>
    fetch(url, {
      ...init,
      redirect: "manual",
      headers: {
        ...init.headers,
        Authorization: `Bearer ${await youtubeToken(force, expectedChannelId)}`,
      },
      signal: AbortSignal.timeout(90000),
    });
  const r = await send(false);
  return r.status === 401 ? send(true) : r;
}
