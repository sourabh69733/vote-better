// How common requests move through government, step by step, from the law or official rules that set
// each step. Checked on 2026-11-15: every step's wording, time limit and page was matched against the
// linked document. Links open the PDF at the page where the cited text is.

export interface ProcessRef { label: string; url: string }

export interface ProcessStep {
  // Who acts at this step: "You", or the office.
  who: string;
  title: string;
  detail: string;
  // A time limit the cited text sets, if any.
  time?: string;
  ref: ProcessRef;
}

export interface CitizenProcess {
  id: string;
  title: string;
  tagline: string;
  start: { label: string; url: string; number?: string };
  steps: ProcessStep[];
  note?: string;
  noteRef?: ProcessRef;
  // A page on this site that shows the process with real records.
  see?: { label: string; href: string };
}

export const PROCESSES_CHECKED_ON = "2026-11-15";

const BNSS = "https://www.ncrb.mha.gov.in/uploads/SankalanPortal/DownloadPDF/BNSS2023.pdf";
const RTI = "https://cic.gov.in/sites/default/files/RTI-Act_English.pdf";
const ECI_FAQ = "https://www.eci.gov.in/Documents/Final-ER-FAQ.pdf";
const CPA = "https://consumeraffairs.gov.in/public/upload/files/CP%20Act%202019_1732700731.pdf";
const CPGRAMS = "https://pgportal.gov.in/Home/Preview/Q29tcHJlaGVuc2l2ZUd1aWRlbGluZXNGb3JIYW5kbGluZ1RoZVB1YmxpY0dyaWV2YW5jZXMucGRm";
const MPLADS_PIB = "https://pib.gov.in/PressReleasePage.aspx?PRID=2153066";

const at = (document: string, page: number) => `${document}#page=${page}`;
const bnss = (sections: string, page: number): ProcessRef => ({ label: `Bharatiya Nagarik Suraksha Sanhita, 2023, ${sections}`, url: at(BNSS, page) });
const rti = (sections: string, page: number): ProcessRef => ({ label: `Right to Information Act, 2005, ${sections}`, url: at(RTI, page) });
const eci = (part: string, page: number): ProcessRef => ({ label: `Election Commission of India, note on electoral roll revision, ${part}`, url: at(ECI_FAQ, page) });
const cpa = (sections: string, page: number): ProcessRef => ({ label: `Consumer Protection Act, 2019, ${sections}`, url: at(CPA, page) });
const pg = (paragraph: string, page: number): ProcessRef => ({ label: `Comprehensive guidelines for handling public grievances, DARPG, August 2024, ${paragraph}`, url: at(CPGRAMS, page) });
const mplads = (paragraph: string): ProcessRef => ({ label: `MPLADS Guidelines, 2023, ${paragraph}, as quoted by the Ministry of Statistics (PIB, 6 August 2025)`, url: MPLADS_PIB });

