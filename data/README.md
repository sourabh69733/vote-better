# Civic data worker

This package stores evidence, review history, and publication revisions. The Jaipur exporter writes reviewed facts to a generated website file; the site reads that file at build time.

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

To collect the current 18th Lok Sabha member list from Digital Sansad and save profile drafts:

```sh
npm --prefix data run import:sansad-members
```

This importer pages through the Parliament JSON feed and records each page URL, hash, capture time and collection attempt. It checks page counts and unique Parliament member IDs before saving any draft claims. Drafts include the current member name, party, constituency, state, membership status, reported education level and profession when present. They do not establish complete education or work history. Dates absent from the source remain absent. Person matching, review and publication remain separate. A live run on 2026-10-06 saved 5,311 unreviewed claims for 540 members across six pages. Parliament's reuse policy needs review before publishing content from this feed; this command stores factual claims privately and does not copy contact details or publish profiles.

To collect one parliamentary question session privately, run from `data/`:

```sh
npm run import:sansad-questions -- 7
```

To refresh the profile question history for every configured MP across complete sessions:

```sh
npm run import:sansad-question-archive -- 1 2 3 4 5 6 7 8
```

The explicit person-to-Parliament ID map is `config/sansad-question-targets.json`. Add a person only after checking their internal profile, official member ID and exact official roster name. The importer checks that identity on each run. It keeps page bytes and per-session publications under ignored `data/raw/sansad-questions/`, then replaces the public archive only after every requested session validates. If a run times out, repeat it with `--resume`; cached sessions are rebuilt from saved page bytes and checked against their publication before reuse. The public profile shows counts by session, the capture date for each session, and links to official question PDFs. It does not infer a question's author, an outcome, or lifetime work outside the imported sessions.

The one-session command writes only under ignored `data/raw/sansad-questions/`; it does not update the website. The archive command above is the publication path. On 2026-10-08, Session 8 had 4,500 feed questions, of which 19 listed Manju and 16 listed Rao. Across Sessions 1 to 8, the archive lists 137 for Manju and 111 for Rao. These counts include jointly listed questions and do not establish sole authorship, impact, or work outside these sessions. The site links to the official question and answer PDF rather than copying its contents. Check Digital Sansad's reuse terms before a public deployment.

To refresh official debate and matters records for the same reviewed MP IDs:

```sh
npm run import:sansad-debates
```

This reads each MP's complete member-filtered Digital Sansad debate result, checks the member ID and name on every row, validates pagination and source-page hashes, and atomically writes `web/records/imported/lok-sabha-18-debates.json`. The 2026-10-08 import found 48 records listing Manju and 22 listing Rao. The profile links to the official debate view. These are feed records, not a speech count: some matters were laid rather than spoken, and no outcomes are inferred. Raw pages stay under ignored `data/raw/sansad-debates/`.

To collect one member's individual official biography and positions held:

```sh
npm --prefix data run import:sansad-biography -- 5619
```

The member ID comes from the Sansad roster. This fetches two official JSON endpoints, retains private source snapshots under ignored `data/raw/sansad-biography/`, and creates review drafts for name, birth date, stated education, profession, official photo and valid social links, plus a positions-held set with each source-stated period and date precision. It does not normalize or publish family details, personal addresses or phone numbers. The source snapshot still contains the original response and must remain private. A repeat check records new collection attempts without duplicating unchanged observations. This command does not link, approve, or publish them. [The profile collection framework](../docs/architecture/profile-collection-framework.md) describes how later adapters and scheduled checks fit together.

For a paced batch of roster IDs, use `npm --prefix data run import:sansad-biographies -- --limit 50 --missing-only`. This skips profiles already collected. The result includes `lastMemberId` and `remaining`; continue with `--after <lastMemberId>` for the next batch. Add `--all-missing` to continue through all batches and print progress after each one. Failed member IDs are reported once and can be retried with the one-member command. These commands store drafts only. They do not perform identity review or make those profiles public.

To show every collected biography field before review in the local research site, regenerate the ignored draft exports after each collection batch:

```sh
npm --prefix data run profile:source-check
npm --prefix data run profile:source-check -- --save
npm --prefix data run profile:drafts
```

The first command is a dry run. It compares the saved biography and positions observations with a fresh normalization of their private source bytes, checks their SHA-256 hashes, and checks the saved roster member ID and name against the biography. Exceptions stay visible in its JSON output. The `--save` command writes an ignored local check report. It records an automated source check, not an independent truth check or human approval. If a collector or normalizer changes the profile, the saved report token no longer matches and the check label disappears on the next draft export. On 2026-10-07, the first run checked 58 of 64 profiles; six older positions observations needed a fresh import with the current normalizer. After those imports, all 64 passed the source replay check.

