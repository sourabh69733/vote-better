# Vote Better

An open-source project to help people in India understand who represents them, what those people have done, and what rights citizens have. Every published fact links to its original public source and shows when it was checked.

## What is on the site

| Route | Content | Status |
| --- | --- | --- |
| `/` | Search for a seat or candidate, verified areas, Delhi entry point | Public |
| `/elections` | Election calendar: polls underway, assemblies due next, and recent counts, each dated from an ECI press note | Public, curated by hand |
| `/seats` | All 543 Lok Sabha seats from 2024: search by seat, state or any candidate's name | Public |
| `/seats/[state]/[seat]` | Who won, the margin, every candidate's votes and share, NOTA, turnout, ECI source rows | Public |
| `/seats/[state]/[seat]/[candidate]` | Each of the 8,359 candidates: party, age, gender, category, votes, margin, rivals, source row | Public |
| `/areas/[areaId]` | Jaipur and Jaipur Rural Lok Sabha: office holders, 2024 results, relationship map | Public |
| `/people/[slug]` | Sitting MPs and all 2024 Jaipur candidates: office, results, affidavit details, career, parliamentary work | Public |
| `/facts/[factId]` | Source trail for each published election fact | Public |
| `/constitution` | Plain-language Constitution questions, topics and animations | Public, expert review pending |
| `/rights` | Protest, police, arrest and legal aid guide for Delhi, with BNSS citations | Public, legal review pending |
| `/mps` | 540 MP profiles from Digital Sansad | Shown only when a local export exists; reuse rights under review |
| `/delhi` | Delhi offices and office holders | Preview data in development; empty in production until a reviewed export is supplied |
| `/research/*` | PIN lookup and draft MP profiles | Development only |

## Data rules

- A person has a lasting profile. Office terms and election candidacies are dated records attached to that person.
- A claim needs a source, a review date, and wording that matches what the source establishes.
- A parliamentary question proves the question was asked. It does not prove that a local project was delivered.
- Missing or unreviewed fields remain absent. No numerical candidate ranking is published.
- A PIN code alone is not enough to identify every representative.
- National 2024 results come from ECI statistical reports. ECI states that its statutory forms are final; the site shows that note on every result.

## Project layout

- `web/` is the Next.js site. It reads curated records in `web/records/` and reviewed exports; it never fetches sources on page load. See [web/README.md](web/README.md).
- `data/` is the collection and review pipeline: snapshots, normalized observations, identity matching, human review and publication, stored in PostgreSQL. See [data/README.md](data/README.md).
- `docs/architecture/` describes the data model, the profile collection framework and the Delhi system. `docs/data-sources/` records each source audit.

## Run locally

Use Node.js 22 (`web/.nvmrc`).

```bash
cd web
npm install
npm run dev
```

Then open `http://localhost:3000`. Use `npm test`, `npm run lint` and `npm run build` to check the site.

The data pipeline needs Docker for its database:

```bash
docker compose -f data/compose.yaml up -d --wait
npm --prefix data test
```

## Before public release

1. A qualified lawyer reviews `/rights` and `/constitution`.
2. Decide whether Digital Sansad biographies can be republished.
3. Run the [Jaipur comprehension check](docs/research/jaipur-voter-test.md) with residents.

License: MIT.
