# Vote Better 🗳️

**Make every Indian voter understand their candidates in 30 seconds.**

An open-source, mobile-first voter intelligence platform that takes publicly available election data and presents it so simply that anyone can make an informed choice.

## What This Does

1. **Enter your PIN code** → instantly see your elected representatives (MP, MLA, Corporator)
2. **Tap any candidate** → see their deep profile: assets, criminal cases, attendance, fund spending
3. **Compare candidates** → side-by-side Head-to-Head Clash with trophy indicators
4. **Take the Priority Quiz** → 5 questions to filter candidates by what matters to YOU
5. **Share on WhatsApp** → one-tap report card image for viral civic awareness

## What This Is NOT

- ❌ NOT a recommendation engine ("Vote for X")
- ❌ NOT an opinion platform
- ❌ NOT affiliated with any political party
- ❌ Every data point links to its official government source

## Data Sources

| Source | What We Use |
|:---|:---|
| [MyNeta / ADR](https://myneta.info) | Candidate assets, criminal records, education |
| [TCPD / Lok Dhaba](https://lokdhaba.ashoka.edu.in) | Historical election results, turnout, margins |
| [PRS Legislative Research](https://prsindia.org) | MP attendance, questions asked, bills |
| [MPLADS Portal](https://mplads.gov.in) | Development fund utilization |
| [DataMeet](https://github.com/datameet/maps) | Constituency boundary maps (GeoJSON) |

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS (Static Export, PWA)
- **Data Processing**: Python scripts
- **Hosting**: Vercel / Cloudflare Pages (free tier)
- **Charts**: Recharts
- **No backend required** — all data is pre-processed into static JSON

## Getting Started

```bash
# Install frontend dependencies
cd web && npm install

# Run development server
npm run dev

# Process data (requires Python 3.10+)
cd data && pip install -r requirements.txt
python scripts/merge_profiles.py
```

## Project Structure

```
vote-better/
├── data/                    # Data processing pipeline
│   ├── raw/                 # Source datasets (gitignored)
│   ├── scripts/             # Python processing scripts
│   ├── mappings/            # Static reference data (IPC translations, party colors)
│   └── output/              # Generated JSON files
├── web/                     # Next.js frontend app
│   ├── app/                 # Pages (App Router)
│   ├── components/          # React components
│   ├── lib/                 # Utilities
│   └── public/data/         # Static JSON served to frontend
└── docs/                    # Documentation
```

## Contributing

This is an open-source civic project. Contributions welcome!

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT License — free to use, modify, and distribute.
