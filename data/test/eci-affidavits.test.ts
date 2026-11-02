import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { LocalBlobStore } from "../src/blob-store.js";
import { AFFIDAVIT_SEATS, collectSeatAffidavits, writeWorklist } from "../src/eci-affidavits.js";
import { abstractPage, parseContestingProfiles, parsePortalProfile } from "../src/normalize/eci-affidavit.js";
import { CivicStore } from "../src/store.js";
import { createTestPool, prepareTestDatabase } from "./db.js";

const pool = createTestPool();
before(async () => { await prepareTestDatabase(pool); });
after(async () => { await pool.end(); });

// The portal's markup, cut down to what the parser reads. The people here are invented.
const profile = (id: number, name: string, age = "54") => `<html><script>var x = "Name: not this";</script>
  <p>Party Name: <span>Test Party</span> टेस्ट पार्टी</p>
  <p>Name: ${name} हिंदी नाम</p><p>Parliament Constituency: JAIPUR</p><p>State: Rajasthan</p>
  <input type="hidden" value="TOKEN${id}" id="pdfUrl${id}" name="pdfUrl">
  <p>Father's / Husband's Name: A RELATIVE</p><p>Address: 1 Secret Street, Jaipur</p><p>Gender: male</p><p>Age: ${age}</p></html>`;

const counters = (contesting: number) => ["All", "Accepted", "Rejected", "Withdrawn", "Contesting"]
  .map((label) => `<p><span>${label === "Contesting" ? contesting : 0}</span></p> <h4>${label}</h4>`).join("");

const card = (ballot: number, name: string, id: number) => `<tr><td><a href="https://affidavit.eci.gov.in/show-profile/P${id}" target="_blank"><img></a></td>
  <td><div class="details-name"><h4 class="bg-blu">${ballot}. ${name}</h4>
  <p><strong>Party :</strong> Test Party</p><p><strong>Status :</strong> <strong><font color=#00a65a>Accepted</font></strong></p>
  <p><strong>State :</strong> Rajasthan</p><p><strong>Constituency :</strong> JAIPUR</p>
  <a href="https://affidavit.eci.gov.in/show-profile/P${id}" target="_blank">View more</a><!-- End of row Div --></div></td></tr>`;

test("reads the typed profile fields and nothing personal", () => {
  const read = parsePortalProfile(profile(1245, "TEST CANDIDATE"));
  assert.deepEqual(read, { name: "TEST CANDIDATE", party: "Test Party", age: 54, gender: "male", affidavitId: 1245, downloadToken: "TOKEN1245" });
  assert.doesNotMatch(JSON.stringify(read), /Secret|RELATIVE/);
  assert.throws(() => parsePortalProfile("<html>maintenance</html>"), /layout may have changed/);
});

test("reads the contesting list with one profile link per candidate", () => {
  assert.deepEqual(parseContestingProfiles(card(1, "FIRST", 11) + card(2, "SECOND", 12)), [
    { ballot: 1, name: "FIRST", profileUrl: "https://affidavit.eci.gov.in/show-profile/P11" },
    { ballot: 2, name: "SECOND", profileUrl: "https://affidavit.eci.gov.in/show-profile/P12" },
  ]);
});

test("finds the abstract by its heading in either language, or by its asset table", () => {
  assert.equal(abstractPage(["शपथपत्र", "भाग-क के (1) से (10) तक में दिए गए ब्यौरों का सारांश", "जंगम विरासती"]), 2);
  assert.equal(abstractPage(["FORM 26", "PART—B", "ABTRACT OF THE DETAILS GIVEN IN (1) TO (10)"]), 3);
  assert.equal(abstractPage(["one", "two", "जंगम आस्तियां\n(ख) विरासती आस्तियां"]), 2);
  assert.equal(abstractPage(["Movable Assets\nInherited assets (Total Value)"]), 1);
  // Part A lists immovable property, which must not count as the asset table.
  assert.equal(abstractPage(["Immovable property\nInherited assets"]), null);
  assert.equal(abstractPage(["nothing here"]), null);
});

test("keeps the scan, saves the portal age as a draft and lists the abstract page", async () => {
  const seat = AFFIDAVIT_SEATS[0];
  const directory = await mkdtemp(path.join(tmpdir(), "affidavits-"));
  const blobs = new LocalBlobStore(directory);
  const fetchPage = async (url: string) => {
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/show-profile/P11") return profile(11, "FIRST CANDIDATE");
    if (pathname === "/show-profile/P12") return profile(12, "SECOND CANDIDATE", "");
    if (pathname === "/show-profile/P13") return "<html>maintenance</html>";
    assert.equal(searchParams.get("submitName"), "100");
    return `${counters(3)}${card(1, "FIRST CANDIDATE", 11)}${card(2, "SECOND CANDIDATE", 12)}${card(3, "THIRD CANDIDATE", 13)}`;
  };
  const scan = Buffer.from("%PDF-1.3 test scan");
  const result = await collectSeatAffidavits(new CivicStore(pool), seat, {
    fetchPage, blobs,
    fetcher: async (url) => { assert.match(String(url), /affidavit-pdf-download\/TOKEN1[12]$/); return new Response(scan, { headers: { "content-type": "application/pdf" } }); },
    readPages: async () => ["front page", "ab stract? no", "सारांश"],
  });
  assert.equal(result.drafts, 1);
  assert.deepEqual(result.worklist.map((row) => [row.ballot, row.name, row.pages, row.abstractPage]), [[1, "First Candidate", 3, 3], [2, "Second Candidate", 3, 3]]);
  assert.deepEqual(result.failed.map((row) => row.ballot), [3]);
  assert.deepEqual(await blobs.get(result.worklist[0].blobRef), scan);

  const age = await pool.query(`SELECT raw_value, normalized_value FROM observation WHERE predicate = 'filing.age' AND normalized_value->>'affidavitId' = '11'`);
  assert.equal(age.rows[0].raw_value, "54");
  assert.equal(age.rows[0].normalized_value.party, "Test Party");
  assert.doesNotMatch(JSON.stringify(age.rows[0]), /Secret|RELATIVE/);

  const saved = JSON.parse(await readFile(await writeWorklist(result, seat, directory), "utf8"));
  assert.equal(saved.candidates.length, 2);
  assert.equal(saved.failed.length, 1);
});

test("stops when the candidate list disagrees with the portal's count", async () => {
  const fetchPage = async () => `${counters(2)}${card(1, "ONLY ONE", 11)}`;
  await assert.rejects(collectSeatAffidavits(new CivicStore(pool), AFFIDAVIT_SEATS[0], {
    fetchPage: async (url) => (url.includes("page=") ? `${counters(2)}--------No Data` : fetchPage()), blobs: new LocalBlobStore(await mkdtemp(path.join(tmpdir(), "affidavits-"))),
  }), /read 1 candidates, the portal counts 2/);
});
