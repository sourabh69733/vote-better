# Civic Data Pipeline Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Keep commits focused and review each task before continuing.

**Goal:** Publish one source-backed election record through a repeatable import, review and publication pipeline, while preserving the existing public pages.

**Architecture:** A separate `data/` worker collects source snapshots and turns them into standard observations. A reviewer resolves identity and evidence, then an approved publication job exports versioned public JSON for the existing Next.js app. PostgreSQL holds drafts, identities, decisions and revisions; file/object storage holds source copies only when permitted. The public site has no write access to the review database.

**Tech Stack:** TypeScript and Node.js for the worker (`data/package.json` with `tsx`, `typescript` and `pg`), PostgreSQL for durable records, and the existing Next.js site for public pages. Run integration tests against a local PostgreSQL service from `data/compose.yaml`. Add spatial storage and indexing when verified boundaries enter the product, not for the first election import.

**Spec:** [Interactive data architecture](../../architecture/vote-better-data-architecture.html) and [current data model](../../architecture/data-model.md).

## Scope and gates

The first vertical slice uses the [Rajasthan CEO Jaipur 2024 Form 21E return](https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf) already cited by the site. This document is an implementation plan, not approval to publish newly extracted facts. First inspect the source's format, access and reuse rules. The return may prove only a subset of candidate/result facts; coverage must say exactly what it proves. Candidate lists, other election types, boundaries, public work and citizen issues follow in separate slices.

The existing `web/records/*.ts` data remains the public source until the generated output matches it and a reviewer approves the switch. No import writes directly to public pages.

## Global constraints

- Every public claim and relationship has a source URL, checked date, source locator when available, review decision and publication revision.
- Keep raw source observations, identity matches and approved facts separate. A new fetch cannot silently replace a published value.
- Preserve effective time, source publication time when known, capture time and review time separately.
- Unknown, missing, disputed and not-covered are distinct states. Do not infer a person or area from a matching name or PIN code alone.
- Public trace and change history must omit private citizen details, precise location, credentials and abuse controls.
- Start with one worker process and one relational database. Add queues, search indexes and geographic services only when a measured need or the next source requires them.
- Use small concern-based commits. Do not push without a request.
- In `data/`, `npm test` runs `node --import tsx --test test/*.test.ts`, `npm run typecheck` runs `tsc --noEmit`, and `npm run db:migrate` applies numbered SQL migrations. Use `npm --prefix data ...` from the repo root.

## Review focus

1. The same source file is fetched twice: one snapshot is retained, with no duplicate draft or publication. Task 2 and Task 3 tests.
2. A revised source contradicts a published value: keep the public value and create a conflict for review. Task 4 test.
3. Two people share a name: identity resolution remains ambiguous and cannot auto-publish. Task 4 test.
4. A source is unavailable or cannot be parsed: log the attempt, preserve current published data and show stale coverage. Task 3 and Task 6 tests.
5. A published fact is corrected: old value, evidence, reason and review decision remain in public history without leaking reviewer private data. Task 5 and Task 6 tests.

## Task 1: Audit one source and lock the contract

**Files:** `docs/data-sources/rajasthan-form21e.md`, `data/src/contracts.ts`, `data/test/contracts.test.ts`, `data/package.json`, `data/tsconfig.json`.

**Interfaces:** Define `Source`, `Snapshot`, `Observation`, `EntityMatch`, `ReviewDecision`, `PublishedFact` and `CoverageStatus`. Give each an opaque ID. `Observation` contains `snapshotId`, `locator`, `predicate`, `rawValue`, `normalizedValue`, `effectiveOn?`, `extractedAt` and `normalizerVersion`. `PublishedFact` refers to approved observation IDs and a publication revision.

- [ ] Inspect the Jaipur official return and document URL, issuing authority, exact fields it proves, file format, update behavior and reuse constraints. Record what remains unknown. Do not equate the return with a complete candidate list.
- [ ] Write failing tests for required provenance fields, valid date order, explicit coverage state and rejection of a publication with no approved observation.
- [ ] Implement the smallest runtime validators and types in `contracts.ts`; run `npm --prefix data test` and `npm --prefix data run typecheck`.
- [ ] Commit the source audit and contract together: `docs/data: define first source contract`.

**Gate:** Another source can produce the same `Observation` type without changing public page types.

## Task 2: Persist source snapshots and decisions

**Files:** `data/migrations/001_core.sql`, `data/src/store.ts`, `data/src/blob-store.ts`, `data/test/store.test.ts`, `data/compose.yaml`, `data/README.md`.

**Interfaces:** `saveSnapshot(sourceId, url, contentHash, capturedAt, blobRef?) -> snapshotId`; `saveObservations(snapshotId, observations) -> ids`; `recordDecision(observationIds, decision, reviewerId, reason) -> decisionId`; `listPublicationCandidates() -> approved observations`. Use a unique source-and-hash key for idempotence. Store immutable review events and publication revisions.

- [ ] Write integration tests for duplicate snapshots, missing source references, immutable decisions and a failed write that leaves no partial observation set.
- [ ] Add tables for source, snapshot, observation, person, area, election, contest, review event, approved fact and publication revision. Add a storage adapter. Use a local file blob store in development and a replaceable object-store interface for deployment. Do not assume copies of source files may be publicly redistributed.
- [ ] Start the local database with `docker compose -f data/compose.yaml up -d`, run `npm --prefix data run db:migrate`, then `npm --prefix data test`; verify migration replay and recovery from a failed transaction.
- [ ] Commit: `data: persist evidence and review history`.

