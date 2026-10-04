import { validateCivicDataset, type CivicDataset } from "@/lib/civic-records";
import { jaipurActivities, jaipurArea, jaipurCandidacies, jaipurPerson, jaipurSources, jaipurTerm } from "./jaipur";
import { jaipurRuralArea, jaipurRuralCandidacies, jaipurRuralPerson, jaipurRuralSources, jaipurRuralTerm } from "./jaipur-rural";
import { lokSabhaOffice } from "./offices";

export { validateCivicDataset } from "@/lib/civic-records";

export const dataset: CivicDataset = {
  areas: [jaipurArea, jaipurRuralArea],
  offices: [lokSabhaOffice],
  people: [jaipurPerson, jaipurRuralPerson],
  terms: [jaipurTerm, jaipurRuralTerm],
  candidacies: [...jaipurCandidacies, ...jaipurRuralCandidacies],
  activities: jaipurActivities,
  sources: [...jaipurSources, ...jaipurRuralSources],
};

const errors = validateCivicDataset(dataset);
if (errors.length) throw new Error(`Civic records cannot be published:\n${errors.join("\n")}`);
