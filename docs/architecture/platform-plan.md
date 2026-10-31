# Platform plan: the full picture for one voter

## The promise, stated as one person

Someone lives in Jaipur. They open Vote Better and, within a minute, see:

1. **Which elections touch me.** Live, due and recent elections for their Lok Sabha seat, assembly seat, and ward. Today that is: no election live, Rajasthan assembly due late 2028, Lok Sabha due mid 2029, Jaipur municipal status still to confirm.
2. **Who is contesting or sitting.** The sitting MP, MLA and councillor, and when a poll is announced, every candidate for each seat.
3. **Who each person is.** One deep profile per person: identity, elections fought, party history, offices held, affidavits (assets, liabilities, cases, education), official contact.
4. **What they were supposed to do, and what they did.** The duties of the office, then the record: questions, debates, attendance, local area fund works, committee roles, votes where published.
5. **What came of it.** Dated outcomes separated from announcements and claims: a sanctioned work, its completion report, an audit finding.
6. **The source for every line**, with a checked date, and a visible "not collected yet" where we have nothing.

Everything below serves these six screens. Nothing is published that cannot be traced to a source, and the site never ranks or scores people with undefined metrics.

### Which phase answers which question

| Question | Today | Moves forward in | Answered in full for Jaipur after |
| --- | --- | --- | --- |
| Which elections touch me | National and state calendar, not per seat | A, C, E | G (wards) |
| Who sits and contests | 2024 MPs and candidates | C, E | G (councillors) |
| Who each person is | 2 deep profiles, stubs for the rest | A (past elections) | D |
| The job and the record | Questions and debates for 2 MPs | G (city work) | D |
| What came of it | Nothing | G | F |
| Where each fact comes from | On every published fact | B, D | H2 (voter test) |

## What exists today

| Layer | Have | Missing |
| --- | --- | --- |
| Elections | Curated calendar (18 records) stored as database entities; election pages with schedule and seats | No assembly or local body results yet |
| Seats and areas | 543 Lok Sabha seats, 2 Jaipur areas, PIN preview | Assembly seats, wards, boundaries, "find my area" |
| Results | Lok Sabha 2024, 2019 and 2014 published and linked as contests and candidacies; each seat shows its history | Assembly results; reviewed aliases for renamed seats |
| People | 8,359 candidate stubs, 540 MPs (local), 2 curated Jaipur profiles | MLAs, councillors; one profile system instead of two |
| Declarations | Jaipur affidavits by hand | National affidavit adapter (PDF, OCR, review) |
| Work | Questions and debates for 2 MPs | All MPs; attendance; MPLADS; committees; state assembly work |
| Outcomes | Nothing | Work records with milestones and evidence |
| Pipeline | Registry, snapshots, observations, review, export, hardened runner, CI | Election entity, scheduled runs, alerting, hosting, PR publish |
| UI | Seat pages, candidate pages, profile view, story player, graph mockup | Area home, candidate comparison, work timeline, outcome views, Hindi |

## Data: how it is arranged

The data layer stays as it is in principle (snapshot, observation, review, approved fact, publication). What changes is the set of entities facts hang on. The entity graph, top down:

```
Election ──has many──> Contest (one per seat) ──has many──> Candidacy ──belongs to──> Person
   │                        │                                                          │
   │                        └── Seat/Area (Lok Sabha seat, assembly seat, ward)        ├── Term (office + area + dates)
   │                                 │                                                 ├── Filing (one affidavit per contest)
   └── Authority (ECI, SEC)          └── Office (MP, MLA, councillor) ── Duty          ├── Work record (question, debate, fund work, vote)
                                                                                       └── Alias (ECI id, Sansad id, state ids)
```

