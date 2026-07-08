# Metrics & Achievements Logic

This guide explains how developer metrics and achievements are calculated within the application.

## 1. Achievements Tracks

We track three primary statistics to award gamified achievement tiers:

| Achievement Track | Milestone Milestones | Formula |
| :--- | :--- | :--- |
| **Total Contributions** | `[100, 500, 1000, 2500, 5000, 10000]` | Total sum of all commits, issue requests, PRs, and review submissions in the last 365 days. |
| **Current Streak** | `[7, 30, 100, 365]` | Total number of consecutive days with at least one contribution. |
| **Pull Requests** | `[1, 10, 50, 100, 250]` | Total PR count submitted to public repositories. |

## 2. Productivity Index

Productivity stats are calculated in [contributionStats.ts](file:///c:/Users/babin/Desktop/ELUSoC_2026/Github-User-Analyser/lib/contributionStats.ts):

- **Weekday vs. Weekend**: Days are mapped using `Date.getDay()`. If the day index is `0` (Sunday) or `6` (Saturday), it increments the weekend counter. Else, it counts towards weekdays.
- **Streak Calculation**: We loop chronologically through the calendar days. If `day.count > 0`, the current streak increments. If it is `0`, the streak resets, saving the highest value as `longestStreak`.

## 3. Language Bytes Distribution

- **GraphQL Path**: Pulls actual language file size byte sums from GitHub's repository metadata nodes. Percentages are calculated as:
  $$\text{Percentage} = \left( \frac{\text{Bytes of Language } X}{\text{Total Repository Bytes}} \right) \times 100$$
- **REST Fallback**: When no token is configured, the system maps the primary language string of each repository to count usage frequency.
