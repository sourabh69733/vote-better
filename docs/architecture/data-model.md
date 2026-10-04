# Civic data model, phase 0

## Goal

Show citizens concise information about the people representing an area, with a path from every published relationship and activity to an original source. The current dataset covers two Lok Sabha constituencies. This phase creates a consistent contract for adding more records, not an automatic import system.

## Records

| Record | Meaning | Stable reference |
| --- | --- | --- |
| Area | A named constituency or ward | Area ID |
| Office | A type of public office | Office ID |
| Person | A person's identity and profile review date | Person ID |
| Term | A person holding an office for an area over dates | Person, office, area, source IDs |
| Candidacy | A documented election result or candidate status | Person and source IDs |
| Activity | A dated, carefully described public record | Person and source ID |
| Source | Original URL and the date it was checked | Source ID |

The term is the single source for both the area page and the person's current role. Ended terms remain records but do not appear as current holders. Source IDs are unique across the dataset.

## Publication flow

1. Find an original public record and check what it actually proves.
2. Enter the source URL and `checkedOn` date.
3. Enter only facts supported by that source. Record the review date for the person and term.
4. Run dataset validation, tests, lint, and build. The registry rejects missing references, duplicate IDs, and two current holders for the same area and office.
5. Review changed facts and sources before deployment. Recheck current status periodically; the software does not do this yet.

Validation catches structural mistakes. It cannot determine whether a source is accurate, whether a person has changed office since review, or whether a page correctly interprets a document. Human source review remains required.

## Next phase

Build a staged import process for one official data source: collect a snapshot, parse it, compare with reviewed records, and present differences for human approval. Publish only approved records. Do not describe the current records as live data.
