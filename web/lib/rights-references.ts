import type { RightsReference } from "./rights";

export const rightsCheckedOn = "2026-10-10";
const bnss = "https://www.mha.gov.in/sites/default/files/2024-04/250884_2_english_01042024.pdf";
const bns = "https://www.indiacode.nic.in/indiacode/bitstream/123456789/20062/1/a202345.pdf";
const constitution = "https://www.legislative.gov.in/static/uploads/2025/08/7af1daa22d65f9d04c00ae9b9aa5a799.pdf";
const delhiPoliceAct = "https://www.indiacode.nic.in/bitstream/123456789/13669/1/delhi_police_act.pdf";

function law(label: string, document: string, page: number, locator: string): RightsReference {
  return { label, url: `${document}#page=${page}`, locator: `${locator}; PDF page ${page}`, checkedAt: rightsCheckedOn, kind: "statute" };
}
function service(label: string, url: string, locator: string): RightsReference {
  return { label, url, locator, checkedAt: rightsCheckedOn, kind: "service" };
}

export const rightsReferences: Record<string, RightsReference> = {
  "constitution-19": law("Constitution, Article 19", constitution, 70, "Article 19(1)(a), (b), (d), (2), (3) and (5)"),
  "constitution-20": law("Constitution, Article 20(3)", constitution, 72, "Article 20(3), protection against compelled self-incrimination"),
  "constitution-22": law("Constitution, Articles 21 and 22", constitution, 74, "Articles 21 and 22(1)-(7); continued on PDF pages 75-76"),
  "constitution-226": law("Constitution, Article 226", constitution, 244, "Article 226(1), including habeas corpus"),
  "bnss-35": law("BNSS, section 35", bnss, 13, "Section 35(1)-(7); continued on PDF page 14"),
  "bnss-36": law("BNSS, sections 36 and 37", bnss, 14, "Sections 36 and 37, identification, arrest memorandum and arrest information"),
  "bnss-38": law("BNSS, section 38", bnss, 15, "Section 38, advocate during interrogation"),
  "bnss-43": law("BNSS, section 43(5)", bnss, 16, "Section 43(5), arrest of women after sunset and before sunrise"),
  "bnss-47": law("BNSS, sections 46-48", bnss, 17, "Sections 46, 47 and 48; section 48 continued on PDF page 18"),
  "bnss-53": law("BNSS, sections 53 and 56", bnss, 18, "Section 53, medical examination and report; section 56 on PDF page 19"),
  "bnss-58": law("BNSS, sections 57 and 58", bnss, 19, "Sections 57 and 58, production and custody limit"),
  "bnss-148": law("BNSS, section 148", bnss, 45, "Section 148(1)-(2), command to disperse and civil force"),
  "bnss-163": law("BNSS, section 163", bnss, 49, "Section 163(1)-(7), written urgent orders, duration and alteration"),
  "bnss-170": law("BNSS, section 170", bnss, 52, "Section 170(1)-(2), preventive arrest and custody limit"),
  "bnss-172": law("BNSS, section 172", bnss, 52, "Section 172(1)-(2), lawful preventive directions and removal"),
  "bnss-173": law("BNSS, section 173", bnss, 52, "Section 173(1)-(4); continued on PDF page 53"),
  "bnss-174": law("BNSS, section 174", bnss, 53, "Section 174(1)-(4), non-cognizable cases"),
  "bnss-179": law("BNSS, section 179", bnss, 55, "Section 179(1), witness attendance and residence protections"),
  "bnss-180": law("BNSS, sections 180 and 181", bnss, 55, "Section 180(2); section 181(1) on PDF page 56"),
  "bnss-215": law("BNSS, section 215(1)(a)", bnss, 68, "Written public-servant complaint requirement for court cognizance"),
  "bnss-478": law("BNSS, section 478", bnss, 143, "Section 478(1)-(2); continued on PDF page 144"),
  "bnss-480": law("BNSS, section 480", bnss, 144, "Section 480, bail in non-bailable offences; continued on PDF page 145"),
  "bnss-482": law("BNSS, section 482", bnss, 146, "Section 482(1)-(4), anticipatory bail and exclusions"),
  "bns-189": law("BNS, section 189", bns, 66, "Section 189(1)-(5); continued on PDF page 67"),
  "bns-190": law("BNS, sections 190 and 191", bns, 67, "Common-object liability and rioting"),
  "bns-221": law("BNS, section 221", bns, 73, "Obstructing a public servant in discharge of public functions"),
  "bns-223": law("BNS, section 223", bns, 74, "Section 223(a)-(b) and explanation, knowledge and harmful consequences"),
  "delhi-police-28": law("Delhi Police Act, sections 28-33", delhiPoliceAct, 14, "Public-place regulations and directions; continued on PDF pages 15-18"),
  "delhi-police-65": law("Delhi Police Act, section 65", delhiPoliceAct, 28, "Section 65(1)-(2), reasonable directions and removal"),
  "delhi-noc": service("Delhi Traffic Police, public-event NOC", "https://traffic.delhipolice.gov.in/en/no-objection-certificate-noc", "NOC for Public Events and Activities"),
  "delhi-orders": service("Delhi Police, notifications", "https://delhipolice.gov.in/notification", "Notification index; each actual order must be opened separately"),
  "dslsa": service("DSLSA, legal aid and helplines", "https://delhi.nalsa.gov.in/introduction/", "Introduction; helplines 15100 and 1516"),
  "nalsa": service("NALSA, legal-aid FAQs", "https://nalsa.gov.in/faqs/", "Eligibility, legal advice, application and urgent assistance"),
  "police-directory": service("Delhi Police, telephone directory", "https://delhipolice.gov.in/telephonedirectory", "Official helplines and local police contacts"),
  "missing-person": service("Delhi Police, missing-person registration", "https://cctns.delhipolice.gov.in/citizenservices/missingpersonregistration.htm", "Citizen missing-person reporting service"),
  "amit-sahni": {
    label: "Supreme Court, Amit Sahni (2020)",
    url: "https://api.sci.gov.in/supremecourt/2020/2418/2418_2020_36_1501_24294_Judgement_07-Oct-2020.pdf#page=7",
    locator: "Civil Appeal 3282/2020, 7 October 2020, paragraphs 14-19; PDF pages 7-12",
    checkedAt: rightsCheckedOn,
    kind: "judgment",
  },
};
