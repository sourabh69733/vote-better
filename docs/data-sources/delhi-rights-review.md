# Delhi rights content review

Source check: 2026-10-09. Public pages show short descriptions of what the cited official sources say, followed by the source links and Delhi legal-aid path. These descriptions are source checks, not case-specific instructions or qualified legal review. No situation-specific legal instruction is marked reviewed. A qualified India criminal-law reviewer must sign off before any plain-language steps are published.

The displayed summaries draw on Constitution Article 22(1)-(3), BNSS sections 35, 38, 47, 48 and 53 and its Second Schedule, Delhi Police's missing-person registration and telephone directory, and DSLSA's introduction page. Article 22(3)'s enemy-alien and preventive-detention exclusions accompany the 24-hour summary. Delhi Police's 1094 and 112 and DSLSA's 1516 are tied to their official pages; stored helpline display expires after 30 days without a new check.

## Draft research map for reviewer

| Situation | Primary sources to check | Specific review risk |
| --- | --- | --- |
| Stopped or questioned | Constitution Article 21 and 22; India Code BNSS sections 35 and 38 | Do not present arrest-only provisions as applying to every conversation with police. |
| Ordinary arrest | Constitution Article 22(1)-(2); BNSS sections 36, 38, 47, 48 and 53 | Confirm exact conditions, actor and exception for each proposed step. |
| Detained or preventive action | Constitution Article 22(3)-(7); BNSS sections 163 and 170; any applicable detention statute or order | Article 22(1)-(2) has stated preventive-detention exceptions. BNSS preventive arrest is not the same as detention under every preventive-detention law. |
| Injured in custody | BNSS section 53; current medical and complaint routes | Check whether the specific provision applies to the person's status and situation. |
| Looking for someone | Delhi Police official station finder and directory; DSLSA | Do not imply a PIN identifies the station or that an online directory is a live custody register. |
| Legal aid | DSLSA service and contact pages | Recheck contact availability and eligibility descriptions. |

Sources: [Constitution official PDF](https://www.legislative.gov.in/static/uploads/2025/08/7af1daa22d65f9d04c00ae9b9aa5a799.pdf), [India Code BNSS](https://www.indiacode.nic.in/indiacode/handle/123456789/20099?view_type=browse), [DSLSA](https://delhi.nalsa.gov.in/introduction/), [Delhi Police](https://delhipolice.gov.in/kyps).

## Expanded source explanations - 10 October 2026

The user approved expanding the rights pages into an interactive protest guide. /rights now provides 18 source-backed topics, a conditional route diagram, an ordinary-custody timeline, a glossary and a source register. Nine situation pages select relevant paragraphs. This expands explanations of published records; it does not mark any RightsGuide as legally reviewed or publish a personalised legal checklist.

The register in web/lib/rights-references.ts records statute or judgment locators, PDF pages where available, source kind and check date. Every paragraph in web/lib/protest-guide.ts references it. The publication validator rejects missing citations, unknown references, duplicate article IDs, missing locators and invalid check dates before content renders. Structural checks cannot determine whether a legal interpretation is correct. Qualified legal review remains pending and is visible in the UI.

### Official sources read

- [Constitution, Legislative Department PDF](https://www.legislative.gov.in/static/uploads/2025/08/7af1daa22d65f9d04c00ae9b9aa5a799.pdf): Articles 19, 20(3), 21, 22 and 226. Article 22's exclusions accompany the ordinary 24-hour explanation.
- [BNSS, Ministry of Home Affairs Gazette PDF](https://www.mha.gov.in/sites/default/files/2024-04/250884_2_english_01042024.pdf): sections 35-38, 43(5), 46-48, 53, 56-58, 148, 163, 170, 172-174, 179-181, 215(1)(a), 478, 480 and 482. This is the linked statutory edition, not a claim that every subsequent amendment or case has been incorporated.
- [BNS, India Code PDF](https://www.indiacode.nic.in/indiacode/bitstream/123456789/20062/1/a202345.pdf): sections 189-191, 221 and 223. The PDF states its edition date as 6 October 2025.
- [Delhi Police Act, India Code PDF](https://www.indiacode.nic.in/bitstream/123456789/13669/1/delhi_police_act.pdf): public-place regulation and direction powers in sections 28-33 and removal under section 65.
- [Amit Sahni v. Commissioner of Police, Supreme Court, 7 October 2020](https://api.sci.gov.in/supremecourt/2020/2418/2418_2020_36_1501_24294_Judgement_07-Oct-2020.pdf): paragraphs 14-19, including earlier judgments and indefinite occupation of public ways.
- [Delhi Traffic Police NOC publication](https://traffic.delhipolice.gov.in/en/no-objection-certificate-noc): organiser-facing public-event requirements. A traffic NOC is not presented as every necessary permission.
- [Delhi Police telephone directory](https://delhipolice.gov.in/telephonedirectory), [missing-person registration](https://cctns.delhipolice.gov.in/citizenservices/missingpersonregistration.htm), [DSLSA introduction](https://delhi.nalsa.gov.in/introduction/) and [NALSA FAQ](https://nalsa.gov.in/faqs/): contact, reporting and legal-help paths. DSLSA's telephone display expires after 30 days without another check.

### Scope and interpretation safeguards

The map is explanatory, not deterministic: lawful arrest or questioning may precede FIR registration; an FIR does not itself require arrest. Section 163 is an order-making power. BNSS section 170 preventive arrest, section 172 removal, Delhi Police Act section 65 removal and detention under a separate preventive-detention statute have distinct conditions and limits. Five people are not automatically an unlawful assembly; BNSS section 148 has a separate dispersal test.

No particular protest, active Delhi order, permission, custody status or future police response has been verified. The direct notification-index fetch timed out; a same-day search result exposed the official index, but no individual order was adopted. Special statutes, labour-specific disputes, children, digital speech, compensation and all subsequent judicial developments are outside this first core guide. The UI states its scope and review status.

### Validation

The citation-boundary test was run failing before implementation and then passing. Required checks are the web test suite, lint, TypeScript and production build. Browser checks cover pointer and keyboard diagram selection, navigation to the detailed FIR page, collapsing topics and a 375px viewport without document overflow. These checks establish rendering and interaction, not qualified legal accuracy.

## Approval gate

For each guide, record the exact statutory section, applicable commencement/amendments, custody path, exceptions, a qualified reviewer and their date, and when each help contact was checked. Re-review after a relevant amendment, order or material correction. Keep the guide unpublished until all fields pass `validateRightsGuide` and the reviewer approves the wording. The public interface must not silently turn this research map into advice.
