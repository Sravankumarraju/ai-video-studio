import { describe, it, expect, vi, beforeEach } from "vitest";

const jobs = new Map<string, Record<string, unknown>>();
vi.mock("../lib/db", () => ({
  db: {
    job: {
      findUnique: async ({ where }: { where: { id: string } }) => jobs.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const next = { ...jobs.get(where.id), ...data };
        jobs.set(where.id, next);
        return next;
      },
    },
  },
}));
const { recordQueueFailure } = await import("../lib/jobs");

describe("jobs failed by the queue itself (stalled worker)", () => {
  beforeEach(() => jobs.clear());
  it("marks an orphaned running render failed so Retry can resume it", async () => {
    jobs.set("r", { id: "r", kind: "render", state: "running" });
    await recordQueueFailure("r", "job stalled more than allowable limit");
    expect(jobs.get("r")).toMatchObject({ state: "failed", stage: "Interrupted" });
    expect(String(jobs.get("r")!.error)).toContain("completed scene clips are reused");
  });
  it("asks for reconciliation when a paid submission may already have been charged", async () => {
    jobs.set("v", { id: "v", kind: "voice", state: "running", submittedAt: new Date(), providerJobId: null, result: null });
    await recordQueueFailure("v", "job stalled more than allowable limit");
    expect(jobs.get("v")).toMatchObject({ state: "waiting-for-input", stage: "Needs reconciliation" });
  });
  it("leaves jobs the worker already finished or failed untouched", async () => {
    for (const state of ["completed", "failed", "stale", "cancelled", "waiting-for-input"]) {
      jobs.set(state, { id: state, kind: "render", state, error: "original" });
      await recordQueueFailure(state, "late event");
      expect(jobs.get(state)).toMatchObject({ state, error: "original" });
    }
  });
});
