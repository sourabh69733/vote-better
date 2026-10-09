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
  dslsa: { title: "Delhi State Legal Services Authority", url: "https://delhi.nalsa.gov.in/" },
  police: { title: "Delhi Police station finder", url: "https://delhipolice.gov.in/kyps" },
} as const;

export const rightsSituations = [
  { id: "stopped", title: "Stopped by police", sourceIds: ["constitution", "bnss", "dslsa"] },
  { id: "questioned", title: "Called for questioning", sourceIds: ["constitution", "bnss", "dslsa"] },
  { id: "detained", title: "Detained", sourceIds: ["constitution", "bnss", "dslsa"] },
  { id: "arrested", title: "Arrested", sourceIds: ["constitution", "bnss", "dslsa"] },
  { id: "injured", title: "Injured in custody", sourceIds: ["bnss", "dslsa"] },
  { id: "family-member-missing", title: "Looking for someone", sourceIds: ["police", "dslsa"] },
  { id: "legal-aid", title: "Need legal aid", sourceIds: ["dslsa"] },
] as const;

export function currentDslsaHelpline(now = new Date()): string | null {
  const checkedAt = Date.parse("2026-10-09T00:00:00.000Z");
  return now.getTime() - checkedAt <= 30 * day ? "1516" : null;
}