| Entity | Key fields | Stable id | Already in schema |
| --- | --- | --- | --- |
| Election | body, authority, states, announced, poll days, counting, term end, status | `lok-sabha-2024`, `rajasthan-assembly-2028` | Table exists, unused by the calendar |
| Contest | election, seat, phase, result status | election id + seat id | Table exists |
| Seat / Area | kind (PC, AC, ward), state, number, name, parent area, boundary ref | `pc-rj-07`, `ac-rj-052`, `ward-jaipur-heritage-12` | Area table exists, PCs only |
| Person | names, DOB precision, gender as declared, aliases | internal id | Yes |
| Candidacy | person, contest, party at that contest, status history, votes, rank | person + contest | Jaipur only, as records |
| Filing | candidacy, affidavit URL, assets, liabilities, cases, education, age | candidacy + source | No |
| Office + Duty | office kind, what the office is for, powers, funds it controls | `office-mp`, `office-mla` | Office table partial |
| Term | person, office, area, start, end, party in role | person + office + start | Jaipur only |
| Work record | person or office, kind, date, subject, source locator, area tags | source locator | Questions and debates, 2 MPs |
| Outcome | work record or scheme, milestone kind (announced, sanctioned, completed, audited), date, evidence source | milestone source | No |

Rules carried over from the profile framework: official ids match people, names only propose; a filing is per contest and never overwritten; absence means not collected; precision of dates is preserved; corrections make new versions.

### Layered by level of government

Each level has the same shape and its own sources. Build Union first, then Rajasthan as the first state, then Jaipur as the first city. Other states and cities follow by adding adapters, not new pages.

| Level | Seat | Office | Election authority | Work sources | Fund sources |
| --- | --- | --- | --- | --- | --- |
| Union | Lok Sabha PC | MP | ECI | Sansad questions, debates, attendance, committees | MPLADS portal |
| State | Assembly AC | MLA | ECI (assembly polls) | Rajasthan Vidhan Sabha questions and proceedings | MLALAD (state portal) |
| City | Ward | Councillor, Mayor | Rajasthan State Election Commission | Municipal corporation board proceedings, works lists | Municipal budget and works portal |

## Sources and how we get them

All collection goes through the registry and the sync runner. Each row below becomes one registered source with an adapter, a refresh interval, reuse terms and a review mode.

| Priority | Source | Gives | Format | Refresh | Review |
| --- | --- | --- | --- | --- | --- |
| 1 | ECI press notes (via PIB and eci.gov.in) | Election schedules | HTML/PDF | Daily; hourly during a poll | Curated, then adapter |
| 1 | ECI results site and statistical reports | Contests, candidacies, votes | HTML, XLS | Archive per election; live on counting day | Batch per snapshot with totals check |
| 1 | ECI affidavit portal (affidavit.eci.gov.in) | Filings per candidate | PDF, often scanned | Archive per election | OCR, then per-field review for winners first |
| 2 | Digital Sansad members, biographies, questions, debates | MP identity, work | JSON | Daily in session, weekly otherwise | Batch; identity link review |
| 2 | Lok Sabha attendance and committee lists | Attendance, committee roles | PDF/HTML | Per session | Batch |
| 2 | MPLADS portal | Fund releases, works, status | Web tables | Monthly | Batch; outcomes per work review |
| 3 | Rajasthan CEO site (Form 21E, assembly results) | State results | PDF | Archive | Batch |
| 3 | Rajasthan Vidhan Sabha site | MLA roster, questions | HTML/PDF | Weekly | Batch; identity review |
| 3 | Rajasthan SEC and Jaipur municipal corporations | Ward results, councillors, works | PDF/HTML | Archive; monthly | Curated first |
| 4 | Boundaries (ECI delimitation maps, OpenStreetMap admin relations) | Location to seat | GeoJSON/shapefile | Per delimitation | Licence check first |
| 4 | CAG reports, scheme dashboards | Outcome evidence | PDF | Per report | Per fact review |

Rules: no MyNeta or PRS scraping without written consent; every adapter declares its allowed predicates; a failed fetch never deletes a fact; rate limits and byte caps apply to every source.

## Sync: from source to screen

