# National plan: know your candidate, simply

## Mission

Anyone in India can find their area, see who represents it and who is contesting it, understand who each person is and how they got there, and open the source behind every fact. Then they can take a local problem to the right person.

Every screen answers four questions, in this order:

1. **Who is this?** Name, photo, party, current role, area, age, education, profession.
2. **How did they get here?** The election they won or contested, votes, margin, rivals, past elections and offices.
3. **What have they declared and done?** Affidavit (assets, liabilities, declared cases), questions, debates, attendance, local area funds.
4. **Where does each fact come from?** A source link and "checked on" date beside every fact.

## Where we are (October 2026)

| Need | Today | Gap |
| --- | --- | --- |
| Find your area | 2 Jaipur areas, PIN preview in development | No national area list or location search |
| Who represents you | 540 MPs from Digital Sansad (local export), Delhi preview | No MLAs or local bodies; MP export not public |
| How they got there | Full 2024 result only for Jaipur | No results for the other 541 seats |
| What they declared | Jaipur affidavits, entered by hand | Nothing national |
| What they did | Questions and debates for 2 MPs | Not collected for the other 538 |
| One profile | `/people/[slug]` (Jaipur) and `/mps/[id]` (Sansad) look and work differently | Two profile systems |
| Data flow | Capture, review and publish exist in PostgreSQL, but each source has its own export script and the site reads local files | No source registry, no scheduled sync, no single publication bundle, no deployment path |
| Problems to representatives | `/constitution` explains Union, State and Local | No route from a problem to the responsible office |

## Data flow

```
Source registry -> Scheduled collect -> Snapshot (hash) -> Normalize -> Match identity
   -> Review (batch per snapshot; per fact only for conflicts) -> Publication bundle (JSON)
   -> Pull request with the diff -> Merge -> Site rebuilds and deploys
```

1. **Source registry.** One file lists every source: owner, URL, format, refresh interval, terms of reuse and which profile fields it may supply. Nothing is collected unless it is registered.
2. **Collect on a schedule.** A scheduled job (GitHub Actions) fetches each due source. Unchanged bytes only update "last checked". Changed bytes create a new snapshot.
3. **Normalize and match.** Each source has one adapter that turns a snapshot into observations with an exact locator. People are matched by official IDs (ECI candidate, Sansad member). A name alone never merges two people.
4. **Review at the right size.** Per-fact human review does not scale to 8,000 candidates. An official structured dataset (for example an ECI results file) is approved once per snapshot after automated checks pass, such as totals matching. Only conflicts, identity doubts and free-text claims go to per-fact review.
5. **One publication bundle.** A single exporter writes versioned JSON: one file per person and area, plus search indexes. The site reads only this bundle and never fetches sources on page load.
6. **Sync by pull request.** The job opens a pull request showing what changed. Merging it publishes. Git history becomes the public correction log.
7. **Real time.** Not needed for profiles. Daily or weekly checks are enough, and "last checked" is shown. Counting day is the exception and needs a separate live results view later.

## Sources, in priority order

| Source | Gives | Format | Status |
| --- | --- | --- | --- |
| ECI 2024 statistical report 33, "Constituency Wise Detailed Result" | Every candidate, party and vote count in all 543 seats | XLS (3 MB) | Located, not collected |
| ECI report 4, "List of Successful Candidates" | Winner per seat | XLS | Located |
| Digital Sansad | Sitting MPs, biography, positions, questions, debates | JSON API | Collected; reuse decision pending |
| ECI affidavit portal | Assets, liabilities, declared cases, education | PDF per candidate, often scanned | Not started; needs OCR and review |
| State election offices (Form 21E) | Official per-seat return | PDF | Jaipur only |
| MPLADS portal | Local area fund releases and works | Web | Not started |
| State assemblies and state election commissions | MLAs, assembly results | Varies by state | Not started |
| Constituency boundaries | Location to seat | Shapefiles | Licence to check |
| CPGRAMS and state grievance portals | Where to file a complaint | Web links | Not started |

MyNeta and PRS stay as manual cross-checks unless they give written permission.

## Phases

1. **National 2024 Lok Sabha (next).** Import ECI report 33 for all 543 seats. One profile page for every candidate and MP, with "How they got here": votes, vote share, margin and every rival linked. One area page for every seat. Home page search by name, seat or state.
2. **Automated data flow.** Source registry, scheduled collection, batch review, publication bundle, pull-request sync and deployment.
3. **Work and declarations.** Questions, debates and attendance for all MPs. Affidavits for winners first, then all candidates.
4. **Find your area.** Location or PIN to Lok Sabha and assembly seat, using boundaries with a checked licence. Then MLAs, state by state.
5. **Problems to representatives.** Pick a problem, see whether Union, State or Local is responsible, then your representative's official contact and the official grievance portal. No public complaint posts until moderation and safety are designed.
6. **Hindi**, then other languages.

## Decisions needed

1. Approve batch review per official snapshot (step 4 of the data flow).
2. Approve pull-request based sync and choose a host (for example Vercel).
3. Decide on Digital Sansad reuse.
4. A lawyer reviews `/rights` and `/constitution`.
