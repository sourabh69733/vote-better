# Delhi Public Information Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Keep commits focused. Do not push without a request.

**Goal:** Let a Delhi resident find public institutions, officeholders, official contacts, legal rights and justice resources with dated, traceable evidence.

**Architecture:** Extend the existing PostgreSQL evidence pipeline with institutions, offices, appointments and jurisdictions. Source-specific adapters produce observations; identity and current-status changes require review; a versioned public export feeds the existing Next.js site. Search and directories are the primary UI; graph views reuse the same published records.

**Tech Stack:** Existing Node.js/TypeScript `data/` worker, PostgreSQL, local blob store, Next.js 16/React 19 `web/`. No new database or queue in the first release.

**Spec:** [Delhi public information system](../../architecture/delhi-public-information-system.md)

## Global constraints

- No claim of complete Delhi coverage. Show covered, partial, stale, disputed and missing categories.
- Every published person-role, jurisdiction, contact and legal statement has a source locator, capture time, review time and publication revision.
- Source checks never run on a user page request. A failed fetch preserves the last reviewed version and marks it stale.
- Person identity, office identity and appointment history stay separate. No name-only automatic merge.
- Courts and lawyers are separate from the executive hierarchy. No private contact details or bulk republication of litigant identities.
- Public rights explanations require source verification and legal review before publication. Show effective and last-reviewed dates.
- PIN or browser location suggests a service area only after its boundary is confirmed; never assert a representative or police station from PIN alone.
- Keep source-specific collection rules and reuse conditions in an audited catalog. Current official directories may themselves be stale.

## Delivery phases

| Phase | Shipped result | Exit gate |
| --- | --- | --- |
| 0. Source map | Delhi institutions, source URLs, authority, access terms, refresh policy and explicit coverage | Each initial source is audited and can fail without inventing facts |
| 1. Public offices | Searchable Delhi ministers, MPs, MLAs, government departments, police offices, appointments, contacts and jurisdictions | A resident can trace each visible role to its captured source; namesakes do not merge |
| 2. Rights and help | Situation-based BNSS/Constitution guides, Delhi legal aid and police contact paths | Legal reviewer approves text; source and review dates visible; ordinary and preventive custody are distinguished |
| 3. Justice | Court hierarchy, sitting judges, public order links and legal-aid bodies | Court links resolve; stale roster is labelled; no case-party bulk index |
| 4. Advocates | Enrolment-ID verification and optional claimed professional profiles | Verification is permitted by source and cannot be confused with endorsement or government employment |
| 5. Public records | Orders, notices, assembly activity, budgets and work records linked to responsible institutions | Announcement, decision and outcome remain distinct; source coverage is measurable |
| 6. Operations | Scheduled checks, review queue, correction history, monitoring and backups | Freshness and failure dashboards, repeatable recovery, measured performance on Delhi dataset |

Phases 3-6 are separate source and implementation plans after the first release. Their completion is not a prerequisite for the first Delhi directory and rights experience. Add agencies such as MCD, NDMC, DDA and Delhi Police by audited source, without hardcoding one institution into the data model or UI.

**First-release acceptance:** A user can find a Delhi minister, MP, MLA, department or police office and see what the source proves, its jurisdiction, official contact when available, last check and missing coverage. The rights section provides legally reviewed situation guides; until review is obtained, it shows only official law and DSLSA links, not interpretive instructions. The release reports covered/expected records per audited source and never calls partial coverage complete.

## File map for phases 0-2

| File | Responsibility |
| --- | --- |
| `data/src/delhi/source-catalog.ts` | Machine-readable source scope and refresh rules |
| `data/migrations/005_delhi_registry.sql` | Institution, office, appointment, jurisdiction and facility records |
| `data/src/delhi/registry.ts` | Repository operations and validation for Delhi graph relationships |
| `data/src/delhi/normalize/gnctd.ts` | GNCTD directory-specific parser; no network access |
| `data/src/delhi/normalize/assembly.ts` | Delhi Assembly member-specific parser; no network access |
| `data/src/delhi/normalize/police.ts` | Delhi Police directory-specific parser; no network access |
| `data/src/delhi/collect.ts` | Paced snapshot capture and attempt logging, reusing existing storage |
| `data/src/delhi/review.ts` | Diff and identity/appointment review queue |
| `data/src/delhi/export.ts` | Reviewed, versioned public Delhi export and coverage |
| `web/lib/delhi.ts` | Validate and load the public export |
| `web/app/delhi/page.tsx` | Delhi search, category entry points and coverage |
| `web/app/delhi/institutions/[id]/page.tsx` | Office, incumbent, jurisdiction, history and sources |
| `web/app/rights/page.tsx`, `web/app/rights/[situation]/page.tsx` | Short situation-based rights paths |
| `web/lib/rights.ts` | Versioned legal guide contract and public loader |