```
registry ──sync --due (daily cron, hourly in poll window)──> snapshots ──adapters──> observations
   ──batch or per-fact review──> approved facts ──export──> web/records/generated/*.json
   ──pull request with diff──> merge ──> build ──> site (ISR 1h; counting day: 1 min)
```

Work left to make this run unattended: scheduled job, hosted Postgres and blob store with backups, alerting (dead-man ping, failure webhook), publish job that opens the pull request, one combined exporter that writes the bundle per entity rather than per source.

Poll window policy: when an election in the calendar is between announcement and counting, sources tagged to that election switch to the short interval automatically. The calendar therefore drives the schedule.

## UI: how we show it

Six screens, matching the six promises. The existing profile view, story player and graph prototype are reused; the first three screens are new.

### 1. My area (new, `/me` or `/areas/[id]`)
Enter a PIN or pick on a map. Show three cards stacked: Lok Sabha seat, assembly seat, ward. Each card: current holder with photo and party, next election with status pill, and a coverage bar saying how much of this area's data we hold. One tap to each person.

### 2. Election (new, `/elections/[id]`)
Timeline of the schedule, phases, counting. Below it the seats, with a filter for "my seats". During a poll: candidate list per seat as nominations are accepted, each with a filing summary once reviewed. After counting: results with margins, turnout, and the winner's story.

### 3. Candidate comparison (new, `/elections/[id]/seats/[seat]`)
Side by side cards for every candidate in one contest: party, age, education as declared, assets, liabilities, cases as declared, previous contests and results. Every cell has its source chip. No composite score. Sorting only on declared numbers, with the definition shown.

### 4. Person profile (exists, unify)
Merge `/people/[slug]` and `/mps/[id]` into one profile model fed by approved facts. Sections in the fixed order from the profile framework. Add a "what this office is for" panel from the Office and Duty entities so the record is read against the job.

### 5. Work and outcomes (new section in profile, plus `/work/[id]`)
A vertical timeline. Each entry is a work record: question asked, fund released, work sanctioned, work completed, audit finding. Entries carry one of four badges, each with a strict meaning: announced, sanctioned, completed, verified. Area tags let the same timeline show on the area page as "what happened here".

### 6. Sources and coverage (exists, extend)
Source chips everywhere. A coverage page per area and per person listing what is collected, what is stale, what is missing. Honest gaps are a feature.

### Making it interesting without distorting it

- **Stories** (exists). Extend the scene builders: a "your seat in 60 seconds" story per area, a "how the money moved" story per filing, a "this session" story per MP. Stories are generated only from approved facts, so new scenes come from new builders, not new content.
- **Relationship map** (prototype exists). Make it real on approved data: person, party, seat, office, and work records as nodes. Filter by year. Useful for party changes and multi-seat careers.
- **Then and now.** Two affidavits side by side for the same person across elections, with the difference stated as "declared" values.
- **Margin and turnout visuals.** The seat page already shows margins. Add state-level small multiples and "how close was your seat".
- **Quests, not points.** Gamify learning, never people. A voter completes "Know your three representatives", "Read one affidavit", "Trace one fact to its source", "Find the office responsible for a pothole". Progress is kept in the browser only. No leaderboards of politicians, no scores for people.
- **Follow and digest.** Follow an area or person; a weekly digest page (later email) lists new approved facts. This is where sync becomes visible to the voter.
- **Hindi first for Rajasthan**, then other languages, using the existing translations table.

## Phases, with done conditions

