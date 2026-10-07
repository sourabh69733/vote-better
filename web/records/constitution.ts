import type { ConstitutionQuestion, ConstitutionTopic } from "@/lib/constitution";

// Plain-language summaries written from the official text. They need expert review before public release.
export const constitutionReviewNote = "Draft summaries. Expert review pending.";

export const constitutionTopics: ConstitutionTopic[] = [
  {
    id: "rights",
    question: "What are my rights?",
    answer: "Part III gives every person Fundamental Rights. If the government breaks them, you can go straight to the High Court or Supreme Court.",
    example: "A government school cannot refuse a 10 year old child free elementary education because of their caste. That would break Articles 15 and 21A.",
    points: [
      { label: "Equality", detail: "Equal before the law. No discrimination by religion, race, caste, sex or place of birth. Untouchability is abolished.", articles: "Articles 14 to 18" },
      { label: "Freedom", detail: "Speak, assemble peacefully, form groups, move and live anywhere in India, and work in any lawful job, within reasonable limits.", articles: "Article 19" },
      { label: "Life and liberty", detail: "No one loses life or personal liberty except by a procedure set by law. Children aged 6 to 14 get free education.", articles: "Articles 21 and 21A" },
      { label: "Against exploitation", detail: "No human trafficking or forced labour. No child under 14 in factories, mines or hazardous work.", articles: "Articles 23 and 24" },
      { label: "Religion", detail: "Freedom to follow, practise and spread any religion, subject to public order, morality and health.", articles: "Articles 25 to 28" },
      { label: "Going to court", detail: "You can ask the Supreme Court or a High Court to enforce these rights.", articles: "Articles 32 and 226" },
    ],
  },
  {
    id: "laws",
    question: "Who makes laws?",
    answer: "Parliament makes laws for the whole country. State legislatures make laws for their state. The Seventh Schedule lists which subjects belong to whom.",
    example: "Railways are on the Union List, so Parliament makes railway laws. Police is on the State List, so your state assembly does.",
    points: [
      { label: "Parliament", detail: "The President, the Lok Sabha (elected by voters) and the Rajya Sabha (mostly elected by state assemblies).", articles: "Article 79" },
      { label: "Union List", detail: "Subjects only Parliament can make laws on, such as defence, foreign affairs, railways and currency.", articles: "Article 246, Seventh Schedule" },
      { label: "State List", detail: "Subjects for state assemblies, such as police, public order, public health and agriculture.", articles: "Article 246, Seventh Schedule" },
      { label: "Concurrent List", detail: "Both can make laws, such as education and electricity. If they conflict, the Union law usually wins.", articles: "Articles 246 and 254" },
    ],
  },
  {
    id: "government",
    question: "How is a government formed?",
    answer: "Citizens aged 18 and above elect the Lok Sabha. The President appoints as Prime Minister the leader who can win the support of the Lok Sabha.",
    example: "If a party or alliance wins a majority of the 543 Lok Sabha seats, its leader is usually invited to become Prime Minister.",
    points: [
      { label: "Voting", detail: "Every citizen aged 18 or above can vote, unless disqualified by law.", articles: "Article 326" },
      { label: "Elections", detail: "The Election Commission runs elections to Parliament, state assemblies and the offices of President and Vice President.", articles: "Article 324" },
      { label: "Prime Minister", detail: "Appointed by the President. The council of ministers must keep the confidence of the Lok Sabha.", articles: "Article 75" },
      { label: "Term", detail: "The Lok Sabha lasts five years unless dissolved earlier. The Rajya Sabha is never dissolved; one third of its members retire every two years.", articles: "Article 83" },
      { label: "States", detail: "The Governor appoints the Chief Minister, who must keep the confidence of the state assembly.", articles: "Article 164" },
    ],
  },
  {
    id: "checks",
    question: "Who keeps power in check?",
    answer: "Power is split between the legislature, the executive and the judiciary. Each can limit the others.",
    example: "If Parliament passes a law that takes away a Fundamental Right, the Supreme Court can strike it down.",
    points: [
      { label: "Legislature", detail: "Makes laws and questions ministers. The government must keep the Lok Sabha's confidence.", articles: "Articles 75 and 79" },
      { label: "Executive", detail: "The President, Prime Minister and ministers run the government and carry out laws.", articles: "Articles 53 and 74" },
      { label: "Judiciary", detail: "The Supreme Court and High Courts decide disputes and can cancel laws that break the Constitution.", articles: "Articles 13, 124 and 214" },
      { label: "Changing the Constitution", detail: "Parliament can amend it by a special majority. The Supreme Court has held that its basic structure cannot be destroyed.", articles: "Article 368" },
    ],
  },
  {
    id: "duties",
    question: "What are my duties, and the state's goals?",
    answer: "Fundamental Duties ask citizens to respect the Constitution and the nation. Directive Principles guide the government toward a fair society, but courts cannot enforce them directly.",
    example: "Protecting public property is a citizen's duty. Equal pay for equal work is a goal the state should work toward.",
    points: [
      { label: "Fundamental Duties", detail: "Eleven duties, such as respecting the flag and anthem, protecting the environment and sending children aged 6 to 14 to school.", articles: "Article 51A" },
      { label: "Directive Principles", detail: "Goals such as adequate livelihood, equal pay for equal work, free legal aid and village panchayats.", articles: "Articles 36 to 51" },
      { label: "Not enforceable in court", detail: "You cannot sue to enforce a Directive Principle, but the state must apply them when making laws.", articles: "Article 37" },
    ],
  },
];

