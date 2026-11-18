// Everyday problems and who handles them, in general terms that hold across states: the level of
// government, the kind of office that does the work, whom to ask, and a national help channel.
// Checked on 2026-11-13. Each `basis` entry was matched word for word against the Constitution of
// India (Legislative Department edition, as on May 2022). A helpline number appears only where its
// own official site, or a PIB release cited in `source`, shows it. States hand local subjects to
// panchayats and municipalities differently, so the office named is the usual one, not every state's.

export type Level = "union" | "state" | "local";

export interface Basis {
  where: "Union List" | "State List" | "Concurrent List" | "Eleventh Schedule" | "Twelfth Schedule" | "Article";
  entry: string;
  text: string;
}

export interface Channel {
  label: string;
  number?: string;
  url: string;
  // Where the number is confirmed, when it is not on the channel's own site.
  source?: { title: string; url: string };
}

export interface EverydayIssue {
  id: string;
  label: string;
  group: "Safety and justice" | "Papers and ID" | "Money and benefits" | "Roads and travel" | "Water, power and streets" | "Health, schools and farms";
  levels: Level[];
  office: string;
  ask: string;
  note: string;
  basis: Basis[];
  channel?: Channel;
}

export const EVERYDAY_ISSUES_CHECKED_ON = "2026-11-13";
export const CONSTITUTION_TEXT = {
  title: "The Constitution of India, as on May 2022, Legislative Department",
  url: "https://cdnbbsr.s3waas.gov.in/s380537a945c7aaa788ccfcdf1b99b5d8f/uploads/2023/05/2023050195.pdf",
};

const pib = (title: string, prid: string) => ({ title: `${title} (PIB)`, url: `https://pib.gov.in/PressReleasePage.aspx?PRID=${prid}` });
const MLA = "Your MLA";
const MP = "Your MP";
const LOCAL = "Your ward councillor or sarpanch";

