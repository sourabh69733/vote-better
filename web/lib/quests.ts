// Quests: small things a voter can do on the site, such as finding their MLA or opening an official source.
// Progress lives only in the voter's browser. Quests reward learning; nothing here scores a politician.

export type QuestId = "know-your-reps" | "read-a-result" | "trace-a-fact" | "share-a-story" | "first-time-voter";

export interface Quest { id: QuestId; title: string; why: string; start: { label: string; href: string } }

export const QUESTS: Quest[] = [
  { id: "know-your-reps", title: "Know who represents you", why: "Your MP and your MLA do different jobs. Find both from your PIN code.", start: { label: "Find my area", href: "/my-area" } },
  { id: "read-a-result", title: "Read one result", why: "See who won your seat, by how much, and who came second.", start: { label: "Find a seat", href: "/seats" } },
  { id: "trace-a-fact", title: "Trace one fact to its source", why: "Open an official document behind a number on this site and check it yourself.", start: { label: "Open a seat's sources", href: "/seats/rajasthan/jaipur#source-heading" } },
  { id: "share-a-story", title: "Share one story", why: "Send a seat's story to a friend, so they look up theirs.", start: { label: "Pick a story", href: "/share/seat/lok-sabha-2024/rajasthan/jaipur" } },
  { id: "first-time-voter", title: "Get ready to vote", why: "Three steps for first-time voters, from enrolling to polling day.", start: { label: "Read the guide", href: "/share/first-time-voter" } },
];

export type QuestProgress = Partial<Record<QuestId, { at: string; detail?: string }>>;

export const STORAGE_KEY = "vb-quests-v1";
export const QUEST_EVENT = "vb-quests";

const isQuest = (id: string): id is QuestId => QUESTS.some((quest) => quest.id === id);

export function parseProgress(raw: string | null): QuestProgress {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const progress: QuestProgress = {};
    for (const [id, entry] of Object.entries(value ?? {})) {
      const item = entry as { at?: unknown; detail?: unknown };
      if (isQuest(id) && typeof item?.at === "string") progress[id] = { at: item.at, ...(typeof item.detail === "string" ? { detail: item.detail } : {}) };
    }
    return progress;
  } catch {
    return {};
  }
}

// Completing a quest again keeps the first date but updates the detail (for example, the voter's seat).
export function complete(progress: QuestProgress, id: QuestId, detail: string | undefined, now: Date): QuestProgress {
  const previous = progress[id];
  return { ...progress, [id]: { at: previous?.at ?? now.toISOString(), ...(detail ?? previous?.detail ? { detail: detail ?? previous?.detail } : {}) } };
}

export const doneCount = (progress: QuestProgress) => QUESTS.filter((quest) => progress[quest.id]).length;

// Official sources whose documents count for "trace one fact".
const OFFICIAL = ["eci.gov.in", "results.eci.gov.in", "sansad.in", "election.rajasthan.gov.in", "pib.gov.in", "static.pib.gov.in", "electoralsearch.eci.gov.in", "voters.eci.gov.in", "legislative.gov.in"];
export function isOfficialSource(href: string) {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return OFFICIAL.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

// Browser storage can be blocked or full; quests then simply do not save.
export function loadProgress(): QuestProgress {
  try { return parseProgress(window.localStorage.getItem(STORAGE_KEY)); } catch { return {}; }
}

export function markQuest(id: QuestId, detail?: string) {
  try {
    const next = complete(loadProgress(), id, detail, new Date());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(QUEST_EVENT));
  } catch {
    // Storage unavailable: nothing to do.
  }
}
