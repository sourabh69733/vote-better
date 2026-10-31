import pg from "pg";

import { slugify } from "../normalize/eci-ge2024-detailed-result.js";

// Turns published result facts into the entity graph: election -> contest (one per seat) -> candidacy -> person.
// Seats are matched across elections by state and seat name only. That is safe for Lok Sabha seats from
// 2009 to 2024, which share one delimitation; seats that do not match are reported, never merged by guess.

export type ElectionBody = "lok-sabha" | "assembly" | "bye-election";
export interface CalendarElection { id: string; name: string; body: ElectionBody }
export interface ResultSource { electionId: string; url: string }

export interface LinkSummary {
  elections: number;
  seats: number;
  byElection: { electionId: string; contests: number; candidacies: number }[];
  // Seats in an older election with no seat of the same state and name in the newest one.
  unmatched: { electionId: string; seat: string }[];
}

const AUTHORITY = "Election Commission of India";

// Older ECI files add the reservation to the name, as in "Gaya (SC)". The reservation is kept separately.
export const seatName = (constituency: string) => constituency.replace(/\s*\((SC|ST)\)\s*$/i, "").trim();
export const seatKey = (state: string, seat: string) => `lok-sabha-seat/${slugify(state)}/${slugify(seatName(seat))}`;
export const contestKey = (electionId: string, state: string, seat: string) => `${electionId}/${slugify(state)}/${slugify(seatName(seat))}`;

// ECI writes seat names in capitals; keep a readable form for the area row.
const readable = (value: string) => value.toLowerCase().replace(/(^|[\s.(\-'/])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());

export async function linkElections(pool: pg.Pool, calendar: readonly CalendarElection[], results: readonly ResultSource[]): Promise<LinkSummary> {
  const ids = new Set<string>();
  for (const election of calendar) {
    if (!/^[a-z0-9-]+$/.test(election.id) || !election.name.trim()) throw new Error(`invalid calendar election ${election.id}`);
    if (ids.has(election.id)) throw new Error(`duplicate calendar election ${election.id}`);
    ids.add(election.id);
  }
  for (const result of results) {
    if (!ids.has(result.electionId)) throw new Error(`results for ${result.electionId} have no calendar record`);
    if (calendar.find((election) => election.id === result.electionId)!.body !== "lok-sabha") throw new Error(`${result.electionId}: only Lok Sabha results can be linked so far`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO election (stable_key, name, body, authority)
      SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
      ON CONFLICT (stable_key) DO UPDATE SET name = EXCLUDED.name, body = EXCLUDED.body, authority = EXCLUDED.authority
    `, [calendar.map((e) => e.id), calendar.map((e) => e.name), calendar.map((e) => e.body), calendar.map(() => AUTHORITY)]);

    const byElection: LinkSummary["byElection"] = [];
    const seatsOf = new Map<string, Set<string>>();
    for (const { electionId, url } of results) {
      const rows = (await client.query<{ entity_id: string; state: string; constituency: string }>(`
        SELECT DISTINCT ON (af.entity_id) af.entity_id, af.value->>'state' AS state, af.value->>'constituency' AS constituency
        FROM approved_fact af
        JOIN fact_observation fo ON fo.fact_id = af.id
        JOIN observation o ON o.id = fo.observation_id
        JOIN snapshot s ON s.id = o.snapshot_id
        WHERE af.predicate = 'candidate.result' AND s.url = $1
        ORDER BY af.entity_id, af.published_at DESC, af.recorded_at DESC
      `, [url])).rows;
      const seats = new Map<string, { state: string; name: string }>();
      for (const row of rows) seats.set(seatKey(row.state, row.constituency), { state: row.state, name: readable(seatName(row.constituency)) });
      seatsOf.set(electionId, new Set(seats.keys()));
      const seatList = [...seats];
      await client.query(`
        INSERT INTO area (stable_key, name, kind, state)
        SELECT key, name, 'lok-sabha-seat', state FROM unnest($1::text[], $2::text[], $3::text[]) AS input(key, name, state)
        ON CONFLICT (stable_key) DO NOTHING
      `, [seatList.map(([key]) => key), seatList.map(([, seat]) => seat.name), seatList.map(([, seat]) => seat.state)]);
      const contests = await client.query(`
        INSERT INTO contest (election_id, area_id, stable_key)
        SELECT e.id, a.id, input.contest_key
        FROM unnest($2::text[], $3::text[]) AS input(area_key, contest_key)
        JOIN election e ON e.stable_key = $1
        JOIN area a ON a.stable_key = input.area_key
        ON CONFLICT (stable_key) DO NOTHING
      `, [electionId, seatList.map(([key]) => key), seatList.map(([key]) => `${electionId}/${key.split("/").slice(1).join("/")}`)]);
      const candidacies = await client.query(`
        INSERT INTO candidacy (contest_id, person_id)
        SELECT c.id, input.person_id
        FROM unnest($1::uuid[], $2::text[]) AS input(person_id, contest_key)
        JOIN contest c ON c.stable_key = input.contest_key
        ON CONFLICT (contest_id, person_id) DO NOTHING
      `, [rows.map((row) => row.entity_id), rows.map((row) => contestKey(electionId, row.state, row.constituency))]);
      byElection.push({ electionId, contests: contests.rowCount ?? 0, candidacies: candidacies.rowCount ?? 0 });
    }
    await client.query("COMMIT");

    const newest = results[0] ? seatsOf.get(results[0].electionId)! : new Set<string>();
    const unmatched = results.slice(1).flatMap(({ electionId }) => [...seatsOf.get(electionId)!]
      .filter((key) => !newest.has(key)).map((key) => ({ electionId, seat: key.replace("lok-sabha-seat/", "") })));
    const allSeats = new Set([...seatsOf.values()].flatMap((set) => [...set]));
    return { elections: calendar.length, seats: allSeats.size, byElection, unmatched };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
