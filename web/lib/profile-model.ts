import type { ChipSource } from "@/components/profile/SourceChip";
import { formatShort, type LokSabhaResults, type ResultCandidate, type ResultSeat } from "./lok-sabha";
import { partyColor } from "./party-colors";

// One shape for every profile page. A section exists only when its data does,
// so a profile never shows empty boxes.

export interface ProfileStat {
  id: string;
  label: string;
  value: string;
  note?: string;
  source?: ChipSource;
  visual?: { kind: "ring"; percent: number } | { kind: "split"; parts: { label: string; value: number; tone: "good" | "bad" }[] };
}

export interface ProfileWork {
  questions?: { total: number; bySession: { label: string; count: number }[]; topMinistries: { name: string; count: number }[]; latest: { date: string; subject: string; url: string }[]; directoryUrl: string; collectedOn: string };
  debates?: { total: number; byCategory: { name: string; count: number }[]; latest: { date: string; title: string; url: string }[]; collectedOn: string };
  positions?: { title: string; period?: string }[];
  offices?: { title: string; detail: string; current: boolean; source?: ChipSource }[];
  note?: string;
}

export interface ProfileMoney {
  election: string;
  assets?: number;
  liabilities?: number;
  cases?: number;
  education?: string;
  age?: number;
  source?: ChipSource;
}

export interface ProfileModel {
  name: string;
  officialName?: string;
  party: { name: string; code?: string; color: string; symbol?: string | null } | null;
  role: { label: string; tone: "sitting" | "won" | "lost" | "candidate" };
  place: string;
  kicker: string;
  headline: string;
  breadcrumb: { label: string; href: string }[];
  contest?: { seat: ResultSeat; candidate?: ResultCandidate; note?: string };
  stats: ProfileStat[];
  work?: ProfileWork;
  money?: ProfileMoney;
  timeline: { when: string; text: string; source?: ChipSource; strong?: boolean }[];
  timelineNote?: string;
  facts: [string, string][];
  links: { label: string; url: string }[];
  related: { label: string; href: string }[];
  sources: { title: string; url: string; checkedOn: string }[];
  coming: string[];
  warning?: string;
}

export const percent = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)}%`;

export function resultStats(seat: ResultSeat, candidate: ResultCandidate, eci: ChipSource): ProfileStat[] {
  return [
    { id: "share", label: "Vote share", value: percent(candidate.shareOfValidVotes), note: "of valid votes", source: eci, visual: { kind: "ring", percent: candidate.shareOfValidVotes } },
    { id: "votes", label: "Votes", value: formatShort(candidate.votes), note: `${candidate.postalVotes.toLocaleString("en-IN")} by post`, source: eci },
    { id: "rank", label: "Finished", value: candidate.rank === 1 ? "1st" : `${candidate.rank} of ${seat.candidates.length}`, note: `of ${seat.candidates.length} candidates`, source: eci },
  ];
}

export function moneyStats(money: ProfileMoney | undefined): ProfileStat[] {
  if (!money) return [];
  const stats: ProfileStat[] = [];
  if (money.assets !== undefined) {
    stats.push({
      id: "assets", label: "Declared assets", value: `₹${formatShort(money.assets)}`, source: money.source,
      ...(money.liabilities !== undefined ? {
        note: `Liabilities ₹${formatShort(money.liabilities)}`,
        visual: { kind: "split" as const, parts: [{ label: "Assets", value: money.assets, tone: "good" as const }, { label: "Liabilities", value: money.liabilities, tone: "bad" as const }] },
      } : {}),
    });
  }
  if (money.cases !== undefined) stats.push({ id: "cases", label: "Declared criminal cases", value: String(money.cases), note: "Declared, not convictions", source: money.source });
  return stats;
}

export function eciChip(data: LokSabhaResults, candidate: ResultCandidate, checkedOn: string): ChipSource {
  return { label: "ECI", title: "ECI 2024 results, report 33", url: data.source.url, locator: candidate.locator.toLowerCase(), checkedOn };
}

export function partyOf(name: string | undefined, code?: string, symbol?: string | null) {
  if (!name) return null;
  return { name, code, color: partyColor(code ?? name), symbol };
}

export function topCounts(values: string[], limit = 5) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
}

const smallWords = new Set(["and", "of", "the", "for", "in", "on", "to"]);

// Sansad writes ministries in capitals: "AGRICULTURE AND FARMERS WELFARE" -> "Agriculture and Farmers Welfare".
export function readableTitle(value: string) {
  if (value !== value.toUpperCase()) return value;
  return value.toLowerCase().split(" ").map((word, index) => (index && smallWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1))).join(" ");
}
