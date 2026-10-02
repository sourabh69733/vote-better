# Vote Better

An open-source project to help people understand their elected representatives and, during elections, the people contesting their seat.

## Current pilot

The website starts with Jaipur Lok Sabha and a sourced profile for its sitting MP. It shows the current office, the 2024 election return, and two dated parliamentary questions. Each displayed record links to the original public source. The profile is deliberately incomplete while other facts are reviewed.

The former PIN lookup, candidate comparison, quiz, and generated demo profiles have been removed from the public website because their sample figures were not verified. The scripts and sample output under `data/` remain development material and must not be published as factual profiles.

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
