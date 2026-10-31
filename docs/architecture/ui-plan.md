# UI design plan: making the full picture easy to see

Companion to [platform-plan.md](platform-plan.md). That plan says what data we collect; this one says how a voter sees it. The visual version, with phone wireframes drawn from real Jaipur records, is the [Vote Better Screens](https://claude.ai/artifact/X8uCiNPCdStgDB2oGYw2tN) artifact (private until shared).

## How it should feel

1. **Answer first.** Every screen opens with one plain sentence and one picture. Detail comes on tap.
2. **Phone first.** Designed at 360 px wide, one thumb, slow network. Desktop is the same screens with more room.
3. **Same frame for everyone.** Every candidate gets the same fields, order and scales. No one gets a nicer layout.
4. **Every number is checkable.** Unit, date and a source chip sit beside each figure.
5. **Gaps are visible.** A missing section shows a hatched "not collected yet" block with the phase that fills it. Never a zero.
6. **Color identifies, never judges.** Party colors only mark who is who. No red for "bad" or green for "good" on people.

## Three depths on every screen

| Depth | What the voter sees | Time |
| --- | --- | --- |
| Glance | One sentence, one visual, three key numbers | 5 seconds |
| Read | Sections with charts and short lists | 1 to 3 minutes |
| Verify | Source chip opens the document, location in it and checked date | On demand |

## Navigation

Phone bottom bar: **My area**, **Elections**, **Search**, **Learn**.

```
Home (PIN or location)
  -> My area: three cards (Lok Sabha seat, assembly seat, ward)
       -> Person profile -> Work and outcomes -> Source
       -> Election -> Contest (one seat) -> Compare candidates -> Person
  -> Elections calendar -> Election -> Contest
Every screen -> Sources and coverage
```

## Screens

| Screen | Route | Glance line | Main visuals | Phase |
| --- | --- | --- | --- | --- |
| Find my area | `/` | "Who represents you?" | PIN box, location button, live or next election strip | C |
| My area | `/areas/[id]` | "Jaipur: your MP, MLA and councillor" | Three nested cards, next election pill, coverage meter per card, "what happened here" timeline | C, G |
| Election | `/elections/[id]` | "Counted on 4 June 2024" | Phase timeline with today marker, seat list, state margin strip | A |
| Contest | `/elections/[id]/[seat]` | "Manju Sharma won Jaipur by 3,31,767 votes" | Vote race, turnout bar, comparison grid of all candidates on shared scales | A, E |
| Person profile | `/people/[slug]` | Role, how they got here, what they declared, what they did | Glance strip, office duties panel, career timeline with party bands, then and now affidavit | D |
| Work and outcomes | profile section and `/work/[id]` | "137 questions in 8 sessions" | Session activity strip, topic bars, fund pipe, milestone track per work | D, F |
| Story | overlay on any page, and shared off site | "Jaipur in 60 seconds" | Full screen scenes, one fact each, tap to advance, share as image or reel | H1 |
| Sources and coverage | `/coverage/[area]` | "What we have for Jaipur" | Coverage bars per section, freshness per source | B, D |

## Visual catalogue: which picture for which data

| Data | Visual | Rule |
| --- | --- | --- |
| Election schedule | Horizontal phase timeline with a today marker | Dates ECI has not announced are not drawn |
| Result in one seat | Vote race bars (exists: `VoteRace`) | Share of valid votes, NOTA shown separately |
| Margin | Tug of war (exists: `TugOfWar`) plus state margin strip | Your seat highlighted among all seats in the state |
| Turnout | Single bar with state median tick | Votes polled over electors, both numbers shown |
| Assets and liabilities | Paired bars; slope chart across elections | Labelled "declared in [year] affidavit", same scale for all candidates in a contest |
| Declared cases | Count plus plain list of sections as declared | No severity colors, no conviction implied |
| Education, age | Text facts | No chart; a chart would suggest a ranking |
| Career | Vertical timeline, party shown as a colored band | Party changes visible as a band change with date |
| Questions and debates | Activity strip per session, topic bars (exists: `Bars`) | Counts only; no "productivity score" |
| Attendance | Bar per session with house median tick | Replaces the dial, which reads as a score |
| Local area funds | Pipe bar: entitled, sanctioned, released, spent | Each stage dated and sourced |
| Works and outcomes | Milestone track: announced, sanctioned, completed, verified | Badges differ by shape as well as color |
| Relationships | Network map (prototype exists) | Only approved links; filter by year |
| Coverage | Segmented meter per section | Hatched for not collected, outline for stale |

## Visual vocabulary

- **Source chip.** Publisher and checked date; tap opens the source. Exists.
- **Status pill.** Election state: due, announced, polling, counting, counted. Exists on `/elections`.
- **Freshness dot.** Filled when checked within the source's interval, outlined when stale.
- **Outcome badges.** Announced (empty circle), sanctioned (half), completed (full), verified (full with ring).
- **Declared tag.** Small caps "declared" before any affidavit value.
- **Not collected block.** Diagonal hatch, one line naming the missing data and the phase that adds it.
- **Party swatch.** Party color square plus short name; never color alone.

## Making it engaging

- **Stories.** New scene builders: "your seat in 60 seconds", "how the money moved", "this session". Built only from approved facts.
- **Quests for the voter.** Know your three representatives. Read one affidavit. Trace one fact to its source. Find who fixes a pothole. Progress stored in the browser only.
- **Share cards.** An image per seat and per person with one fact and its source line, for WhatsApp.
- **Follow and digest.** Follow an area or person; see "new since your last visit".
- **Did you know.** One surprising, sourced fact per area page, for example the closest seat in the state.
- **No scores for politicians.** No leaderboards, ratings or composite indexes of people.

## Stories are the front door

**Audience.** Young and first-time voters, mostly on Instagram and WhatsApp, on phones, often reading Hinglish. Most will meet Vote Better through a shared story before they ever open the site. So a story is the front door, not a feature at the end, and every story links to the exact page it came from.

**Tone.** Playful in format (quiz, reveal, countdown, swipe), plain in claims. The fun is in how a fact is shown, never in what is said about a person.

### Formats

| Format | Size | Where it goes | Built from |
| --- | --- | --- | --- |
| Story and reel frame | 1080 x 1920 (9:16) | Instagram stories and reels, WhatsApp status | Story scenes |
| Carousel slide | 1080 x 1350 (4:5) | Instagram feed posts, 5 to 8 slides | The same scenes |
| Link preview | 1200 x 630 | Preview card when any page link is pasted in WhatsApp or elsewhere | One image per seat and person |
| Reel video | 9:16, 15 to 30 seconds | Instagram reels, YouTube Shorts | Scenes played in sequence |

Every frame carries the source and checked date, a short link to the page, the Vote Better mark and "Check it yourself".

### Story templates

All built automatically from approved facts and applied the same way to every seat, candidate and party.

1. **Your seat in 60 seconds.** Winner, margin, turnout, who came second.
2. **Closest fights in the state.** Seats ordered by margin.
3. **Guess the margin.** A question slide, then the answer slide.
4. **Then and now.** Declared assets across two affidavits of one person.
5. **What does an MP actually do?** The duties of an office, from the Office and Duty records.
6. **This session.** The questions your MP asked, by topic.
7. **Countdown.** Schedule announced, phases, your poll day.
8. **First-time voter.** How to check your name on the roll, linking to the official ECI voter services portal.
9. **My card.** After the "know your three representatives" quest, the voter gets a personal card to share.

### How they are made

- **Images.** One route per scene renders a PNG with Next.js `ImageResponse`, from the same scene data the on-site story player uses. This replaces the unused `html-to-image` helper.
- **Reels.** Render the scene frames as PNG and join them into MP4 with ffmpeg in a scheduled job. Remotion is the richer option later; it is free for individuals and very small teams and needs a paid licence beyond that.
- **Share button.** On phones the Web Share API sends the image straight to Instagram or WhatsApp. Elsewhere the voter saves the image.
- **Batches.** When ECI announces a schedule, the pipeline makes a card set for every seat in that election and queues it for a person to post.

**Built (2026-10-31).** Five decks: seat in 60 seconds, guess the margin, closest fights, what an MP does, and first-time voter. Each renders as 9:16 and 4:5 PNGs at `/share/image/...`, with a share page at `/share/...` that shares the images, records a reel in the browser and gives English and Hinglish captions. `npm run reel` makes an MP4 with ffmpeg. Seat and election pages have link preview images. Not built yet: then and now (needs affidavits), this session (needs work records for every MP), countdown (needs the next announced schedule), my card (phase H2) and the scheduled batch queue.

### From a post to the site, and back

Post or reel, then the link in bio, story link sticker or WhatsApp link, then the seat page with "find your own seat", then the quest, then the voter's own card, shared to their friends.

Measure it without cookies: tag each template's links, and count visits from Instagram, the share of visitors who look up their own seat, quests completed and personal cards shared.

### Guardrails

- **Same rules for everyone.** Templates run on a stated rule, such as every seat or the ten closest. No hand-picked targets.
- **No predictions.** No opinion polls, exit polls or forecasts. Exit poll results are barred by law during polling (Representation of the People Act, section 126A).
- **Silence period.** Pause posts about a seat's candidates in the 48 hours before polling ends there (section 126). Confirm the scope with a lawyer.
- **Paid boosting.** Meta requires authorisation and a "paid for by" label for ads about elections or politics in India. Organic posts do not.
- **Photos.** Initials and party swatch until the right to reuse official photos is settled.
- **No mockery.** No memes about a person, no edited faces, no AI likenesses.
- **Corrections travel too.** If a fact on a posted card is corrected, post the correction on the same channel.

## Design system

| Token | Value | Note |
| --- | --- | --- |
| Background | `#f5f7f2` | Existing |
| Ink | `#18372a` | Existing heading color |
| Primary | `#1e6b4d` | Existing brand green |
| Line | `#dce6dc` | Existing card border |
| Highlight | violet `#5b3f8f` | New; election ink, used only for "you" and "now" |
| Fonts | Inter, plus Noto Sans Devanagari for Hindi | Hindi lines run about 20 percent longer; layouts must allow it |
| Radius | 22 px cards, 999 px pills | Existing |
| Motion | Bars grow once on first view; off with reduced motion | Existing `growX` keyframe |
| Dark mode | Later; the site is light only today | Tokens first, so dark is a token swap |

## Quality bars

- **Speed.** Under 100 KB of JavaScript per page; pages are static and cached. Usable on a slow 3G phone.
- **Access.** WCAG 2.1 AA contrast, every chart has a text summary, nothing relies on color alone, full keyboard use.
- **Language.** Every screen tested in Hindi and English before Jaipur launch.
- **Understanding.** The Jaipur voter test: five residents find their MP, the source, and say what a fact does and does not prove.

## Build order

| Phase | UI work |
| --- | --- |
| A | Election page, contest page with vote race and margin strip, status pills reused |
| B | Freshness dots and "checked" dates driven by the sync log |
| C | Find my area, my area hub with three cards and not collected blocks |
| D | One profile model, glance strip, duties panel, career timeline, then and now, attendance bars |
| E | Comparison grid live during a poll, nomination status per candidate |
| F | Fund pipe, milestone tracks, area "what happened here" timeline |
| G | Ward card, councillor profiles on the same model |
| H1 | Share kit, right after A: scene images, carousel and reel export, link previews, share button, Hinglish captions, first five templates |
| H2 | Quests, personal card, follow and digest, full Hindi |

Retire the unused legacy components `MetricBadge`, `CriminalCasePill`, `AttendanceDial`, `HeadToHead`, `FundUtilization` and `WealthChart`. They use severity colors, emoji and loose types that break the rules above.
