const PAGE_SIZE = 24;

export function paginateMpResults<T>(items: readonly T[], requestedPage?: string) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const parsed = requestedPage && /^\d+$/.test(requestedPage) ? Number(requestedPage) : 1;
  const page = Math.min(Math.max(Number.isSafeInteger(parsed) ? parsed : 1, 1), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), page, pageCount,
    first: items.length ? start + 1 : 0, last: Math.min(start + PAGE_SIZE, items.length) };
}

// Honorifics seen in Sansad names. "Md" is kept because it is part of a name.
const honorific = /^(?:(?:advocate|adv|dr|prof|shri|sh|smt|kumari|kum|sushri|ms|mr|mrs|com|chh|capt|col|er|thiru|selvi)\.?\s+)+/i;

export function sortableMpName(name: string) {
  return name.trim().replace(honorific, "");
}

export function sortMpsByName<T extends { name: string }>(items: readonly T[]) {
  return [...items].sort((a, b) => sortableMpName(a.name).localeCompare(sortableMpName(b.name), "en-IN", { sensitivity: "base" }));
}