export const processes: CitizenProcess[] = [
  {
    id: "police-complaint", title: "From a police complaint to court", tagline: "What happens after you report a crime",
    start: { label: "Any police station, or 112 in an emergency", url: "https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=188727", number: "112" },
    steps: [
      { who: "You", title: "Report it at any police station", detail: "A cognizable offence, one the police can act on without a court's order, can be reported at any police station, wherever it happened, in person or electronically. A report sent electronically must be signed within three days.", ref: bnss("section 173(1)", 116) },
      { who: "Police station", title: "The FIR is written down and you get a copy", detail: "What you say is recorded, read back to you and signed. A copy must be given to you straight away, free.", ref: bnss("section 173(1)-(2)", 116) },
      { who: "Superintendent of Police", title: "If the station refuses, write to the SP", detail: "Send the details in writing by post to the district's Superintendent of Police, who must investigate or have it investigated. If that fails too, you can apply to a Magistrate.", ref: bnss("section 173(4)", 117) },
      { who: "Police", title: "The case is investigated", detail: "Investigation must be finished without unnecessary delay, and within two months for rape and some other sexual offences.", time: "2 months for some sexual offences", ref: bnss("section 193(1)-(2)", 130) },
      { who: "Police", title: "You are told how it is going", detail: "The police must tell the informant or victim how the investigation is progressing within 90 days.", time: "Within 90 days", ref: bnss("section 193(3)(ii)", 130) },
      { who: "Police", title: "A report goes to the Magistrate", detail: "When the investigation ends, the police send a report to the Magistrate: who is involved, what was found, and whether anyone is arrested or on bail.", ref: bnss("section 193(3)(i)", 130) },
      { who: "Court", title: "The court takes up the case", detail: "A Magistrate takes cognizance on the police report, and the case moves to trial.", ref: bnss("section 210(1)", 137) },
    ],
    note: "For a less serious (non-cognizable) offence, the police note it and send you to a Magistrate instead.",
    see: { label: "Your rights with the police", href: "/rights" },
  },
  {
    id: "rti", title: "Asking for information under RTI", tagline: "Get records from any public office",
    start: { label: "RTI Online, for central government offices", url: "https://rtionline.gov.in/" },
    steps: [
      { who: "You", title: "Apply to the Public Information Officer", detail: "Write to the office's Public Information Officer with the prescribed fee, saying what information you want. You do not have to give a reason.", ref: rti("section 6(1)-(2)", 4) },
      { who: "Public authority", title: "Wrong office? It is passed on", detail: "If another office holds the information, your application is transferred there and you are told.", time: "Within 5 days", ref: rti("section 6(3)", 4) },
      { who: "Public Information Officer", title: "You get a reply", detail: "The officer must give the information or reasons for refusing it. If a life or liberty is at stake, the limit is 48 hours. No reply in time counts as a refusal.", time: "30 days", ref: rti("section 7(1)-(2)", 4) },
      { who: "You", title: "First appeal, inside the office", detail: "If there is no reply or you are not satisfied, appeal to the officer senior to the Public Information Officer. The appeal must be decided within 30 days, or 45 at most.", time: "Appeal within 30 days", ref: rti("section 19(1) and (6)", 5) },
      { who: "Information Commission", title: "Second appeal, to the Commission", detail: "Appeal again to the Central or State Information Commission. Its decision is binding on the office.", time: "Appeal within 90 days", ref: rti("section 19(3) and (7)", 5) },
    ],
  },
  {
    id: "voter-list", title: "Getting your name on the voter list", tagline: "From Form 6 to being able to vote",
    start: { label: "Voter portal and Voter Helpline", url: "https://voters.eci.gov.in/", number: "1950" },
    steps: [
      { who: "You", title: "Fill in Form 6", detail: "Apply any time in the year. You can apply from 17: four dates a year count for turning 18, and you are added in the quarter you turn 18.", ref: eci("questions 13 to 15", 11) },
      { who: "Electoral Registration Officer", title: "Your claim is listed in public", detail: "New claims are put on the registration officer's notice board and the state election office's website, and given to political parties every week, so anyone can object.", ref: eci("paragraph 7.1, under Rule 16 of the Registration of Electors Rules, 1960", 8) },
      { who: "Booth Level Officer", title: "A visit to check your details", detail: "The registration officer sends your Booth Level Officer to verify the claim at your address, and the officer reports back.", ref: eci("paragraph 7.3", 9) },
      { who: "Electoral Registration Officer", title: "A decision on your claim", detail: "The registration officer decides only after the list of claims has been public for at least seven clear days.", time: "After 7 clear days", ref: eci("paragraph 7.2", 8) },
    ],
    note: "Check your name on the voter portal before an election, or call 1950.",
  },
  {
    id: "consumer", title: "A consumer complaint", tagline: "When a product or service lets you down",
    start: { label: "National Consumer Helpline", url: "https://consumerhelpline.gov.in/", number: "1915" },
    steps: [
      { who: "You", title: "Complain to the District Commission", detail: "File a complaint about the goods or service with the District Consumer Commission, with the prescribed fee. It can be filed online, on e-Jagriti.", ref: cpa("section 35", 18) },
      { who: "District Commission", title: "The complaint is admitted", detail: "The Commission decides whether to take the complaint, and must hear you before rejecting it. If it does not decide in time, the complaint is treated as admitted.", time: "Usually within 21 days", ref: cpa("section 36(2)-(3)", 18) },
      { who: "District Commission", title: "Mediation, if a settlement looks possible", detail: "If both sides might agree, the Commission can send the dispute to mediation with their written consent.", ref: cpa("section 37", 18) },
      { who: "District Commission", title: "A decision", detail: "The Commission aims to decide within three months of the other side getting notice, or five months if goods must be tested.", time: "3 months (5 with testing)", ref: cpa("section 38(7)", 20) },
      { who: "You", title: "Appeal to the State Commission", detail: "If either side disagrees with the order, it can appeal to the State Consumer Commission.", time: "Within 45 days", ref: cpa("section 41", 22) },
    ],
    note: "e-Jagriti, launched on 1 January 2025, took in the older e-Daakhil filing site.",
    noteRef: { label: "Department of Consumer Affairs on e-Jagriti (PIB, 17 August 2025)", url: "https://pib.gov.in/PressReleasePage.aspx?PRID=2157241" },
  },
  {
    id: "central-grievance", title: "A complaint about a central government office", tagline: "Through the national grievance portal (CPGRAMS)",
    start: { label: "Public grievance portal (CPGRAMS)", url: "https://pgportal.gov.in/" },
    steps: [
      { who: "You", title: "File the grievance online", detail: "Describe the problem and pick its category on the portal. Each category is mapped to the Grievance Redressal Officer of the office responsible.", ref: pg("paragraph 3(i)-(ii)", 2) },
      { who: "Grievance Redressal Officer", title: "It reaches the right office", detail: "A grievance must not be closed as “not our department”; it is transferred to the office that can act on it.", ref: pg("paragraph 7.1", 4) },
      { who: "Grievance Redressal Officer", title: "It is resolved", detail: "The officer resolves it, or sends an interim reply with the reason for delay and an expected date.", time: "21 days at most", ref: pg("paragraph 5.1", 3) },
      { who: "Grievance Redressal Officer", title: "It is closed with reasons", detail: "The officer files an action taken report, attaches any order issued, and gives a clear reason if your request is not accepted.", ref: pg("paragraphs 7.3-7.4", 4) },
      { who: "Appellate Authority", title: "Appeal if you are not satisfied", detail: "A senior officer examines the appeal independently. The grievance stays open until the appeal is decided.", time: "Decided within 30 days", ref: pg("paragraphs 6 and 7.5", 4) },
    ],
  },
  {
    id: "mp-fund", title: "Your MP's local area fund (MPLADS)", tagline: "How an MP's recommended work gets built",
    start: { label: "MPLADS eSAKSHI dashboard", url: "https://mplads.mospi.gov.in/digigov/dashboard.html" },
    steps: [
      { who: "Your MP", title: "The MP recommends a work", detail: "The MP chooses a work for the area and sends the recommendation to the district on the eSAKSHI portal.", ref: mplads("eSAKSHI") },
      { who: "District authority", title: "The district sanctions or rejects it", detail: "The district must sanction or reject every recommendation.", time: "Within 45 days", ref: mplads("paragraph 3.2.4") },
      { who: "District authority", title: "A deadline is set", detail: "The sanction letter sets a deadline for the work to be finished, generally no more than a year.", time: "Generally within 1 year", ref: mplads("paragraph 3.2.12") },
      { who: "Implementing agency", title: "The work is built and marked complete", detail: "The implementing agency carries out the work, and its progress is recorded on eSAKSHI.", ref: mplads("eSAKSHI") },
    ],
    see: { label: "See real works for a Jaipur MP", href: "/people/manju-sharma" },
  },
];
