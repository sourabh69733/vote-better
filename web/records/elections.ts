import { validateElections, type Election, type ElectionSource } from "@/lib/elections";

// Curated from ECI press notes as relayed by the Press Information Bureau (PIB) and ECI's own site.
// Add an election only with a source that states the dates. Dates ECI has not announced stay absent.

const CHECKED = "2026-10-31";
const ECI = "Election Commission of India";
const PIB = "Press Information Bureau, Government of India";

const pib = (title: string, prid: string, extra = ""): ElectionSource => ({
  title, publisher: PIB, checkedOn: CHECKED, url: `https://www.pib.gov.in/PressReleasePage.aspx?PRID=${prid}${extra}`,
});

const schedule2026: ElectionSource[] = [
  pib("General Election to the Legislative Assemblies of Assam, Kerala, Tamil Nadu, West Bengal and Puducherry: Schedule of Election, 15 March 2026", "2240396", "&reg=3&lang=1"),
  pib("General Elections to Legislative Assemblies and bye-elections 2026: implementation of dry day (states poll and counting dates), 20 April 2026", "2253728", "&reg=3&lang=1"),
];

// Term end dates for the 2027 round come from reports of ECI statements, not a schedule press note.
const dueIn2027: ElectionSource[] = [
  { title: "2027 elections in India", publisher: "Wikipedia (summary of reported assembly terms)", checkedOn: CHECKED, url: "https://en.wikipedia.org/wiki/2027_elections_in_India" },
  { title: "ECI team visits Uttarakhand to plan assembly polls", publisher: "Deccan Chronicle", checkedOn: CHECKED, url: "https://www.deccanchronicle.com/news/politics/eci-team-visits-uttarakhand-to-plan-assembly-polls-1995479" },
];

