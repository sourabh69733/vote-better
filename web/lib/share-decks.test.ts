import assert from "node:assert/strict";
import test from "node:test";

import { imagePath, quizOptions, resolveDeck, type Deck } from "./share/decks";

const factFrames = (deck: Deck) => deck.frames.filter((frame) => frame.kind !== "cta" && frame.kind !== "quiz");

test("a seat deck tells the result in order, with a source on every fact", () => {
  const deck = resolveDeck(["seat", "lok-sabha-2024", "rajasthan", "jaipur"])!;
  assert.deepEqual(deck.frames.map((frame) => frame.kind), ["cover", "race", "big", "big", "list", "cta"]);
  assert.equal(deck.link, "/seats/rajasthan/jaipur");
  assert.ok(factFrames(deck).every((frame) => frame.source), "every fact frame names its source");
  const margin = deck.frames[2];
  assert.ok(margin.kind === "big" && margin.value === "3,31,767" && margin.detail === "The 5th widest margin of 25 seats in Rajasthan.");
  assert.match(deck.caption.en, /won by 3,31,767 votes/);
  assert.match(deck.caption.hi, /3,31,767 votes se jeet haasil ki/);
  assert.ok(deck.hashtags.includes("#LokSabha2024"));
  assert.equal(imagePath(deck, "story", 0), "/share/image/story/1/seat/lok-sabha-2024/rajasthan/jaipur");
});

test("the quiz offers the true margin between a tenth and ten times it", () => {
  assert.deepEqual(quizOptions(1615), ["160", "1,615", "16,200"]);
  assert.deepEqual(quizOptions(331767), ["33,200", "3,31,767", "33,18,000"]);
  const deck = resolveDeck(["quiz", "lok-sabha-2024", "rajasthan", "jaipur-rural"])!;
  const [question, answer] = deck.frames;
  assert.ok(question.kind === "quiz" && question.options.includes("1,615"));
  assert.ok(answer.kind === "big" && answer.value === "1,615" && answer.detail === "The closest result of 25 seats in Rajasthan.");
});

test("closest fights lists the five smallest margins in the state, closest first", () => {
  const deck = resolveDeck(["closest", "lok-sabha-2024", "rajasthan"])!;
  const list = deck.frames[0];
  assert.ok(list.kind === "list");
  assert.deepEqual(list.rows.map((row) => row.label), ["Jaipur Rural", "Jhunjhunu", "Kota", "Nagaur", "Alwar"]);
  assert.equal(list.rows[0].value, "1,615");
});

test("unusual seats get honest decks: unopposed has no quiz, winner-only cites the winners list", () => {
  const surat = resolveDeck(["seat", "lok-sabha-2024", "gujarat", "surat"])!;
  assert.ok(surat.frames.some((frame) => frame.kind === "big" && frame.unit === "votes cast"));
  assert.equal(resolveDeck(["quiz", "lok-sabha-2024", "gujarat", "surat"]), null);
  const cuttack = resolveDeck(["seat", "lok-sabha-2014", "odisha", "cuttack"])!;
  assert.ok(!cuttack.frames.some((frame) => frame.kind === "race"));
  assert.match(cuttack.frames[0].source!, /list of successful candidates/);
});

test("explainer decks carry their official sources", () => {
  for (const key of ["mp-role", "first-time-voter"]) {
    const deck = resolveDeck([key])!;
    assert.ok(factFrames(deck).every((frame) => frame.source), `${key} frames are sourced`);
  }
  assert.match(resolveDeck(["first-time-voter"])!.caption.en, /voters\.eci\.gov\.in/);
});

test("unknown or malformed deck keys resolve to nothing", () => {
  for (const parts of [["nope"], ["seat", "lok-sabha-1999", "x", "y"], ["seat", "lok-sabha-2024", "rajasthan"], ["seat", "lok-sabha-2024", "rajasthan", "jaipur", "extra"], ["closest", "lok-sabha-2024", "nowhere"], ["mp-role", "x"]]) {
    assert.equal(resolveDeck(parts), null, parts.join("/"));
  }
});
