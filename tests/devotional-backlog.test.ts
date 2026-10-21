import { describe, expect, it } from "vitest";
import {
  devotionalBacklog,
  devotionalResearchBundle,
  firstExperiment,
  starterPackage,
} from "../lib/devotional-backlog";
import { GET } from "../app/api/devotional-backlog/route";
import { sessionToken } from "../lib/security";

describe("devotional research boundaries", () => {
  it("preserves all 30 discovery topics without converting title counts into verified counts", () => {
    expect(devotionalBacklog).toHaveLength(30);
    expect(new Set(devotionalBacklog.map((w) => w.id)).size).toBe(30);
    expect(firstExperiment).toHaveLength(8);
    expect(
      firstExperiment.every((id) => devotionalBacklog.some((w) => w.id === id)),
    ).toBe(true);
    for (const w of devotionalBacklog) {
      expect(w.verifiedCounts).toEqual({ verses: null, names: null });
      expect(w.rightsStatus).toBe("needs_verification");
    }
    expect(
      devotionalBacklog.find((w) => w.id === "hanuman-chalisa")
        ?.originalLanguage,
    ).toBe("Awadhi");
  });
  it("keeps scaffold text, media, and timings empty until review and recording", () => {
    for (const id of ["lingashtakam", "mahalakshmi-ashtakam"]) {
      const p = starterPackage(id);
      expect(p.publish_ready).toBe(false);
      expect(p.production_status).toBe("blocked");
      expect(new Set(p.sections.map((s) => s.id)).size).toBe(p.sections.length);
      expect(
        p.sections.every(
          (s) => s.original_text === null && s.meaning_te === null,
        ),
      ).toBe(true);
      expect(
        p.scenes.every(
          (s) =>
            p.sections.some((section) => section.id === s.section_id) &&
            s.estimated_duration_seconds === null,
        ),
      ).toBe(true);
      expect(p.render_manifest.audio_asset).toBeNull();
      expect(p.captions.files).toEqual([]);
      expect(
        p.sources.every((s) => s.independence === "needs_verification"),
      ).toBe(true);
    }
    expect(() => starterPackage("toString")).toThrow();
    expect(() => starterPackage("vishnu-sahasranamam")).toThrow();
  });
  it("exports independent copies and leaves missing analytics null", () => {
    const bundle = devotionalResearchBundle();
    const packet = starterPackage("lingashtakam");
    packet.sections[0].review_status = "changed";
    expect(starterPackage("lingashtakam").sections[0].review_status).toBe(
      "needs_verification",
    );
    expect(bundle.analytics.ctr).toBeNull();
    expect(bundle.publicComparables).toEqual([]);
    expect(bundle.channelUrl).toContain("DivineWisdomTeluguOfficial");
  });
  it("requires owner authentication for research downloads", async () => {
    const response = await GET(
      new Request("http://localhost/api/devotional-backlog?download=1"),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("exports starter drafts and rejects unknown package IDs", async () => {
    const before = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET =
      "devotional-test-session-secret-with-32-characters";
    try {
      const headers = { cookie: `studio_session=${sessionToken()}` };
      const response = await GET(
        new Request(
          "http://localhost/api/devotional-backlog?package=lingashtakam&download=1",
          { headers },
        ),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-disposition")).toContain(
        "lingashtakam.json",
      );
      expect((await response.json()).publish_ready).toBe(false);
      expect(
        (
          await GET(
            new Request(
              "http://localhost/api/devotional-backlog?package=unknown",
              { headers },
            ),
          )
        ).status,
      ).toBe(404);
    } finally {
      if (before === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = before;
    }
  });
});
