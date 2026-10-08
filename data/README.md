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

For a paced batch of existing roster IDs, use `npm --prefix data run import:sansad-biographies -- --limit 50`. The result includes `lastMemberId` and `remaining`; continue with `--after <lastMemberId>` until none remain. A failed member ID is reported in `failedMemberIds` and can be retried with the one-member command. This batch stores drafts only. A three-member live run after ID 5619 saved 36 drafts without errors on 2026-10-07. It does not perform identity review or make those profiles public.

To show every collected biography field before review in the local research site, regenerate the ignored draft exports after each collection batch:

```sh
npm --prefix data run profile:source-check
npm --prefix data run profile:source-check -- --save
npm --prefix data run profile:drafts
```

The first command is a dry run. It compares the saved biography and positions observations with a fresh normalization of their private source bytes, checks their SHA-256 hashes, and checks the saved roster member ID and name against the biography. Exceptions stay visible in its JSON output. The `--save` command writes an ignored local check report. It records an automated source check, not an independent truth check or human approval. If a collector or normalizer changes the profile, the saved report token no longer matches and the check label disappears on the next draft export. On 2026-10-07, the first run checked 58 of 64 profiles; six older positions observations needed a fresh import with the current normalizer. After those imports, all 64 passed the source replay check.

The draft exporter checks the latest official roster and biography member ID and name, then exports available birth date, education statement, profession, official photo link, social links and positions with source URL, locator, hash and capture time. A position without a source date keeps its title but no inferred date; blank position rows and unusable birth dates stay out. It does not invent missing career or party history, confirm identity with an internal person, approve facts or publish them. Rejected or needs-changes observations are omitted on the next export. The development-only `/research/people/<member-id>` page labels fields "Source checked" only when the saved report matches the current source and observations. "Reviewed" still requires a separate approved review event. The draft files stay under ignored `data/raw/profile-drafts/`.

To export source checked factual fields into the private local MP preview, run `npm --prefix data run export:local-mps` after the source check. This writes the ignored `data/raw/public-profiles/sansad-mps.json`. The development-only `/mps` pages list the source's party, constituency and membership status with the roster capture date, then show biography fields with a human-readable Digital Sansad link. The export refuses a stale check token and omits contact details and family information. Digital Sansad restricts reproduction without permission; these profiles are not included in production or the public repository while their reuse rights are unresolved.

Run `npm --prefix data run report:mp-crosswalk` after the Sansad import and PIN boundary draft exist locally. It writes ignored `data/raw/maps/mp_crosswalk_draft.json` with source hashes, all roster members, exact state-and-constituency matches, naming suggestions, ambiguous matches, and unmatched records. It refuses incomplete page sets or mixed snapshots. The local report has 373 exact proposals, 145 suggestions for reservation suffixes or known state label differences, 25 unmatched areas, and 22 unmatched members among 543 boundary areas and 540 imported members. Every connection remains unreviewed. This report does not publish verified profiles or assign an MP to a PIN.

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
