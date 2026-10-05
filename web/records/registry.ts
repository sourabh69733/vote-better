import { validateCivicDataset, type CivicDataset } from "@/lib/civic-records";
import { jaipurActivities, jaipurArea, jaipurCandidacies, jaipurPerson, jaipurSources, jaipurTerm } from "./jaipur";
import { jaipurRuralArea, jaipurRuralCandidacies, jaipurRuralPerson, jaipurRuralSources, jaipurRuralTerm } from "./jaipur-rural";
import { lokSabhaOffice } from "./offices";
import { jaipurPublication, mergeJaipurCandidacies, validatePublication } from "@/lib/publication";

export { validateCivicDataset } from "@/lib/civic-records";

export const dataset: CivicDataset = {
  areas: [jaipurArea, jaipurRuralArea],
  offices: [lokSabhaOffice],
  people: [jaipurPerson, jaipurRuralPerson],
  terms: [jaipurTerm, jaipurRuralTerm],
  candidacies: [...mergeJaipurCandidacies(jaipurCandidacies, jaipurSources, jaipurPublication), ...jaipurRuralCandidacies],
  activities: jaipurActivities,
  sources: [...jaipurSources, ...jaipurRuralSources],
};

const errors = validateCivicDataset(dataset);
errors.push(...validatePublication(jaipurPublication));
if (errors.length) throw new Error(`Civic records cannot be published:\n${errors.join("\n")}`);
