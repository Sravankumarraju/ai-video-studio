import { realpath, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
export async function cleanupTemp(dir: string) {
  const root = await realpath(tmpdir());
  const resolved = await realpath(dir);
  if (
    path.dirname(resolved).toLowerCase() !== root.toLowerCase() ||
    !/^story-(render|import|upload)-[a-z0-9]+$/i.test(path.basename(resolved))
  )
    throw Error("Refusing to clean an unexpected temporary directory");
  await rm(resolved, { recursive: true, force: true });
}
