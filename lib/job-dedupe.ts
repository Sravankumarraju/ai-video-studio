import {createHash} from "node:crypto";
// Bump when rendering behavior changes so an unchanged document can produce a fresh preview.
export const RENDER_ENGINE_VERSION = 2;
export function jobDedupeKey(projectId: string, kind: string, snapshot: unknown, renderEngineVersion = RENDER_ENGINE_VERSION) {
  return createHash("sha256").update(JSON.stringify({projectId, kind, snapshot, ...(kind === "render" ? {renderEngineVersion} : {})})).digest("hex");
}
