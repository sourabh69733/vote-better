// Share decks: short sequences of frames built from published facts, for Instagram stories,
// carousels and reels. Every template runs the same way for every seat and party, and every
// frame carries its source. No photos, no predictions, no opinion about anyone.

import { findSeat, isResultElection, loadResults, marginsInState, ordinal, seatHistory, seatWinner, turnout, yearOf, type LokSabhaResults, type ResultElectionId, type ResultSeat } from "../lok-sabha";
import { formatNumber, formatShort } from "../lok-sabha-2024";
import { partyColor } from "../party-colors";

export type Format = "story" | "post";
export const FORMATS: Record<Format, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: "Story and reel, 9:16" },
  post: { width: 1080, height: 1350, label: "Carousel post, 4:5" },
};

export type Frame = { source?: string } & (
  | { kind: "cover"; kicker: string; title: string; subtitle: string }
  | { kind: "race"; kicker: string; title: string; rows: { name: string; party: string; color: string; share: number; votes: string }[]; others?: string }
  | { kind: "big"; kicker: string; value: string; unit: string; line: string; detail?: string; highlight?: boolean }
  | { kind: "list"; kicker: string; title: string; note?: string; rows: { label: string; detail: string; value: string; width: number; color: string }[] }
  | { kind: "quiz"; kicker: string; question: string; options: string[]; hint: string }
  | { kind: "points"; kicker: string; title: string; points: { title: string; text: string }[] }
  | { kind: "cta"; kicker: string; title: string; text: string }
);

