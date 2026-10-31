// ECI's archive (old.eci.gov.in) serves each report through three pages: a disclaimer
// to accept, a list of the file's formats, then the file after a short countdown.
// The fetcher accepts only disclaimers the project owner approved word for word on
// 2026-10-25, and stops if ECI shows any other text.
export const APPROVED_DISCLAIMERS = [
  "This report is based on Index Cards data made available by concerned Returning Officers on the basis of Statutory data maintained in the forms. In case of any dispute, the data maintained in the Statutory Forms by the concerned Returning Officers shall prevail.",
  "These reports are developed on the basis of information provided by Chief Electoral Officers of States and UTs.",
];

export function disclaimerText(html: string): string | null {
  const match = /you must agree to the following terms:([\s\S]*?)Agree &amp; Download/i.exec(html);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/Cancel\s*$/i, "").replace(/^\s*Disclaimer\s*:-\s*/i, "").trim();
}

export const OLD_ECI_HOST = "https://old.eci.gov.in";

type Fetch = typeof fetch;

function cookieJar() {
  const cookies = new Map<string, string>();
  return {
    store(response: Response) {
      for (const line of response.headers.getSetCookie?.() ?? []) {
        const [pair] = line.split(";");
        const [name, ...value] = pair.split("=");
        if (name) cookies.set(name.trim(), value.join("=").trim());
      }
    },
    header: () => [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  };
}

const unescape = (value: string) => value.replace(/&amp;/g, "&");

// Returns a fetcher for collectDocument: given a report's file page, it responds with the spreadsheet itself.
export function oldEciFetcher(options: { request?: Fetch; countdownMs?: number; extension: RegExp } = { extension: /\.xlsx?$/i }): Fetch {
  const request = options.request ?? fetch;
  const countdownMs = options.countdownMs ?? 11_000;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const page = String(input);
    if (!page.startsWith(`${OLD_ECI_HOST}/files/file/`)) throw new Error("not an ECI archive file page");
    const jar = cookieJar();
    const get = async (url: string) => {
      const response = await request(url, { ...init, headers: { "User-Agent": "VoteBetter/1.0 (civic data; contact via project repository)", Cookie: jar.header(), Referer: page } });
      jar.store(response);
      return response;
    };
    const disclaimer = await (await get(`${page}?do=download`)).text();
    const key = /confirm=1&amp;csrfKey=([0-9a-f]+)/.exec(disclaimer)?.[1];
    const terms = disclaimerText(disclaimer);
    if (!key || !terms || !APPROVED_DISCLAIMERS.includes(terms)) throw new Error(`unapproved terms, not accepted: ${terms ?? "none found"}`);
    const list = await (await get(`${page}?do=download&confirm=1&csrfKey=${key}`)).text();
    const files = [...list.matchAll(/ipsType_break ipsContained'>([^<]+)<[\s\S]*?(do=download&amp;r=\d+&amp;confirm=1&amp;t=1&amp;csrfKey=[0-9a-f]+)/g)];
    const wanted = files.find(([, name]) => options.extension.test(name.trim()));
    if (!wanted) throw new Error(`no matching file among: ${files.map(([, name]) => name.trim()).join(", ") || "none"}`);
    await new Promise((done) => setTimeout(done, countdownMs));
    return get(`${page}?${unescape(wanted[2])}`);
  }) as Fetch;
}
