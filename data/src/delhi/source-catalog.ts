export type DelhiPredicate =
  | "institution.name" | "institution.url" | "office.title" | "appointment.holder"
  | "appointment.office" | "jurisdiction.area" | "facility.name" | "facility.address"
  | "contact.official" | "law.text" | "help.service";

export interface DelhiSourceDefinition {
  id: string;
  authority: string;
  url: string;
  documentType: "html" | "pdf";
  scope: string;
  allowedPredicates: readonly DelhiPredicate[];
  refreshIntervalHours: number;
  reuseStatus: "review-required" | "approved" | "link-only";
  maxRequestsPerMinute: number;
}

export const delhiSources: readonly DelhiSourceDefinition[] = [
  { id: "gnctd-departments", authority: "Government of NCT of Delhi", url: "https://delhi.gov.in/departments-offices", documentType: "html", scope: "GNCTD department names and links, not officeholders", allowedPredicates: ["institution.name", "institution.url"], refreshIntervalHours: 168, reuseStatus: "review-required", maxRequestsPerMinute: 2 },
  { id: "gnctd-services-officers", authority: "GNCTD Services Department", url: "https://services.delhi.gov.in/who-is-who", documentType: "html", scope: "Services Department public office roles and office contacts", allowedPredicates: ["office.title", "appointment.holder", "appointment.office", "contact.official"], refreshIntervalHours: 24, reuseStatus: "review-required", maxRequestsPerMinute: 2 },
  { id: "delhi-assembly-members", authority: "Delhi Legislative Assembly", url: "https://delhiassembly.delhi.gov.in/sites/default/files/2025-07/list_of_members.pdf", documentType: "pdf", scope: "8th Assembly member, constituency and party; excludes private contact fields", allowedPredicates: ["appointment.holder", "appointment.office", "jurisdiction.area"], refreshIntervalHours: 168, reuseStatus: "review-required", maxRequestsPerMinute: 1 },
  { id: "delhi-police-stations", authority: "Delhi Police", url: "https://delhipolice.gov.in/kyps", documentType: "html", scope: "Official police station finder; location input may be required", allowedPredicates: ["facility.name", "facility.address", "jurisdiction.area", "contact.official"], refreshIntervalHours: 168, reuseStatus: "link-only", maxRequestsPerMinute: 1 },
  { id: "delhi-high-court", authority: "Delhi High Court", url: "https://www.delhihighcourt.nic.in/web/judges/current?page=0", documentType: "html", scope: "Current judge roster and public court information", allowedPredicates: ["office.title", "appointment.holder", "appointment.office"], refreshIntervalHours: 24, reuseStatus: "link-only", maxRequestsPerMinute: 1 },
  { id: "delhi-district-courts", authority: "Delhi District Courts", url: "https://delhidistrictcourts.nic.in/", documentType: "html", scope: "District court locations and public notices; no case-party index", allowedPredicates: ["institution.name", "facility.name", "facility.address"], refreshIntervalHours: 168, reuseStatus: "link-only", maxRequestsPerMinute: 1 },
  { id: "india-code-bnss", authority: "India Code", url: "https://www.indiacode.nic.in/indiacode/handle/123456789/20099?view_type=browse", documentType: "html", scope: "Official BNSS text and amendment context", allowedPredicates: ["law.text"], refreshIntervalHours: 168, reuseStatus: "link-only", maxRequestsPerMinute: 1 },
  { id: "delhi-legal-aid", authority: "Delhi State Legal Services Authority", url: "https://delhi.nalsa.gov.in/", documentType: "html", scope: "Legal aid services and official helplines", allowedPredicates: ["help.service", "contact.official"], refreshIntervalHours: 24, reuseStatus: "link-only", maxRequestsPerMinute: 1 },
  { id: "delhi-bar-enrolment", authority: "Bar Council of Delhi", url: "https://www.delhibarcouncil.com/bcd/enrolment_index.php", documentType: "html", scope: "User-entered advocate enrolment verification, not bulk lawyer directory", allowedPredicates: ["help.service"], refreshIntervalHours: 720, reuseStatus: "link-only", maxRequestsPerMinute: 1 },
];

const knownPredicates = new Set<DelhiPredicate>(["institution.name", "institution.url", "office.title", "appointment.holder", "appointment.office", "jurisdiction.area", "facility.name", "facility.address", "contact.official", "law.text", "help.service"]);

export function validateDelhiSourceCatalog(entries: readonly DelhiSourceDefinition[]): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.id?.trim() || ids.has(entry.id)) throw new Error(`missing or duplicate source ID: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.scope?.trim() || !entry.authority?.trim()) throw new Error(`source ${entry.id} needs authority and scope`);
    if (!entry.reuseStatus || !["review-required", "approved", "link-only"].includes(entry.reuseStatus)) throw new Error(`source ${entry.id} needs reuse status`);
    if (!entry.allowedPredicates?.length || entry.allowedPredicates.some((p) => !knownPredicates.has(p))) throw new Error(`source ${entry.id} has unaudited predicate`);
    if (!/^https:\/\//.test(entry.url) || !Number.isFinite(entry.refreshIntervalHours) || entry.refreshIntervalHours <= 0 || !Number.isFinite(entry.maxRequestsPerMinute) || entry.maxRequestsPerMinute <= 0) throw new Error(`invalid source ${entry.id}`);
  }
}