The draft exporter checks the latest official roster and biography member ID and name, then exports available birth date, education statement, profession, official photo link, social links and positions with source URL, locator, hash and capture time. It reports identity conflicts separately, excludes those IDs from the draft index, and removes any stale draft file for them. A position without a source date keeps its title but no inferred date; blank position rows and unusable birth dates stay out. It does not invent missing career or party history, confirm identity with an internal person, approve facts or publish them. Rejected or needs-changes observations are omitted on the next export. The development-only `/research/people/<member-id>` page labels fields "Source checked" only when the saved report matches the current source and observations. "Reviewed" still requires a separate approved review event. The draft files stay under ignored `data/raw/profile-drafts/`.

To export source checked factual fields into the private local MP preview, run `npm --prefix data run export:local-mps` after the source check. This writes the ignored `data/raw/public-profiles/sansad-mps.json`. The development-only `/mps` pages list the source's party, constituency and membership status with the roster capture date, then show biography fields with a human-readable Digital Sansad link. The export refuses a stale check token and omits contact details and family information. Digital Sansad restricts reproduction without permission; these profiles are not included in production or the public repository while their reuse rights are unresolved.

Run `npm --prefix data run report:mp-crosswalk` after the Sansad import and PIN boundary draft exist locally. It writes ignored `data/raw/maps/mp_crosswalk_draft.json` with source hashes, all roster members, exact state-and-constituency matches, naming suggestions, ambiguous matches, and unmatched records. It refuses incomplete page sets or mixed snapshots. The local report has 373 exact proposals, 145 suggestions for reservation suffixes or known state label differences, 25 unmatched areas, and 22 unmatched members among 543 boundary areas and 540 imported members. Every connection remains unreviewed. This report does not publish verified profiles or assign an MP to a PIN.

To prepare and review these matches in bulk:

```sh
npm --prefix data run report:mp-crosswalk
npm --prefix data run review:mp-links -- prepare
# inspect data/raw/maps/mp_link_review_queue.json
# copy data/raw/maps/mp_link_decisions_template.json to data/config/mp-link-decisions.json
# change only checked rows from "pending" to "approve" or "reject"
npm --prefix data run review:mp-links -- promote
npm --prefix data run review:mp-links -- promote --write
```

The queue includes official member names, both constituency labels, match type and a token bound to the boundary source, Sansad roster page and question member directory. The fetched directory bytes are saved privately with their hash. The template supplies stable `mp-<member ID>` person IDs for new members; existing reviewed IDs are retained. For each approval or rejection, add a UTC `reviewedAt` instant, `reviewer` and a specific `reason`. Exact matches are still pending until reviewed. Promotion checks every decision against the saved crosswalk and a fresh question member directory, then rejects stale tokens, duplicate identities and changes to existing links. Refresh the crosswalk before preparing a new review batch. `--directory <file>` lets either command use cached directory bytes offline, but does not check for source changes since that file was saved. The dry run prints counts; `--write` atomically updates the shared importer target list. Run the question archive and debate imports separately after promotion. This does not create a public person profile or verify a PIN-to-constituency assignment. The boundary draft uses a research mirror whose geometry and reuse terms still need independent review.

The import refuses a changed PDF until its page-linked transcription in `extractions/jaipur-form21e-2024.json` is checked and updated. The transcription is explicitly unreviewed. The command never publishes to the website. It saves source URL, PDF hash and check attempts, but does not retain PDF bytes. A private blob storage adapter exists for sources whose reuse policy permits retaining a copy.

The Rajasthan source currently needs legacy TLS renegotiation. Only this exact URL uses a source-specific adapter; normal certificate verification stays enabled. Other source adapters should use the standard fetch path.

The default local database URL is `postgres://vote_better:local_dev_only@127.0.0.1:55432/vote_better`. Set `DATABASE_URL` to use a different database. The Compose password is only for local development. Stop the container with `docker compose -f data/compose.yaml down`; omitting `-v` retains the database volume.

Tests use a separate `vote_better_test` database, created automatically on the same local server. `DATABASE_URL` does not redirect tests. Set `TEST_DATABASE_URL` only to a database whose name ends in `_test`. Existing test rows written to the application database before this isolation change remain there; use the exact source URL filter in the review command to see the Jaipur queue.

Migrations are numbered SQL files in `migrations/`. The runner applies each once, records its SHA-256 hash, and rejects edits to a migration that has already run. Add a new migration for schema changes.

`LocalBlobStore` can keep source copies under a private directory such as `data/raw/`. It verifies SHA-256 on read and returns an opaque reference. Do not serve that directory publicly. The Rajasthan PDF's redistribution permission has not been established; the first collector should link to the official source and save a private copy only when the team's reuse policy allows it.

