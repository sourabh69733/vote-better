import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { LocalBlobStore } from "../blob-store.js";
import { migrate } from "../migrate.js";
import { buildDelhiPublication, loadReviewedDelhiRows } from "./export.js";

const directory = fileURLToPath(new URL("../../raw/delhi/", import.meta.url));
const target = resolve(directory, "publication-preview.json");

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const rows = await loadReviewedDelhiRows(pool, new LocalBlobStore(directory));
    const publication = buildDelhiPublication(rows, "preview");
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify(publication, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, target);
    process.stdout.write(`Delhi preview exported: ${publication.offices.length} offices, ${publication.people.length} people, ${publication.traces.length} traces.\n`);
  } finally { await pool.end(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