| Phase | Build | Done when |
| --- | --- | --- |
| A. Election as entity (done 2026-10-31) | `election`, `contest`, `seat` entities in the data layer; calendar records import into them; `/elections/[id]` page; 2024 results attached; 2019 and 2014 published | A Jaipur voter opens the 2024 election page and reaches their seat and winner |
| B. Unattended sync | Scheduled `sync --due`, hosting, alerts, PR publish, single bundle exporter | A week passes with no manual run and the site shows updated "checked on" dates |
| C. Area first | PIN and map to PC and AC; assembly seats for Rajasthan; area home with three cards and coverage | A Jaipur PIN shows the MP and MLA with sources |
| D. Deep profiles | Affidavit adapter for 2024 winners, then all 2024 candidates; Sansad work for all MPs; attendance; unified profile; office duties | Every sitting MP has a filing, work timeline and duties panel |
| E. Candidates during a poll | Nomination adapter (ECI candidate lists), comparison page, poll-window scheduling | Tested end to end on the first announced election after launch (2027 round) |
| F. Outcomes | MPLADS and MLALAD works, milestone badges, area timeline | Jaipur area page lists funded works with status and source |
| G. City | Rajasthan SEC results, Jaipur wards and councillors, municipal works | The third card on the Jaipur area page is filled |
| H1. Share kit | Story scenes exported as Instagram carousels, story frames and reels; link previews; share button; Hinglish captions | A Jaipur seat story is posted as a carousel and a reel, and its link opens the seat page |
| H2. Engagement | Quests, personal share card, relationship map on real data, follow and digest, full Hindi | Jaipur voter test from `docs/research/jaipur-voter-test.md` passes with five residents |

Phases A to D are sequential. E can start once A and B exist. H1 starts as soon as A ships, because stories are how young voters find the site; the 2024 Lok Sabha data is enough to start. F, G and H2 run alongside D and E.

**Audience.** Young and first-time voters, reached mainly through stories shared on Instagram and WhatsApp. See the stories section of [ui-plan.md](ui-plan.md) for formats, templates and guardrails.

## Deadlines the calendar sets

Assembly terms run five years from the last results, so the calendar fixes when each part must be ready. Poll dates stay unknown until ECI announces them; ECI usually announces four to six weeks before polling.

| When terms end | Elections | What should be ready |
| --- | --- | --- |
| March 2027 | Goa, Manipur, Punjab, Uttarakhand | A and B before the schedule (likely January 2027); E tested live on this round |
| May 2027 | Uttar Pradesh | E running for a large state |
| Nov to Dec 2027 | Himachal Pradesh, Gujarat | E routine |
| Early 2028 | Tripura, Meghalaya, Nagaland | |
| May 2028 | Karnataka | |
| Late 2028 | Rajasthan, Madhya Pradesh, Chhattisgarh, Telangana, Mizoram | C and D for Rajasthan: assembly seats, MLAs, deep profiles |
| Mid 2029 | Lok Sabha | Full stack, with F, G and H done |

These are targets, not commitments.

## Risks and guards

| Risk | Guard |
| --- | --- |
| Wrong person matched | Official ids only; doubtful matches held back |
| OCR misreads an affidavit | Every value reviewed against the page image before publishing |
| Source site changes or goes down | Adapter fails loudly, alert fires, old facts marked stale, not deleted |
| Reuse terms or personal data | Decisions 5 and 6 settled before phase D publishes |
| Seen as taking sides | Same fields for every candidate, no scores, sources on every line |
| Missing the 2027 window | Phases A and B scoped small; E can fall back to the curated calendar |

## How we measure progress

- **Coverage.** Share of seats, people and sections with data, shown publicly per area.
- **Freshness.** Days since each source was last checked, and sources overdue.
- **Accuracy.** Corrections reported and fixed, and time to fix.
- **Reliability.** Sync runs without manual help, failures and time to recover.
- **Understanding.** Jaipur residents who pass the comprehension test in Hindi and English.

## Decisions to take

1. Confirm Rajasthan and Jaipur as the first state and city.
2. Approve the badge vocabulary for outcomes: announced, sanctioned, completed, verified.
3. Approve quests as the only gamification, with no scores for people.
4. Pick a host for Postgres, blobs and the site before phase B.
5. Decide Digital Sansad reuse (still open from the national plan).
6. Legal review of affidavit republication (public record, but personal data) before phase D publishes filings.
7. Set up the Instagram account and a short web address, and get legal advice on posting rules during polls, before phase H1 goes live.
