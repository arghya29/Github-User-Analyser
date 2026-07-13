# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Content Security Policy (CSP) headers via Next.js middleware for XSS prevention
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, Referrer-Policy)
- Input validation library (lib/validation.ts) for sanitizing GitHub usernames and repo names
- Enhanced rate limiter with per-path granularity and remaining quota query
- Server-side security headers via next.config.js (poweredByHeader disabled, etags enabled)
- API route input sanitization for /api/github endpoint
- Cache-Control: no-store for all API routes
- Mobile-responsive navigation component (MobileNav) with bottom sheet drawer and backdrop blur
- Custom responsive hooks (useMediaQuery, useBreakpoint, useIsMobile, useIsTablet, useIsDesktop)
- Touch-friendly interaction improvements (tap highlight removal, min touch targets on mobile, font-size adjustment)
- Custom scrollbar styling for WebKit browsers
- Reduced motion support with prefers-reduced-motion media query
- Enhanced SearchBar with auto-focus, trim-on-submit, and active scale feedback
- Responsive CompareResult layout with mobile-optimized avatar sizes
- Fixed broken repository owner links in Footer (your-username -> arghya29)
- Progressive Web App (PWA) support with service worker for offline caching
- Web manifest (manifest.json) for installable app experience
- Service worker (sw.js) with static asset caching and cache-first strategy
- InstallPrompt component for native app installation on supported browsers
- PWA meta tags (theme-color, apple-mobile-web-app, apple-touch-icon)
- Service worker and analytics route tracking in _app.tsx
- Install button in Footer for manual PWA trigger
- IndexedDB-based persistent cache for cross-session data retention
- Offline contribution queue with localStorage-backed pending syncs
- Hybrid in-memory + IndexedDB caching via getCachedWithFallback
- Cache statistics reporting for debugging and monitoring
- GitHub User Analyzer project initialization
- GitHub API integration for user data fetching
- Search functionality to find GitHub users
- User profile display with stats (followers, repos, etc.)
- Repository listing showing top 6 most-starred repos
- Repository cards with language, stars, and forks display
- Loading state with spinner animation
- Error handling for invalid usernames and API failures
- Responsive design for mobile and desktop
- Dark theme GitHub-inspired UI
- TypeScript for type safety
- Tailwind CSS for styling
- Next.js API routes for backend
- Open source contribution guidelines
- Code of Conduct
- Security policy
- GitHub Actions CI/CD pipeline
- Pull request and issue templates
- Automated dependency updates with Dependabot

### Features
- 🔍 Search GitHub users by username
- 📊 View user profile with avatar, bio, and statistics
- 📚 Browse user's most-starred repositories
- 🎨 Dark theme UI with GitHub aesthetic
- ⚡ Fast and responsive performance
- 🔗 Direct links to GitHub profiles and repositories
- 📱 Mobile-friendly design

## [0.1.0] - 2024-06-10

### Initial Release
- Initial project setup with Next.js and TypeScript
- Basic GitHub user search functionality
- User profile and repository display components
- Tailwind CSS styling
- Deployment ready for Vercel

---

## How to Report Changes

When contributing, please follow these guidelines when updating this changelog:

- Add your changes to the [Unreleased] section
- Group changes by type: Added, Changed, Deprecated, Removed, Fixed, Security
- Keep it user-friendly and avoid technical jargon where possible
- Link to related pull requests and issues when applicable

### Types of Changes

- **Added** - for new features
- **Changed** - for changes in existing functionality
- **Deprecated** - for soon-to-be removed features
- **Removed** - for now removed features
- **Fixed** - for any bug fixes
- **Security** - in case of vulnerabilities

---

## Links

- [Latest Release](https://github.com/arghya29/Github-User-Analyser/releases)
- [Unreleased Changes](https://github.com/arghya29/Github-User-Analyser/compare/main...dev)
