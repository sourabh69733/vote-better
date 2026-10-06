import { validateCivicDataset, type CivicDataset } from "@/lib/civic-records";
import { jaipurActivities, jaipurArea, jaipurCandidacies, jaipurPerson, jaipurSources, jaipurTerm } from "./jaipur";
import { candidateProfilesFromPublication } from "./jaipur-candidates";
import { jaipurDisclosureSources, jaipurDisclosures } from "./jaipur-disclosures";
import { jaipurRuralArea, jaipurRuralCandidacies, jaipurRuralPerson, jaipurRuralSources, jaipurRuralTerm } from "./jaipur-rural";
import { lokSabhaOffice } from "./offices";
import { jaipurPublication, mergeJaipurCandidacies, validatePublication } from "@/lib/publication";

export { validateCivicDataset } from "@/lib/civic-records";

const jaipurCandidates = candidateProfilesFromPublication(jaipurPublication, jaipurSources, [jaipurPerson.id]);

export const dataset: CivicDataset = {
  areas: [jaipurArea, jaipurRuralArea],
  offices: [lokSabhaOffice],
  people: [jaipurPerson, ...jaipurCandidates.people, jaipurRuralPerson],
  terms: [jaipurTerm, jaipurRuralTerm],
  candidacies: [...mergeJaipurCandidacies(jaipurCandidacies, jaipurSources, jaipurPublication), ...jaipurCandidates.candidacies, ...jaipurRuralCandidacies],
  activities: jaipurActivities,
  disclosures: jaipurDisclosures,
  sources: [...jaipurSources, ...jaipurRuralSources, ...jaipurDisclosureSources],
};

const errors = validateCivicDataset(dataset);
errors.push(...validatePublication(jaipurPublication));
if (errors.length) throw new Error(`Civic records cannot be published:\n${errors.join("\n")}`);
