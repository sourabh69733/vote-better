# Vote Better web

The pilot publishes source-backed records for the Jaipur and Jaipur Rural Lok Sabha constituencies. Records are curated manually. The site does not fetch election data at request time or update itself automatically.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Run `npm test`, `npm run lint`, and `npm run build` before committing changes.

## Data and evidence

- `lib/civic-records.ts` defines areas, offices, people, terms, candidacies, activities, and sources. It validates IDs and required evidence references.
- `records/registry.ts` assembles the reviewed records and rejects broken references before pages are generated.
- `lib/civic-area.ts` and `lib/verified-profile.ts` derive area and person views from the same records.
- `lib/civic-graph.ts` derives the relationship map from current terms.

To add a record, check the original source, add its URL and checked date, then connect each published fact to its source ID. A current term needs separate evidence for the area seat and its holder. `reviewedOn` describes the manual review date, not live status. Leave unverified facts out. A PIN code or browser position alone is not a confirmed constituency or ward match.

See [the data model](../docs/architecture/data-model.md) for the review flow and remaining limits. `/mockups/graph` is a fictional design preview, separate from published records.
