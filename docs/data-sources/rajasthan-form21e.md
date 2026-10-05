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

## First adapter scope

The first adapter may emit observations for the named contest, each page 1 candidate row, the five totals, the elected-person declaration and the document date. Each observation needs a snapshot ID, page/row locator, original text, normalized value and normalizer version. The date is stored as `2024-06-04` with `day` precision and original text `04/06/2024`, never as an invented midnight instant. A separate candidate-list source is needed before claiming full nomination coverage.
