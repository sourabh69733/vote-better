// Colours commonly used for parties in Indian election coverage. They identify
// a party at a glance; they are not party branding. Unknown parties are grey.
const byCode: Record<string, string> = {
  BJP: "#f2780c", INC: "#1c9ad6", SP: "#d7261e", AITC: "#1f9d55", DMK: "#c1121f", TDP: "#e0b400",
  "JD(U)": "#0e7c3a", SHSUBT: "#e4572e", NCPSP: "#0f8b8d", SHS: "#f08a24", LJPRV: "#6d3fa0",
  YSRCP: "#1565c0", RJD: "#2e7d32", "CPI(M)": "#b71c1c", JMM: "#1b5e20", IUML: "#00695c",
  AAAP: "#0277bd", JnP: "#c62828", "CPI(ML)(L)": "#8e1b1b", JKN: "#b23a48", "JD(S)": "#388e3c",
  VCK: "#283593", CPI: "#d32f2f", RLD: "#43a047", BSP: "#1e3a8a", NCP: "#00838f", AIMIM: "#2e7d32",
};

const nameToCode: [RegExp, string][] = [
  [/bharatiya janata/i, "BJP"], [/indian national congress/i, "INC"], [/samajwadi/i, "SP"],
  [/trinamool/i, "AITC"], [/dravida munnetra kazhagam$/i, "DMK"], [/telugu desam/i, "TDP"],
  [/janata dal \(united\)/i, "JD(U)"], [/uddhav/i, "SHSUBT"], [/sharadchandra/i, "NCPSP"], [/^shiv sena$/i, "SHS"],
  [/ram vilas/i, "LJPRV"], [/yuvajana sramika/i, "YSRCP"], [/rashtriya janata dal/i, "RJD"],
  [/marxist\)$/i, "CPI(M)"], [/jharkhand mukti/i, "JMM"], [/indian union muslim/i, "IUML"],
  [/aam aadmi/i, "AAAP"], [/bahujan samaj/i, "BSP"], [/communist party of india$/i, "CPI"],
];

export const NEUTRAL = "#7d8a80";

export function partyColor(codeOrName: string | undefined | null) {
  if (!codeOrName) return NEUTRAL;
  if (byCode[codeOrName]) return byCode[codeOrName];
  const match = nameToCode.find(([pattern]) => pattern.test(codeOrName));
  return match ? byCode[match[1]] : NEUTRAL;
}
