import type { ConstitutionGuide } from "@/lib/constitution";

export const constitutionGuides: ConstitutionGuide[] = [
  {
    id: "protest",
    title: "Your right to protest",
    summary: "The Constitution does not use the word \"protest\", but it protects what a protest is made of: speaking, gathering peacefully and organising. The state can limit these rights only for reasons the Constitution names.",
    glance: [
      { tone: "yes", heading: "Protected", text: "Peaceful, unarmed gatherings, speeches, slogans, marches, petitions and forming groups or unions." },
      { tone: "limit", heading: "Can be limited", text: "Time, place and size, for reasons like public order or the sovereignty and integrity of India. Limits must be set by law and be reasonable." },
      { tone: "no", heading: "Not protected", text: "Violence, carrying arms, damaging public property, inciting an offence, or blocking public roads indefinitely." },
    ],
    sections: [
      {
        heading: "What you can do",
        intro: "These Fundamental Rights belong to every citizen.",
        items: [
          { label: "Speak and criticise", detail: "Express your views, including criticism of the government, through speech, writing, posters or slogans.", ref: "Article 19(1)(a)", kind: "constitution" },
          { label: "Gather peacefully", detail: "Assemble peaceably and without arms. This is the core of a protest, sit-in or march.", ref: "Article 19(1)(b)", kind: "constitution" },
          { label: "Form groups and unions", detail: "Form associations, unions or co-operative societies to organise collectively.", ref: "Article 19(1)(c)", kind: "constitution" },
          { label: "Travel to protest", detail: "Move freely throughout India.", ref: "Article 19(1)(d)", kind: "constitution" },
          { label: "Equal treatment", detail: "Rules must apply equally to everyone. Arbitrary action by the state can be challenged.", ref: "Article 14", kind: "constitution" },
        ],
      },
      {
        heading: "Limits the state can place",
        intro: "Each freedom comes with a short list of grounds on which a law can restrict it. Courts check whether a restriction is reasonable.",
        items: [
          { label: "On gatherings", detail: "Only in the interest of the sovereignty and integrity of India or public order.", ref: "Article 19(3)", kind: "constitution" },
          { label: "On speech", detail: "Sovereignty and integrity of India, security of the state, friendly relations with foreign states, public order, decency or morality, contempt of court, defamation, or incitement to an offence.", ref: "Article 19(2)", kind: "constitution" },
          { label: "On groups and unions", detail: "Sovereignty and integrity of India, public order or morality.", ref: "Article 19(4)", kind: "constitution" },
          { label: "Armed forces and police", detail: "Parliament can restrict the rights of members of the armed forces and police so they can do their duties.", ref: "Article 33", kind: "constitution" },
          { label: "During an Emergency", detail: "During a national emergency declared because of war or external aggression, Article 19 freedoms can be suspended. Rights under Articles 20 and 21 can never be suspended.", ref: "Articles 358 and 359", kind: "constitution" },
        ],
      },
      {
        heading: "If the police act",
        intro: "These protections apply to everyone, including protesters who are detained or arrested.",
        items: [
          { label: "Know why", detail: "You must be told the grounds of your arrest as soon as possible.", ref: "Article 22(1)", kind: "constitution" },
          { label: "Get a lawyer", detail: "You can consult and be defended by a lawyer of your choice.", ref: "Article 22(1)", kind: "constitution" },
          { label: "See a magistrate in 24 hours", detail: "You must be produced before the nearest magistrate within 24 hours of arrest, not counting travel time. Different rules apply to preventive detention.", ref: "Article 22(2)", kind: "constitution" },
          { label: "Stay silent about yourself", detail: "No person accused of an offence can be forced to be a witness against themselves.", ref: "Article 20(3)", kind: "constitution" },
          { label: "Life and liberty", detail: "Your liberty can be taken only by a procedure set by law, which courts require to be fair, just and reasonable.", ref: "Article 21", kind: "constitution" },
          { label: "Go to court", detail: "If your rights are violated, you can approach the Supreme Court or your High Court directly.", ref: "Articles 32 and 226", kind: "constitution" },
        ],
      },
      {
        heading: "What courts have said",
        intro: "The Supreme Court explains how these articles apply to real protests. These rulings are binding on all courts in India.",
        items: [
          { label: "Peaceful protest is a fundamental right", detail: "The Court held that the right to assemble and protest peacefully is protected, and found the police action against sleeping protesters at Ramlila Maidan excessive.", ref: "Ramlila Maidan Incident (2012)", kind: "court" },
          { label: "No blanket bans", detail: "A complete ban on protests at Jantar Mantar and Boat Club in Delhi was not allowed. Police must balance protesters' rights with residents' rights.", ref: "Mazdoor Kisan Shakti Sangathan (2018)", kind: "court" },
          { label: "Public roads cannot be occupied indefinitely", detail: "Protests must be held in designated places. Blocking a public way for a long time is not allowed.", ref: "Amit Sahni (2020)", kind: "court" },
          { label: "Prohibitory orders must be proportionate", detail: "Orders banning gatherings cannot be used to suppress legitimate expression of opinion, and must be reasoned and reviewable.", ref: "Anuradha Bhasin (2020)", kind: "court" },
          { label: "No fundamental right to strike", detail: "Government employees do not have a fundamental right to go on strike.", ref: "T.K. Rangarajan (2003)", kind: "court" },
        ],
      },
      {
        heading: "Ordinary laws that also apply",
        intro: "These come from criminal law and local rules, not the Constitution. Check the current text and your city's rules.",
        items: [
          { label: "Prohibitory orders", detail: "A magistrate can issue urgent temporary orders that stop gatherings in an area. This was Section 144 of the old CrPC.", ref: "BNSS Section 163", kind: "law" },
          { label: "Unlawful assembly", detail: "A gathering of five or more people with a common unlawful aim, such as using force, is an offence. This was Section 141 of the old IPC.", ref: "BNS Section 189", kind: "law" },
          { label: "Local permission", detail: "Many cities require prior police permission for rallies, marches or use of loudspeakers.", ref: "City police rules", kind: "law" },
        ],
      },
      {
        heading: "Your duties",
        intro: "Fundamental Duties are not enforced like rights, but they describe what citizens are expected to do.",
        items: [
          { label: "Respect the Constitution", detail: "Abide by the Constitution and respect its ideals, the national flag and the national anthem.", ref: "Article 51A(a)", kind: "constitution" },
          { label: "No violence, no damage", detail: "Safeguard public property and abjure violence.", ref: "Article 51A(i)", kind: "constitution" },
        ],
      },
    ],
    checklist: [
      "Check whether your city needs police permission, and apply early.",
      "Use the designated protest site, not a public road.",
      "Stay peaceful and carry nothing that could be called a weapon.",
      "Ask whether a prohibitory order is in force in the area.",
      "If detained, ask for the grounds and for a lawyer. Free legal aid: NALSA helpline 15100.",
    ],
  },
];

export function getConstitutionGuide(id: string) {
  return constitutionGuides.find((guide) => guide.id === id);
}
