# Delhi public information system

## Purpose

Help a Delhi resident find the public institution and office responsible for an issue, the person currently holding that office, the relevant public records, and the legal rights and help available to the resident. The CJP protest is one possible entry point, not the dataset boundary. The first release is read-only and works on mobile and desktop.

"All Delhi information" is a coverage goal, not a completeness claim. Every category must show its source, last successful check, reviewed date, and whether its coverage is complete, partial, stale, disputed or unknown.

## User journeys, in priority order

1. **Find help:** enter a place or issue and find the responsible office, official contact and escalation path. A PIN code may suggest an area but cannot establish all boundaries by itself.
2. **Know your rights:** choose a situation such as being stopped, questioned, detained, arrested, seeking bail or locating someone in custody. Read short, actionable steps, exact legal references and Delhi legal-aid contacts.
3. **Understand power:** browse the current and past holders of elected and appointed offices, the institutions they belong to, and their geographic or functional jurisdiction.
4. **Inspect records:** see dated orders, appointments, official notices, legislative work, budgets and public works where an audited source exists.
5. **Explore justice:** find courts, benches, judges, legal-aid bodies and advocates. Court records remain linked to the court's original page; the first release does not bulk-publish litigant or minor identities.

Search and a simple directory are the default interface. A relationship graph is a deeper view of the same published records, not a second data store. Ranking means relevance to the resident's selected place and task, not a score of a person's worth or integrity.

## Records and relationships

Keep the existing `source`, `snapshot`, `observation`, `entity_match`, `review_event`, `publication_revision`, `person` and `area` contracts. Add stable IDs for `institution`, `office`, `jurisdiction`, `facility` and `legal_rule`. A dated `appointment` connects person to office; office belongs to institution; a jurisdiction connects an institution or office to a place or subject. `public_record` connects an order, work item or decision to its issuing institution. `rights_guide` is reviewed editorial content whose steps cite versioned legal rules and official help contacts.

Do not model all Delhi authorities as one reporting tree. The Delhi government, local bodies, Union-controlled authorities and judiciary have different legal relationships. An advocate is a regulated professional, not automatically a public servant. A lawyer's enrolment check and a lawyer's role in a case are separate claims.

All relationships are dated and sourced. Preserve source wording and date precision. A person leaving an office closes an appointment but does not erase their history. A changed page creates a new snapshot and a review case; it never silently replaces a published fact.

## Source families to audit

| Family | Initial official source | First facts to prove |
| --- | --- | --- |
| Delhi government | [GNCTD departments](https://delhi.gov.in/departments-offices?page=1) and current Who's Who pages | Institution, office, incumbent, official contact, portfolio |
| Elected offices | [GNCTD MP directory](https://delhi.gov.in/members-of-parliament), Delhi Assembly and relevant election authority | Member, seat, term, party in that role |
| Police | [Delhi Police station finder](https://delhipolice.gov.in/kyps) and official directories | Station, district, office, official contact |
| Courts | [Delhi High Court](https://delhihighcourt.nic.in/web/) and Delhi District Courts | Court, judge/roster, public order or case link |
| Advocates | [Bar Council of Delhi enrolment lookup](https://www.delhibarcouncil.com/bcd/enrolment_index.php) | Verification of a supplied enrolment ID, if permitted |
| Law and legal aid | [India Code BNSS](https://www.indiacode.nic.in/indiacode/handle/123456789/20099?view_type=browse), [Constitution](https://www.legislative.gov.in/constitution-of-india), [DSLSA](https://delhi.nalsa.gov.in/) | Current text, effective date, right, limitation, official help contact |

Each source adapter records access/reuse conditions, collection method, update pattern, rate limit, expected coverage and failure behavior before collection. Official pages may be stale or conflict with each other; authority and publication date must be compared before an incumbent is marked current. A source's absence is unknown, not evidence that an office or person does not exist.

## Rights guide rules

Start with practical paths for `stopped`, `questioned`, `detained`, `arrested`, `injured`, `family-member-missing` and `legal-aid`. Each step distinguishes the rule from a practical suggestion. Cite the Constitution, BNSS, applicable orders and official legal-aid service. Distinguish ordinary arrest, preventive arrest and detention under a preventive-detention law. Never present the 24-hour rule as universal. A qualified legal reviewer must approve public legal interpretations and check them after a relevant amendment or court decision. The UI shows the review date and directs urgent cases to a lawyer or DSLSA.

## Publication and safety

Use the existing capture, normalize, match, review and publish pipeline. Public pages read a reviewed export, never fetch external websites on page load. Namesakes do not merge without a stable ID or a reviewed corroborating match. Publish only professional public contact details, not home addresses or private numbers. For court material, link to authoritative records before considering any searchable case data. The public trace gives URL, locator, capture time, review and correction history without exposing private review notes.

The first release is not a live protest tracker, crowdsourced accusation system, lawyer-rating site or AI legal adviser. Those would need their own evidence, safety and maintenance design.
