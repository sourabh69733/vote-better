import type { CivicArea, CivicOffice, AreaOfficeLink } from "@/lib/civic-area";
import type { PersonProfile } from "@/lib/verified-profile";
import { jaipurArea, jaipurLink, jaipurProfile } from "./jaipur";
import { jaipurRuralArea, jaipurRuralLink, jaipurRuralProfile } from "./jaipur-rural";
import { lokSabhaOffice } from "./offices";

export const areas: Record<string, CivicArea> = {
  [jaipurArea.id]: jaipurArea,
  [jaipurRuralArea.id]: jaipurRuralArea,
};
export const offices: Record<string, CivicOffice> = { [lokSabhaOffice.id]: lokSabhaOffice };
export const profiles: Record<string, PersonProfile> = {
  [jaipurProfile.slug]: jaipurProfile,
  [jaipurRuralProfile.slug]: jaipurRuralProfile,
};
export const areaLinks: AreaOfficeLink[] = [jaipurLink, jaipurRuralLink];
