# Architecture Documentation

## High-Level Architecture

The `Github-User-Analyser` is built as a web application aimed at analysing GitHub user profiles.

## Tech Stack

- **Frontend / Framework:** Next.js (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Testing:** Jest

## Directory Structure

- `pages/`: Contains the Next.js pages and API routes.
- `components/`: Contains reusable React components.
- `lib/`: Contains utility functions and library wrappers.
- `styles/`: Global stylesheets and Tailwind configurations.
- `types/`: TypeScript type definitions.
- `public/`: Static assets such as images and icons.

## Data Flow

1. **User Interaction:** The user interacts with the UI (built with React components in `pages/` and `components/`).
2. **Data Fetching:** The application makes API calls to GitHub's API to fetch user data (often via helper functions in `lib/` or API routes in `pages/api/`).
3. **State Management:** The fetched data is managed using React state and passed down to components as props.
4. **Rendering:** The data is processed and presented to the user through the styled components.