The database assigns `recorded_at` when a row is inserted. Source dates and real-world validity dates are separate fields with their original precision. Snapshots, observations, review decisions and publication revisions are append-only. A new fetch does not change published facts.

## PIN to constituency research map

`src/geo/build_pin_lookup.py` intersects postal PIN polygons with parliamentary constituency polygons. It returns every constituency touched by a PIN, including ambiguous matches. It never claims that a PIN identifies a voter's exact constituency. It rejects missing provenance, changed input hashes and unusable geometries. Self-intersections repaired by Shapely are listed for review. Output is always marked `unreviewed` and must not be served by the website as a verified match.

The Department of Posts [published PIN boundary GeoJSON](https://www.data.gov.in/catalog/all-india-pincode-boundary-geo-json). The public Bharat Maps [parliamentary layer](https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/AC_PC/MapServer/1) currently requires a token. A public research mirror was used for a local draft run. Its constituency geometry and reuse terms need independent review before publication. The raw files, source manifest and draft output are kept in ignored `data/raw/maps/`; they are not committed.

To rebuild from locally obtained GeoJSON or GeoJSONL inputs:

```sh
python3 -m venv data/.venv
data/.venv/bin/pip install -r data/requirements-geo.txt
data/.venv/bin/python data/src/geo/build_pin_lookup.py \
  --pins data/raw/maps/Datagov_Pincode_Boundaries.geojsonl \
  --areas data/raw/maps/LGD_Parliament_Constituencies.geojsonl \
  --sources data/raw/maps/sources.json \
  --output data/raw/maps/pin_candidates_draft.json \
  --pin-field Pincode --area-field pc_id \
  --area-label-field pc_name --area-state-field st_name
```

The source manifest needs `pins` and `areas` objects with HTTPS `url`, ISO `checkedAt`, and optional `inputSha256` for the extracted local file. The local research run on 2026-10-06 mapped 19,312 PINs against 543 parliamentary polygons: 8,994 had one possible constituency, 10,314 crossed more than one, and four had no overlap. Three constituency geometries needed repair. These are mapping drafts, not verified voter assignments. The source `pc_id` values also need a reviewed crosswalk to Vote Better area IDs before the website can use them. Browser location needs a separate point-in-boundary lookup using reviewed polygons.

The development-only PIN preview has provisional links for source area IDs 806 (Jaipur Rural) and 807 (Jaipur). It checks the draft area name and state against the published area record before showing that area's MP profile. This does not verify the PIN boundary or identify a voter's MP.

The same local preview reads the national crosswalk draft for other areas and links to source-labeled draft MP profiles. The draft directory includes all imported members, including those without an area match. The unreviewed PIN-to-area connections stay hidden in production. Source checked biographies are published separately in `/mps` without claiming a PIN-to-MP mapping.

## Local review

For an individual Sansad profile, use the source-specific review flow:

```sh
npm --prefix data run profile:review -- report 5619
npm --prefix data run profile:review -- link 5619 manju-sharma <report-token> <reviewer-id> "Official ID and name checked"
npm --prefix data run profile:review -- approve 5619 <new-report-token> person.name,person.birthDate,person.educationStatement,person.profession,office.positionsHeld <reviewer-id> "Checked against official response"
npm --prefix data run profile:preview -- 5619
```

The report gives source URLs, hashes, capture times, exact field locators, roster and biography identity evidence, and a token tied to the current snapshots. Inspect it before linking. `link` requires an existing person key and checks official member ID and name; create a new internal person only after checking identity with `npm --prefix data run review -- person <stable-key> <display-name>`. `approve` selects specific fields and rejects stale tokens, missing links and publication conflicts. Run `report` again after linking to get the current token. The preview writes an ignored, local-only file under `data/raw/profile-previews/`; the development website can show it at `/research/people/<member-id>`. Approval and preview do not publish to the public website. Official content reuse permission must be resolved before public redistribution.

Run `npm --prefix data run review -- queue` to see unreviewed observations with source URL, locator, hash, captured time and any earlier published value. Pass a limit and exact source URL to filter a source. `show <observation-id>` includes decision history. Candidate facts need a confirmed person link before approval. The PDF contains names, not unique person IDs, so the reviewer must check the identity against independent evidence before using `person <stable-key> <display-name>` and `link <observation-id> <person-id> <reviewer-id> <reason>`. Creating a person is only an internal identity record, not a public claim. Use `approve`, `reject`, or `needs-changes` with an observation ID, reviewer ID and reason. A changed published value requires an explicit conflict resolution before approval. The review command never publishes data.

## Local publication

`npm --prefix data run export:jaipur` rebuilds `web/records/generated/jaipur.json` from the existing database revision. Passing observation IDs publishes only those already approved and linked to a person, then rebuilds the file. The command rejects unapproved values, repeated publication and unresolved changes to a previously published value. To correct a published value, check the new source, run `npm --prefix data run review -- resolve <observation-id> <previous-fact-id> <reviewer-id> <reason>`, then approve and export the new observation. Every old fact remains accessible by its fact URL and timestamps. The website reads the generated file at build time; it does not query the database for each page view.

The first local revision included only Manju Sharma's result row. The next revision contains all 13 candidate names, parties and vote totals from Jaipur Form 21E, each linked to its source row and review decision. The 2026-10-06 source recheck matched the existing PDF hash. Contest totals remain unpublished, and these result records do not create full person profiles. The current office term and parliamentary activities still come from the separately curated website records.

The exporter also derives candidate-result coverage from the latest snapshot, collection attempts, review decisions and published facts. It reports the number of complete candidate rows published from this return, not the coverage of all election data. A successful check of unchanged bytes updates the last check time without changing the original snapshot capture time.

## Sources and syncing

Every collected source is listed in `src/registry.ts` with its owner, link, refresh interval, reuse status, the fields it may supply and how it is reviewed. A source that is not in the registry is not collected; a source marked `restricted` fails validation.

```sh
npm --prefix data run sync -- --list            # every source, last run, whether it is due
npm --prefix data run sync -- --due             # run everything that is due, dependencies first
npm --prefix data run sync -- eci-ge2024-results # run named sources
npm --prefix data run sync -- --due --dry-run   # show what would run
```

Each run, including a failed one, is written to the `sync_run` table and cannot be edited. A source is due when it has never completed (succeeded or partial) or its refresh interval has passed since the last completed run; fixed archives are checked only until they first complete. After a failed run the source waits one hour, then two, four and so on up to a week, before it is due again, so a broken source is not refetched on every tick. The `--list` table shows the failure streak. Unchanged files keep their original snapshot. Reuse status `under-review` means outputs stay local.

Each source runs under a database advisory lock, so two overlapping syncs skip rather than repeat a source. A run that passes its deadline (`timeoutMinutes` in the registry, 90 by default) is logged as failed and the runner moves to the next source; the process exits once the loop ends even if that run is still finishing. A run whose log row cannot be written still reports its result, with the write error appended.

## National Lok Sabha 2024 results

The source is ECI's 2024 statistical report 33, "Constituency Wise Detailed Result" (XLS). It covers 542 seats; Surat was decided unopposed and is reported separately. ECI notes that the statutory forms kept by Returning Officers are final, and the site shows that note.

```sh
npm --prefix data run import:eci-2024
npm --prefix data run review:batch -- --reviewer=automated-batch-check "--reason=<checks and approval>"
npm --prefix data run export:lok-sabha-2024
```

The import saves a hashed snapshot and stores one `candidate.result` observation per candidate row. It refuses the file unless the title, header and disclaimer match, there are 542 seats, general plus postal votes equal the total in every row, candidate votes equal valid votes in every seat, each seat has one NOTA row and no seat has a tie for first place.

Batch review is allowed only for sources listed in `src/review-batch.ts`. It creates one person record per candidacy, keyed by election, state, seat and name (party is added for namesakes in the same seat), and records one approval for the snapshot. It stops if any result differs from an already published fact. These person records are not yet linked to Sansad members or other elections.

The export publishes approved facts and writes `web/records/generated/lok-sabha-2024.json`, grouped by seat. Each candidate keeps its fact ID and worksheet row.

## Elections, seats and contests

Results attach to an entity graph: election, contest (one per seat in one election), area (the seat) and candidacy (one person in one contest). The curated calendar in `web/records/elections.ts` is the list of elections; every election with published results must have a calendar record.

```sh
npm --prefix data run sync -- eci-ge2019-results eci-ge2014-results
npm --prefix data run review:batch -- <report 33 URL> --reviewer=automated-batch-check "--reason=<checks and approval>"
npm --prefix data run export:elections
```

`export:elections` publishes approved 2019 and 2014 results, writes `web/records/generated/lok-sabha-2019.json` and `lok-sabha-2014.json` in the same shape as 2024, and links all three elections in the database. Running it again adds nothing new.

Seats are matched across elections by state and seat name, after dropping the "(SC)" or "(ST)" older files add to the name. Nothing else is guessed. The export lists every older seat with no 2024 match: Assam's seats redrawn in 2023, Telangana seats listed under Andhra Pradesh in 2014, Ladakh and Dadra and Nagar Haveli changing status, and spelling variants such as Secundrabad and Gauhati. These stay separate until a reviewed alias list exists.

The older reports have no seat numbers and no vote-share column; vote share and valid votes are calculated and marked as derived. ECI's 2014 detailed file leaves out 32 seats in Chhattisgarh and Odisha; those appear with the winner and margin from ECI's list of successful candidates and no candidate rows.
