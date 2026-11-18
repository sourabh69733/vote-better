export function formatTermDuration(startedOn: string, through: string): string {
  const [startYear, startMonth, startDay] = startedOn.split("-").map(Number);
  const [endYear, endMonth, endDay] = through.split("-").map(Number);
  const months = Math.max(0, (endYear - startYear) * 12 + endMonth - startMonth - Number(endDay < startDay));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts = [
    ...(years ? [`${years} ${years === 1 ? "year" : "years"}`] : []),
    ...(remainingMonths ? [`${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`] : []),
  ];
  return parts.join(", ") || "Less than a month";
}
