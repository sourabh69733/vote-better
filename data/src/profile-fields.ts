import type { ObservationDraft } from "./store.js";

export type ProfileSourceKind =
  | "sansad-member-list"
  | "official-biography"
  | "official-office-record"
  | "eci-nomination"
  | "eci-result"
  | "eci-affidavit"
  | "official-work-record";

export interface ProfileField {
  subject: "person" | "office-term" | "party-term" | "career-event" | "candidacy" | "affidavit" | "work";
  time: "stable" | "changing" | "dated-event" | "filing-snapshot";
  sources: readonly ProfileSourceKind[];
}

// This is a collection contract, not a list of facts we already have.
// Add a source kind only after its collector can point to the exact supporting record.
export const profileFields = {
  "person.sansadMemberId": { subject: "person", time: "stable", sources: ["sansad-member-list"] },
  "person.name": { subject: "person", time: "changing", sources: ["sansad-member-list", "official-biography", "eci-nomination"] },
  "person.birthDate": { subject: "person", time: "stable", sources: ["sansad-member-list", "official-biography", "eci-affidavit"] },
  "person.educationLevel": { subject: "person", time: "changing", sources: ["sansad-member-list", "official-biography", "eci-affidavit"] },
  "person.educationInstitution": { subject: "person", time: "dated-event", sources: ["official-biography", "eci-affidavit"] },
  "person.profession": { subject: "person", time: "changing", sources: ["sansad-member-list", "official-biography", "eci-affidavit"] },
  "person.officialWebsite": { subject: "person", time: "changing", sources: ["official-biography"] },
  "person.socialProfile": { subject: "person", time: "changing", sources: ["official-biography"] },
  "career.role": { subject: "career-event", time: "dated-event", sources: ["official-biography"] },
  "office.party": { subject: "office-term", time: "changing", sources: ["sansad-member-list", "official-office-record", "eci-result"] },
  "office.state": { subject: "office-term", time: "changing", sources: ["sansad-member-list", "official-office-record"] },
  "office.constituency": { subject: "office-term", time: "changing", sources: ["sansad-member-list", "official-office-record", "eci-result"] },
  "office.membershipStatus": { subject: "office-term", time: "changing", sources: ["sansad-member-list", "official-office-record"] },
  "office.lokSabhaTerms": { subject: "office-term", time: "changing", sources: ["sansad-member-list", "official-biography"] },
  "office.startedAt": { subject: "office-term", time: "dated-event", sources: ["official-office-record"] },
  "office.endedAt": { subject: "office-term", time: "dated-event", sources: ["official-office-record"] },
  "party.membership": { subject: "party-term", time: "dated-event", sources: ["official-biography", "official-office-record"] },
  "candidacy.status": { subject: "candidacy", time: "changing", sources: ["eci-nomination"] },
  "candidacy.party": { subject: "candidacy", time: "filing-snapshot", sources: ["eci-nomination", "eci-result"] },
  "candidacy.result": { subject: "candidacy", time: "dated-event", sources: ["eci-result"] },
  "candidacy.votes": { subject: "candidacy", time: "dated-event", sources: ["eci-result"] },
  "affidavit.assets": { subject: "affidavit", time: "filing-snapshot", sources: ["eci-affidavit"] },
  "affidavit.liabilities": { subject: "affidavit", time: "filing-snapshot", sources: ["eci-affidavit"] },
  "affidavit.declaredCases": { subject: "affidavit", time: "filing-snapshot", sources: ["eci-affidavit"] },
  "work.record": { subject: "work", time: "dated-event", sources: ["official-work-record"] },
} as const satisfies Record<string, ProfileField>;

export type ProfilePredicate = keyof typeof profileFields;

export function assertProfileDrafts(sourceKind: ProfileSourceKind, drafts: readonly ObservationDraft[]): void {
  for (const draft of drafts) {
    const field = (profileFields as Record<string, ProfileField>)[draft.predicate];
    if (!field) throw new Error(`unknown profile field: ${draft.predicate}`);
    if (!field.sources.includes(sourceKind)) {
      throw new Error(`${draft.predicate} is not supported by ${sourceKind}`);
    }
  }
}
