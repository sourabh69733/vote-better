export interface RightsGuide {
  id: string;
  situation: string;
  custodyPath: "ordinary" | "preventive" | "not-applicable";
  steps: { kind: "legal" | "practical"; text: string; citationIds: string[] }[];
  citations: { id: string; url: string; section: string; checkedAt: string }[];
  lawEffectiveOn: string;
  sourceCheckedAt: string;
  legallyReviewedAt: string;
  reviewer: string;
  exceptions: string[];
  helpContacts: { label: string; url: string; checkedAt: string }[];
  amendedAt?: string;
}

const day = 86_400_000;
function instant(value: string): number { return typeof value === "string" ? Date.parse(value) : NaN; }

export function validateRightsGuide(guide: RightsGuide, now = new Date()): void {
  if (!guide.id?.trim() || !guide.situation?.trim() || !["ordinary", "preventive", "not-applicable"].includes(guide.custodyPath)) throw new Error("invalid custody path or situation");
  if (!guide.reviewer?.trim() || !Number.isFinite(instant(guide.legallyReviewedAt)) || instant(guide.legallyReviewedAt) < instant(guide.sourceCheckedAt)) throw new Error("legal review is required after source check");
  if (!/^\d{4}-\d\d-\d\d$/.test(guide.lawEffectiveOn) || !Number.isFinite(instant(guide.sourceCheckedAt))) throw new Error("law effective and source check dates are required");
  if (guide.amendedAt && instant(guide.amendedAt) > instant(guide.legallyReviewedAt)) throw new Error("law amendment needs renewed legal review");
  const citations = new Set(guide.citations.map((item) => item.id));
  if (!citations.size || guide.citations.some((item) => !item.section || !item.url.startsWith("https://") || !Number.isFinite(instant(item.checkedAt)))) throw new Error("official citation is required");
  if (!guide.steps.length || guide.steps.some((step) => !step.text?.trim() || !step.citationIds.length || step.citationIds.some((id) => !citations.has(id)))) throw new Error("every step needs a citation");
  if (guide.steps.some((step) => /\b(?:24[ -]?hour|twenty[ -]?four[ -]?hour)/i.test(step.text)) && !guide.exceptions.includes("preventive-detention")) throw new Error("24-hour claim needs preventive-detention exception");
  if (!guide.helpContacts.length || guide.helpContacts.some((item) => !item.url.startsWith("https://") || !Number.isFinite(instant(item.checkedAt)) || now.getTime() - instant(item.checkedAt) > 30 * day)) throw new Error("help contact check expired");
}

export const rightsSources = {
  constitution: { title: "Constitution of India, Article 22", url: "https://www.legislative.gov.in/static/uploads/2025/08/7af1daa22d65f9d04c00ae9b9aa5a799.pdf" },
  bnss: { title: "India Code, Bharatiya Nagarik Suraksha Sanhita, 2023", url: "https://www.indiacode.nic.in/indiacode/handle/123456789/20099?view_type=browse" },
  bnssText: { title: "BNSS full text (India Code PDF)", url: "https://www.indiacode.nic.in/bitstream/123456789/21180/1/bharatiya_nagarik_suraksha_sanhita%2C_2023_1723877824_66c049c04ad7c_%281%29.pdf" },
  dslsa: { title: "Delhi State Legal Services Authority", url: "https://delhi.nalsa.gov.in/" },
  dslsaAbout: { title: "DSLSA legal aid and helplines", url: "https://delhi.nalsa.gov.in/introduction/" },
  police: { title: "Delhi Police station finder", url: "https://delhipolice.gov.in/kyps" },
  policeContacts: { title: "Delhi Police helplines", url: "https://delhipolice.gov.in/telephonedirectory" },
  missingReport: { title: "Delhi Police missing-person registration", url: "https://cctns.delhipolice.gov.in/citizenservices/missingpersonregistration.htm" },
} as const;

export const rightsSituations = [
  { id: "stopped", title: "Stopped by police", summary: "A stop and an arrest can involve different legal powers. BNSS section 35 describes when police may arrest without a warrant.", sourceIds: ["bnssText", "dslsa"], summaryReference: "BNSS section 35" },
  { id: "questioned", title: "Called for questioning", summary: "In specified cases, police can issue a written notice to appear. The BNSS notice form identifies the case, station, date and time.", sourceIds: ["bnssText", "dslsa"], summaryReference: "BNSS section 35(3) and Second Schedule" },
  { id: "detained", title: "Detained", summary: "Article 22 generally requires an arrested person to be brought before a magistrate within 24 hours, excluding travel time. Its first two clauses do not apply to enemy aliens or detention under a preventive-detention law.", sourceIds: ["constitution", "bnssText", "dslsa"], summaryReference: "Constitution, Article 22(1)-(3)" },
  { id: "arrested", title: "Arrested", summary: "For an arrest without warrant, BNSS requires the grounds to be given. It also covers informing a nominated person and meeting an advocate during interrogation.", sourceIds: ["bnssText", "constitution", "dslsa"], summaryReference: "BNSS sections 38, 47 and 48" },
  { id: "injured", title: "Injured in custody", summary: "BNSS requires a medical examination soon after arrest. The report should record injuries and be given to the arrested person or their nominee.", sourceIds: ["bnssText", "dslsa"], summaryReference: "BNSS section 53" },
  { id: "family-member-missing", title: "Looking for someone", summary: "Delhi Police offers missing-person registration and a 1094 helpline. Its emergency response number is 112.", sourceIds: ["missingReport", "policeContacts", "police"], summaryReference: "Delhi Police missing-person service and telephone directory" },
  { id: "legal-aid", title: "Need legal aid", summary: "DSLSA offers legal-aid services for eligible people, including accused persons and victims. Its official page lists helpline 1516.", sourceIds: ["dslsaAbout", "dslsa"], summaryReference: "DSLSA introduction" },
] as const;

export function currentDslsaHelpline(now = new Date()): string | null {
  const checkedAt = Date.parse("2026-10-09T00:00:00.000Z");
  return now.getTime() - checkedAt <= 30 * day ? "1516" : null;
}
