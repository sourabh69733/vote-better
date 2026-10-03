import type { CivicArea, CivicOffice, AreaOfficeLink } from "@/lib/civic-area";
import type { PersonProfile } from "@/lib/verified-profile";
import { jaipurArea, jaipurLink, jaipurProfile, lokSabhaOffice } from "./jaipur";

export const areas: Record<string, CivicArea> = { [jaipurArea.id]: jaipurArea };
export const offices: Record<string, CivicOffice> = { [lokSabhaOffice.id]: lokSabhaOffice };
export const profiles: Record<string, PersonProfile> = { [jaipurProfile.slug]: jaipurProfile };
export const areaLinks: AreaOfficeLink[] = [jaipurLink];
