# Candidate and public servant profile collection

## Purpose and current boundary

Build a detailed, updateable profile for each person without losing where each fact came from. A profile is a view assembled from sourced records, not one scraped biography. The current worker has snapshots, normalized observations, matching, review and publication. Its Sansad list collector covers basic sitting MP fields. The broader source adapters described here are the implementation contract, not a claim that their data has been collected.

## Profile field map

The machine-readable predicate and source contract lives in [`data/src/profile-fields.ts`](../../data/src/profile-fields.ts). A field can be absent. Absence means unknown or not collected, never zero, none, or no history.

| Order in profile | Facts to collect | Record scope | Primary source path |
| --- | --- | --- | --- |
| 1. Current public role | Office, area, current status, party in that role, term start/end | Office term | Parliament or relevant legislature/department roster, gazette/appointment records |
| 2. Elections | Each election, seat, candidate status, party at that election, result, votes | Candidacy in one contest | ECI/State Election Commission nomination and result records |
| 3. Identity | Official names and stable IDs, birth date if published | Person | Official roster, nomination/affidavit |
| 4. Education | Declared level, institution, degree, dates only when documented | Education event or filing claim | Biography and dated affidavit |
| 5. Work and political timeline | Professional roles, party memberships/changes, prior offices, documented dates | Separate career, party and office events | Official biographies, election records, appointment records |
| 6. Affidavit | Assets, liabilities, declared cases and other declarations | One filing for one election | Original affidavit and its filing metadata |
| 7. Public contact and presence | Official contact, official site and verified social links | Time-varying person/office link | Official institutional pages and accounts linked there |
| 8. Public work | Dated questions, attendance, fund releases, projects, reports, outcomes | One work record with area/office context | Institution's original record |

Do not turn a declared case into guilt, an asset declaration into current wealth, or a biography claim into an independently verified fact. Label what the source actually states. Ranking and automated analysis are separate products and must use only reviewed facts with clear definitions.

## Source adapters

Each adapter owns one source family and declares its authority, document type, allowed profile predicates, geographic/election coverage, discovery method, terms of use, rate limit, byte limit and normalizer version. It has four steps:

1. **Discover:** enumerate official person, constituency, contest, filing or document IDs. Save the source URL and stable external IDs. Do not search by name alone.
2. **Capture:** fetch at a controlled rate and save the original response as a content-hashed snapshot, capture time, response metadata and each collection attempt. A source check that fails is recorded and never interpreted as deletion.
3. **Normalize:** emit observations with an exact locator in the source, raw text, normalized value, source-stated date precision, and version. Reject partial paginated runs, malformed documents and predicates outside the adapter's field contract.
4. **Reconcile:** match records to a person using stable IDs and election/constituency context. Queue new, changed, removed and conflicting claims for review. Publication reads approved observations only.

Start with official Sansad rosters and biographies, then official ECI/State Election Commission nomination, result and affidavit sources. Build separate adapters because their formats and update cycles differ. MyNeta is useful as a cross-check and discovery lead, but its [terms prohibit systematic automated collection without written consent](https://adrindia.org/content/adr-terms-use). Do not build a MyNeta scraper unless that permission or another authorized data route is obtained.

## Identity and relationships

Use internal IDs for person, election, contest, office, area, term, filing and work record. Preserve source IDs as aliases, never as universal person IDs. A person can have many candidacies, party memberships, offices and filings. A candidate's party in an old election does not overwrite their current party. Link by official source ID first; name plus state/constituency/election can propose a match but cannot confirm one. Ambiguous matches stay unpublished.

An election has type, jurisdiction, date and authority. A contest belongs to one election and one seat. A candidacy belongs to one person and one contest. Its statuses are dated source claims such as applied, accepted, rejected, withdrawn, contesting and result declared. A nomination application alone must never produce a public “contesting” badge. When the source does not state the transition date, keep it unknown and show when we observed the status.

## Update and time rules

`attemptedAt` means the source was checked; `capturedAt` means bytes were saved; `sourcePublishedAt` is supplied by the source; `validFrom`/`validTo` are real-world dates only when evidenced; `recordedAt`, `reviewedAt` and `publishedAt` track our own process. Keep source precision. Never use fetch time as a candidate's career or nomination date.

Scheduling is a product policy, not evidence. The initial policy can check active nomination/status sources several times a day during an election, current office rosters daily, and biographies and completed filings less often. Configure intervals per source and obey its terms and load limits. Trigger a recheck when an official election calendar or record changes. Source polling is shared work; a page view reads stored approved data and does not scrape live. Show “last checked” and “last reviewed” separately, plus a stale or missing label.

On unchanged content, record the check without duplicating observations. On changed content, retain both snapshots and calculate a field-level diff. A missing field in a new response is not proof that the old fact is false. A removed source record or changed office status requires explicit review and, where possible, corroboration. For affidavit values, create a new filing snapshot; never overwrite prior election filings. A correction creates a new publication revision while preserving history.

## Publication gate and transparency

Each displayed claim should resolve to: person/record ID → approved fact → review decision → observation → exact source locator → immutable snapshot → original URL and capture time. Review checks identity, scope, source wording, date precision, conflicts and whether the source still supports the claim. The interface can then say “declared in the 2024 affidavit” or “listed as sitting MP when checked on [date]”, rather than stating uncertain facts as timeless truth.

Coverage is tracked per person, section, source and area. A blank section is labeled missing or not yet collected. A failed check can mark data stale but must not invent a replacement value. Public correction reports should enter the same review path and retain their resolution.

## Implementation order

1. **Contract:** maintain the predicate/source registry now used by the Sansad normalizer. Add context keys and validation for election, contest, term and filing before importing those records.
2. **Source discovery and capture:** add official biography and ECI election/nomination adapters, each with saved source snapshots and collection attempt logs.
3. **Diff and match:** compare snapshots, reconcile stable IDs and queue uncertain identity or status changes.
4. **Review and publish:** approve by sourced record, publish revisioned profile sections and expose provenance and freshness in the UI.
5. **Scale:** run scheduled per-source jobs, partition work by election/area, monitor failures and stale coverage, and expand to MLAs and local bodies as official source formats are mapped.

The first collector now enriches an MP from the individual official biography and positions feeds, producing review drafts. A paced, resumable batch runner reads imported Sansad roster IDs and reports failures for separate retries. The `profile:review` command presents the latest source trail, confirms a roster-to-biography identity link against an existing person, and records field-selective approvals. The `profile:preview` command exports approved facts to an ignored development-only file. Neither command publishes public profiles. Automatic scheduling, wider identity review, and a rights-cleared public export remain to be built. The ECI adapter then introduces election and filing context rather than forcing those records into a flat person row.
