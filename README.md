# GitHub User Analyzer

A full-stack web application to search and analyze GitHub users. Built with Next.js, TypeScript, Tailwind CSS, and deployed on Vercel.

## Features

- 🔍 **Search GitHub Users** - Instantly find any GitHub user
- 📊 **User Profile Display** - View detailed profile information including:
  - Avatar and bio
  - Public repositories count
  - Followers and following
  - Company, location, website, and Twitter
  - Join date
- 📚 **Top Repositories** - See user's most-starred repositories with:
  - Stars and forks count
  - Programming language
  - Description
  - Last updated date
- 🎨 **Beautiful UI** - GitHub-themed dark interface with Tailwind CSS
- ⚡ **Fast & Responsive** - Optimized performance on all devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **API**: GitHub REST API
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

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter a GitHub username in the search box
2. Click the "Search" button or press Enter
3. View the user's profile information and repositories
4. Click on any repository to visit it on GitHub
5. Click "View on GitHub" to visit the user's profile

## Project Structure

```
github-user-analyzer/
├── pages/
│   ├── api/
│   │   └── github.ts          # GitHub API route
│   ├── _app.tsx               # Next.js app wrapper
│   ├── _document.tsx          # HTML document wrapper
│   └── index.tsx              # Main page
├── components/
│   ├── SearchBar.tsx          # Search input component
│   ├── UserCard.tsx           # User profile display
│   ├── RepositoryCard.tsx     # Repository card display
│   └── Loading.tsx            # Loading spinner
├── styles/
│   └── globals.css            # Global styles with Tailwind
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── next.config.js             # Next.js config
├── tailwind.config.js         # Tailwind CSS config
└── postcss.config.js          # PostCSS config
```

## API Endpoints

### GET `/api/github?username=<username>`

Fetches GitHub user data and repositories.

**Query Parameters:**
- `username` (required): GitHub username to search

**Response:**
```json
{
  "user": {
    "login": "username",
    "name": "Full Name",
    "bio": "User bio",
    "avatar_url": "https://...",
    "public_repos": 10,
    "followers": 100,
    "following": 50,
    ...
  },
  "repos": [
    {
      "name": "repo-name",
      "description": "repo description",
      "stargazers_count": 10,
      "forks_count": 2,
      "language": "JavaScript",
      ...
    }
  ]
}
```

## Building for Production

```bash
npm run build
npm start
```

## Deployment on Vercel

This project is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" and select your repository
4. Click "Deploy" - that's it!

Vercel will automatically detect this as a Next.js project and configure everything correctly.

## Environment Variables

No environment variables are required for basic functionality. The GitHub API is publicly available for basic queries.

## Limitations

- GitHub API has rate limits: 60 requests per hour for unauthenticated requests
- For higher limits, add a GitHub Personal Access Token to your environment

## Future Enhancements

- Add authentication with GitHub Personal Access Token for higher rate limits
- Show user's recent activity/contributions graph
- Add repository filters and sorting options
- Store search history with localStorage
- Add dark/light theme toggle
- Show organization information
- Display user's gists

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