export const constitutionQuestions: ConstitutionQuestion[] = [
  { id: "voting-age", topicId: "government", question: "At what age can I vote?", answer: "At 18. Every citizen aged 18 or above can vote unless a law disqualifies them. The 61st Amendment (1988) lowered it from 21.", articles: "Article 326", keywords: ["vote", "voting", "age", "18", "voter", "adult"] },
  { id: "contest-age", topicId: "government", question: "How old must I be to contest an election?", answer: "25 for the Lok Sabha and state assemblies, 30 for the Rajya Sabha and state legislative councils. You must also be a citizen of India.", articles: "Articles 84 and 173", keywords: ["contest", "candidate", "election", "age", "stand", "mp", "mla"] },
  { id: "pm", topicId: "government", question: "Who chooses the Prime Minister?", answer: "The President appoints the Prime Minister. In practice, this is the leader who has majority support in the Lok Sabha.", articles: "Article 75", keywords: ["prime", "minister", "pm", "appoint", "choose", "majority"] },
  { id: "president-election", topicId: "government", question: "Who elects the President?", answer: "An electoral college of elected members of both Houses of Parliament and of state legislative assemblies, including Delhi and Puducherry. Citizens do not vote directly.", articles: "Articles 54 and 55", keywords: ["president", "elect", "electoral", "college"] },
  { id: "term", topicId: "government", question: "How long does a Lok Sabha term last?", answer: "Five years from its first meeting, unless it is dissolved earlier. It can be extended by one year at a time only during a national emergency.", articles: "Article 83", keywords: ["term", "lok", "sabha", "years", "five", "dissolve"] },
  { id: "election-commission", topicId: "government", question: "Who conducts elections?", answer: "The Election Commission of India for Parliament, state assemblies, President and Vice President. Panchayat and municipal elections are run by each State Election Commission.", articles: "Articles 324, 243K and 243ZA", keywords: ["election", "commission", "eci", "conduct", "panchayat", "municipal"] },
  { id: "speech", topicId: "rights", guideId: "protest", question: "Can I criticise the government?", answer: "Yes. Freedom of speech and expression protects it. The state can impose reasonable restrictions only on grounds such as public order, defamation, decency or the security of the state.", articles: "Article 19(1)(a) and 19(2)", keywords: ["criticise", "criticize", "speech", "expression", "protest", "opinion", "free"] },
  { id: "protest", topicId: "rights", guideId: "protest", question: "Can I protest?", answer: "You have the right to assemble peacefully and without arms. Reasonable restrictions can apply in the interest of public order.", articles: "Article 19(1)(b) and 19(3)", keywords: ["protest", "protests", "assemble", "rally", "march", "gathering", "dharna", "andolan", "rights"] },
  { id: "arrest", topicId: "rights", guideId: "protest", question: "What are my rights if I am arrested?", answer: "You must be told the grounds of arrest, you can consult a lawyer of your choice, and you must be produced before a magistrate within 24 hours, not counting travel time. Different rules apply to preventive detention.", articles: "Article 22", keywords: ["arrest", "police", "lawyer", "magistrate", "24", "hours", "detained", "custody"] },
  { id: "protest-permission", topicId: "rights", guideId: "protest", question: "Do I need permission to protest?", answer: "The Constitution protects peaceful, unarmed assembly, but allows reasonable limits for public order. Many cities require prior police permission for rallies and marches, so check local rules.", articles: "Article 19(1)(b) and 19(3)", keywords: ["permission", "protest", "rally", "march", "dharna", "police", "allowed"] },
  { id: "protest-stop", topicId: "rights", guideId: "protest", question: "Can police stop my protest?", answer: "Only on grounds the Constitution allows, such as public order, and under a law. The Supreme Court has said orders banning gatherings must be proportionate and cannot be used just to silence legitimate opinions.", articles: "Article 19(3)", keywords: ["police", "stop", "ban", "protest", "section", "144", "163", "prohibitory", "dharna"] },
  { id: "protest-road", topicId: "rights", guideId: "protest", question: "Can I protest by blocking a road?", answer: "Not indefinitely. The Supreme Court held in 2020 that public ways cannot be occupied for long and protests should be held at designated places.", articles: "Article 19(1)(b) and 19(3)", keywords: ["road", "block", "blockade", "chakka", "jam", "highway", "protest", "sit"] },
  { id: "strike", topicId: "rights", guideId: "protest", question: "Is strike a fundamental right?", answer: "No. You can form unions under Article 19(1)(c), but the Supreme Court has held that government employees have no fundamental right to strike. Strikes are governed by labour laws.", articles: "Article 19(1)(c)", keywords: ["strike", "union", "hartal", "bandh", "employees", "workers"] },
  { id: "education", topicId: "rights", question: "Is education a right?", answer: "Yes, for children aged 6 to 14. The state must provide free and compulsory education. This was added by the 86th Amendment in 2002.", articles: "Article 21A", keywords: ["education", "school", "child", "children", "free", "study"] },
  { id: "untouchability", topicId: "rights", question: "Is untouchability allowed?", answer: "No. Untouchability is abolished and practising it in any form is an offence punishable by law.", articles: "Article 17", keywords: ["untouchability", "caste", "discrimination", "dalit"] },
  { id: "discrimination", topicId: "rights", question: "Can the government discriminate against me?", answer: "No. The state cannot discriminate on religion, race, caste, sex or place of birth. It can make special provisions for women, children and backward classes.", articles: "Articles 14, 15 and 16", keywords: ["discriminate", "discrimination", "equal", "equality", "caste", "religion", "women", "gender", "job"] },
  { id: "property", topicId: "rights", question: "Is property a Fundamental Right?", answer: "Not any more. The 44th Amendment in 1978 removed it from Fundamental Rights. It is now a constitutional right: no one can be deprived of property except by authority of law.", articles: "Article 300A", keywords: ["property", "land", "house", "acquire"] },
  { id: "religion", topicId: "rights", question: "Can I follow any religion?", answer: "Yes. You may freely profess, practise and spread your religion, subject to public order, morality and health.", articles: "Articles 25 to 28", keywords: ["religion", "faith", "worship", "secular", "convert", "temple", "mosque", "church"] },
  { id: "court", topicId: "rights", question: "Where can I go if my rights are violated?", answer: "Directly to the Supreme Court under Article 32, or to your High Court under Article 226. Free legal aid may be available through legal services authorities.", articles: "Articles 32 and 226", keywords: ["court", "violated", "rights", "petition", "writ", "justice", "supreme", "high"] },
  { id: "money-bill", topicId: "laws", question: "What is a money bill?", answer: "A bill only about taxes, government borrowing or spending from the Consolidated Fund. It can only be introduced in the Lok Sabha. The Rajya Sabha can suggest changes within 14 days but cannot block it.", articles: "Articles 109 and 110", keywords: ["money", "bill", "tax", "budget", "finance"] },
  { id: "houses-disagree", topicId: "laws", question: "What if the Lok Sabha and Rajya Sabha disagree on a bill?", answer: "The President can call a joint sitting of both Houses, where a majority of members present and voting decides. This does not apply to money bills or constitutional amendments.", articles: "Article 108", keywords: ["joint", "sitting", "disagree", "deadlock", "houses", "bill"] },
  { id: "president-assent", topicId: "laws", question: "Can the President refuse to sign a bill?", answer: "The President can return an ordinary bill once for reconsideration. If Parliament passes it again, with or without changes, the President must give assent.", articles: "Article 111", keywords: ["president", "assent", "sign", "veto", "refuse", "bill"] },
  { id: "amend", topicId: "checks", question: "Can the Constitution be changed?", answer: "Yes, by Parliament through a special majority, and for some parts with approval from half the states. The Supreme Court held in Kesavananda Bharati (1973) that the basic structure cannot be destroyed.", articles: "Article 368", keywords: ["amend", "amendment", "change", "basic", "structure"] },
  { id: "emergency", topicId: "checks", question: "What is an Emergency?", answer: "Special powers for a war, external aggression or armed rebellion (Article 352), failure of government in a state (President's Rule, Article 356), or a financial crisis (Article 360). Rights under Articles 20 and 21 cannot be suspended even then.", articles: "Articles 352, 356, 359 and 360", keywords: ["emergency", "president", "rule", "suspend", "war"] },
  { id: "duties", topicId: "duties", question: "What are Fundamental Duties?", answer: "Eleven duties for citizens, such as respecting the Constitution, flag and anthem, protecting the environment and public property, and giving children aged 6 to 14 a chance to study.", articles: "Article 51A", keywords: ["duty", "duties", "citizen", "responsibility"] },
  { id: "panchayat", topicId: "laws", question: "Who handles roads, water and drains in my area?", answer: "Usually your panchayat or municipality. The Constitution lets states hand them subjects such as drinking water, local roads, sanitation and street lighting.", articles: "Articles 243G and 243W, Eleventh and Twelfth Schedules", keywords: ["road", "roads", "water", "drain", "drains", "garbage", "streetlight", "local", "panchayat", "municipality", "councillor", "sarpanch", "ward"] },
  { id: "mp-mla", topicId: "laws", question: "What is the difference between an MP and an MLA?", answer: "An MP sits in Parliament and works on national subjects like railways and defence. An MLA sits in the state assembly and works on state subjects like police, hospitals and agriculture.", articles: "Article 246, Seventh Schedule", keywords: ["mp", "mla", "difference", "parliament", "assembly", "representative"] },
  { id: "women-reservation", topicId: "government", question: "Are seats reserved for women?", answer: "The 106th Amendment (2023) reserves one third of seats in the Lok Sabha and state assemblies for women. It takes effect after delimitation based on the next census. Panchayats and municipalities already reserve at least one third.", articles: "Articles 330A, 332A, 243D and 243T", keywords: ["women", "reservation", "seats", "reserved", "female"] },
  { id: "language", topicId: "laws", question: "What is the official language?", answer: "Hindi in Devanagari script is the official language of the Union, and English continues to be used for official purposes. The Eighth Schedule lists 22 languages.", articles: "Articles 343 and 344, Eighth Schedule", keywords: ["language", "hindi", "english", "official", "national"] },
];
