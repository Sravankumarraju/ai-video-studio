import { NextResponse } from "next/server";
import { guard } from "@/lib/security";
import { db } from "@/lib/db";
import {
  beginYoutube,
  configureYoutube,
  finishYoutube,
  youtubeStatus,
} from "@/lib/youtube";
import { queueYoutubeUpload, youtubeQueue } from "@/lib/youtube-uploads";
import { publicUpload } from "@/lib/youtube-policy";
export const runtime = "nodejs";
async function route(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params,
      action = path.join("/");
    // The owner's Strict session cookie is intentionally absent on Google's cross-site
    // redirect. Only this callback authenticates through the owner-initiated, expiring,
    // one-use OAuth state cookie and PKCE exchange. Every other endpoint requires owner access.
    if (!(req.method === "GET" && action === "callback")) guard(req);
    if (req.method === "GET" && action === "status")
      return NextResponse.json(await youtubeStatus());
    if (req.method === "GET" && action === "uploads")
      return NextResponse.json(
        (
          await db.youtubeUpload.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
          })
        ).map(publicUpload),
      );
    if (req.method === "GET" && action === "connect") {
      const result = await beginYoutube(),
        r = NextResponse.redirect(result.url);
      r.cookies.set("youtube_oauth_state", result.state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.APP_ORIGIN?.startsWith("https:"),
        maxAge: 600,
        path: "/api/youtube",
      });
      return r;
    }
    if (req.method === "GET" && action === "callback") {
      const u = new URL(req.url),
        cookieState =
          (req.headers.get("cookie") || "")
            .split(";")
            .map((s) => s.trim())
            .find((s) => s.startsWith("youtube_oauth_state="))
            ?.slice(20) || "";
      if (u.searchParams.has("error"))
        throw Error(
          "Google authorization was not completed; reconnect YouTube",
        );
      await finishYoutube(
        u.searchParams.get("state") || "",
        cookieState,
        u.searchParams.get("code") || "",
      );
      const r = NextResponse.redirect(
        `${process.env.APP_ORIGIN}/?youtube=connected`,
      );
      r.cookies.set("youtube_oauth_state", "", {
        maxAge: 0,
        path: "/api/youtube",
      });
      return r;
    }
    if (req.method !== "POST")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const text = await req.text();
    if (Buffer.byteLength(text) > 65536) throw Error("Request too large");
    const body = text ? JSON.parse(text) : {};
    if (action === "client") {
      await configureYoutube(body);
      return NextResponse.json({ configured: true });
    }
    if (action === "uploads")
      return NextResponse.json(await queueYoutubeUpload(body));
    if (action === "disconnect") {
      const active = await db.youtubeUpload.count({
        where: { state: { in: ["queued", "running"] } },
      });
      if (active) throw Error("Stop active uploads before disconnecting");
      await db.youtubeConnection.update({
        where: { id: "owner" },
        data: {
          encryptedTokens: null,
          channelId: null,
          channelTitle: null,
          stateHash: null,
          encryptedVerifier: null,
          stateExpiresAt: null,
        },
      });
      return NextResponse.json({ disconnected: true });
    }
    const match = /^uploads\/([a-f0-9-]+)\/(retry|cancel)$/.exec(action);
    if (match) {
      const row = await db.youtubeUpload.findUniqueOrThrow({
        where: { id: match[1] },
      });
      if (match[2] === "cancel")
        return NextResponse.json(
          publicUpload(
            await db.youtubeUpload.update({
              where: { id: row.id },
              data: { cancelRequested: true },
            }),
          ),
        );
      if (
        !["failed", "cancelled"].includes(row.state) ||
        (!row.videoId && !row.encryptedSession)
      )
        throw Error(
          "Only known upload sessions or existing video IDs can be retried safely",
        );
      await db.youtubeUpload.update({
        where: { id: row.id },
        data: { state: "queued", error: null, cancelRequested: false },
      });
      const old = await youtubeQueue().getJob(row.id);
      if (old) await old.remove();
      await youtubeQueue().add("upload", { id: row.id }, { jobId: row.id });
      return NextResponse.json({ queued: true });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "YouTube request failed" },
      {
        status: e instanceof Error && e.message === "Unauthorized" ? 401 : 400,
      },
    );
  }
}
export { route as GET, route as POST };
