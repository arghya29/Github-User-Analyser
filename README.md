<p align="center">
  <a href="https://github-user-analyser.vercel.app">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-000000?style=for-the-badge" alt="Live Demo"/>
  </a>
  <a href="https://github.com/arghya29/Github-User-Analyser">
    <img src="https://img.shields.io/badge/Visit_Project-2563EB?style=for-the-badge&logo=github&logoColor=white" alt="Visit Project"/>
  </a>
</p>

# GitHub User Analyzer

A full-stack GitHub analytics dashboard. Search any GitHub user to see their profile, repositories, contribution activity, language breakdown, productivity patterns, and AI-generated insights, or compare two users head to head. Built with Next.js, TypeScript, Tailwind CSS, and GitHub's REST + GraphQL APIs, deployed on Vercel.

## Features

### Search & Profile

- 🔍 **Search GitHub Users** — instantly look up any GitHub user
- 🕓 **Search History** — your last 5 searches are saved locally and one click away
- 📊 **User Profile Display** — avatar, bio, public repo count, followers/following, company, location, website, Twitter, and join date
- ⚖️ **Compare Mode** — search two usernames side by side and see who's ahead on followers, stars, forks, contributions, and streak

### Visual Analytics

- 🥧 **Language Distribution** — pie chart of language usage, byte-accurate when possible, falling back to repo-count if not
- 🔥 **Activity Heatmap** — a GitHub-style contribution calendar for the last year
- 📈 **Engagement Stats** — total commits, pull requests, issues, and PR reviews from the last year
- ⏱️ **Productivity Panel** — current streak, longest streak, most productive day, weekday vs. weekend split, and a month-by-month contribution chart
- 🏆 **Achievements** — milestone progress bars for total contributions, current streak, and pull requests

### Repositories

- 📚 **Top Repositories** — sortable by stars, forks, or last updated, filterable by language
- 🩺 **Health Score** — a quick badge per repo based on recency, issue resolution ratio, license presence, and documentation
- 📖 **README Preview** — click any repo card to read its rendered README (including GitHub-flavored Markdown tables and task lists) without leaving the app

### AI Insights

- ✍️ **Bio Generator** — turns a profile's languages, top repos, and activity into a polished, copy-paste-ready README bio
- 😄 **Roast or Toast** — a playful, good-natured take on someone's coding habits, generated from their public stats

### Personalization

- 🌗 **Dark / Light Theme Toggle** — persisted across visits, with no flash of the wrong theme on load
- 🎨 **GitHub-Themed UI** — clean, responsive interface built with Tailwind CSS
- ⚡ **Fast & Cached** — API responses are cached briefly server-side to cut down on repeat GitHub API calls

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Markdown rendering**: react-markdown + remark-gfm
- **Backend**: Next.js API Routes
- **Data sources**: GitHub GraphQL API (primary) with REST API fallback
- **AI**: Google Gemini API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd github-user-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see below), then run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file in the project root:

```
GITHUB_TOKEN=your_github_personal_access_token
GEMINI_API_KEY=your_gemini_api_key
```

