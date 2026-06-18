export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-gray-900 dark:text-white font-semibold">GitHub User Analyzer</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Search, visualize, and compare GitHub profiles.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a
              href="https://github.com/your-username/Github-User-Analyser"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Source Code
            </a>
            <a
              href="https://github.com/your-username/Github-User-Analyser/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Report an Issue
            </a>
            <a
              href="https://docs.github.com/en/rest"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              GitHub API Docs
            </a>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-slate-800 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <p>© {year} GitHub User Analyzer. Not affiliated with GitHub, Inc.</p>
          <p>Built with Next.js, TypeScript, Tailwind CSS &amp; Recharts</p>
        </div>
      </div>
    </footer>
  )
}