**Gate:** A source can change or disappear without destroying the prior evidence and review history.

## Task 3: Collect and normalize the first source

**Files:** `data/src/sources/rajasthan-form21e.ts`, `data/src/normalize/rajasthan-form21e.ts`, `data/test/rajasthan-form21e.test.ts`, `data/test/fixtures/`.

**Interfaces:** `collect(source: Source) -> Snapshot`; `normalize(snapshot: Snapshot) -> Observation[]`. The connector records fetch outcome, URL, capture time and content hash. The normalizer emits only fields confirmed in Task 1, each with a document locator and normalizer version.

- [ ] Freeze a minimal permitted test fixture or an extracted text fixture with its source locator. Write a failing test for the Jaipur facts already manually curated in `web/records/jaipur.ts`, plus malformed and changed documents.
- [ ] Implement fetch with bounded retry and polite rate limits. Return a recorded failure on unavailable sources; do not publish or overwrite data.
- [ ] Implement and test the source-specific normalizer. If reliable automated extraction is not possible, use a reviewed extraction input tied to the snapshot and locator; keep the same observation contract and record the manual step.
- [ ] Verify a second fetch of identical content produces no new observations with `npm --prefix data test`. Commit: `data: collect and normalize Jaipur return`.

**Gate:** The draft values are reproducible from a captured source and parser version. They are still unpublished.

## Task 4: Resolve identity, conflicts and review

**Files:** `data/src/match.ts`, `data/src/review.ts`, `data/src/cli.ts`, `data/test/review.test.ts`.

**Interfaces:** `proposeMatches(observation, knownEntities) -> EntityMatch[]`; `queueForReview(observationIds) -> ReviewCase`; `approve(caseId, reviewerId, reason) -> ReviewDecision`. A trusted local CLI is enough for the first reviewer; no public review action until authentication and roles are designed.

- [ ] Write failing tests for the two-name collision, a conflicting result, an exact existing entity link and a rejected draft.
- [ ] Implement conservative matching using official IDs and election/contest context. Name-only matches stay ambiguous. Show before/after values, evidence and coverage in the review command.
- [ ] Require an explicit reviewer decision and reason; preserve rejected and superseded observations. Run `npm --prefix data test`. Commit: `data: review identity and conflicting claims`.

**Gate:** No ambiguous or conflicting draft can reach the publication exporter.

## Task 5: Export approved data and public trace

**Files:** `data/src/publish.ts`, `data/test/publish.test.ts`, `web/records/generated/jaipur.json`, `web/records/registry.ts`, `web/app/facts/[factId]/page.tsx`, focused web tests.

**Interfaces:** `buildPublication(approvedFacts) -> { revision, dataset, traces, coverage }`. Write the approved output to `web/records/generated/jaipur.json`, including its revision; the web build reads this file. Each public fact has a stable ID and a trace to source, locator, normalizer version, review date and revision; expose only public-safe decision fields.

- [ ] Write failing tests that an unapproved observation cannot export, a correction preserves history, and generated Jaipur data matches the current sourced profile and area pages.
- [ ] Build the exporter and public trace page. Make `registry.ts` consume generated Jaipur data while retaining the manually reviewed Jaipur Rural record. Validate the merged dataset before build.
- [ ] Run `npm --prefix data test`, then `npm test`, `npm run lint` and `npm run build -- --webpack` in `web/`; inspect profile, area, graph and trace pages. Commit the exporter and site adapter as separate focused commits if their review boundaries differ.

**Gate:** A reviewer can follow a displayed Jaipur fact back to its source and publication decision. The current site does not lose any verified facts.

## Task 6: Make freshness and coverage visible

**Files:** `data/src/coverage.ts`, `data/test/coverage.test.ts`, `web/app/areas/[areaId]/page.tsx`, focused web tests, `docs/data-sources/rajasthan-form21e.md`.

**Interfaces:** `getCoverage(areaId, factType) -> { state, lastCheckedOn?, lastPublishedOn?, reason? }`, where state is `covered | partial | missing | stale | disputed`.

- [ ] Write failing tests for source failure, partial candidate coverage, conflicting facts and a successful refresh with unchanged content.
- [ ] Export coverage with the public data and display it on the area page. A missing source is never shown as zero activity or zero candidates.
- [ ] Document the source's recheck trigger and manual review procedure. Verify tests, lint, build and the public page. Commit: `data: show source coverage and freshness`.

**Gate:** A citizen can tell both what is known and what the platform has not checked.

## Expansion after the first vertical slice

1. **All candidates in a contest:** audit an official candidate list source, add its adapter and normalizer, then compare its coverage with result records. Do not treat the first return as a full field of candidates.
2. **More elections:** add election-event and contest records for assembly, local and other election types. Each new authority gets a source audit and adapter, never a fork of the public schema.
3. **Geography:** acquire and review versioned official boundaries; then add spatial lookup. Until then, use explicit area selection.
4. **Representatives, departments and public work:** add dated appointment, responsibility, project, milestone and outcome observations. Keep announcements, reported progress and measured outcomes separate.
5. **National operations:** partition collection jobs by source/election, add job monitoring and backups, cache public read views, and measure error rate, review backlog, freshness, publication delay and page latency. Introduce a queue or search service only when those measures require it.

These are separate implementation plans after the first slice. Candidate profiles, issue escalation, ranking and citizen submissions need their own trust, privacy and product decisions.
