import type { ObservationDraft } from "../../store.js";

function decode(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&#039;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

export function cellText(html: string): string {
  return decode(html.replace(/<br\s*\/?\s*>/gi, " | ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function sourceTableRows(html: string, requiredHeaders: readonly string[]): string[][] {
  const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? [];
  const selected = tables.filter((candidate) => requiredHeaders.every((header) => candidate.toLowerCase().includes(header.toLowerCase())));
  if (!selected.length) throw new Error("official directory layout changed");
  const rows = selected.flatMap((table) => [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) =>
    [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1])));
  if (!rows.some((row) => row.length > 2)) throw new Error("official directory layout has no rows");
  return rows;
}

export function observation(locator: string, rawValue: string, value: Record<string, string>, normalizedAt: string, version: string): ObservationDraft {
  return { locator, predicate: "appointment.holder", rawValue, normalizedValue: value, normalizedAt, normalizerVersion: version };
}