- **`GITHUB_TOKEN`** *(recommended)* — a free [GitHub personal access token](https://github.com/settings/tokens) (classic, no scopes needed) raises your rate limit from 60 to 5,000 requests/hour and unlocks the GraphQL-powered features: engagement stats, productivity panel, achievements, activity heatmap, and byte-accurate language distribution. Without it, the app still works with basic profile and repo data.
- **`GEMINI_API_KEY`** *(optional)* — a free key from [Google AI Studio](https://aistudio.google.com/app/apikey), needed only for the AI Insights (bio generator / Roast or Toast) feature.

## Usage

1. Enter a GitHub username and search, or pick one from your recent history
2. Browse the profile, charts, engagement stats, and achievements
3. Sort or filter repositories, and click any repo card to preview its README inline
4. Generate an AI-written bio or a playful roast from the AI Insights panel
5. Switch to Compare mode to put two profiles side by side
6. Toggle dark/light theme from the top-right corner

## Project Structure

```
github-user-analyzer/
├── pages/
│   ├── api/
│   │   ├── github.ts          # Main GitHub data route (GraphQL + REST fallback)
│   │   ├── readme.ts          # Fetches & decodes a repo's README
│   │   └── ai-insight.ts      # Gemini-powered bio/roast generator
│   ├── _app.tsx               # App wrapper (wraps pages in ThemeProvider)
│   ├── _document.tsx          # HTML document wrapper (theme flash-prevention script)
│   └── index.tsx              # Main page
├── components/
│   ├── SearchBar.tsx
│   ├── SearchHistory.tsx
│   ├── UserCard.tsx
│   ├── RepositoryCard.tsx
│   ├── RepoReadmeModal.tsx
│   ├── HealthScoreBadge.tsx
│   ├── SortFilterBar.tsx
│   ├── LanguageChart.tsx
│   ├── ActivityHeatmap.tsx
│   ├── EngagementStats.tsx
│   ├── ProductivityPanel.tsx
│   ├── AchievementsPanel.tsx
│   ├── AiInsightPanel.tsx
│   ├── CompareForm.tsx
│   ├── CompareResult.tsx
│   ├── ThemeToggle.tsx
│   ├── Footer.tsx
│   └── LoadingSkeleton.tsx
├── lib/
│   ├── cache.ts                # In-memory TTL cache for API routes
│   ├── ThemeContext.tsx        # Theme provider + persistence
│   ├── healthScore.ts          # Repo health score calculation
│   ├── languageColors.ts       # Shared language → color mapping
│   ├── contributionStats.ts    # Streaks, productivity, monthly totals
│   └── repoStats.ts            # Language distribution aggregation
├── types/
│   └── github.ts               # Shared TypeScript types
├── styles/
│   └── globals.css
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## API Endpoints

### GET `/api/github?username=<username>`

Fetches a user's profile, repositories, contribution calendar, engagement stats, and productivity stats. Uses GitHub's GraphQL API when `GITHUB_TOKEN` is set (richer data, single round trip), falling back to REST otherwise.

**Response:**
```json
{
  "user": { "login": "...", "name": "...", "followers": 100, "..." : "..." },
  "repos": [{ "name": "...", "stargazers_count": 10, "watchers_count": 3, "open_issues_count": 1, "license": "MIT", "languages": [{ "name": "TypeScript", "bytes": 1200 }] }],
  "contributions": { "totalContributions": 928, "weeks": [/* ... */] },
  "engagement": { "totalCommitContributions": 77, "totalPullRequestContributions": 18 },
  "productivity": { "currentStreak": 11, "longestStreak": 13, "monthlyTotals": [/* ... */] }
}
```

On failure, returns `{ "error": "...", "errorType": "not_found" | "rate_limited" | "unknown" }`.

### GET `/api/readme?owner=<owner>&repo=<repo>`

Returns the decoded README content (markdown text) for a given repository.

### POST `/api/ai-insight`

Generates an AI bio or roast. Body: `{ "type": "bio" | "roast", "username": "...", "topLanguages": [...], "topRepos": [...] }`. Returns `{ "text": "..." }`.

## Building for Production

```bash
npm run build
npm start
```

## Deployment on Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add `GITHUB_TOKEN` and `GEMINI_API_KEY` as environment variables in the project settings
4. Deploy

> **Note:** the in-memory cache (`lib/cache.ts`) resets on cold starts in serverless environments like Vercel, it still cuts down on repeat calls for a warm instance, just don't expect it to persist indefinitely.

## Limitations

- GitHub's REST API allows 60 requests/hour unauthenticated, 5,000/hour with a token; the GraphQL API used for the richer features always requires a token
- Repository lists are capped at 100 (GitHub's GraphQL page size) — accounts with more repos than that won't show everything
- AI Insights are generated text and may occasionally be inaccurate or generic — they're meant as a fun starting point, not a final draft

## Future Enhancements

- Shareable profile URLs (`/[username]`) instead of a single search-driven page
- Pinned repositories support (GitHub lets users curate which repos to showcase)
- Visible GitHub API rate-limit indicator
- Repository name search alongside the language filter
- Open Graph meta tags for nicer link previews when shared
- Automated tests for the pure stats/health-score functions, plus a CI workflow

## Contributing

We love contributions! Whether you're fixing bugs, adding features, or improving documentation, here's how to get started:

1. **Fork** the repository and create your branch: `git checkout -b feature/your-feature`
2. **Test** your changes: run `npm run dev` to verify the app works as expected, then `npm run lint` to check code quality.
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open a Pull Request** against our `dev` branch.

PRs that don't pass `npm run lint` won't be merged, so make sure that check is clean before submitting. Refer to our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for further details.

### Before You Contribute

- Check existing issues to avoid duplicates
- For major changes, open an issue first to discuss what you'd like to change
- Make sure your branch is up to date with `dev` before opening a PR

### Types of Contributions

- 🐛 **Bug Fixes** - Found a bug? Let us know!
- ✨ **Features** - Have a great idea? We'd love to hear it
- 📚 **Documentation** - Help improve our docs
- 🎨 **UI/UX** - Improve the design and usability
- ⚡ **Performance** - Speed optimizations

### Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Check code quality
npm start        # Run production build
```

## License

Licensed under the [Apache License, Version 2.0](LICENSE). You're free to use, modify, and distribute this project for personal or commercial purposes, provided you comply with the terms of the license (including preserving copyright/notice information and documenting any significant changes).

## Support

If you encounter any issues or have suggestions, please open an issue on GitHub.

---

Made with ❤️ | Deployed on Vercel