// A short label for a source, from where it is published.
export function sourceLabel(url: string, title = "") {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.endsWith("sansad.in")) return /question/i.test(title) ? "Lok Sabha" : "Sansad";
  if (host.endsWith("myneta.info")) return "MyNeta";
  if (host === "affidavit.eci.gov.in" || /affidavit/i.test(title)) return "Affidavit";
  if (host.endsWith("eci.gov.in")) return "ECI";
  if (host === "election.rajasthan.gov.in") return "Rajasthan CEO";
  if (host.endsWith("prsindia.org")) return "PRS";
  const parts = host.split(".").filter((part) => !["gov", "nic", "co", "org", "ac", "in", "com"].includes(part));
  const name = parts.at(-1) ?? host;
  return name.length <= 4 ? name.toUpperCase() : name[0].toUpperCase() + name.slice(1);
}
