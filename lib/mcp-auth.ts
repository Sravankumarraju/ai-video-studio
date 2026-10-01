import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { z } from "zod";
export const mcpScope = z.enum(["read", "edit", "render", "generate"]);
export type McpScope = z.infer<typeof mcpScope>;
export const connectionInput = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(mcpScope).min(1).max(4),
});
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newMcpToken = () => `ss_mcp_${randomBytes(32).toString("hex")}`;
export function checkMcpOrigin(req: Request) {
  const expected = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || new URL(req.url).host;
  if (host !== expected.host || (origin && origin !== expected.origin))
    throw Error("Invalid MCP host or origin");
}
export async function authenticateMcp(req: Request) {
  checkMcpOrigin(req);
  const token = req.headers
    .get("authorization")
    ?.match(/^Bearer (ss_mcp_[a-f0-9]{64})$/)?.[1];
  if (!token) throw Error("MCP bearer token required");
  const connection = await db.mcpConnection.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!connection || connection.revokedAt)
    throw Error("Invalid or revoked MCP token");
  return connection.id;
}
export async function requireMcpScope(connectionId: string, scope: McpScope) {
  const connection = await db.mcpConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection || connection.revokedAt)
    throw Error("Invalid or revoked MCP token");
  if (!z.array(mcpScope).parse(connection.scopes).includes(scope))
    throw Error(`Connector needs ${scope} permission`);
  await db.mcpConnection.update({
    where: { id: connectionId },
    data: { lastUsedAt: new Date() },
  });
}
export function publicConnection(c: {
  id: string;
  name: string;
  prefix: string;
  scopes: unknown;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}) {
  return {
    id: c.id,
    name: c.name,
    prefix: c.prefix,
    scopes: c.scopes,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
    revokedAt: c.revokedAt,
  };
}
