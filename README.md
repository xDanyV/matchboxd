# Matchbox

A Letterboxd-style web app for football matches. Rate and review matches, vote for the MVP, tag the vibe of a game ("epic", "comeback", "boring"...), save matches to watch later and see how the community scored them.

For now it focuses on the **UEFA Champions League**, with match data coming from [API-Football](https://www.api-football.com/).

> **Status:** work in progress. The interface is in Spanish.

<!-- Add screenshots here, for example:
![Home](docs/screenshots/home.png)
![Match page](docs/screenshots/match.png)
-->

## Features

- **Browse matches** by season, with pagination.
- **Top matches** ranking based on community ratings.
- **Match page** with score (half-time and penalty shoot-out), venue, referee, community rating, MVP voting, a match **timeline** (goals, cards, substitutions and VAR checks), **team stats** (possession, xG, shots, passes, corners...), **line-ups drawn on a pitch** with kit colors and player ratings, a **player stats table**, a "community vs. the numbers" card (community MVP against the best rated player) and the reviews wall. MVP candidates come from the real line-up of that match.
- **Reviews** with a 0.5-10 rating (half points), title, spoiler flag, likes/dislikes and comments. The text is optional: a review without text is just a rating.
- **Diary**: log every time you watch a match (date, how you watched it — stadium, TV, streaming, replay or highlights — and whether it was a rewatch), from the rating dialog or with one click on "Marcar como visto".
- **Review tags** (up to 3 per review, such as epic, comeback, dramatic, controversial, goal fest, tactical or boring). The most voted tags of a match are highlighted on its card and page.
- **Watchlist** ("Por Ver") to save matches for later. Logging a match in the diary removes it from the list.
- **Competition pages** (`/competitions/[slug]`) with the standings (one table per group in group-stage seasons, qualification zones and recent form), top scorers, assists, yellow and red cards per season. The leaders are computed from the stored player stats of each match (group/league phase and knockout rounds, with the club the player had at the time), because the API leaderboards mix in qualifying rounds and show the player's current club.
- **Google sign-in** with Auth.js, with a custom login page (`/login`) that returns users to the page they came from.
- **User profiles** (`/u/[username]`) with editable username, bio and favorite team, personal stats (matches watched, stadium visits, rewatches, average rating, rating distribution, most watched team, favorite tag), the diary and recent reviews.
- **Share cards**: dynamic Open Graph images for matches (no score, so links never spoil the result) and profiles. The share button uses the native share menu and falls back to copying the link.
- **Moderation**: users can delete their own reviews and comments (and comments on their reviews), and report other people's content (spam, offensive, unmarked spoiler, other). Admins review reports grouped by content at `/admin/reports` and can dismiss them or delete the content.
- **Automatic moderation**: a language filter (`src/lib/content-filter.ts`) checks reviews, comments, usernames and bios. Slurs and threats are blocked; common swear words are published but sent to the moderation queue as automatic reports. It normalizes accents, case, leetspeak (`p3nd3j0`), repeated letters and separators (`p.u.t.a`), and matches whole words only. Users are also rate-limited (5 comments per minute, 10 ratings per minute, 10 reports per 10 minutes).
- **Team pages** (`/teams/[slug]`) with crest, country, founding year, venue, current squad, best rated matches and match history. Team crests link to them across the whole app.
- **Global search**: press `/` or `Ctrl+K` for quick suggestions, or use `/search` to filter by season, stage and rating range.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- [Prisma 6](https://www.prisma.io/) with PostgreSQL (developed against [Neon](https://neon.com/))
- [Auth.js](https://authjs.dev/) v5 (NextAuth) with Google as provider
- [lucide-react](https://lucide.dev/) icons
- [API-Football](https://www.api-football.com/) as the data source

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- A PostgreSQL database (a free [Neon](https://neon.com/) project works well)
- A Google OAuth client (see [Google sign-in](#google-sign-in))
- An API-Football key (the free plan is enough, see [Working with the API quota](#working-with-the-api-quota))

### 1. Clone and install

```bash
git clone https://github.com/xDanyV/matchboxd.git
cd matchboxd
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
AUTH_SECRET="generate-one-with-npx-auth-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
FOOTBALL_API_KEY="your-api-football-key"
SITE_URL="http://localhost:3000"
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `AUTH_SECRET` | Secret used by Auth.js. Generate one with `npx auth secret`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials. |
| `FOOTBALL_API_KEY` | API-Football key, only needed by the data scripts. |
| `SITE_URL` | Public URL of the app, used to build absolute links to the Open Graph images. Defaults to `http://localhost:3000`. |
| `AUTH_TRUST_HOST` | Set it to `true` when running `npm start` outside Vercel (another host, Docker or locally). Without it Auth.js rejects every session with `UntrustedHost`. Vercel sets it automatically. |

Never commit your `.env` file. Make sure it is listed in `.gitignore`.

### 3. Create the database schema

```bash
npx prisma db push
```

> The project currently syncs its schema with `db push`. There is no baseline migration yet.

### 4. Load the data

```bash
npm run seed          # matches, team details and squads
npm run sync:events   # goals, cards and substitutions for each match
npm run sync:daily    # all matches, standings and full match details (run it every day)
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google sign-in

1. Create an OAuth client (type *Web application*) in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add this authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

When you deploy, add the production callback URL (`https://your-domain/api/auth/callback/google`) as well.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm run build` / `npm start` | Builds and serves the production app. |
| `npm run lint` | Runs ESLint. |
| `npm run seed` | Creates or updates matches, team details and missing squads. **Safe: it never deletes data.** |
| `npm run seed -- --squads` | Same, and also refreshes the squads of every team. |
| `npm run enrich:teams` | Updates team details (country, founding year, venue) for existing teams. Add `-- --squads` to refresh squads too. |
| `npm run sync:events` | Imports match events into the timeline. Flags: `--force` (redo every match), `--match=<id>` (one match), `--probe=<apiFixtureId>` (inspect the API response without writing to the database). |
| `npm run sync:daily` | Fills the database a little every day with the free quota: every match of the 2022-2024 seasons, team details and standings (once per season), then the full detail of each match (events, line-ups, team and player stats, 1 request per match). Matches with reviews go first. Flags: `--budget=<n>` (requests to spend, 90 by default), `--refresh` (download season data again). |
| `npm run backfill:logs` | Creates a diary entry for every review that has none (reviews written before the diary existed) and removes those matches from the watchlist. Run it once after updating the schema. |
| `npm run set-role -- <username> <admin\|user>` | Promotes a user to admin (or back to user). There is no UI for this on purpose. The change applies on the user's next request. |

All data scripts are idempotent: running them again only fills gaps or updates data.

## Working with the API quota

The free API-Football plan has a small daily request quota and a per-minute limit, so the scripts are designed to spend as few requests as possible:

- Team details are requested once per season, not once per team.
- Squads are only downloaded for teams that do not have players yet.
- Matches that already have events are skipped by `sync:events`.
- `sync:daily` spends a fixed budget (90 by default) and keeps a reserve of 5 requests. Each match detail costs a single request (`/fixtures?id=`), which returns events, line-ups and stats together.
- The free plan only covers the 2022-2024 seasons; the current season needs a paid plan.
- Requests are spaced out, the per-minute limit is retried automatically and the scripts stop cleanly when the daily quota runs out. Just run them again the next day.

### Daily sync with GitHub Actions

`.github/workflows/daily-sync.yml` runs `sync:daily` every day at 00:30 UTC (half an hour after the quota resets), so the database keeps filling up even when your computer is off. You can also run it by hand from the **Actions** tab, choosing the budget.

It needs two repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | The same connection string as your `.env` |
| `FOOTBALL_API_KEY` | Your API-Football key |

If you also run the scripts locally on the same day, they share the same 100 daily requests.

## Project structure

```
prisma/
  schema.prisma            Database schema
  seed.ts                  Safe seed (matches, teams, squads)
  enrich-teams.ts          Team details and squads refresh
  sync-events.ts           Match events import
src/
  app/
    page.tsx               Home: matches by season
    matches/               Top matches and match detail
    teams/[slug]/          Team pages
    u/[username]/          Public user profiles
    search/                Search with filters
    reviews/               "My reviews"
    watchlist/             "Por Ver"
    settings/profile/      Edit profile
    api/                   Auth.js and search suggestions
    actions/               Server actions
  components/              UI components (matches, reviews, teams, search, layout)
  lib/                     Prisma client, search, review tags and match events logic
  auth.ts                  Auth.js configuration
```

## Known limitations

- The squad shown on team pages is the **current** squad, which can differ from the squads of historical matches. Matches without synced details still use the current squads as MVP candidates.
- Penalty shoot-out kicks are not shown in the timeline (the shoot-out result is shown in the header).
- Only the Champions League is loaded, and only the seasons the free API plan allows (2022-2024).

## Roadmap

- Player pages and a teams index.
- Custom lists ("Best finals", "Impossible comebacks").
- Following other users and an activity feed.
- Baseline database migration.

## Disclaimer

Matchbox is an independent fan project. It is not affiliated with UEFA, Letterboxd or API-Football. Team crests, player photos and match data belong to their respective owners.
