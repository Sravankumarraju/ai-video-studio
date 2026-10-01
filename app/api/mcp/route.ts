import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcp } from "@/lib/mcp-auth";
import { createMcpServer } from "@/lib/mcp-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  let connection: string;
  try {
    connection = await authenticateMcp(req);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error && e.message.includes("origin")
            ? "Invalid MCP host or origin"
            : "MCP bearer token required or revoked",
      },
      {
        status: e instanceof Error && e.message.includes("origin") ? 403 : 401,
      },
    );
  }
  const server = createMcpServer(connection);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 13 * 1024 * 1024,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    // Fully consume the JSON response before closing the request-scoped transport.
    const body = await response.arrayBuffer();
    return new Response(body.byteLength ? body : null, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await server.close();
  }
}
export async function GET(req: Request) {
  try {
    await authenticateMcp(req);
  } catch {
    return Response.json(
      { error: "MCP authentication required" },
      { status: 401 },
    );
  }
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export const DELETE = GET;
