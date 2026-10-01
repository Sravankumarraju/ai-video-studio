import { guard } from "@/lib/security";
import { db } from "@/lib/db";
import { json } from "@/lib/projects";
import {
  connectionInput,
  newMcpToken,
  hashToken,
  publicConnection,
} from "@/lib/mcp-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    guard(req);
    return Response.json(
      (await db.mcpConnection.findMany({ orderBy: { createdAt: "desc" } })).map(
        publicConnection,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const text = await req.text();
    if (text.length > 2000) throw Error("Request too large");
    const input = connectionInput.parse(JSON.parse(text));
    const token = newMcpToken();
    const row = await db.mcpConnection.create({
      data: {
        name: input.name,
        scopes: json([...new Set(input.scopes)]),
        tokenHash: hashToken(token),
        prefix: token.slice(0, 15),
      },
    });
    return Response.json(
      { ...publicConnection(row), token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Invalid connection settings" },
      { status: 400 },
    );
  }
}
export async function DELETE(req: Request) {
  try {
    guard(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return Response.json({ error: "Connection ID required" }, { status: 400 });
  await db.mcpConnection.updateMany({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return Response.json({ ok: true });
}
export async function PATCH(req: Request) {
  try {
    guard(req);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw Error("Connection ID required");
    const text = await req.text();
    if (text.length > 2000) throw Error("Request too large");
    const input = connectionInput.parse(JSON.parse(text));
    const result = await db.mcpConnection.updateMany({
      where: { id, revokedAt: null },
      data: { name: input.name, scopes: json([...new Set(input.scopes)]) },
    });
    if (!result.count) return Response.json({ error: "Active connection not found" }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid connection settings" }, { status: 400 });
  }
}
