// Offline, deterministic preparation only. Never connects to providers or the database.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { devotionalResearchBundle } from "../lib/devotional-backlog";

async function main() {
  const out = path.resolve("data/productions/devotional-research");
  const bundle = devotionalResearchBundle();
  await mkdir(out, { recursive: true });
  await writeFile(
    path.join(out, "research.json"),
    JSON.stringify(bundle, null, 2) + "\n",
    "utf8",
  );
  for (const packet of bundle.packages) {
    // Write generated starter files only; reviewed texts belong in a separate edition file.
    await writeFile(
      path.join(out, `${packet.content_id}.draft.json`),
      JSON.stringify(packet, null, 2) + "\n",
      "utf8",
    );
  }
  console.log(
    `Prepared ${bundle.works.length} backlog records and ${bundle.packages.length} blocked starter drafts in ${out}`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
