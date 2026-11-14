import { validateRightsArticles, type RightsArticle } from "./rights";
import { rightsReferences } from "./rights-references";

export type RightsTopic = RightsArticle & { group: "freedom" | "police" | "case" | "help" };

// Explanations of official records, without claiming qualified legal review.
export const protestTopics: RightsTopic[] = [
  {
    id: "peaceful-protest", group: "freedom", title: "Your right to protest",
    summary: "Speech, peaceful assembly and movement have constitutional protection, with stated limits.",
    paragraphs: [
      { text: "Article 19 gives Indian citizens rights to express their views, assemble peacefully without arms and move freely throughout India. A peaceful protest can involve these rights together. The right does not give unconditional use of every place at every time. Article 19(2) allows specified reasonable restrictions on speech; Article 19(3) allows reasonable restrictions on assembly in the interests of sovereignty and integrity or public order; Article 19(5) allows reasonable restrictions on movement in the general public interest or for protecting Scheduled Tribes.", references: ["constitution-19"] },
      { text: "In Amit Sahni, the Supreme Court discussed dissent alongside other people's use of public roads. It held that public ways and public spaces cannot be occupied indefinitely for protests. The judgment also discusses earlier decisions about reasonable time-and-place regulation and a mechanism for peaceful demonstrations at Jantar Mantar. These principles need to be read with the actual facts and current orders; a court judgment is not an event permission.", references: ["amit-sahni"] },
    ],
  },
  {
    id: "alone-or-group", group: "freedom", title: "Going alone or in a group",
    summary: "Five people are not automatically an unlawful assembly. Going alone does not override an applicable order.",
    paragraphs: [
      { text: "BNS section 189 defines an unlawful assembly as five or more people with one of the listed unlawful common objects, such as committing an offence, resisting execution of law, or using criminal force to compel someone. Headcount alone does not establish that offence. A gathering that starts lawfully can later become unlawful. The section addresses intentionally joining or continuing in an assembly with awareness of the facts that make it unlawful, rather than simply being near a crowd.", references: ["bns-189"] },
      { text: "Someone going alone still needs to consider an applicable restriction. BNSS section 163 allows an order to address an individual, residents of an area or the public visiting an area. Neither going alone nor describing a gathering as peaceful establishes that every activity is permitted. The written order's prohibited acts, people covered, geographical limits and period of operation matter. This page has not checked an order for a particular outing.", references: ["bnss-163", "constitution-19"] },
    ],
  },
  {
    id: "delhi-permission", group: "freedom", title: "Permissions, routes and public spaces in Delhi",
    summary: "Organising a public event involves conditions that differ from simply attending.",
    paragraphs: [
      { text: "Delhi Traffic Police's published NOC page says a traffic NOC is mandatory for organising public rallies, meetings, processions, morchas and protest gatherings in public spaces. This requirement concerns organisers. The page does not say every attendee needs an individual NOC. A traffic NOC also does not establish that every other permission or restriction has been satisfied.", references: ["delhi-noc"] },
      { text: "The Delhi Police Act provides powers to regulate traffic and order in public places and to issue directions and specified prohibitions. The actual event permission, route, place, time and conditions therefore matter. The linked notification index helps locate documents, but its listings do not establish that a particular order applies to your event. An old event approval is not permission for a new event.", references: ["delhi-police-28", "delhi-orders"] },
    ],
  },
  {
    id: "restriction-order", group: "freedom", title: "What BNSS section 163 actually does",
    summary: "It authorises a written urgent restriction, rather than a blanket arrest power.",
    paragraphs: [
      { text: "A District Magistrate, Sub-divisional Magistrate or specially empowered Executive Magistrate can issue a written order stating material facts when immediate prevention or speedy remedy is considered necessary. It can direct people to abstain from acts to prevent the specified obstruction, injury, danger, disturbance, riot or affray. Emergency orders may be made without a prior hearing. The power creates a particular order; it does not permanently put a whole city under an identical prohibition.", references: ["bnss-163"] },
      { text: "An order ordinarily lasts no longer than two months from its making. Under the stated conditions, the State Government can extend it for a further specified period of up to six months. Sections 163(5)-(7) provide for alteration or rescission, including an application by an aggrieved person and written reasons if it is rejected. Whether an order is active requires reading its dates, scope and any extension, amendment or withdrawal. Checking the statute alone cannot establish that.", references: ["bnss-163"] },
    ],
  },
  {
    id: "possible-offences", group: "freedom", title: "When conduct at a protest can become an offence",
    summary: "The elements of the alleged offence matter, rather than the label 'protester'.",
    paragraphs: [
      { text: "BNS section 223 concerns knowing disobedience of an order duly promulgated by a legally empowered public servant. The disobedience must cause or tend to cause the obstruction, injury, danger, riot or affray specified in the section. Intending the resulting harm is not required, but knowledge of the order and the prescribed consequence or likelihood remain relevant. The order and the offence of breaching it are different legal things.", references: ["bns-223"] },
      { text: "Sections 189-191 distinguish unlawful assembly, liability for its common object and rioting. Section 190 can attach liability for an offence committed in pursuit of the assembly's common object, or one members knew was likely in pursuit of that object. Section 191 concerns force or violence by that assembly or a member pursuing its common object. Section 221 separately addresses voluntary obstruction of a public servant's public functions. Each provision requires its own facts; peaceful attendance alone does not prove them.", references: ["bns-189", "bns-190", "bns-221"] },
    ],
  },
  {
    id: "dispersal", group: "police", title: "When a gathering can be directed to disperse",
    summary: "This power covers unlawful assemblies and certain gatherings likely to disturb public peace.",
    paragraphs: [
      { text: "BNSS section 148 allows an Executive Magistrate, the officer in charge of a police station or, in that officer's absence, an officer of at least sub-inspector rank to command an unlawful assembly to disperse. It also covers an assembly of five or more people likely to disturb public peace. That is a separate test from the definition of unlawful assembly in BNS section 189. Members of an assembly covered by a lawful command have a duty to disperse.", references: ["bnss-148", "bns-189"] },
      { text: "Section 148(2) provides for dispersal by force and, if necessary, arrest and confinement when its conditions are met. BNS section 189(3) and (5) separately address knowingly continuing in the relevant assemblies after a lawful dispersal command. A police power being written into law does not establish that every use of force in a particular incident was lawful. The legal basis, circumstances and conduct still need examination.", references: ["bnss-148", "bns-189"] },
    ],
  },
  {
    id: "arrest-power", group: "police", title: "Arrest without a warrant and the notice alternative",
    summary: "An allegation or FIR does not automatically require an arrest.",
    paragraphs: [
      { text: "BNSS section 35 lists grounds for arrest without warrant. In the section 35(1)(b) route for an alleged cognizable offence punishable up to seven years, police must have reason to believe the person committed it and must be satisfied arrest is necessary for a listed purpose. These include preventing further offences, proper investigation, protecting evidence or witnesses and ensuring court attendance. Reasons for arrest must be recorded. Other clauses have distinct conditions, so this is not a universal rule for every arrest.", references: ["bnss-35"] },
      { text: "Where arrest under section 35(1) is not required, section 35(3) requires a notice to appear in the specified circumstances. Someone who complies and continues to comply is ordinarily not to be arrested for that offence unless the officer records reasons for deciding arrest is necessary. Non-compliance or unwillingness to identify oneself can change the position under section 35(6). Recording an FIR and deciding to arrest are separate legal processes.", references: ["bnss-35", "bnss-173"] },
    ],
  },
  {
    id: "questioning", group: "police", title: "Called for questioning: notice, witness or arrest?",
    summary: "The legal basis for attendance determines which protections apply.",
    paragraphs: [
      { text: "A notice to someone suspected of an offence under section 35(3) differs from a written witness-attendance order under section 179. Section 179 concerns someone within the investigating officer's or an adjoining station's limits who appears acquainted with the case. Under that witness provision, a male under 15 or over 60, a woman, someone with a mental or physical disability, or someone with acute illness cannot be required to attend away from their residence, although voluntary station attendance is possible. This protection does not apply automatically to every arrest or notice.", references: ["bnss-35", "bnss-179"] },
      { text: "Section 180(2) requires truthful case-related answers, except answers tending to expose the person to a criminal charge, penalty or forfeiture. Article 20(3) protects an accused person against compelled self-incrimination. Section 181 says an investigation statement reduced to writing is not to be signed by its maker. This does not mean every police document must remain unsigned: FIRs and arrest memoranda have different signing rules. Section 38 gives an arrested person access to an advocate during interrogation, though not throughout it.", references: ["bnss-180", "constitution-20", "bnss-173", "bnss-36", "bnss-38"] },
    ],
  },
  {
    id: "preventive-action", group: "police", title: "Preventive arrest, removal and preventive detention",
    summary: "These are distinct routes, with distinct conditions and custody limits.",
    paragraphs: [
      { text: "BNSS section 170 allows preventive arrest when an officer knows of a design to commit a cognizable offence and considers it cannot otherwise be prevented. The planned offence need not already have happened. Section 170(2) does not allow custody beyond 24 hours from arrest unless another provision of BNSS or another law requires or authorises further detention. The word 'preventive' does not create unlimited custody.", references: ["bnss-170"] },
      { text: "Section 172 concerns lawful police directions in the preventive-action chapter. It allows detention or removal for disregarding them and either production before a magistrate or, in petty cases, release as soon as possible within 24 hours. Delhi Police Act section 65 separately concerns reasonable directions under that Act, with production before a magistrate or release within 24 hours of removal. Detention under a separate preventive-detention law has a different constitutional framework in Article 22(3)-(7). The provision and actual order must be identified before interpreting the custody period.", references: ["bnss-172", "delhi-police-65", "constitution-22"] },
    ],
  },
  {
    id: "arrest-safeguards", group: "police", title: "What safeguards accompany an arrest?",
    summary: "Grounds, officer identification, an arrest memorandum, a nominated contact and access to counsel.",
    paragraphs: [
      { text: "BNSS section 36 requires clear officer identification and an arrest memorandum witnessed by a family member or respectable local person and countersigned by the arrested person. Section 47 requires prompt communication of the grounds for arrest without warrant, and information about entitlement to bail in its stated bailable situation. Section 48 requires prompt communication of the arrest and place of custody to a nominated relative, friend or other person, with a station record of whom was informed.", references: ["bnss-36", "bnss-47"] },
      { text: "Article 22(1) protects consultation with and defence by a lawyer of choice, subject to the stated Article 22(3) exclusions. BNSS section 38 allows an arrested person to meet an advocate during police interrogation, though not throughout it. Section 46 prohibits more restraint than necessary to prevent escape. These are legal obligations and protections; listing them here does not establish that they were followed in a particular incident.", references: ["constitution-22", "bnss-38", "bnss-47"] },
    ],
  },
  {
    id: "custody-clock", group: "police", title: "The 24-hour rule and what happens afterwards",
    summary: "The ordinary rule concerns court oversight, rather than automatic release at 24 hours.",
    paragraphs: [
      { text: "Article 22(2) ordinarily requires production before the nearest magistrate within 24 hours of arrest, excluding necessary journey time. BNSS section 58 limits detention after arrest without warrant in the absence of a magistrate's special order under section 187. Judicial authority can permit further detention under applicable law. The rule cannot therefore be reduced to 'everyone must be released at 24 hours'.", references: ["constitution-22", "bnss-58"] },
      { text: "Article 22(3) excludes enemy aliens and people arrested or detained under a preventive-detention law from clauses (1) and (2). The later clauses address that separate framework. BNSS section 170 preventive arrest has its own explicit 24-hour limit unless another legal provision authorises further detention. These exceptions cannot be inferred merely because someone uses the word 'detained'. The actual legal route matters.", references: ["constitution-22", "bnss-170"] },
    ],
  },
  {
    id: "women-and-vulnerable-people", group: "police", title: "Additional protections in specified situations",
    summary: "Women, older people and people with particular vulnerabilities have provision-specific safeguards.",
    paragraphs: [
      { text: "BNSS section 43(5) ordinarily prohibits arresting a woman after sunset and before sunrise. In exceptional circumstances, a woman police officer must make a written report and obtain prior permission from the relevant first-class magistrate. This is a conditional protection, rather than an absolute ban on every night arrest. Section 53 separately requires a woman's medical examination to be by or under a female medical officer, or by a female registered practitioner if that officer is unavailable.", references: ["bnss-43", "bnss-53"] },
      { text: "Section 35(7) requires prior permission from an officer of at least Deputy Superintendent rank for arrest for an offence punishable with less than three years where the person is infirm or above 60. Section 179's residence protections concern specified witness-attendance orders. These safeguards have different triggers and should not be interchanged. This guide explains the core adult framework; child-specific procedures need a separate juvenile-justice guide.", references: ["bnss-35", "bnss-179"] },
    ],
  },
  {
    id: "medical-care", group: "police", title: "Injuries, examination and health in custody",
    summary: "The law requires examination soon after arrest, an injury record and a copy of the report.",
    paragraphs: [
      { text: "BNSS section 53 requires examination soon after arrest by a government medical officer or, if one is unavailable, a registered medical practitioner. The record must include injuries or marks of violence and their approximate time of infliction. A copy must be furnished to the arrested person or nominee. Further examination is possible when the medical professional considers it necessary, and women have specific examination safeguards.", references: ["bnss-53"] },
      { text: "Section 56 places a duty of reasonable care for the accused person's health and safety on whoever has custody. Medical records can matter to a later account of events, but an injury entry alone does not determine who caused it or whether an officer committed an offence. Legal-services institutions provide advice and assistance with the process appropriate to an actual incident.", references: ["bnss-53", "nalsa"] },
    ],
  },
  {
    id: "fir-process", group: "case", title: "FIRs, complaints and investigation",
    summary: "An FIR records an allegation. It is not a finding of guilt or an automatic arrest order.",
    paragraphs: [
      { text: "BNSS section 173 allows information about a cognizable offence to be given to a police station irrespective of where it happened. Oral information is written down and read back; electronic information must be signed within three days. The informant or victim receives a free copy. For offences punishable with three years or more but less than seven, section 173(3) permits a preliminary enquiry with prior senior-officer permission within 14 days, or investigation where a prima facie case exists. This is not a general waiting rule for every FIR.", references: ["bnss-173"] },
      { text: "Section 35 governs the separate warrantless-arrest decision. Non-cognizable cases follow section 174, generally requiring a magistrate's order for investigation without granting the same warrantless-arrest power. Where information under section 173 is refused, subsection (4) provides a written postal route to the Superintendent of Police concerned and, failing that route, an application to a magistrate. Recording an allegation does not establish guilt; the applicable investigation and court process remain necessary.", references: ["bnss-35", "bnss-173", "bnss-174"] },
    ],
  },
  {
    id: "order-breach-case", group: "case", title: "An order-breach allegation has a further court requirement",
    summary: "BNS section 223 and BNSS section 215 address different stages.",
    paragraphs: [
      { text: "An alleged breach under BNS section 223 requires examination of the order, lawful promulgation, knowledge and the prescribed harmful consequence or likelihood. Separately, BNSS section 215(1)(a) restricts a court taking cognizance of listed offences, including section 223, except on a written complaint from the concerned public servant, an administrative superior or another authorised public servant.", references: ["bns-223", "bnss-215"] },
      { text: "Court cognizance is the court taking up an alleged offence for the relevant judicial process. It is different from recording information or deciding whether an arrest is lawful. The written-complaint requirement should not be presented as automatic proof that any FIR is invalid, or as something the court can ignore. Its effect in a particular case requires examination of the actual papers.", references: ["bnss-215", "bnss-173", "bnss-35"] },
    ],
  },
  {
    id: "bail", group: "case", title: "Bail and anticipatory bail",
    summary: "Non-bailable describes a legal category. It does not mean bail is impossible.",
    paragraphs: [
      { text: "BNSS section 478 provides release on bail in its stated bailable circumstances when someone is prepared to give bail. It also addresses a personal bond for an indigent person unable to furnish surety, with a qualification for previous failure to comply with bond attendance conditions. Section 480 governs bail in non-bailable cases, with restrictions and conditions. Whether an alleged offence is bailable is a different question from whether someone is guilty.", references: ["bnss-478", "bnss-480"] },
      { text: "Section 482 provides a route to the High Court or Court of Session for anticipatory bail when someone has reason to believe they may be arrested for a non-bailable offence. The court may impose conditions, and the section has express exclusions, including specified BNS sexual offences. This is not automatic protection from arrest. The alleged sections, evidence, any special statute and existing court orders affect the available options.", references: ["bnss-482", "bnss-480"] },
    ],
  },
  {
    id: "challenge-and-help", group: "help", title: "Challenging restrictions or unlawful custody",
    summary: "Review routes exist. Which route fits depends on the order and circumstances.",
    paragraphs: [
      { text: "BNSS section 163(5)-(7) allows an aggrieved person to apply for alteration or rescission, with written reasons for rejection. Article 226 empowers High Courts to issue writs, including habeas corpus, for enforcing fundamental rights and other purposes. Reviewing a public-order restriction and asking a court to examine allegedly unlawful custody are distinct mechanisms, rather than interchangeable forms.", references: ["bnss-163", "constitution-226"] },
      { text: "NALSA describes advice, assistance and representation through legal-services institutions, with eligibility and application procedures. Its FAQ provides an urgent legal-assistance contact. DSLSA's introduction lists round-the-clock helplines. The recently checked Delhi contact appears separately on this page; the linked official pages provide current numbers. These services provide a human legal-help path for examining a notice, order, FIR or custody concern. An application or call does not guarantee immediate representation or a particular outcome.", references: ["nalsa", "dslsa"] },
    ],
  },
  {
    id: "find-person", group: "help", title: "Finding someone after a police incident",
    summary: "Arrest information and missing-person reporting are different sources of help.",
    paragraphs: [
      { text: "BNSS sections 36-37 and 48 provide for arrest information: the designated officer maintains specified information, and a nominated person must be informed of the arrest and place of custody. These provisions do not mean Vote Better has access to a live custody register or can locate someone using a PIN code.", references: ["bnss-36", "bnss-47"] },
      { text: "Delhi Police publishes a telephone directory and a missing-person registration service. They are contact and reporting paths, rather than proof someone was arrested. DSLSA and NALSA provide legal-help routes for a custody concern and examination of a possible court remedy, including whether a habeas corpus petition fits the facts.", references: ["police-directory", "missing-person", "dslsa", "nalsa", "constitution-226"] },
    ],
  },
];

