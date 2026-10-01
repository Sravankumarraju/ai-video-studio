import { beforeEach, describe, expect, it, vi } from "vitest";
const { guard, updateMany } = vi.hoisted(() => ({ guard: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/security", () => ({ guard }));
vi.mock("@/lib/db", () => ({ db: { mcpConnection: { updateMany } } }));
vi.mock("@/lib/projects", () => ({ json: (value: unknown) => value }));
import { PATCH } from "../app/api/mcp-connections/route";
const request = () => new Request("http://localhost:3000/api/mcp-connections?id=connection-1", {
  method: "PATCH", body: JSON.stringify({ name: "My client", scopes: ["read", "edit", "render", "generate"] }),
});
beforeEach(() => { vi.clearAllMocks(); updateMany.mockResolvedValue({ count: 1 }); });
describe("owner connector permission changes", () => {
  it("rejects non-owner changes before touching connections", async () => {
    guard.mockImplementationOnce(() => { throw Error("Unauthorized"); });
    expect((await PATCH(request())).status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("updates only active connection scopes without rotating or exposing tokens", async () => {
    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "connection-1", revokedAt: null }, data: { name: "My client", scopes: ["read", "edit", "render", "generate"] } });
    expect(await response.json()).toEqual({ ok: true });
  });
  it("does not reactivate a revoked or missing connection", async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await PATCH(request())).status).toBe(404);
  });
});
