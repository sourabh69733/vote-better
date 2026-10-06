# Rajasthan CEO Form 21E - Jaipur Lok Sabha 2024

Checked: 2026-10-05. This is a source audit, not an approval to publish extracted data.

## Source and format

- Issuer: Returning Officer for 7-Jaipur Parliamentary Constituency. The [Rajasthan Chief Electoral Officer result index](https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/Form20_21C_21E.html) links to [Form 21E, Jaipur](https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/ElectionResults/Form21E/Form21E-7.pdf).
- Format: two-page scanned PDF, English on page 1 and Hindi on page 2. It has no extractable text layer in the checked copy. The two pages repeat the same return in different languages and should not produce duplicate observations.
- Document date: `04/06/2024`, day precision. PDF metadata reports creation on 2024-06-06; that is file metadata, not the election event time or an official publication date.
- Retrieval: direct GET of the PDF succeeded on 2026-10-05. The inspected 470,361-byte copy had SHA-256 `b366199167e1759a15d1ae85ac8bfbb1233b746f10fed3a47a429d54fba17dd2`. A HEAD request redirected to the site's error page, so a connector must verify response type and PDF bytes. A later response at the same URL might contain different bytes, so collection must retain a content hash and capture time.

## What this return supports

Page 1 has the constituency name and number; rows 1-13 have candidate name, party affiliation and votes polled. Below the table are totals for electors, valid votes, NOTA votes, rejected votes and tendered votes. The signed declaration names Manju Sharma as duly elected to fill the seat; it states Jaipur and the document date. Page 2 repeats these details in Hindi.

The return can support **2024 Jaipur contest results and the declaration** after a reviewer checks each extracted value against the page. It does not prove present office occupancy, a term end date, work performance, constituency boundaries, biographical claims, or candidate identity across elections. It is not a complete nomination history: withdrawn or rejected nominations are outside its stated return of election. Do not use the address in the declaration for a public profile.

## Update and reuse limits

- Update schedule, revision history and stable version URL: not stated on the result index or PDF. Recheck the URL and compare content hashes; do not assume the document is immutable.
- Automated access limits or machine-readable endpoint: not established by this audit. The source is a scanned PDF, so extraction may need a reviewed transcription tied to page and row.
- Copyright or bulk republication permission for this PDF: not established by this audit. Link to the official PDF. Do not redistribute a source copy publicly until its terms are confirmed.
- Any discrepancy between the English and Hindi pages must enter review; neither page silently overrides the other.
- The first import uses the page 1 manual transcription in `data/extractions/jaipur-form21e-2024.json`. It is draft evidence only until each observation receives a recorded review decision.

## First adapter scope

The first adapter may emit observations for the named contest, each page 1 candidate row, the five totals, the elected-person declaration and the document date. Each observation needs a snapshot ID, page/row locator, original text, normalized value and normalizer version. The date is stored as `2024-06-04` with `day` precision and original text `04/06/2024`, never as an invented midnight instant. A separate candidate-list source is needed before claiming full nomination coverage.

## Recheck and review procedure

- Recheck the official URL before a new publication and when a source change is reported. Compare its SHA-256 with the latest saved snapshot. A failed check is recorded and does not erase the last published facts.
- If the hash changes, inspect the new PDF and create a new page-linked transcription. Review each changed candidate row against the image before approving it. Conflicting values need an explicit resolution linked to the previous published fact.
- The local coverage report counts complete candidate result rows in the latest saved return. It is partial while only some rows are published. A failed latest check with prior published rows is marked stale; an unresolved changed result is marked disputed. These states describe this source's review and collection process, not whether the election itself is valid.
- The first revision published one of 13 result rows: Manju Sharma's name, party and votes.

## Candidate-row review on 2026-10-06

- A fresh GET returned the same 470,361-byte PDF and SHA-256 `b366199167e1759a15d1ae85ac8bfbb1233b746f10fed3a47a429d54fba17dd2`. The matching source check was recorded in the evidence database.
- All 13 names, parties and vote totals in the page 1 transcription were visually checked against the official PDF. Page 2 repeats the 13 vote totals in Hindi with the same numbers. The row votes add to the printed valid-vote total, 1,452,830.
- Candidate names and parties were separately checked against the Rajasthan CEO [2024 candidate expenditure register](https://election.rajasthan.gov.in/Lok_Sabha_Election_2024/Expenditure.html), constituency 7 Jaipur, entries 69-81. This supports identity within this contest; it does not establish that a same-named person in a different election is the same individual.
- The remaining 36 candidate observations received `codex-agent-visual-check` identity links and review decisions. They were published together in revision `c164ad5b-e9a2-47b4-902e-297b5d0f98a7`. The generated website export has 39 facts and 13 complete candidate result rows. Each vote total has a fact trail with source locator and UTC review/publication timestamps.
- The five contest totals and declaration observations have not been published. Candidate-result coverage of 13/13 refers only to rows in this return; it is not coverage of all election facts, nomination history or candidate profiles.