validateRightsArticles(protestTopics, rightsReferences);

export const rightsGroups = [
  { id: "freedom", title: "Before and during a protest", description: "Your rights, the location, applicable orders and the conduct of a gathering." },
  { id: "police", title: "Police powers and your protections", description: "Dispersal, questioning, custody and the safeguards for each legal route." },
  { id: "case", title: "If a case is registered", description: "FIRs, investigation, court requirements and bail." },
  { id: "help", title: "Review and legal help", description: "Challenging orders, legal aid and looking for someone." },
] as const;

export const rightsPaths = [
  { id: "protesting", title: "Planning to attend a protest", topics: ["peaceful-protest", "alone-or-group", "delhi-permission", "restriction-order", "possible-offences", "dispersal"] },
  { id: "stopped", title: "Stopped by police", topics: ["alone-or-group", "restriction-order", "dispersal", "preventive-action", "arrest-power"] },
  { id: "questioned", title: "Called for questioning", topics: ["questioning", "arrest-power", "arrest-safeguards"] },
  { id: "detained", title: "Detained or removed", topics: ["preventive-action", "custody-clock", "arrest-safeguards", "challenge-and-help"] },
  { id: "arrested", title: "Arrested", topics: ["arrest-safeguards", "custody-clock", "women-and-vulnerable-people", "medical-care", "bail"] },
  { id: "fir-registered", title: "FIR registered", topics: ["fir-process", "arrest-power", "order-breach-case", "bail", "challenge-and-help"] },
  { id: "injured", title: "Injured in custody", topics: ["medical-care", "arrest-safeguards", "challenge-and-help"] },
  { id: "family-member-missing", title: "Looking for someone", topics: ["find-person", "custody-clock", "challenge-and-help"] },
  { id: "legal-aid", title: "Need legal aid", topics: ["challenge-and-help", "bail", "find-person"] },
] as const;

export const rightsGlossary = [
  { term: "BNS", text: "The Bharatiya Nyaya Sanhita defines offences and punishments.", references: ["bns-189", "bns-223"] },
  { term: "BNSS", text: "The Bharatiya Nagarik Suraksha Sanhita sets out criminal procedure, including investigation, arrest and bail.", references: ["bnss-35", "bnss-173", "bnss-478"] },
  { term: "Cognizable", text: "A category in which arrest without warrant is permitted under applicable law. It does not make arrest compulsory.", references: ["bnss-35"] },
  { term: "FIR", text: "The commonly used name for the first information report recording an alleged cognizable offence.", references: ["bnss-173"] },
] as const;
