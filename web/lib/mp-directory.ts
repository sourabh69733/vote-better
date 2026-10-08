const PAGE_SIZE = 24;

export function paginateMpResults<T>(items: readonly T[], requestedPage?: string) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const parsed = requestedPage && /^\d+$/.test(requestedPage) ? Number(requestedPage) : 1;
  const page = Math.min(Math.max(Number.isSafeInteger(parsed) ? parsed : 1, 1), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), page, pageCount,
    first: items.length ? start + 1 : 0, last: Math.min(start + PAGE_SIZE, items.length) };
}
