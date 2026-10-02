import { describe, it, expect } from "vitest";
import { isExportForVariant } from "../lib/export-visibility";

describe("version export visibility", () => {
  it("hides a removed short export even when only the long version remains", () => {
    expect(isExportForVariant({ variantId: "short" }, "long", 1)).toBe(false);
    expect(isExportForVariant({ variantId: "long" }, "long", 1)).toBe(true);
  });
  it("preserves legacy single-version exports without guessing across versions", () => {
    expect(isExportForVariant({}, "long", 1)).toBe(true);
    expect(isExportForVariant({}, "long", 2)).toBe(false);
    expect(isExportForVariant(undefined, undefined, 1)).toBe(false);
  });
});
