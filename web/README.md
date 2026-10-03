# Vote Better web

The production pilot currently publishes one source-backed relationship:
Jaipur Lok Sabha constituency → Member of Parliament → Manju Sharma.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Run `npm test`, `npm run lint`, and `npm run build` before committing changes.

## Data and evidence

- `lib/verified-profile.ts` holds the curated person profile and original source URLs.
- `lib/civic-area.ts` holds areas, offices, and dated area-to-office-holder links. Each link separates evidence for the area/office connection from evidence for the current holder.
- `lib/civic-graph.ts` derives the read-only relationship graph from the same area links used by the home page.
- `app/areas/jaipur/relationships` displays that graph and the source for each edge.

Only add a link after checking its area identity, office, current holder, dates, and original records. Location-based matching also needs checked boundaries. Leave an unverified role out of the registry. A PIN code or browser position is not a confirmed constituency or ward match.

`/mockups/graph` remains a fictional design preview and is separate from the sourced production view.