export const everydayIssues: EverydayIssue[] = [
  // Safety and justice
  {
    id: "emergency", label: "Emergency", group: "Safety and justice", levels: ["state"],
    office: "Your state's emergency response centre, which sends the police, fire service or an ambulance", ask: MLA,
    note: "One number reaches police, fire and ambulance. Public order and police are state subjects.",
    basis: [{ where: "State List", entry: "1", text: "Public order" }, { where: "State List", entry: "2", text: "Police" }],
    channel: { label: "Emergency Response Support System", number: "112", url: "https://112.gov.in/", source: { title: "Pan-India emergency number 112 launched (PIB)", url: "https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=188727" } },
  },
  {
    id: "police", label: "Police complaint or FIR", group: "Safety and justice", levels: ["state"],
    office: "Your police station; if it does not act, the district's Superintendent of Police", ask: MLA,
    note: "Police are run by the state. Criminal law is shared: Parliament and states can both make it.",
    basis: [{ where: "State List", entry: "2", text: "Police" }, { where: "Concurrent List", entry: "1", text: "Criminal law" }],
  },
  {
    id: "cyber-fraud", label: "Online or bank fraud", group: "Safety and justice", levels: ["union", "state"],
    office: "Your state police's cyber crime cell; your bank, to stop the money", ask: MLA,
    note: "Report it quickly: the national helpline can ask banks to hold the money while state police investigate.",
    basis: [{ where: "State List", entry: "2", text: "Police" }],
    channel: { label: "National Cyber Crime Reporting Portal", number: "1930", url: "https://cybercrime.gov.in/", source: pib("Strengthening the mechanism to deal with cyber frauds", "2042130") },
  },
  {
    id: "legal-aid", label: "Free legal help", group: "Safety and justice", levels: ["union", "state"],
    office: "The District Legal Services Authority, at your district court", ask: MLA,
    note: "Free legal aid is a duty the Constitution puts on the state, for anyone who cannot afford a lawyer.",
    basis: [{ where: "Article", entry: "39A", text: "Equal justice and free legal aid" }],
    channel: { label: "National Legal Services Authority", number: "15100", url: "https://nalsa.gov.in/" },
  },
  // Papers and ID
  {
    id: "voter", label: "Voter ID and the voter list", group: "Papers and ID", levels: ["union"],
    office: "Your Booth Level Officer and the Electoral Registration Officer", ask: "The Election Commission, not a politician",
    note: "Elections are run by the Election Commission of India, independent of the government.",
    basis: [{ where: "Union List", entry: "72", text: "Elections to Parliament, to the Legislatures of States" }],
    channel: { label: "Voter Helpline and voters.eci.gov.in", number: "1950", url: "https://voters.eci.gov.in/", source: pib("Citizens can use 1950 Voter Helpline", "2183805") },
  },
  {
    id: "aadhaar", label: "Aadhaar", group: "Papers and ID", levels: ["union"],
    office: "An Aadhaar enrolment or update centre, run for UIDAI", ask: MP,
    note: "Aadhaar is issued by the Unique Identification Authority of India, a central body.",
    basis: [],
    channel: { label: "UIDAI", number: "1947", url: "https://uidai.gov.in/" },
  },
  {
    id: "passport", label: "Passport", group: "Papers and ID", levels: ["union"],
    office: "A Passport Seva Kendra, run by the Ministry of External Affairs", ask: MP,
    note: "Passports are a Union subject.",
    basis: [{ where: "Union List", entry: "19", text: "passports and visas" }],
    channel: { label: "Passport Seva", url: "https://www.passportindia.gov.in/" },
  },
  {
    id: "birth-death", label: "Birth or death certificate", group: "Papers and ID", levels: ["state", "local"],
    office: "The registrar of births and deaths: the municipality in towns, the panchayat or block office in villages", ask: LOCAL,
    note: "Registration is a shared subject that states usually hand to local bodies.",
    basis: [{ where: "Concurrent List", entry: "30", text: "Vital statistics including registration of births and deaths" }, { where: "Twelfth Schedule", entry: "16", text: "Vital statistics including registration of births and deaths" }],
    channel: { label: "Civil Registration System", url: "https://crsorgi.gov.in/" },
  },
  {
    id: "land", label: "Land records and property", group: "Papers and ID", levels: ["state"],
    office: "Your tehsil or revenue office, through the village land record official (patwari or lekhpal)", ask: MLA,
    note: "Land and land records are state subjects; each state has its own land records website.",
    basis: [{ where: "State List", entry: "18", text: "Land" }, { where: "State List", entry: "45", text: "Land revenue, including ... maintenance of land records" }],
  },
  {
    id: "income-tax", label: "Income tax and PAN", group: "Papers and ID", levels: ["union"],
    office: "The Income Tax Department", ask: MP,
    note: "Tax on income, other than farm income, is a Union subject.",
    basis: [{ where: "Union List", entry: "82", text: "Taxes on income other than agricultural income" }],
    channel: { label: "Income tax e-filing", url: "https://www.incometax.gov.in/" },
  },
  // Money and benefits
  {
    id: "ration", label: "Ration card and ration shop", group: "Money and benefits", levels: ["union", "state", "local"],
    office: "Your state's food and civil supplies department, through your fair price shop", ask: MLA,
    note: "The Union sets the national food security scheme; states issue cards and run ration shops.",
    basis: [{ where: "Concurrent List", entry: "33", text: "Trade and commerce in ... foodstuffs" }, { where: "Eleventh Schedule", entry: "28", text: "Public distribution system" }],
    channel: { label: "National Food Security portal", url: "https://nfsa.gov.in/" },
  },
  {
    id: "pension", label: "Old-age, widow or disability pension", group: "Money and benefits", levels: ["union", "state"],
    office: "Your district social welfare office", ask: MLA,
    note: "These pensions are mostly paid by states, often with a central share.",
    basis: [{ where: "State List", entry: "9", text: "Relief of the disabled and unemployable" }, { where: "Concurrent List", entry: "23", text: "Social security and social insurance" }],
  },
  {
    id: "bank", label: "Bank problem", group: "Money and benefits", levels: ["union"],
    office: "Your bank's branch first; if it does not solve it, the RBI Ombudsman", ask: MP,
    note: "Banking is a Union subject, regulated by the Reserve Bank of India.",
    basis: [{ where: "Union List", entry: "45", text: "Banking" }],
    channel: { label: "RBI complaint management system", number: "14448", url: "https://cms.rbi.org.in/" },
  },
  {
    id: "consumer", label: "Faulty product or bad service", group: "Money and benefits", levels: ["union", "state"],
    office: "The seller first; then the district consumer commission", ask: MLA,
    note: "Consumer complaints can be settled through the national helpline before going to a consumer commission.",
    basis: [],
    channel: { label: "National Consumer Helpline", number: "1915", url: "https://consumerhelpline.gov.in/" },
  },
  {
    id: "mgnrega", label: "Rural job card and work (MGNREGA)", group: "Money and benefits", levels: ["union", "state", "local"],
    office: "Your gram panchayat, and the block programme officer", ask: LOCAL,
    note: "A central law guarantees the work; panchayats and states plan and pay for it.",
    basis: [{ where: "Eleventh Schedule", entry: "16", text: "Poverty alleviation programme" }],
    channel: { label: "MGNREGA", url: "https://nrega.nic.in/" },
  },
  {
    id: "central-office", label: "Any central government office", group: "Money and benefits", levels: ["union"],
    office: "The ministry or department concerned", ask: MP,
    note: "Complaints against any central ministry can be filed and tracked online.",
    basis: [],
    channel: { label: "Centralised public grievance portal (CPGRAMS)", url: "https://pgportal.gov.in/" },
  },
  // Roads and travel
  {
    id: "trains", label: "Trains", group: "Roads and travel", levels: ["union"],
    office: "Indian Railways", ask: MP,
    note: "Railways are a Union subject.",
    basis: [{ where: "Union List", entry: "22", text: "Railways" }],
    channel: { label: "RailMadad", number: "139", url: "https://railmadad.indianrailways.gov.in/" },
  },
  {
    id: "highways", label: "National highways and tolls", group: "Roads and travel", levels: ["union"],
    office: "The National Highways Authority of India (NHAI)", ask: MP,
    note: "Highways declared national are a Union subject; other roads are the state's.",
    basis: [{ where: "Union List", entry: "23", text: "Highways declared ... to be national highways" }],
    channel: { label: "NHAI highway helpline", number: "1033", url: "https://nhai.gov.in/", source: pib("NHAI to transform 1033 National Highway Helpline", "2310140") },
  },
  {
    id: "local-roads", label: "Potholes and local roads", group: "Roads and travel", levels: ["state", "local"],
    office: "The state Public Works Department for state roads; your municipality or panchayat for local streets", ask: `${MLA}, or ${LOCAL.toLowerCase()}`,
    note: "Roads other than national highways are the state's; states hand local roads to municipalities and panchayats.",
    basis: [{ where: "State List", entry: "13", text: "Communications, that is to say, roads, bridges" }, { where: "Twelfth Schedule", entry: "4", text: "Roads and bridges" }, { where: "Eleventh Schedule", entry: "13", text: "Roads, culverts, bridges" }],
  },
  {
    id: "licence", label: "Driving licence and vehicle registration", group: "Roads and travel", levels: ["union", "state"],
    office: "Your Regional Transport Office (RTO)", ask: MLA,
    note: "Motor vehicles are a shared subject: Parliament sets the law, state transport offices issue licences.",
    basis: [{ where: "Concurrent List", entry: "35", text: "Mechanically propelled vehicles" }],
    channel: { label: "Parivahan", url: "https://parivahan.gov.in/" },
  },
  {
    id: "post", label: "Post and parcels", group: "Roads and travel", levels: ["union"],
    office: "India Post", ask: MP,
    note: "Posts are a Union subject.",
    basis: [{ where: "Union List", entry: "31", text: "Posts and telegraphs" }],
    channel: { label: "India Post", number: "1800 266 6868", url: "https://www.indiapost.gov.in/" },
  },
  {
    id: "phone", label: "Lost phone or phone fraud", group: "Roads and travel", levels: ["union"],
    office: "Your telecom company; the Department of Telecommunications", ask: MP,
    note: "Telephones are a Union subject.",
    basis: [{ where: "Union List", entry: "31", text: "telephones, wireless, broadcasting" }],
    channel: { label: "Sanchar Saathi", url: "https://sancharsaathi.gov.in/" },
  },
  // Water, power and streets
  {
    id: "electricity", label: "Power cuts and electricity bills", group: "Water, power and streets", levels: ["union", "state"],
    office: "Your state's electricity distribution company (discom)", ask: MLA,
    note: "Electricity is shared: Parliament sets the law, state companies supply homes.",
    basis: [{ where: "Concurrent List", entry: "38", text: "Electricity" }],
  },
  {
    id: "water", label: "Drinking water", group: "Water, power and streets", levels: ["state", "local"],
    office: "The municipality or water board in towns; the gram panchayat in villages", ask: LOCAL,
    note: "Water is a state subject that states hand to local bodies; big schemes stay with the state.",
    basis: [{ where: "State List", entry: "17", text: "Water, that is to say, water supplies" }, { where: "Twelfth Schedule", entry: "5", text: "Water supply" }, { where: "Eleventh Schedule", entry: "11", text: "Drinking water" }],
  },
  {
    id: "garbage", label: "Garbage and blocked drains", group: "Water, power and streets", levels: ["local"],
    office: "Your municipality's sanitation department; the gram panchayat in villages", ask: LOCAL,
    note: "Sanitation and waste are handed to local bodies.",
    basis: [{ where: "Twelfth Schedule", entry: "6", text: "Public health, sanitation conservancy and solid waste management" }, { where: "Eleventh Schedule", entry: "23", text: "Health and sanitation" }],
  },
  {
    id: "street-lights", label: "Street lights", group: "Water, power and streets", levels: ["local"],
    office: "Your municipality or gram panchayat", ask: LOCAL,
    note: "Street lighting is a local public amenity.",
    basis: [{ where: "Twelfth Schedule", entry: "17", text: "Public amenities including street lighting" }],
  },
  {
    id: "fire", label: "Fire safety", group: "Water, power and streets", levels: ["state", "local"],
    office: "Your state or city fire service", ask: LOCAL,
    note: "Fire services can be handed to municipalities; in an emergency, call 112.",
    basis: [{ where: "Twelfth Schedule", entry: "7", text: "Fire services" }],
    channel: { label: "Emergency Response Support System", number: "112", url: "https://112.gov.in/", source: { title: "Pan-India emergency number 112 launched (PIB)", url: "https://www.pib.gov.in/newsite/PrintRelease.aspx?relid=188727" } },
  },
  // Health, schools and farms
  {
    id: "hospital", label: "Government hospitals and health", group: "Health, schools and farms", levels: ["state", "local"],
    office: "The district hospital and the district's Chief Medical Officer; primary health centres in villages", ask: MLA,
    note: "Health and hospitals are state subjects. The central Ayushman Bharat scheme pays for treatment for those eligible.",
    basis: [{ where: "State List", entry: "6", text: "Public health and sanitation; hospitals and dispensaries" }, { where: "Eleventh Schedule", entry: "23", text: "Health and sanitation, including hospitals, primary health centres" }],
    channel: { label: "National Health Authority (Ayushman Bharat)", number: "14555", url: "https://nha.gov.in/" },
  },
  {
    id: "schools", label: "Government schools", group: "Health, schools and farms", levels: ["union", "state", "local"],
    office: "The district education office; each school's management committee", ask: MLA,
    note: "Education is shared; most schools are run by states, and panchayats can be given primary and secondary schools.",
    basis: [{ where: "Concurrent List", entry: "25", text: "Education" }, { where: "Eleventh Schedule", entry: "17", text: "Education, including primary and secondary schools" }],
  },
  {
    id: "farming", label: "Farming help and PM-KISAN", group: "Health, schools and farms", levels: ["union", "state"],
    office: "Your block's agriculture office; PM-KISAN payments are a central scheme", ask: MLA,
    note: "Agriculture is a state subject, with central schemes such as PM-KISAN on top.",
    basis: [{ where: "State List", entry: "14", text: "Agriculture" }],
    channel: { label: "PM-KISAN", url: "https://pmkisan.gov.in/" },
  },
];
