// Links Digital Sansad MPs to ECI 2024 seats. Most link automatically by seat
// and name. These lists cover the rest and were reviewed on 2026-10-21.

// Sansad seat name -> ECI seat slug, where the two spell the seat differently.
export const seatAliases: Record<string, string> = {
  "Andaman and Nicobar Islands": "andaman-nicobar-islands",
  Anantapur: "ananthapur",
  Bahraich: "baharaich",
  "Dadra and Nagar Haveli": "dadar-nagar-haveli",
  "Daman and Diu": "daman-diu",
  Hardwar: "haridwar",
  Hatkanangle: "hatkanangale",
  Kurnool: "kurnoolu",
  Narasaraopet: "narsaraopet",
  Pataliputra: "patliputra",
  Tirupati: "thirupathi",
};

// Same person, same seat and party, name spelled differently by the two sources.
export const nameVariants: Record<number, string> = {
  3479: "PANKAJ CHAUDHARY", 3586: "SWAMI SACHCHIDANAND HARI SAKSHI", 4022: "DAGGUBATI PURANDHESHWARI",
  4389: "SHRIMANT CHH UDAYANRAJE PRATAPSINHAMAHARAJ BHONSLE", 4452: "C R PATIL", 4549: "THIRUMAAVALAVAN THOL",
  4582: "MALA RAJYA LAKSHMI SHAH", 4619: "HEMAMALINI DHARMENDRA DEOL", 4779: "AKSHAYA YADAV",
  4865: "CHUDASAMA RAJESHBHAI NARANBHAI", 5017: "HASMUKHBHAI PATEL (H.S.PATEL)", 5018: "MITESH PATEL (BAKABHAI)",
  5151: "VIJAY KUMAR DUBAY", 5576: "ANOOP PRADHAN BALMIKI", 5584: "AMBICA G LAKSHMINARAYANA VALMIKI",
  5587: "YOGENDER CHANDOLIYA", 5594: "KRISHNA DEVI SHIVSHANKER PATEL", 5602: "DR.K.SUDHAKAR",
  5620: "DAMODAR AGARWAL", 5621: "LUMBARAM", 5623: "SRIBHARAT MATHUKUMILI",
  5650: "SUDHA R", 5651: "BIRENDRA SINGH", 5695: "DR RAJEEV BHARDWAJ",
  5711: "KOTA SRINIVAS POOJARY", 5745: "BHUPATHI RAJU SRINIVASA VARMA (B.J.P.VARMA)", 5815: "ANAND BHADAURIYA",
};

// Elected later in a by-election, so the seat's 2024 general election winner is someone else.
export const byElections: Record<number, string> = {
  5835: "Elected in a by-election after the 2024 winner, Vasantrao Chavan, died.",
  5836: "Elected in a by-election after the 2024 winner, Rahul Gandhi, kept his other seat, Rae Bareli.",
};
