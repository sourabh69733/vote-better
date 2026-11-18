// Pages of ECI's candidate portal that lead to a Form 26 affidavit, and finding the affidavit's
// abstract (Part B) in its OCR text. The affidavits are scans, in English or Hindi.
//
// OCR locates the page only. On 13 Jaipur 2024 filings, figures read by Tesseract from the abstract's
// table matched the hand-checked totals in none of 10 cases, with false zeros and false case counts,
// so nothing is read from the scan as a value: a person reads the figures from the page.

export const AFFIDAVIT_VERSION = "eci-affidavit-v1";

export interface PortalProfile {
  name: string;
  party: string;
  age: number | null;
  gender: string | null;
  // The portal's own number for this affidavit; the encrypted links around it change on every request.
  affidavitId: number;
  downloadToken: string;
}

const decode = (value: string) => value
  .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();

// The name and party cells repeat in Hindi after the English; only the English is kept.
const latinPart = (value: string) => value.replace(/[ऀ-ॿ].*$/, "").trim();

// Reads only the typed fields needed here; the page also shows a home address and a relative's name.
export function parsePortalProfile(html: string): PortalProfile {
  const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " "));
  const token = html.match(/value="([^"]+)"\s+id="pdfUrl(\d+)"/);
  const [, party, name] = text.match(/Party Name:\s*(.+?)\s*Name:\s*(.+?)\s*(?:Parliament|Assembly) [Cc]onstituency:/) ?? [];
  if (!token || !name || !party) throw new Error("profile page has no name, party or affidavit link; the portal layout may have changed");
  const age = text.match(/\bAge:\s*(\d{1,3})\b/)?.[1];
  return {
    name: latinPart(name), party: latinPart(party), age: age ? Number(age) : null,
    gender: text.match(/\bGender:\s*([a-z]+)/i)?.[1]?.toLowerCase() ?? null,
    affidavitId: Number(token[2]), downloadToken: token[1],
  };
}

export interface ContestingProfile { ballot: number; name: string; profileUrl: string }

// The contesting list, numbered in ballot order, with each candidate's profile link.
export function parseContestingProfiles(html: string): ContestingProfile[] {
  return html.split(/<tr>/).flatMap((row) => {
    const heading = row.match(/<h4 class="[^"]*">\s*(\d+)\.\s*([^<]+)<\/h4>/);
    const link = row.match(/href="(https:\/\/affidavit\.eci\.gov\.in\/show-profile\/[^"]+)"/);
    return heading && link ? [{ ballot: Number(heading[1]), name: decode(heading[2]), profileUrl: link[1] }] : [];
  });
}

// Spellings of the abstract's heading seen in filings, including one filer's "ABTRACT".
const ABSTRACT = /सारांश|ab?s?tract\s+of\s+the\s+details/i;
// When the heading is unreadable, the abstract's asset table is the only page with both of these rows.
const MOVABLE_ROW = /जंगम|(?<![il]m)movab/i;
const INHERITED_ROW = /विरासती|inherited\s+assets/i;

// The page to start reading from, given each page's OCR text in order. Null when neither sign is found.
// A table found without its heading starts one page early: the criminal cases rows come before it.
export function abstractPage(pages: readonly string[]): number | null {
  const heading = pages.findIndex((text) => ABSTRACT.test(text));
  if (heading >= 0) return heading + 1;
  const table = pages.findIndex((text) => MOVABLE_ROW.test(text) && INHERITED_ROW.test(text));
  return table >= 0 ? Math.max(table, 1) : null;
}
