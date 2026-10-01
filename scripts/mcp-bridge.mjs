import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
const url = process.env.STORY_STUDIO_MCP_URL || "http://localhost:3000/api/mcp";
const token = process.env.STORY_STUDIO_MCP_TOKEN;
if (!token) {
  process.stderr.write(
    "Set STORY_STUDIO_MCP_TOKEN to an owner-created connector token.\n",
  );
  process.exit(1);
}
const target = new URL(url);
if (
  target.protocol !== "https:" &&
  !(
    target.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
  )
) {
  process.stderr.write("Remote MCP connections require HTTPS.\n");
  process.exit(1);
}
const upstream = new Client({
  name: "story-studio-desktop-bridge",
  version: "1.1.0",
});
const server = new Server(
  { name: "story-studio", version: "1.1.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
);
server.setRequestHandler(ListToolsRequestSchema, (req) =>
  upstream.listTools(req.params),
);
server.setRequestHandler(CallToolRequestSchema, (req) =>
  upstream.callTool(req.params),
);
server.setRequestHandler(ListResourcesRequestSchema, (req) =>
  upstream.listResources(req.params),
);
server.setRequestHandler(ReadResourceRequestSchema, (req) =>
  upstream.readResource(req.params),
);
server.setRequestHandler(ListPromptsRequestSchema, (req) =>
  upstream.listPrompts(req.params),
);
server.setRequestHandler(GetPromptRequestSchema, (req) =>
  upstream.getPrompt(req.params),
);
async function stop() {
  await server.close();
  await upstream.close();
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
try {
  await upstream.connect(
    new StreamableHTTPClientTransport(target, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  await server.connect(new StdioServerTransport());
} catch {
  process.stderr.write(
    "Story Studio MCP connection failed. Check that the app is running and the connector token is valid.\n",
  );
  await stop();
  process.exitCode = 1;
}