## Review focus

1. Two officers share a name: Task 3 leaves their person matches separate until reviewed.
2. An official page lists an outdated minister: Task 3 records the conflict and Task 4 does not mark the old holder current.
3. An official directory fails during a protest: Task 2 logs the attempt, Task 4 retains the last reviewed value and labels coverage stale.
4. An address or PIN crosses jurisdictions: Task 5 presents possible offices and asks for a more precise location instead of asserting one.
5. A legal rule has an exception or amendment: Task 6 blocks an unsupported absolute instruction and requires re-review before publishing.

## Task 1: Audit and register initial sources

**Files:** Create `docs/data-sources/delhi-source-register.md`, `data/src/delhi/source-catalog.ts`, `data/test/delhi-source-catalog.test.ts`.

**Interfaces:** `DelhiSourceDefinition = { id, authority, url, documentType, scope, allowedPredicates, refreshIntervalHours, reuseStatus, maxRequestsPerMinute }`; `validateDelhiSourceCatalog(entries): void`.

- [ ] Write tests rejecting duplicate IDs, empty scope, missing reuse status and an adapter claiming predicates outside its audited scope; run `node --import tsx --test test/delhi-source-catalog.test.ts` from `data/` and see failures.
- [ ] Audit GNCTD departments and Who's Who, Delhi Assembly, Delhi Police station finder, Delhi High Court, District Courts, India Code, DSLSA and Bar Council of Delhi. Record exact URL, public facts offered, stable IDs, freshness evidence, access/reuse limits and known gaps. Implement the catalog validator and rerun the focused test.
- [ ] Run `npm test && npm run typecheck` in `data/`; commit only the register, catalog and test.

**Gate:** A proposed adapter has a known authority and scope before making requests.

## Task 2: Add the Delhi registry contract

**Files:** Create `data/migrations/005_delhi_registry.sql`, `data/src/delhi/registry.ts`, `data/test/delhi-registry.test.ts`; extend `data/src/contracts.ts` only where shared validation is needed.

**Interfaces:** `Institution`, `Office`, `Appointment`, `Jurisdiction`, `Facility` have stable keys and DB-assigned `recordedAt`. `upsertInstitutionDraft(input): Promise<string>`, `recordAppointmentDraft(input): Promise<string>`, `listDelhiReviewCandidates(): Promise<...>` operate on unapproved data; approved output still uses the existing publication path.

- [ ] Write integration tests for separate person and office IDs, one person holding several offices, successive holders, overlapping jurisdiction, unknown valid-from date and immutable evidence; run the focused test and see failures.
- [ ] Add the numbered migration and repository operations. Preserve exact source-date precision and a source observation reference for each relationship. Run `npm run db:migrate`, the focused test, full data tests and typecheck.
- [ ] Commit the migration, repository and tests together.

**Gate:** Delhi government, police and court structures fit the same contract without a single universal parent tree.

## Task 3: Collect and reconcile the first Delhi directories

**Files:** Create `data/src/delhi/collect.ts`, `data/src/delhi/normalize/gnctd.ts`, `data/src/delhi/normalize/assembly.ts`, `data/src/delhi/normalize/police.ts`, `data/src/delhi/review.ts` and focused tests/fixtures under `data/test/`.

**Interfaces:** `collectDelhiSource(sourceId): Promise<CollectionAttempt>` reuses `CivicStore` and `LocalBlobStore`; `normalizeGnctd(snapshot, body): ObservationDraft[]`; `normalizeAssembly(snapshot, body): ObservationDraft[]`; `normalizePolice(snapshot, body): ObservationDraft[]`; `buildDelhiReviewCases(observations): Promise<ReviewCase[]>`.

