import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ guard: vi.fn(), finish: vi.fn() }));
vi.mock("../lib/security", () => ({ guard: mock.guard }));
vi.mock("../lib/db", () => ({ db: {} }));
vi.mock("../lib/youtube", () => ({ beginYoutube: vi.fn(), configureYoutube: vi.fn(), finishYoutube: mock.finish, youtubeStatus: vi.fn() }));
vi.mock("../lib/youtube-uploads", () => ({ queueYoutubeUpload: vi.fn(), youtubeQueue: vi.fn() }));
import { GET, POST } from "../app/api/youtube/[...path]/route";
describe("Google redirect with a Strict owner-session cookie", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.APP_ORIGIN = "http://localhost:3000"; mock.guard.mockImplementation(() => { throw Error("Unauthorized"); }); mock.finish.mockResolvedValue(undefined); });
  it("accepts a Google GET callback through state/PKCE verification even though the Strict owner cookie is absent", async () => {
    const response = await GET(new Request("http://localhost:3000/api/youtube/callback?state=state&code=code", { headers: { cookie: "youtube_oauth_state=state" } }), { params: Promise.resolve({ path: ["callback"] }) });
    expect(response.status).toBe(307);
    expect(mock.guard).not.toHaveBeenCalled();
    expect(mock.finish).toHaveBeenCalledWith("state", "state", "code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/?youtube=connected");
  });
  it("still requires state verification rather than trusting a copied callback URL", async () => {
    mock.finish.mockRejectedValue(Error("Invalid OAuth callback"));
    const response = await GET(new Request("http://localhost:3000/api/youtube/callback?state=state&code=code"), { params: Promise.resolve({ path: ["callback"] }) });
    expect(response.status).toBe(400); expect(mock.finish).toHaveBeenCalledWith("state", "", "code");
  });
  it("does not let an OAuth cookie authorize ordinary API calls or POST callbacks", async () => {
    const headers = { cookie: "youtube_oauth_state=state" };
    expect((await GET(new Request("http://localhost:3000/api/youtube/status", { headers }), { params: Promise.resolve({ path: ["status"] }) })).status).toBe(401);
    expect((await POST(new Request("http://localhost:3000/api/youtube/callback", { method: "POST", headers }), { params: Promise.resolve({ path: ["callback"] }) })).status).toBe(401);
    expect(mock.finish).not.toHaveBeenCalled();
  });
});
