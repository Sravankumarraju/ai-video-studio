import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
  scryptSync,
} from "node:crypto";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
function key() {
  const k = process.env.ENCRYPTION_KEY || "";
  if (!/^[0-9a-f]{64}$/i.test(k))
    throw Error("Configure ENCRYPTION_KEY with 32 random bytes");
  return Buffer.from(k, "hex");
}
export function encrypt(secret: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key(), iv);
  return Buffer.concat([
    iv,
    c.update(secret, "utf8"),
    c.final(),
    c.getAuthTag(),
  ]).toString("base64");
}
export function decrypt(value: string) {
  const b = Buffer.from(value, "base64"),
    c = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  c.setAuthTag(b.subarray(-16));
  return Buffer.concat([c.update(b.subarray(12, -16)), c.final()]).toString(
    "utf8",
  );
}
function sessionSecret() {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 32) throw Error("Configure SESSION_SECRET");
  return s;
}
export function sessionToken() {
  const exp = String(Date.now() + 12 * 3600000);
  return `${exp}.${createHmac("sha256", sessionSecret()).update(exp).digest("hex")}`;
}
export function authorized(req: Request) {
  try {
    const token =
      (req.headers.get("cookie") || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("studio_session="))
        ?.slice(15) || "";
    const [exp, sig] = token.split(".");
    if (Number(exp) < Date.now() || !exp || !sig) return false;
    const expected = createHmac("sha256", sessionSecret())
      .update(exp)
      .digest("hex");
    return (
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    );
  } catch {
    return false;
  }
}
export function checkPassword(password: string) {
  const expected = process.env.OWNER_PASSWORD;
  if (!expected || expected.length < 12)
    throw Error("Configure an OWNER_PASSWORD of at least 12 characters");
  return timingSafeEqual(
    scryptSync(password, "studio-owner", 32),
    scryptSync(expected, "studio-owner", 32),
  );
}
export function guard(req: Request) {
  if (!authorized(req)) throw Error("Unauthorized");
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && origin !== process.env.APP_ORIGIN)
      throw Error("Invalid origin");
    if (req.headers.get("sec-fetch-site") === "cross-site")
      throw Error("Invalid origin");
  }
}
export async function safeUrl(raw: string) {
  const u = new URL(raw);
  if (
    u.username ||
    u.password ||
    u.hash ||
    !["https:", "http:"].includes(u.protocol)
  )
    throw Error("Unsafe URL");
  const dev =
    process.env.ALLOW_LOCAL_PROVIDERS === "true" &&
    process.env.NODE_ENV !== "production";
  if (u.protocol !== "https:" && !dev) throw Error("HTTPS required");
  const hostname = u.hostname.replace(/^\[|\]$/g, "");
  const records = await lookup(hostname, { all: true });
  if (
    !records.length ||
    (!dev &&
      records.some((r) => ipaddr.process(r.address).range() !== "unicast"))
  )
    throw Error("Private and reserved destinations are blocked");
  return u;
}
export async function safeFetch(
  raw: string,
  init: RequestInit = {},
  max = Number(process.env.MAX_DOWNLOAD_MB || 100) * 1024 * 1024,
) {
  const u = await safeUrl(raw);
  const addresses = await lookup(u.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  const dev =
    process.env.ALLOW_LOCAL_PROVIDERS === "true" &&
    process.env.NODE_ENV !== "production";
  if (
    !addresses.length ||
    (!dev &&
      addresses.some((a) => ipaddr.process(a.address).range() !== "unicast"))
  )
    throw Error("Unsafe destination");
  const prepared = new Request(u, init);
  const payload = init.body
    ? Buffer.from(await prepared.arrayBuffer())
    : undefined;
  const headers = Object.fromEntries(prepared.headers.entries());
  headers["accept-encoding"] = "identity";
  if (payload) headers["content-length"] = String(payload.length);
  // Pin the validated address in the actual socket lookup; do not resolve DNS a third time.
  return new Promise<Response>((resolve, reject) => {
    const send = u.protocol === "https:" ? httpsRequest : httpRequest;
    const selected = addresses[0];
    const request = send(
      u,
      {
        method: prepared.method,
        headers,
        signal: init.signal ?? AbortSignal.timeout(120000),
        lookup: ((_host: unknown, opts: unknown, cb: Function) => {
          if ((opts as { all?: boolean }).all) cb(null, [selected]);
          else cb(null, selected.address, selected.family);
        }) as never,
      },
      (r) => {
        if ((r.statusCode || 0) >= 300 && (r.statusCode || 0) < 400) {
          r.destroy();
          reject(Error("Remote redirects are blocked"));
          return;
        }
        if (Number(r.headers["content-length"] || 0) > max) {
          r.destroy();
          reject(Error("Remote response exceeds limit"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        r.on("data", (b) => {
          size += b.length;
          if (size > max) {
            r.destroy(Error("Remote response exceeds limit"));
          } else chunks.push(b);
        });
        r.on("error", reject);
        r.on("end", () => {
          const rh = new Headers();
          for (const [k, value] of Object.entries(r.headers)) {
            if (value)
              rh.set(k, Array.isArray(value) ? value.join(", ") : value);
          }
          resolve(
            new Response(new Uint8Array(Buffer.concat(chunks)), {
              status: r.statusCode,
              headers: rh,
            }),
          );
        });
      },
    );
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}
