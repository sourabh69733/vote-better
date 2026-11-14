// Links MoSPI's eSAKSHI (MPLADS) seats to ECI 2024 seats and winners. Most link automatically by seat
// and name; these lists cover the rest, keyed by eSAKSHI's constituency ID, and were reviewed on 2026-11-15.

// eSAKSHI constituency ID -> ECI seat, where eSAKSHI spells the seat differently or adds a state code.
export const esakshiSeats: Record<number, string> = {
  11: "andhra-pradesh/thirupathi", // TIRUPATI(SC)
  12: "andhra-pradesh/ananthapur", // ANANTAPUR
  16: "andhra-pradesh/narsapuram", // NARASAPURAM
  19: "andhra-pradesh/narsaraopet", // NARASARAOPET
  23: "andhra-pradesh/kurnoolu", // KURNOOL
  38: "assam/nagaon", // NOWGONG
  48: "bihar/patliputra", // PATALIPUTRA
  57: "bihar/purnia", // PURNEA
  67: "bihar/ujiarpur", // UJJARPUR
  70: "bihar/aurangabad", // AURANGABAD_BR
  76: "bihar/maharajganj", // MAHARAJGANJ_BR
  95: "chhattisgarh/surguja", // SARGUJA(ST)
  98: "nct-of-delhi/north-west-delhi", // Delhi / NORTH WEST DELHI(SC)
  99: "nct-of-delhi/chandni-chowk", // Delhi / CHANDINI CHOWK
  100: "nct-of-delhi/east-delhi", // Delhi / EAST DELHI
  101: "nct-of-delhi/north-east-delhi", // Delhi / NORTH EAST DELHI
  102: "nct-of-delhi/west-delhi", // Delhi / WEST DELHI
  103: "nct-of-delhi/new-delhi", // Delhi / NEW DELHI
  104: "nct-of-delhi/south-delhi", // Delhi / SOUTH DELHI
  133: "haryana/sonipat", // SONEPAT
  143: "himachal-pradesh/hamirpur", // HAMIRPUR_HP
  147: "jammu-and-kashmir/anantnag-rajouri", // ANANTNAG
  149: "jammu-and-kashmir/baramulla", // BARAMULLAH
  171: "karnataka/chikkballapur", // CHIKBALLAPUR
  258: "maharashtra/aurangabad", // AURANGABAD_MH
  285: "maharashtra/hatkanangale", // HATKANANGLE
  321: "punjab/bathinda", // BHATINDA
  389: "tamil-nadu/dharmapuri", // DHARAMAPURI
  404: "telangana/mahbubnagar", // MAHABUBNAGAR
  407: "telangana/chevella", // CHELVELLA
  408: "telangana/warangal", // WARANGEL(SC)
  446: "uttar-pradesh/baharaich", // BAHRAICH(SC)
  467: "uttar-pradesh/hamirpur", // HAMIRPUR_UP
  479: "uttar-pradesh/maharajganj", // MAHARAJGANJ_UP
  498: "uttarakhand/nainital-udhamsingh-nagar", // NAINITAL UDHAM SINGH NAG.
  500: "uttarakhand/haridwar", // HARDWAR
  526: "west-bengal/jaynagar", // JOYNAGAR(SC)
  548: "dadra-nagar-haveli-and-daman-diu/dadar-nagar-haveli", // DADRA & NAGAR HAVELI (ST)
};

// eSAKSHI constituency ID -> eSAKSHI's name for the seat's 2024 winner, where eSAKSHI spells it differently
// (initials written out, another spelling). An approval holds only while eSAKSHI shows that exact name.
// Not listed: Wayanad, where eSAKSHI shows the member elected at the 2024 bye-election.
export const esakshiWinnerNames: Record<number, string> = {
  17: "Daggubati Purandeshwari", // Rajahmundry
  20: "Sribharat MathuKumli", // Visakhapatnam
  22: "Balashowry Vallabbhaneni", // Machilipatnam
  113: "Prabhubhai Nagarbhai Vasava", // Bardoli
  146: "Kangana Ranaut", // Mandi
  194: "Shri Kumbakudi Sudhakaran", // Kannur, K. Sudhakaran
  209: "Shri NK Premachandran", // Kollam
  212: "Vellalath Kochukrishnan Nair Sreekandan", // Palakkad, V K Sreekandan
  214: "Mohamed Haneefa", // Ladakh
  243: "Vishnu Dutt Sharma", // Khajuraho
  251: "Shyamkumar", // Ramtek, Shyamkumar Daulat Barve
  264: "Sunil Dattatray Tatkare", // Raigad
  278: "RAJABHAU", // Nashik, Rajabhau Parag Prakash Waje
  279: "Omprakash Bhupalsinh Alias Pawan Rajenimbalkar", // Osmanabad
  288: "VISHAL", // Sangli, Vishal Prakashbapu Patil
  334: "Bhagirath Chaudhary", // Ajmer
  358: "Shri PP Chaudhary", // Pali
  361: "Ganesan Selvam", // Kancheepuram, Selvam G
  362: "Thalikkottai Rajuthevar Baalu", // Sriperumbudur, T R Baalu
  364: "S. Jagathrakshakan", // Arakkonam
  384: "CN Annadurai", // Tiruvannamalai
  395: "Kani K Navas", // Ramanathapuram, Navaskani K
  396: "Andimuthu Raja", // Nilgiris, A Raja
  427: "Swami Sachchidanandhari Sakshi ji Maharaj", // Unnao
  476: "DR. S P SINGH", // Pratapgarh, Shiv Pal Singh Patel
};
