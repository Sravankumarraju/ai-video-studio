import {
  devotionalResearchBundle,
  starterPackage,
} from "@/lib/devotional-backlog";
import { guard } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    guard(req);
  } catch {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("package");
  let payload;
  try {
    payload = id ? starterPackage(id) : devotionalResearchBundle();
  } catch {
    return Response.json(
      { error: "Starter package not found" },
      { status: 404 },
    );
  }
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (url.searchParams.get("download") === "1") {
    headers["Content-Disposition"] =
      `attachment; filename="${id ? (payload as ReturnType<typeof starterPackage>).content_id : "divine-wisdom-research"}.json"`;
  }
  return Response.json(payload, { headers });
}
