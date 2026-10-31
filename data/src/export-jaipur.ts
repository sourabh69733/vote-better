import { writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { migrate } from "./migrate.js";
import { loadPublication, publishApproved } from "./publish.js";
import { getSourceCoverage } from "./coverage.js";
import { JAIPUR_FORM21E_URL } from "./sources/rajasthan-form21e.js";

const target = fileURLToPath(new URL("../../web/records/generated/jaipur.json", import.meta.url));

async function main(args: string[]): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const publication = args.length
      ? await publishApproved(pool, JAIPUR_FORM21E_URL, args)
      : await loadPublication(pool, JAIPUR_FORM21E_URL);
    const coverage = await getSourceCoverage(pool, "jaipur-lok-sabha", "election-result-candidates", JAIPUR_FORM21E_URL);
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify({ ...publication, coverage }, null, 2)}\n`, { flag: "w" });
    await rename(temporary, target);
    process.stdout.write(`Jaipur publication written: ${publication.facts.length} fact(s), revision ${publication.revisionId ?? "none"}.\n`);
  } finally {
    await pool.end();
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
