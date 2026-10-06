import type { CareerEventRecord, PersonBackgroundRecord, SourceRecord } from "@/lib/civic-records";

export const otherBackgrounds: PersonBackgroundRecord[] = [{
  id: "rao-digital-sansad-background",
  personId: "rao-rajendra-singh",
  educationDetail: "Honours in Public Administration, Rajasthan University",
  workDescription: "Agriculturist",
  context: "Digital Sansad member biography",
  sourceId: "rao-member",
}];

export const jaipurCareerEvents: CareerEventRecord[] = [
  {
    id: "rao-rajasthan-mla-2003-2018",
    personId: "rao-rajendra-singh",
    title: "Member, Rajasthan Legislative Assembly",
    period: "2003-2018",
    sortOn: "2003-01-01",
    sourceId: "rao-member",
  },
  {
    id: "pratap-civil-lines-mla-2018",
    personId: "jaipur-lok-sabha-2024-candidate-row-01",
    title: "Elected MLA, Civil Lines",
    period: "2018",
    sortOn: "2018-01-01",
    partyAtEvent: "Indian National Congress",
    sourceId: "pratap-rajasthan-assembly-2018",
  },
  {
    id: "pratap-transport-minister-2018-19",
    personId: "jaipur-lok-sabha-2024-candidate-row-01",
    title: "Listed as Transport Minister, Rajasthan",
    period: "2018-19",
    sortOn: "2019-01-01",
    sourceId: "pratap-transport-abstract-2018-19",
  },
];

export const jaipurCareerSources: SourceRecord[] = [
  {
    id: "pratap-rajasthan-assembly-2018",
    title: "Rajasthan CEO, 2018 Assembly successful candidates",
    url: "https://election.rajasthan.gov.in/Vidhansabha%202018/Notification.pdf",
    checkedOn: "2026-10-06",
  },
  {
    id: "pratap-transport-abstract-2018-19",
    title: "Rajasthan Transport Department statistical abstract 2018-19",
    url: "https://www.tourism.rajasthan.gov.in/content/dam/transport/transport-dept/pdf/statistical-abstract2018-19/Trasport%20Department%20Abstract%20Book%2018-19.pdf",
    checkedOn: "2026-10-06",
  },
];
