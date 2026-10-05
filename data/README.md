# Civic data worker

This package stores draft evidence and review history. It does not publish facts to the website. The site continues to use its reviewed records until a later publication step is approved.

## Local setup

Use Node.js 20.9 or newer and Docker. From the repository root:

```sh
npm --prefix data ci
docker compose -f data/compose.yaml up -d --wait
npm --prefix data run db:migrate
npm --prefix data test
npm --prefix data run typecheck
```

To fetch the audited Jaipur Form 21E and save draft observations:

```sh
npm --prefix data run import:jaipur
```

The import refuses a changed PDF until its page-linked transcription in `extractions/jaipur-form21e-2024.json` is checked and updated. The transcription is explicitly unreviewed. The command never publishes to the website. It saves source URL, PDF hash and check attempts, but does not retain PDF bytes. A private blob storage adapter exists for sources whose reuse policy permits retaining a copy.

The Rajasthan source currently needs legacy TLS renegotiation. Only this exact URL uses a source-specific adapter; normal certificate verification stays enabled. Other source adapters should use the standard fetch path.

The default local database URL is `postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better`. Set `DATABASE_URL` to use a different database. The Compose password is only for local development. Stop the container with `docker compose -f data/compose.yaml down`; omitting `-v` retains the database volume.

Migrations are numbered SQL files in `migrations/`. The runner applies each once, records its SHA-256 hash, and rejects edits to a migration that has already run. Add a new migration for schema changes.

`LocalBlobStore` can keep source copies under a private directory such as `data/raw/`. It verifies SHA-256 on read and returns an opaque reference. Do not serve that directory publicly. The Rajasthan PDF's redistribution permission has not been established; the first collector should link to the official source and save a private copy only when the team's reuse policy allows it.

The database assigns `recorded_at` when a row is inserted. Source dates and real-world validity dates are separate fields with their original precision. Snapshots, observations, review decisions and publication revisions are append-only. A new fetch does not change published facts.

## Local review

Run `npm --prefix data run review -- queue` to see unreviewed observations with source URL, locator, hash, captured time and any earlier published value. Pass a limit and exact source URL to filter a source. Coverage is shown as not assessed until the coverage phase. `show <observation-id>` includes decision history. Candidate facts need a confirmed person link before approval. The PDF contains names, not unique person IDs, so the reviewer must check the identity against independent evidence before using `person <stable-key> <display-name>` and `link <observation-id> <person-id> <reviewer-id> <reason>`. Creating a person is only an internal identity record, not a public claim. Use `approve`, `reject`, or `needs-changes` with an observation ID, reviewer ID and reason. A changed published value is blocked pending a separate conflict resolution flow. The review command never publishes data.
