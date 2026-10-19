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
- **Match page** with score, venue, community rating, MVP voting, a match **timeline** (goals, cards, substitutions and VAR checks) and the reviews wall.
- **Reviews** with a 1-10 rating, title, spoiler flag, likes/dislikes and comments.
- **Review tags** (up to 3 per review, such as epic, comeback, dramatic, controversial, goal fest, tactical or boring). The most voted tags of a match are highlighted on its card and page.
- **Watchlist** ("Por Ver") to save matches for later.
- **Google sign-in** with Auth.js.
- **User profiles** (`/u/[username]`) with editable username, bio and favorite team, plus recent reviews.
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
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `AUTH_SECRET` | Secret used by Auth.js. Generate one with `npx auth secret`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials. |
| `FOOTBALL_API_KEY` | API-Football key, only needed by the data scripts. |

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

All data scripts are idempotent: running them again only fills gaps or updates data.

## Working with the API quota

The free API-Football plan has a small daily request quota and a per-minute limit, so the scripts are designed to spend as few requests as possible:

- Team details are requested once per season, not once per team.
- Squads are only downloaded for teams that do not have players yet.
- Matches that already have events are skipped by `sync:events`.
- Requests are spaced out, the per-minute limit is retried automatically and the scripts stop cleanly when the daily quota runs out. Just run them again the next day.

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

- The squad shown on team pages is the **current** squad, which can differ from the squads of historical matches. For the same reason, the MVP candidates of an old match come from the current squads.
- Penalty shoot-out kicks are not shown in the timeline, and the shoot-out result is not stored yet.
- Only the Champions League seasons listed in `prisma/seed.ts` are loaded, and only a limited number of matches per season.

## Roadmap

- Match line-ups drawn on a pitch, and real line-ups for MVP candidates.
- Player pages and a teams index.
- Custom lists ("Best finals", "Impossible comebacks").
- Following other users and an activity feed.
- Personal stats and a watched-matches diary.
- Baseline database migration.

## Disclaimer

Matchbox is an independent fan project. It is not affiliated with UEFA, Letterboxd or API-Football. Team crests, player photos and match data belong to their respective owners.
