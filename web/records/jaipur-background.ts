import type { PersonBackgroundRecord } from "@/lib/civic-records";

// Education and self-described work are snapshots of 2024 candidate affidavits, not complete life histories.
const filingRows = [
  { personId: "manju-sharma", adrId: 417, educationDetail: "M.A., Rajasthan University, 1983", workDescription: "Jewellery business" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-01", adrId: 419, educationDetail: "Postgraduate study in Political Science, Rajasthan University, 1992", workDescription: "Salary, rent and bank interest" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-03", adrId: 416, educationDetail: "Secondary exam not passed, Pandit Dindayal Senior Secondary School, Jaipur, 1984", workDescription: "Personal business" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-04", adrId: 425, educationDetail: "M.A., Rajasthan University, 2011", workDescription: "Social activist" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-05", adrId: 424, educationDetail: "10th pass, private study", workDescription: "Private practice" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-06", adrId: 415, educationDetail: "B.A. first year, Maharashi Dayanad Saraswati University, Ajmer, 1996", workDescription: "Journalism, private consultancy, agricultural income and trading" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-08", adrId: 71, educationDetail: "MBA, Symbiosis Centre for Distance Learning, Pune, 2010", workDescription: "Self-employed" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-09", adrId: 413, educationDetail: "B.Sc. and LL.B., Rajasthan University", workDescription: "Advocate" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-10", adrId: 423, educationDetail: "Ph.D. in Pharmaceutical Sciences, Maharashi Arvind University, 2022", workDescription: "Consultant" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-11", adrId: 418, educationDetail: "9th class, Shri Shwetamber Jain Secondary School, Jaipur, 1967-68", workDescription: "Agricultural labour" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-12", adrId: 426, educationDetail: "B.E. Electrical, Magniram Bangad Memorial Engineering College, Jodhpur, 1994", workDescription: "Pension" },
  { personId: "jaipur-lok-sabha-2024-candidate-row-13", adrId: 422, educationDetail: "B.Sc. Agriculture, SKN College of Agriculture, Jobner, 1983", workDescription: "Retired bank employee" },
] as const;

export const jaipurBackgrounds: PersonBackgroundRecord[] = filingRows.map((row) => ({
  id: `jaipur-2024-background-${row.adrId}`,
  personId: row.personId,
  educationDetail: row.educationDetail,
  workDescription: row.workDescription,
  context: "2024 election affidavit",
  sourceId: `adr-jaipur-2024-${row.adrId}`,
}));