export interface Deck {
  key: string;
  template: "seat" | "quiz" | "closest" | "mp-role" | "first-time-voter";
  title: string;
  // The page on this site the deck comes from; every frame and caption points there.
  link: string;
  frames: Frame[];
  caption: { en: string; hi: string };
  hashtags: string[];
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const tag = (value: string) => `#${value.replace(/[^A-Za-z0-9]/g, "")}`;

function resultSource(results: LokSabhaResults, seat?: ResultSeat) {
  const year = yearOf(results.election.id);
  const file = seat?.winnerOnly ? "list of successful candidates" : "statistical report";
  return `Election Commission of India, ${year} ${file} · checked ${day(results.publishedAt)}`;
}

function rankLine(results: LokSabhaResults, seat: ResultSeat) {
  const margins = marginsInState(results, seat.stateSlug);
  const rank = margins.findIndex((row) => row.seat.slug === seat.slug) + 1;
  const total = margins.length;
  if (!rank || total < 2) return undefined;
  if (rank === 1) return `The widest margin of ${total} seats in ${seat.state}.`;
  if (rank === total) return `The closest result of ${total} seats in ${seat.state}.`;
  return rank <= total / 2
    ? `The ${ordinal(rank)} widest margin of ${total} seats in ${seat.state}.`
    : `The ${ordinal(total - rank + 1)} closest result of ${total} seats in ${seat.state}.`;
}

function stateTurnout(results: LokSabhaResults, stateSlug: string) {
  let electors = 0, polled = 0;
  for (const seat of results.seats) if (seat.stateSlug === stateSlug && seat.electors && seat.votesPolled !== null) { electors += seat.electors; polled += seat.votesPolled; }
  return electors ? (polled / electors) * 100 : null;
}

const pagePath = (id: ResultElectionId, seat: ResultSeat) => id === "lok-sabha-2024" ? `/seats/${seat.stateSlug}/${seat.slug}` : `/elections/${id}/${seat.stateSlug}/${seat.slug}`;

const cta = (title: string, text: string): Frame => ({ kind: "cta", kicker: "CHECK IT YOURSELF", title, text });

function seatDeck(id: ResultElectionId, stateSlug: string, seatSlug: string): Deck | null {
  const results = loadResults(id);
  const seat = findSeat(id, stateSlug, seatSlug);
  const winner = seat && seatWinner(seat);
  if (!results || !seat || !winner) return null;
  const year = yearOf(id);
  const party = (code: string) => results.parties[code]?.name ?? code;
  const source = resultSource(results, seat);
  const kicker = `LOK SABHA ${year} · ${seat.state.toUpperCase()}`;
  const frames: Frame[] = [{ kind: "cover", kicker, title: seat.name, subtitle: "Your seat in 60 seconds", source }];

  if (winner.how === "contested" && seat.candidates.length > 1) {
    const top = seat.candidates.slice(0, 2);
    const rest = seat.candidates.length - 2;
    const restShare = Math.max(100 - top.reduce((sum, c) => sum + c.shareOfValidVotes, 0), 0);
    frames.push({
      kind: "race", kicker, title: "Who won", source,
      rows: top.map((c) => ({ name: c.name, party: `${c.party} · ${party(c.party)}`, color: partyColor(c.party), share: c.shareOfValidVotes, votes: `${formatShort(c.votes)} votes` })),
      ...(rest > 0 ? { others: `${rest} other${rest === 1 ? "" : "s"} and NOTA · ${restShare.toFixed(1)}% together` } : {}),
    });
  } else if (winner.how === "unopposed") {
    frames.push({ kind: "big", kicker, value: "0", unit: "votes cast", line: `${winner.name} (${winner.party}) was elected unopposed.`, detail: "Every other nomination was rejected or withdrawn.", source });
  }

  if (winner.margin !== null) {
    const runnerUp = seat.candidates[1];
    frames.push({
      kind: "big", kicker, value: formatNumber(winner.margin), unit: "votes", highlight: true, source,
      line: runnerUp ? `between ${winner.name} (${winner.party}) and ${runnerUp.name} (${runnerUp.party})` : `${winner.name} (${winner.party}) won by this margin`,
      ...(rankLine(results, seat) ? { detail: rankLine(results, seat) } : {}),
    });
  }

  const share = turnout(seat);
  if (share !== null && seat.electors && seat.votesPolled !== null) {
    const state = stateTurnout(results, seat.stateSlug);
    frames.push({
      kind: "big", kicker, value: `${share.toFixed(1)}%`, unit: "turnout", source,
      line: `${formatShort(seat.votesPolled)} of ${formatShort(seat.electors)} registered voters voted`,
      ...(state !== null ? { detail: `${state.toFixed(1)}% across ${seat.state}.` } : {}),
    });
  }

  const history = seatHistory(seat.stateSlug, seat.slug);
  if (history.length > 1) {
    const max = Math.max(...history.map((h) => h.winner.margin ?? 0), 1);
    frames.push({
      kind: "list", kicker: `${seat.name.toUpperCase()} · LOK SABHA`, title: "Over the years", note: "Winner and winning margin in votes",
      source: "Election Commission of India statistical reports",
      rows: history.map((h) => ({
        label: String(h.year), detail: `${h.winner.name} · ${h.winner.party}`,
        value: h.winner.margin === null ? "unopposed" : formatShort(h.winner.margin), width: ((h.winner.margin ?? 0) / max) * 100, color: partyColor(h.winner.party),
      })),
    });
  }
  frames.push(cta("How close was your seat?", "Every Lok Sabha seat, every candidate and every number, from the Election Commission of India."));

  const rank = rankLine(results, seat);
  const marginText = winner.margin === null ? "" : ` by ${formatNumber(winner.margin)} votes`;
  return {
    key: `seat/${id}/${seat.stateSlug}/${seat.slug}`, template: "seat", title: `${seat.name}, Lok Sabha ${year}`, link: pagePath(id, seat), frames,
    caption: {
      en: `${seat.name}, Lok Sabha ${year}: ${winner.name} (${winner.party}) won${winner.how === "unopposed" ? " unopposed" : marginText}.${rank ? ` ${rank}` : ""}${share !== null ? ` Turnout was ${share.toFixed(1)}%.` : ""} How close was your seat? Check it yourself on Vote Better. Every number is from the Election Commission of India.`,
      hi: `${seat.name}, Lok Sabha ${year}: ${winner.name} (${winner.party}) ne${winner.margin === null ? " bina muqable ke" : ` ${formatNumber(winner.margin)} votes se`} jeet haasil ki.${share !== null ? ` Turnout ${share.toFixed(1)}% raha.` : ""} Aapki seat kitni close thi? Vote Better par khud check karo. Saare numbers Election Commission of India se.`,
    },
    hashtags: ["#VoteBetter", `#LokSabha${year}`, tag(seat.state), tag(seat.name)],
  };
}

function roundTo(value: number) {
  const step = value >= 100_000 ? 1000 : value >= 10_000 ? 100 : 10;
  return Math.max(Math.round(value / step) * step, step);
}

export function quizOptions(margin: number) {
  return [...new Set([roundTo(margin / 10), margin, roundTo(margin * 10)])].sort((a, b) => a - b).map(formatNumber);
}

function quizDeck(id: ResultElectionId, stateSlug: string, seatSlug: string): Deck | null {
  const results = loadResults(id);
  const seat = findSeat(id, stateSlug, seatSlug);
  const winner = seat && seatWinner(seat);
  const runnerUp = seat?.candidates[1];
  if (!results || !seat || !winner || winner.how !== "contested" || winner.margin === null || !runnerUp) return null;
  const year = yearOf(id);
  const source = resultSource(results, seat);
  const rank = rankLine(results, seat);
  return {
    key: `quiz/${id}/${seat.stateSlug}/${seat.slug}`, template: "quiz", title: `Guess the margin: ${seat.name}, ${year}`, link: pagePath(id, seat),
    frames: [
      { kind: "quiz", kicker: "GUESS THE MARGIN", question: `${seat.name}, ${seat.state}. Lok Sabha ${year}. How many votes decided it?`, options: quizOptions(winner.margin), hint: "Answer on the next slide" },
      { kind: "big", kicker: "THE ANSWER", value: formatNumber(winner.margin), unit: "votes", highlight: true, source,
        line: `${winner.name} (${winner.party}) beat ${runnerUp.name} (${runnerUp.party})`, ...(rank ? { detail: rank } : {}) },
      cta("Guess your own seat", "Find any Lok Sabha seat and see how close it was."),
    ],
    caption: {
      en: `Guess the margin: how many votes decided ${seat.name} in ${year}? Answer on the next slide. Then find your own seat on Vote Better. Source: Election Commission of India.`,
      hi: `Guess karo: ${year} mein ${seat.name} kitne votes se decide hua? Answer agli slide mein. Phir apni seat Vote Better par dekho. Source: Election Commission of India.`,
    },
    hashtags: ["#VoteBetter", "#GuessTheMargin", `#LokSabha${year}`, tag(seat.state)],
  };
}

function closestDeck(id: ResultElectionId, stateSlug: string): Deck | null {
  const results = loadResults(id);
  if (!results) return null;
  const margins = marginsInState(results, stateSlug).reverse();
  if (margins.length < 3) return null;
  const top = margins.slice(0, 5);
  const state = top[0].seat.state;
  const year = yearOf(id);
  const max = top.at(-1)!.margin;
  return {
    key: `closest/${id}/${stateSlug}`, template: "closest", title: `Closest fights in ${state}, ${year}`, link: `/elections/${id}`,
    frames: [
      { kind: "list", kicker: `${state.toUpperCase()} · LOK SABHA ${year}`, title: `The ${top.length} closest fights`, note: "Winning margin in votes", source: resultSource(results),
        rows: top.map(({ seat, margin }) => {
          const winner = seatWinner(seat)!;
          return { label: seat.name, detail: `${winner.name} · ${winner.party}`, value: formatNumber(margin), width: Math.max((margin / max) * 100, 2), color: partyColor(winner.party) };
        }) },
      cta("What about your seat?", `All ${margins.length} ${state} seats, every candidate and every number, from the Election Commission of India.`),
    ],
    caption: {
      en: `The ${top.length} closest Lok Sabha fights in ${state}, ${year}. ${top[0].seat.name} was decided by just ${formatNumber(top[0].margin)} votes. How close was yours? Check it on Vote Better. Source: Election Commission of India.`,
      hi: `${state} ki ${top.length} sabse kareebi takkar, Lok Sabha ${year}. ${top[0].seat.name} sirf ${formatNumber(top[0].margin)} votes se decide hua. Aapki seat kitni close thi? Vote Better par dekho. Source: Election Commission of India.`,
    },
    hashtags: ["#VoteBetter", `#LokSabha${year}`, tag(state), "#EveryVoteCounts"],
  };
}

const MP_SOURCE = "Constitution of India, Articles 75, 107 and 113 · MPLADS guidelines, Ministry of Statistics";

function mpRoleDeck(): Deck {
  return {
    key: "mp-role", template: "mp-role", title: "What does an MP actually do?", link: "/constitution",
    frames: [
      { kind: "cover", kicker: "EXPLAINED", title: "What does an MP actually do?", subtitle: "Four jobs, from the Constitution", source: MP_SOURCE },
      { kind: "points", kicker: "THE JOB · 1 OF 2", title: "In Parliament", source: MP_SOURCE, points: [
        { title: "Makes Union laws", text: "A bill becomes law only after both Houses of Parliament pass it. (Article 107)" },
        { title: "Keeps the government in check", text: "The council of ministers answers to the Lok Sabha. MPs question ministers in the House. (Article 75)" },
      ] },
      { kind: "points", kicker: "THE JOB · 2 OF 2", title: "Money", source: MP_SOURCE, points: [
        { title: "Votes on spending", text: "The Lok Sabha votes on the government's demands for grants. (Article 113)" },
        { title: "Recommends local works", text: "Each MP can recommend development works in their area under the MPLADS scheme." },
      ] },
      cta("See what your MP did", "Find your seat, your MP and their questions in Parliament."),
    ],
    caption: {
      en: "What does an MP actually do? Four jobs, straight from the Constitution. Then see what your own MP did on Vote Better.",
      hi: "MP actually karte kya hain? Constitution ke hisaab se chaar kaam. Phir apne MP ka kaam Vote Better par dekho.",
    },
    hashtags: ["#VoteBetter", "#KnowYourMP", "#Constitution"],
  };
}

const VOTER_SOURCE = "Election Commission of India · CEO Delhi press release, 1 Aug 2022";

function firstTimeVoterDeck(): Deck {
  return {
    key: "first-time-voter", template: "first-time-voter", title: "Voting for the first time?", link: "/elections",
    frames: [
      { kind: "cover", kicker: "FIRST-TIME VOTER", title: "Voting for the first time?", subtitle: "Three things to do before poll day", source: VOTER_SOURCE },
      { kind: "points", kicker: "STEP 1 AND 2", title: "Get on the roll", source: VOTER_SOURCE, points: [
        { title: "Turning 18?", text: "You can enrol once you turn 18 on 1 January, 1 April, 1 July or 1 October. You can apply in advance." },
        { title: "Register", text: "Fill Form 6 on voters.eci.gov.in or in the Voter Helpline app." },
      ] },
      { kind: "points", kicker: "STEP 3", title: "Before you go", source: VOTER_SOURCE, points: [
        { title: "Check your name", text: "Search the electoral roll at electoralsearch.eci.gov.in." },
        { title: "On poll day", text: "Carry your voter ID card (EPIC), or another photo ID that ECI allows for that election." },
      ] },
      cta("Know who is on your ballot", "See every election coming up and every candidate in your seat."),
    ],
    caption: {
      en: "Voting for the first time? Turn 18 on 1 Jan, 1 Apr, 1 Jul or 1 Oct and you can enrol. Register with Form 6 on voters.eci.gov.in, check your name at electoralsearch.eci.gov.in, and see who is on your ballot on Vote Better.",
      hi: "Pehli baar vote? 1 Jan, 1 Apr, 1 Jul ya 1 Oct ko 18 ke ho rahe ho toh enrol kar sakte ho. voters.eci.gov.in par Form 6 bharo, electoralsearch.eci.gov.in par apna naam check karo, aur Vote Better par dekho ki ballot par kaun hai.",
    },
    hashtags: ["#VoteBetter", "#FirstTimeVoter", "#MyVoteMyRight"],
  };
}

// Deck keys are path segments: seat/<election>/<state>/<seat>, quiz/<election>/<state>/<seat>,
// closest/<election>/<state>, mp-role, first-time-voter.
export function resolveDeck(parts: readonly string[]): Deck | null {
  const [template, id, state, seat, ...rest] = parts;
  if (rest.length) return null;
  if (template === "mp-role" && !id) return mpRoleDeck();
  if (template === "first-time-voter" && !id) return firstTimeVoterDeck();
  if (!id || !isResultElection(id) || !state) return null;
  if (template === "seat" && seat) return seatDeck(id, state, seat);
  if (template === "quiz" && seat) return quizDeck(id, state, seat);
  if (template === "closest" && !seat) return closestDeck(id, state);
  return null;
}

export const isFormat = (value: string): value is Format => value === "story" || value === "post";
export const imagePath = (deck: Pick<Deck, "key">, format: Format, index: number) => `/share/image/${format}/${index + 1}/${deck.key}`;
