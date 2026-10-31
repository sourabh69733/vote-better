import pg from "pg";

import { migrate } from "./migrate.js";
import { CivicReview } from "./review.js";
import { resolvePublicationConflict } from "./publish.js";

const usage = `Usage:
  npm run review -- queue [limit] [source-url]
  npm run review -- show <observation-id>
  npm run review -- people
  npm run review -- person <stable-key> <display-name>
  npm run review -- link <observation-id> <person-id> <reviewer-id> <reason>
  npm run review -- resolve <observation-id> <previous-fact-id> <reviewer-id> <reason>
  npm run review -- approve|reject|needs-changes <observation-id> <reviewer-id> <reason>`;

async function main(args: string[]): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" });
  try {
    await migrate(pool);
    const review = new CivicReview(pool);
    const [command, ...rest] = args;
    if (command === "queue") {
      const limit = rest[0] === undefined ? 25 : Number(rest[0]);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200 || rest.length > 2) throw new Error("queue limit must be 1 to 200");
      const result = await pool.query(`
        SELECT o.id FROM observation o JOIN snapshot s ON s.id = o.snapshot_id
        LEFT JOIN LATERAL (
          SELECT r.decision FROM review_observation ro JOIN review_event r ON r.id = ro.review_id
          WHERE ro.observation_id = o.id ORDER BY r.sequence DESC LIMIT 1
        ) latest ON true
        WHERE (latest.decision IS NULL OR latest.decision = 'needs-changes')
          AND ($2::text IS NULL OR s.url = $2)
        ORDER BY o.recorded_at, o.id LIMIT $1
      `, [limit, rest[1] ?? null]);
      const cases = result.rows.length ? await review.queueForReview(result.rows.map((row) => row.id)) : [];
      process.stdout.write(`${JSON.stringify(cases, null, 2)}\n`);
    } else if (command === "show" && rest.length === 1) {
      const [item] = await review.queueForReview([rest[0]]);
      const history = await review.history(rest[0]);
      process.stdout.write(`${JSON.stringify({ ...item, history }, null, 2)}\n`);
    } else if (command === "people" && rest.length === 0) {
      const result = await pool.query("SELECT id, stable_key, display_name, recorded_at FROM person ORDER BY stable_key LIMIT 200");
      process.stdout.write(`${JSON.stringify(result.rows, null, 2)}\n`);
    } else if (command === "person" && rest.length === 2) {
      if (!rest[0].trim() || !rest[1].trim()) throw new Error("stable key and display name are required");
      const result = await pool.query(
        "INSERT INTO person (stable_key, display_name) VALUES ($1, $2) RETURNING id, stable_key, display_name, recorded_at",
        rest,
      );
      process.stdout.write(`${JSON.stringify(result.rows[0], null, 2)}\n`);
    } else if (command === "link" && rest.length === 4) {
      await review.confirmIdentity(rest[0], rest[1], rest[2], rest[3]);
      process.stdout.write("Identity link recorded.\n");
    } else if (command === "resolve" && rest.length === 4) {
      await resolvePublicationConflict(pool, rest[0], rest[1], rest[2], rest[3]);
      process.stdout.write("Conflict resolution recorded. Review the case again before approval.\n");
    } else if (["approve", "reject", "needs-changes"].includes(command) && rest.length === 3) {
      const decision = command === "reject" ? "rejected" : command === "needs-changes" ? "needs-changes" : "approved";
      const result = await review.decide(rest[0], decision, rest[1], rest[2]);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      throw new Error(usage);
    }
  } finally {
    await pool.end();
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
