// Assembly seats that held a bye-election after the last general election, in states that vote in 2027.
// Their results are not on the site: ECI took down its result pages for these rounds, so a seat is only
// flagged, with the official notice that called the bye-election. Checked by hand on 2026-11-10 against
// each notice; lib/held-bye-elections.test.ts checks every seat number and name against the 2022 results.

export interface HeldByeElection { state: string; seat: number; name: string; countedOn: string; source: { title: string; url: string } }

const CHECKED = "2026-11-10";
const ECI_PAGE = "https://www.eci.gov.in/bye-elections";
const eci = (number: string, date: string) => ({ title: `ECI press note ${number}, ${date}, on ECI's bye-elections page`, url: ECI_PAGE });
const pib = (title: string, prid: string) => ({ title: `${title} (PIB release of the ECI notice)`, url: `https://pib.gov.in/PressReleasePage.aspx?PRID=${prid}` });

const PN_47_2023 = { title: "ECI press note ECI/PN/47/2023, 8 August 2023 (copy published by the Government of Tripura)", url: "https://tripura.gov.in/sites/default/files/By-Election-Sept.pdf" };
const PN_24_2024 = eci("ECI/PN/24/2024", "16 March 2024");
const PN_120_2024 = eci("ECI/PN/120/2024", "10 June 2024");
const PN_150_2024 = eci("ECI/PN/150/2024", "15 October 2024");

export const HELD_BYE_ELECTIONS_CHECKED_ON = CHECKED;

export const heldByeElections: HeldByeElection[] = [
  // Uttarakhand
  { state: "Uttarakhand", seat: 55, name: "Champawat", countedOn: "2022-06-03", source: pib("Schedule for bye-election in 3 assembly constituencies of Odisha, Kerala and Uttarakhand, 3 May 2022", "1822192") },
  { state: "Uttarakhand", seat: 47, name: "Bageshwar", countedOn: "2023-09-08", source: PN_47_2023 },
  { state: "Uttarakhand", seat: 4, name: "Badrinath", countedOn: "2024-07-13", source: PN_120_2024 },
  { state: "Uttarakhand", seat: 33, name: "Manglaur", countedOn: "2024-07-13", source: PN_120_2024 },
  { state: "Uttarakhand", seat: 7, name: "Kedarnath", countedOn: "2024-11-23", source: PN_150_2024 },
  // Punjab
  { state: "Punjab", seat: 34, name: "Jalandhar West", countedOn: "2024-07-13", source: PN_120_2024 },
  { state: "Punjab", seat: 10, name: "Dera Baba Nanak", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Punjab", seat: 44, name: "Chabbewal", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Punjab", seat: 84, name: "Gidderbaha", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Punjab", seat: 103, name: "Barnala", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Punjab", seat: 64, name: "Ludhiana West", countedOn: "2025-06-23", source: eci("ECI/PN/220/2025", "25 May 2025") },
  { state: "Punjab", seat: 21, name: "Tarn Taran", countedOn: "2025-11-14", source: eci("ECI/PN/317/2025", "6 October 2025") },
  // Uttar Pradesh
  { state: "Uttar Pradesh", seat: 139, name: "Gola Gokrannath", countedOn: "2022-11-06", source: pib("Schedule for bye-election in assembly constituencies of Maharashtra, Bihar, Haryana, Telangana, Uttar Pradesh and Odisha, 3 October 2022", "1864735") },
  { state: "Uttar Pradesh", seat: 15, name: "Khatauli", countedOn: "2022-12-08", source: pib("Schedule for bye-election in 15-Khatauli, 8 November 2022", "1874486") },
  { state: "Uttar Pradesh", seat: 37, name: "Rampur", countedOn: "2022-12-08", source: pib("Bye-election to 37-Rampur, revised schedule, 10 November 2022", "1875030") },
  { state: "Uttar Pradesh", seat: 395, name: "Chhanbey", countedOn: "2023-05-13", source: pib("Schedule for bye-election in Punjab, Odisha, Uttar Pradesh and Meghalaya, 29 March 2023", "1911754") },
  { state: "Uttar Pradesh", seat: 34, name: "Suar", countedOn: "2023-05-13", source: pib("Schedule for bye-election in Punjab, Odisha, Uttar Pradesh and Meghalaya, 29 March 2023", "1911754") },
  { state: "Uttar Pradesh", seat: 354, name: "Ghosi", countedOn: "2023-09-08", source: PN_47_2023 },
  { state: "Uttar Pradesh", seat: 136, name: "Dadraul", countedOn: "2024-06-04", source: PN_24_2024 },
  { state: "Uttar Pradesh", seat: 173, name: "Lucknow East", countedOn: "2024-06-04", source: PN_24_2024 },
  { state: "Uttar Pradesh", seat: 292, name: "Gainsari", countedOn: "2024-06-04", source: PN_24_2024 },
  { state: "Uttar Pradesh", seat: 403, name: "Duddhi", countedOn: "2024-06-04", source: PN_24_2024 },
  { state: "Uttar Pradesh", seat: 16, name: "Meerapur", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 29, name: "Kundarki", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 56, name: "Ghaziabad", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 71, name: "Khair", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 110, name: "Karhal", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 213, name: "Sishamau", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 256, name: "Phulpur", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 277, name: "Katehari", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 397, name: "Majhawan", countedOn: "2024-11-23", source: PN_150_2024 },
  { state: "Uttar Pradesh", seat: 273, name: "Milkipur", countedOn: "2025-02-08", source: eci("ECI/PN/170/2025", "7 January 2025") },
  // Goa
  { state: "Goa", seat: 21, name: "Ponda", countedOn: "2026-05-04", source: eci("ECI/PN/030/2026", "15 March 2026") },
];
