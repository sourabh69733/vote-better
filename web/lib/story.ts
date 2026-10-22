import { formatShort, marginOf, marginRankInState } from "./lok-sabha-2024";
import { partyColor } from "./party-colors";
import type { ProfileModel } from "./profile-model";

// A story is a short sequence of scenes built from any profile. Each builder looks
// at the profile and returns a scene, or nothing when its data is missing, so every
// profile type gets a story without empty scenes. Add a builder to add a scene type.

export type StoryScene =
  | { kind: "intro"; kicker: string; name: string; initials: string; party: string | null; color: string; role: string; place: string }
  | { kind: "race"; title: string; rows: { name: string; party: string; color: string; share: number; votes: string; self: boolean }[]; others?: string }
  | { kind: "margin"; lead: string; value: string; unit: string; detail: string; comparison?: string }
  | { kind: "money"; title: string; assets?: string; liabilities?: string; assetShare?: number; cases?: number }
  | { kind: "work"; title: string; questions?: number; debates?: number; topics: { name: string; width: number }[] }
  | { kind: "career"; title: string; items: { when: string; text: string }[] }
  | { kind: "sources"; labels: string[] };

export interface Story {
  name: string;
  color: string;
  scenes: StoryScene[];
}

type Builder = (profile: ProfileModel) => StoryScene | null;

function initials(name: string) {
  const parts = name.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

function ordinal(n: number) {
  const suffix = ["th", "st", "nd", "rd"];
  const lastTwo = n % 100;
  return n + (suffix[(lastTwo - 20) % 10] ?? suffix[lastTwo] ?? suffix[0]);
}

const intro: Builder = (profile) => ({
  kind: "intro", kicker: profile.kicker, name: profile.name, initials: initials(profile.name),
  party: profile.party?.name ?? null, color: profile.party?.color ?? partyColor(null), role: profile.role.label, place: profile.place,
});

const race: Builder = ({ contest }) => {
  if (!contest || contest.seat.candidates.length < 2) return null;
  const top = contest.seat.candidates.slice(0, 2);
  const self = contest.candidate && !top.some((item) => item.slug === contest.candidate!.slug) ? contest.candidate : undefined;
  const shown = self ? [...top, self] : top;
  const rest = contest.seat.candidates.length - shown.length;
  const restShare = 100 - shown.reduce((sum, item) => sum + item.shareOfValidVotes, 0);
  return {
    kind: "race", title: `2024 vote in ${contest.seat.name}`,
    rows: shown.map((item) => ({
      name: item.name, party: item.party, color: partyColor(item.party), share: item.shareOfValidVotes,
      votes: formatShort(item.votes), self: item.slug === contest.candidate?.slug,
    })),
    ...(rest > 0 ? { others: `${rest} other${rest === 1 ? "" : "s"} · ${Math.max(restShare, 0).toFixed(1)}% together` } : {}),
  };
};

const margin: Builder = ({ contest }) => {
  if (!contest?.candidate || contest.seat.candidates.length < 2) return null;
  const result = marginOf(contest.seat, contest.candidate);
  if (!result) return null;
  const [value, unit = ""] = formatShort(result.votes).split(" ");
  const rank = result.kind === "won" ? marginRankInState(contest.seat) : null;
  const comparison = rank
    ? rank.rank === 1 ? `The biggest winning margin of ${rank.total} seats in ${contest.seat.state}.`
      : rank.rank === rank.total ? `The closest result of ${rank.total} seats in ${contest.seat.state}.`
      : `The ${ordinal(rank.rank)} biggest margin of ${rank.total} seats in ${contest.seat.state}.`
    : undefined;
  return {
    kind: "margin", lead: result.kind === "won" ? "Won by" : "Lost by", value, unit: `${unit ? `${unit} ` : ""}votes`,
    detail: result.kind === "won" ? `over ${result.other.name} (${result.other.party})` : `to ${result.other.name} (${result.other.party})`,
    ...(comparison ? { comparison } : {}),
  };
};

const money: Builder = ({ money: declared }) => {
  if (!declared || (declared.assets === undefined && declared.cases === undefined)) return null;
  const total = (declared.assets ?? 0) + (declared.liabilities ?? 0);
  return {
    kind: "money", title: `Declared in the ${declared.election} affidavit`,
    ...(declared.assets !== undefined ? { assets: `₹${formatShort(declared.assets)}` } : {}),
    ...(declared.liabilities !== undefined ? { liabilities: `₹${formatShort(declared.liabilities)}` } : {}),
    ...(declared.assets !== undefined && total > 0 ? { assetShare: (declared.assets / total) * 100 } : {}),
    ...(declared.cases !== undefined ? { cases: declared.cases } : {}),
  };
};

const work: Builder = ({ work: record }) => {
  const questions = record?.questions;
  const debates = record?.debates;
  if (!questions && !debates) return null;
  const topics = questions?.topMinistries.slice(0, 3) ?? [];
  return {
    kind: "work", title: "In Parliament",
    ...(questions ? { questions: questions.total } : {}),
    ...(debates ? { debates: debates.total } : {}),
    topics: topics.map((topic) => ({ name: topic.name, width: (topic.count / topics[0].count) * 100 })),
  };
};

const career: Builder = (profile) => {
  // Earlier events only: the 2024 election already has its own scenes.
  const items = profile.timeline.filter((item) => !(item.strong && /2024/.test(item.when))).slice(0, 3);
  if (items.length < 2) return null;
  return { kind: "career", title: "Before this", items: items.map((item) => ({ when: item.when.split(" · ")[0], text: item.text })) };
};

const sources: Builder = (profile) => {
  const labels = new Set<string>();
  if (profile.contest) labels.add("ECI");
  for (const stat of profile.stats) if (stat.source) labels.add(stat.source.label);
  for (const item of profile.timeline) if (item.source) labels.add(item.source.label);
  if (profile.money?.source) labels.add(profile.money.source.label);
  return { kind: "sources", labels: [...labels].slice(0, 5) };
};

export const storyBuilders: Builder[] = [intro, race, margin, money, work, career, sources];

export function buildStory(profile: ProfileModel, builders: Builder[] = storyBuilders): Story {
  return {
    name: profile.name,
    color: profile.party?.color ?? partyColor(null),
    scenes: builders.map((build) => build(profile)).filter((scene): scene is StoryScene => scene !== null),
  };
}
