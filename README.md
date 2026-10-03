# Vote Better

An open-source project to help people understand their elected representatives and, during elections, the people contesting their seat.

## Current coverage

The home page lists verified areas. Each area has its own overview and relationship graph, and each person has a lasting profile. Jaipur and Jaipur Rural Lok Sabha are the first two data entries. Their sitting MPs have sourced profiles with the current office and 2024 election return. Jaipur's profile also shows two dated parliamentary questions. Each displayed record links to the original public source. Profiles remain incomplete while other facts are reviewed.

The former PIN lookup, candidate comparison, quiz, and generated demo profiles have been removed from the public website because their sample figures were not verified. The scripts and sample output under `data/` remain development material and must not be published as factual profiles.

## Site structure

- `/` lists verified areas from `web/records/registry.ts`.
- `/areas/[areaId]` and `/areas/[areaId]/relationships` render any registered area from the same records.
- `/people/[slug]` renders a registered person's sourced profile.
- `web/records/jaipur.ts` and `web/records/jaipur-rural.ts` contain the first curated area, person and relationship records. Shared offices live in `web/records/offices.ts`. Add future verified records in separate files and register them in `web/records/registry.ts`. The shared pages do not need city-specific copies.

## Data rules

- A person has a lasting profile. Office terms and election candidacies are dated records attached to that person.
- A claim needs a source, a review date, and wording that matches what the source establishes.
- A parliamentary question proves the question was asked. It does not prove that a local project was delivered.
- Missing or unreviewed fields remain absent. No numerical candidate ranking is published.
- Jaipur and Jaipur Rural are separate parliamentary constituencies. A PIN code alone is not enough to identify every representative.

## Run locally

```bash
cd web
npm install
npm run dev
```

Then open `http://localhost:3000`. Use `npm run lint` and `npm run build` to check the site.

## Next validation

Use the [Jaipur comprehension check](docs/research/jaipur-voter-test.md) with residents. Review source status again before public release.

License: MIT.
