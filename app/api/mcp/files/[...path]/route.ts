import {
  authenticateMcp,
  requireMcpScope,
  checkMcpOrigin,
} from "@/lib/mcp-auth";
import { authorized, sessionToken } from "@/lib/security";
import { GET as ownerGet } from "@/app/api/[...path]/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    checkMcpOrigin(req);
    if (!authorized(req))
      await requireMcpScope(await authenticateMcp(req), "read");
  } catch {
    return Response.json(
      { error: "Read permission required" },
      { status: 401 },
    );
  }
  const path = (await ctx.params).path;
  const validId = /^[a-zA-Z0-9_-]{1,80}$/;
  if (
    !(path.length === 2 && path[0] === "assets" && validId.test(path[1])) &&
    !(
      path.length === 3 &&
      path[0] === "jobs" &&
      validId.test(path[1]) &&
      path[2] === "download"
    )
  )
    return Response.json({ error: "File not found" }, { status: 404 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "mp4";
  if (!["mp4", "srt", "vtt"].includes(format))
    return Response.json({ error: "Invalid export format" }, { status: 400 });
  const headers = new Headers();
  headers.set("cookie", `studio_session=${sessionToken()}`);
  const range = req.headers.get("range");
  if (range) headers.set("range", range);
  return ownerGet(
    new Request(`${url.origin}/api/${path.join("/")}?format=${format}`, {
      headers,
    }),
    { params: Promise.resolve({ path }) },
  );
}
