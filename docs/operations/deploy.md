# Deploying Vote Better

The production setup has four parts. None of them is a server we maintain.

| Part | Runs on | What it does |
| --- | --- | --- |
| Website | Vercel | Builds `web/` from `main`. Pages read JSON files committed under `web/records/`; there is no database call per page view. |
| Database | Neon (Postgres) | Holds sources, snapshots, observations, review decisions, published facts and the sync run log. |
| Raw files | Cloudflare R2 | Holds the hashed source files (`data/raw/`), so a sync on a fresh machine can read what earlier runs saved. |
| Sync | GitHub Actions | `.github/workflows/sync.yml` runs hourly: `sync --due`, then, if anything ran, `export:all` and one pull request with the changes. |

Nothing reaches the site until a person merges the data pull request.

## 1. Database (Neon)

1. Create a Neon project with Postgres 16 in the region nearest India.
2. Copy the **direct** connection string, not the pooled one. The sync takes a Postgres advisory lock per source, and that lock needs a session-level connection; a pooled connection in transaction mode would break it. Keep `?sslmode=require`.
3. Copy the local database, so the review decisions made so far carry over:

   ```sh
   pg_dump --format=custom --no-owner --no-acl "postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better" > vote-better.dump
   pg_restore --no-owner --no-acl --dbname "<neon direct connection string>" vote-better.dump
   ```

4. Check it: `DATABASE_URL="<neon string>" npm --prefix data run sync -- --list` shows the same last runs as the local database.

## 2. Raw files (Cloudflare R2)

1. Create a private bucket, for example `vote-better-raw`.
2. Create an R2 API token with **Object Read & Write** on that bucket only. Note the access key ID, the secret and the S3 endpoint (`https://<account-id>.r2.cloudflarestorage.com`).
3. Upload the existing raw files with the same layout:

   ```sh
   aws s3 sync data/raw s3://vote-better-raw --endpoint-url https://<account-id>.r2.cloudflarestorage.com
   ```

The bucket is private. Some files in it (boundary maps, Sansad exports) wait on reuse decisions 5 and 8 and must not be made public.

## 3. GitHub

Under **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | The Neon direct connection string |
| `BLOB_BUCKET` | The bucket name |
| `BLOB_ENDPOINT` | The R2 S3 endpoint |
| `BLOB_ACCESS_KEY_ID` | The R2 access key ID |
| `BLOB_SECRET_ACCESS_KEY` | The R2 secret |
| `DATA_PR_TOKEN` (optional) | A fine-grained token with contents and pull request write access to this repository. Without it the data pull request is opened with `GITHUB_TOKEN`, and GitHub does not run CI on pull requests opened that way. |

Under **Settings → Actions → General**, turn on **Allow GitHub Actions to create and approve pull requests**.

Scheduled workflows run only from the default branch, so the scheduled sync starts once `sync.yml` is on `main`. To try it before then, open **Actions → Data sync → Run workflow**.

## 4. Website (Vercel)

1. Import the repository in Vercel. Set **Root Directory** to `web`; the framework is detected as Next.js.
2. Set the production branch to `main`.
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` with the public address, for example `https://votebetter.in`. Link previews and share images use it.
4. Add the domain.

These stay off in production because their files are not in the repository: PIN search (`PIN_LOOKUP_FILE`, decision 8), and the Sansad MP directory (`VOTE_BETTER_MP_EXPORT`, decision 5). Research and mockup pages answer only in development.

## Day to day

- **Data pull request.** The workflow keeps one open pull request on the `data-sync` branch and updates it on each run. Its description lists the sources that ran and what the export wrote. Review the diff, then merge; Vercel deploys `main`.
- **Failures.** A failed source opens an issue labelled `sync-failure`, or adds a comment to the open one, with the failing sources and a link to the run. The source is retried after 1, 2, 4 hours and so on, up to a week. The issue closes itself after the next sync with no failures.
- **Freshness.** The About page lists every source with the day it was last checked, and marks it overdue once twice its refresh interval has passed.
- **Manual runs.** Locally, with the secrets set as environment variables, `npm --prefix data run sync -- <source-id>` and `npm --prefix data run export:all` do the same as the workflow.
