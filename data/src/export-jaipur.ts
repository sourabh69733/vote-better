import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import pg from "pg";

import { migrate } from "./migrate.js";
import { loadPublication, publishApproved } from "./publish.js";
import { getSourceCoverage } from "./coverage.js";
import { JAIPUR_FORM21E_URL } from "./sources/rajasthan-form21e.js";

const target = fileURLToPath(new URL("../../web/records/generated/jaipur.json", import.meta.url));

// Passing observation ids publishes those approved facts first; with none, the current revision is rewritten.
export async function exportJaipur(pool: pg.Pool, observationIds: string[] = []): Promise<string> {
  const publication = observationIds.length
    ? await publishApproved(pool, JAIPUR_FORM21E_URL, observationIds)
    : await loadPublication(pool, JAIPUR_FORM21E_URL);
  const coverage = await getSourceCoverage(pool, "jaipur-lok-sabha", "election-result-candidates", JAIPUR_FORM21E_URL);
  // Coverage is recomputed on every run; keep the file as it is when only that time would change,
  // so a scheduled export does not open a pull request with nothing new in it.
  const existing = await readFile(target, "utf8").then((text) => JSON.parse(text), () => null);
  if (existing && isDeepStrictEqual({ ...existing, coverage: { ...existing.coverage, computedAt: null } },
    { ...publication, coverage: { ...coverage, computedAt: null } })) {
    return `Jaipur publication unchanged: ${publication.facts.length} fact(s), revision ${publication.revisionId ?? "none"}.`;
  }
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ ...publication, coverage }, null, 2)}\n`, { flag: "w" });
  await rename(temporary, target);
  return `Jaipur publication written: ${publication.facts.length} fact(s), revision ${publication.revisionId ?? "none"}.`;
}

async function main(args: string[]): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    process.stdout.write(`${await exportJaipur(pool, args)}\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
