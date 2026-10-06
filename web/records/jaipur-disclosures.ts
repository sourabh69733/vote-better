import type { CandidateDisclosureRecord, SourceRecord } from "@/lib/civic-records";

// ADR transcribes each candidate's 2024 self-declared affidavit. These are filing-time claims, not current facts.
const rows = [
  { personId: "manju-sharma", name: "Manju Sharma", adrId: 417, ageAtFiling: 64, education: "Post Graduate", declaredCases: 0, declaredAssetsRupees: 23661843, declaredLiabilitiesRupees: 4169859 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-01", name: "Pratap Singh Khachariyawas", adrId: 419, ageAtFiling: 54, education: "Post Graduate", declaredCases: 0, declaredAssetsRupees: 87942399, declaredLiabilitiesRupees: 9660026 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-03", name: "Rajesh Tanwar", adrId: 416, ageAtFiling: 59, education: "8th Pass", declaredCases: 0, declaredAssetsRupees: 32841972, declaredLiabilitiesRupees: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-04", name: "Kuldeep Singh", adrId: 425, ageAtFiling: 37, education: "Post Graduate", declaredCases: 0, declaredAssetsRupees: 1198813, declaredLiabilitiesRupees: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-05", name: "Trilok Tiwari", adrId: 424, ageAtFiling: 63, education: "10th Pass", declaredCases: 0, declaredAssetsRupees: 598000, declaredLiabilitiesRupees: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-06", name: "Narender Sharma", adrId: 415, ageAtFiling: 45, education: "12th Pass", declaredCases: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-08", name: "Shashank Singh Arya", adrId: 71, ageAtFiling: 36, education: "Post Graduate", declaredCases: 0, declaredAssetsRupees: 283000, declaredLiabilitiesRupees: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-09", name: "Advocate Hari Kishan Tiwari", adrId: 413, ageAtFiling: 64, education: "Graduate Professional", declaredCases: 0, declaredAssetsRupees: 10110000, declaredLiabilitiesRupees: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-10", name: "Dr. Aseem Verma", adrId: 423, ageAtFiling: 59, education: "Doctorate", declaredCases: 0, declaredAssetsRupees: 24628731, declaredLiabilitiesRupees: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-11", name: "Yogesh Sharma", adrId: 418, ageAtFiling: 73, education: "8th Pass", declaredCases: 0 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-12", name: "Rajeev Roliwal", adrId: 426, ageAtFiling: 54, education: "Graduate", declaredCases: 0, declaredAssetsRupees: 23588352, declaredLiabilitiesRupees: 1857968 },
  { personId: "jaipur-lok-sabha-2024-candidate-row-13", name: "Hari Narayan Meena", adrId: 422, ageAtFiling: 64, education: "Graduate", declaredCases: 0 },
] as const;

export const jaipurDisclosures: CandidateDisclosureRecord[] = [...rows.map((row) => ({
  id: `jaipur-2024-disclosure-${row.adrId}`,
  personId: row.personId,
  election: "Jaipur Lok Sabha, 2024",
  ageAtFiling: row.ageAtFiling,
  education: row.education,
  declaredCases: row.declaredCases,
  declaredAssetsRupees: "declaredAssetsRupees" in row ? row.declaredAssetsRupees : undefined,
  declaredLiabilitiesRupees: "declaredLiabilitiesRupees" in row ? row.declaredLiabilitiesRupees : undefined,
  sourceId: `adr-jaipur-2024-${row.adrId}`,
})), {
  id: "jaipur-2024-disclosure-pradeep-eci",
  personId: "jaipur-lok-sabha-2024-candidate-row-07",
  election: "Jaipur Lok Sabha, 2024",
  ageAtFiling: 29,
  sourceId: "eci-jaipur-2024-pradeep",
}];

export const jaipurDisclosureSources: SourceRecord[] = [...rows.map(({ name, adrId }) => ({
  id: `adr-jaipur-2024-${adrId}`,
  title: `ADR archive of ${name}'s 2024 affidavit`,
  url: `https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=${adrId}`,
  checkedOn: "2026-10-06",
})), {
  id: "eci-jaipur-2024-pradeep",
  title: "ECI 2024 candidate filing: Pradeep Verma",
  url: "https://affidavit.eci.gov.in/show-profile/eyJpdiI6Ik05cmF0RDNwVE1ZeG5mRDR4UkNqNXc9PSIsInZhbHVlIjoiY0NQam5HQjdiM1FoREtwZGVpVW1ZZz09IiwibWFjIjoiMWYzMDg3NjM1ZDYyMGQxOTk2NDA1N2NlMmYxZDAyNDlkYWM2MjBlMGI5NWEyMDE4NDdhMTQ1ODI0MzI2MGRjZSIsInRhZyI6IiJ9/eyJpdiI6IjNSb3R3eGFlTE1PUmpHUFVjbkR2Zmc9PSIsInZhbHVlIjoicEEwOVEwUDRzZER1MkhrbGVrV0xyUT09IiwibWFjIjoiM2M4NGMxYWQxYjcyMzBlZTJjZGRhMGVkNmFlOGNmMzAyMmZkYTU3MGYzYzUwYTI1ZDkyNjg3NmI0ZmE0NjcyYiIsInRhZyI6IiJ9/eyJpdiI6Imo2NWZDUkl4ZFd3Tis3b2d5cWZEVGc9PSIsInZhbHVlIjoiZHVvMWdHS3RDZUJJbU9WbGEyME15dz09IiwibWFjIjoiZGY5OGMyZjkyMThkNzNhNmZlMDM3Yzc4NjAyM2YzYTMyN2RmMjg2MmQxOWNmMTYwYmEyZjhjZjdiZGZlY2MyZiIsInRhZyI6IiJ9/eyJpdiI6Im8xd2RMQ1dkSU4zdjhXMkU3Z3NCdmc9PSIsInZhbHVlIjoiY3hsVnJoZTYxdjV0UWpnUEhob1ZOUT09IiwibWFjIjoiMjI0MTRiMzY2ZTEyNWFlODM4MzY5MWY3MDdiZjAwZTQ0ZmZkN2MzMmRlMzE0Y2YxNDYxZWM1ODA5ODQ1NTIxNCIsInRhZyI6IiJ9/eyJpdiI6InJ1a3M1emo1QytnRTkySldWZ2hoL2c9PSIsInZhbHVlIjoiWFJhd0w4THJhekFyRUVRcUQ0Wm53dz09IiwibWFjIjoiNDBkMjYwNzRiNGE2YjY1YTc4ODhiNWUwOGE1NzFlZWMyZmMyNTcwOWVkZDkxZTVjYmI4ODNmODRiZDc3N2UxMSIsInRhZyI6IiJ9",
  checkedOn: "2026-10-06",
}];