- [ ] Capture small source fixtures with exact locators and write failing parser tests for incumbent, role, official contact and station/district relationships, plus changed markup and missing field behavior.
- [ ] Implement paced capture and the three source-specific normalizers. Reuse the existing Sansad roster and biography observations for Delhi MPs, but do not treat the local source-checked preview as publication approval. A collection failure emits an attempt, not deletions. A changed or contradictory incumbent becomes a review case; same-name people never auto-merge.
- [ ] Run focused and full data tests, typecheck, and a controlled import against audited sources. Record observed coverage and exceptions in the source register. Commit capture/normalizers separately from review logic.

**Gate:** GNCTD, Assembly and Delhi Police draft records are reproducible from stored official snapshots; Delhi MP candidates enter the same review queue; nothing new is public yet.

## Task 4: Publish a reviewed Delhi read model

**Files:** Create `data/src/delhi/export.ts`, `data/test/delhi-export.test.ts`, `web/lib/delhi.ts`, `web/lib/delhi.test.ts`.

**Interfaces:** `buildDelhiPublication(approvedFacts): { revision, institutions, offices, people, appointments, jurisdictions, facilities, coverage, traces }`; `loadDelhiPublication(path?): Promise<DelhiPublication>` rejects inconsistent references.

- [ ] Write tests rejecting unreviewed facts, stale source-check tokens, broken person-office links, duplicate current appointments without review, and leaked private contacts; run them failing.
- [ ] Export only approved claims into an ignored local preview; add the web loader and verify that a failed refresh leaves the previous export usable with stale coverage. Promote a versioned deployment export only after source reuse and publication review are recorded.
- [ ] Run data and web tests, typechecks and build. Review the actual export and commit exporter and loader in focused commits.

**Gate:** Every public item has one trace to its original source and its review decision.

## Task 5: Ship the Delhi directory and navigation

**Files:** Create `web/app/delhi/page.tsx`, `web/app/delhi/institutions/[id]/page.tsx`, focused `web/lib/delhi-directory.test.ts`; modify `web/app/layout.tsx` navigation. Read the installed Next.js 16 guide under `web/node_modules/next/dist/docs/` before editing routes.

**Interfaces:** `searchDelhiRecords(publication, query, areaId?): DelhiSearchResult[]` ranks exact task/place matches before broad text matches; it does not rank people's quality.

- [ ] Write tests for a known office, unknown query, namesake, stale office, and ambiguous PIN/location; see failures.
- [ ] Build mobile-first search and browse by government and police, with clearly labelled official court and legal-help entry links until those directories are audited. Show only the first useful facts; let the user open role history, relationships and source details. Add a deeper graph only after the directory's task paths work.
- [ ] Run web tests, lint, typecheck and build; inspect desktop and mobile layouts and source links. Commit directory and navigation separately.

**Gate:** A resident can reach a relevant office and its evidence in a few steps without reading a raw graph.

## Task 6: Add the reviewed rights guide

**Files:** Create `web/lib/rights.ts`, `web/lib/rights.test.ts`, `web/app/rights/page.tsx`, `web/app/rights/[situation]/page.tsx`, `docs/data-sources/delhi-rights-review.md`; connect from existing `web/app/constitution/` without duplicating the legal text.

**Interfaces:** `RightsGuide = { id, situation, steps, citations, lawEffectiveOn, sourceCheckedAt, legallyReviewedAt, reviewer, exceptions, helpContacts }`; `validateRightsGuide(guide): void` refuses missing citation, review date or exception handling.

- [ ] Write tests for missing citation, universal 24-hour claim, confusion between ordinary and preventive detention, expired help contact and amended law; see failures.
- [ ] Draft paths for stopped, questioned, detained, arrested, injured, family-member-missing and legal-aid from the Constitution, India Code BNSS/BNS/BSA, applicable orders and DSLSA. A qualified legal reviewer checks each plain-language instruction and exception before public release.
- [ ] Build a short checklist first, then source sections and local help. Verify links, keyboard access and small screens. Run web tests, lint, typecheck and build; commit content contract, reviewed content and UI separately.

**Gate:** A user can distinguish practical suggestions from legal entitlements, identify the applicable custody path, and reach Delhi legal aid. Unreviewed legal interpretation is not published.

## Subsequent plans

Write a separate source audit and implementation plan for each of: court rosters and public orders; Bar Council enrolment verification; municipal and Union authority expansion; public works and budgets; and scheduled operations. Reuse the same IDs, evidence pipeline and public read model. Do not start mass collection of court cases or lawyers until source rights, privacy and identity matching are resolved.