export const elections: Election[] = [
  {
    id: "lok-sabha-2024",
    body: "lok-sabha",
    name: "General Election to Lok Sabha, 2024",
    states: ["All states and union territories"],
    seats: 543,
    announcedOn: "2024-03-16",
    polls: [
      { date: "2024-04-19", covers: "Phase 1, 102 seats" },
      { date: "2024-04-26", covers: "Phase 2, 89 seats" },
      { date: "2024-05-07", covers: "Phase 3, 94 seats" },
      { date: "2024-05-13", covers: "Phase 4, 96 seats" },
      { date: "2024-05-20", covers: "Phase 5, 49 seats" },
      { date: "2024-05-25", covers: "Phase 6, 57 seats" },
      { date: "2024-06-01", covers: "Phase 7, 57 seats" },
    ],
    countingOn: "2024-06-04",
    siteHref: "/seats",
    note: "Assembly elections in Andhra Pradesh, Arunachal Pradesh, Odisha and Sikkim were held alongside. Every seat's result is on this site.",
    sources: [pib("Announcement of schedule for General Elections to Lok Sabha and Legislative Assemblies of Andhra Pradesh, Arunachal Pradesh, Odisha and Sikkim, 2024, in maps and tables", "2015237", "&reg=48&lang=2")],
  },
  {
    id: "delhi-assembly-2025",
    body: "assembly",
    name: "General Election to Legislative Assembly of NCT of Delhi, 2025",
    states: ["NCT of Delhi"],
    seats: 70,
    announcedOn: "2025-01-07",
    polls: [{ date: "2025-02-05" }],
    countingOn: "2025-02-08",
    termEndsOn: "2025-02-23",
    sources: [pib("General Election to Legislative Assembly of NCT of Delhi, 2025", "2090923", "&reg=48&lang=2")],
  },
  {
    id: "bihar-assembly-2025",
    body: "assembly",
    name: "General Election to Legislative Assembly of Bihar, 2025",
    states: ["Bihar"],
    seats: 243,
    announcedOn: "2025-10-06",
    polls: [
      { date: "2025-11-06", covers: "Phase 1, 121 seats" },
      { date: "2025-11-11", covers: "Phase 2, 122 seats" },
    ],
    countingOn: "2025-11-14",
    termEndsOn: "2025-11-22",
    sources: [
      { title: "General Election to Legislative Assembly of Bihar, 2025 (ECI press note, 6 October 2025)", publisher: PIB, checkedOn: CHECKED, url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/oct/doc2025106659201.pdf" },
      { title: "Annexure I: schedule for the General Election to the Legislative Assembly of Bihar", publisher: PIB, checkedOn: CHECKED, url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/oct/doc2025106659301.pdf" },
    ],
  },
  {
    id: "west-bengal-assembly-2026",
    body: "assembly",
    name: "General Election to Legislative Assembly of West Bengal, 2026",
    states: ["West Bengal"],
    seats: 294,
    announcedOn: "2026-03-15",
    polls: [{ date: "2026-04-23", covers: "Phase 1" }, { date: "2026-04-29", covers: "Phase 2" }],
    countingOn: "2026-05-04",
    termEndsOn: "2026-05-07",
    sources: schedule2026,
  },
  {
    id: "tamil-nadu-assembly-2026",
    body: "assembly",
    name: "General Election to Legislative Assembly of Tamil Nadu, 2026",
    states: ["Tamil Nadu"],
    seats: 234,
    announcedOn: "2026-03-15",
    polls: [{ date: "2026-04-23" }],
    countingOn: "2026-05-04",
    termEndsOn: "2026-05-10",
    sources: schedule2026,
  },
  {
    id: "assam-assembly-2026",
    body: "assembly",
    name: "General Election to Legislative Assembly of Assam, 2026",
    states: ["Assam"],
    seats: 126,
    announcedOn: "2026-03-15",
    polls: [{ date: "2026-04-09" }],
    countingOn: "2026-05-04",
    termEndsOn: "2026-05-20",
    sources: schedule2026,
  },
  {
    id: "kerala-assembly-2026",
    body: "assembly",
    name: "General Election to Legislative Assembly of Kerala, 2026",
    states: ["Kerala"],
    seats: 140,
    announcedOn: "2026-03-15",
    polls: [{ date: "2026-04-09" }],
    countingOn: "2026-05-04",
    termEndsOn: "2026-05-23",
    resultsUrl: "https://results.eci.gov.in/ResultAcGenMay2026/statewiseS111.htm",
    sources: schedule2026,
  },
  {
    id: "puducherry-assembly-2026",
    body: "assembly",
    name: "General Election to Legislative Assembly of Puducherry, 2026",
    states: ["Puducherry"],
    seats: 30,
    announcedOn: "2026-03-15",
    polls: [{ date: "2026-04-09" }],
    countingOn: "2026-05-04",
    termEndsOn: "2026-06-15",
    sources: schedule2026,
  },
  {
    id: "bye-elections-october-2026",
    body: "bye-election",
    name: "Bye-elections to five assembly seats and the Nagaon Lok Sabha seat, October 2026",
    states: ["Tamil Nadu", "Puducherry", "West Bengal", "Assam"],
    seats: 6,
    announcedOn: "2026-09-07",
    polls: [{ date: "2026-10-06" }],
    countingOn: "2026-10-09",
    resultsUrl: "https://results.eci.gov.in/ResultAcByeOct2026/index.htm",
    note: "Madurantakam and Dharapuram (Tamil Nadu), Thattanchavady (Puducherry), Nandigram and Rejinagar (West Bengal), and the Nagaon parliamentary seat (Assam). The seats fell vacant after resignations.",
    sources: [
      { title: "Schedule for bye-elections to 05 Assembly Constituencies of Tamil Nadu, Puducherry and West Bengal and 01 Parliamentary Constituency of Assam, 7 September 2026", publisher: ECI, checkedOn: CHECKED, url: "https://www.eci.gov.in/issue-details-page/press-releases" },
      { title: "Bye election to parliamentary constituencies: results October 2026", publisher: ECI, checkedOn: CHECKED, url: "https://results.eci.gov.in/ResultPcByeOct2026/index.htm" },
    ],
  },
  { id: "manipur-assembly-2027", body: "assembly", name: "Legislative Assembly of Manipur", states: ["Manipur"], seats: 60, polls: [], termEndsOn: "2027-03", sources: dueIn2027 },
  { id: "goa-assembly-2027", body: "assembly", name: "Legislative Assembly of Goa", states: ["Goa"], seats: 40, polls: [], termEndsOn: "2027-03", sources: dueIn2027 },
  { id: "punjab-assembly-2027", body: "assembly", name: "Legislative Assembly of Punjab", states: ["Punjab"], seats: 117, polls: [], termEndsOn: "2027-03", sources: dueIn2027 },
  { id: "uttarakhand-assembly-2027", body: "assembly", name: "Legislative Assembly of Uttarakhand", states: ["Uttarakhand"], seats: 70, polls: [], termEndsOn: "2027-03", sources: dueIn2027 },
  { id: "uttar-pradesh-assembly-2027", body: "assembly", name: "Legislative Assembly of Uttar Pradesh", states: ["Uttar Pradesh"], seats: 403, polls: [], termEndsOn: "2027-05", sources: dueIn2027 },
  { id: "himachal-pradesh-assembly-2027", body: "assembly", name: "Legislative Assembly of Himachal Pradesh", states: ["Himachal Pradesh"], seats: 68, polls: [], termEndsOn: "2027-11", sources: dueIn2027 },
  { id: "gujarat-assembly-2027", body: "assembly", name: "Legislative Assembly of Gujarat", states: ["Gujarat"], seats: 182, polls: [], termEndsOn: "2027-12", sources: dueIn2027 },
];

const errors = validateElections(elections);
if (errors.length) throw new Error(`Election records cannot be published:\n${errors.join("\n")}`);
