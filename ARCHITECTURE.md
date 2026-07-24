# Architecture Documentation

## Project Overview
Github-User-Analyser is a web application designed to analyze GitHub user profiles. It provides comprehensive insights into a user's GitHub activity, repositories, and statistics by leveraging the GitHub API. The application is built to be fast, responsive, and visually appealing, allowing users to easily digest complex data through intuitive charts and metrics.

## System Data Flow

The following Mermaid diagram illustrates the flow of data from user interaction to the GitHub API and back:

`mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant G as GitHub GraphQL
    
    U->>F: Enters GitHub username
    F->>A: Requests user data
    A->>G: Authenticated GraphQL Query
    G-->>A: Returns user data
    A-->>F: Formatted response
    F-->>U: Renders charts & metrics
`

## Tech Stack
- **Frontend / Framework:** Next.js (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Testing:** Jest

## Directory Structure
- pages/: Contains the Next.js pages and backend endpoints under pages/api/.
- components/: Contains reusable React components.
- lib/: Contains utility functions and library wrappers.
- hooks/: Custom React hooks for state management.
- styles/: Global stylesheets and Tailwind configurations.
- 	ypes/: TypeScript type definitions.
- public/: Static assets such as images and icons.

## Component Breakdown
1. **Search Interface:** Captures the GitHub username input.
2. **Profile Dashboard:** Aggregates and displays the retrieved data.
3. **Statistics Views:** Visual representations of user metrics.
4. **API Routes:** Server-side handlers that communicate with the GitHub GraphQL API.
