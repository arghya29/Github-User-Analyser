import type { Repository } from "@/types/github";

export interface RepoHealthSummary {
  repoName: string;
  score: number;
  label: string;
  hasLicense: boolean;
  hasDescription: boolean;
  isRecent: boolean;
  openIssues: number;
}

export function computeHealthScore(repo: Repository): number {
  let score = 50;

  const daysSinceUpdate =
    (Date.now() - new Date(repo.updated_at).getTime()) / 86400000;
  if (daysSinceUpdate < 30) score += 20;
  else if (daysSinceUpdate < 90) score += 10;
  else if (daysSinceUpdate > 365) score -= 15;

  if (repo.description) score += 10;
  if (repo.license) score += 10;

  const openIssues = repo.open_issues_count ?? 0;
  if (openIssues === 0) score += 10;
  else if (openIssues < 5) score += 5;
  else if (openIssues > 20) score -= 10;

  if ((repo.stargazers_count ?? 0) > 0) score += 5;
  if ((repo.forks_count ?? 0) > 0) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function getHealthLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

export function getHealthColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getHealthBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export function summarizeReposHealth(repos: Repository[]): RepoHealthSummary[] {
  return repos.map((repo) => {
    const score = computeHealthScore(repo);
    const daysSinceUpdate =
      (Date.now() - new Date(repo.updated_at).getTime()) / 86400000;
    return {
      repoName: repo.name,
      score,
      label: getHealthLabel(score),
      hasLicense: !!repo.license,
      hasDescription: !!repo.description,
      isRecent: daysSinceUpdate < 90,
      openIssues: repo.open_issues_count ?? 0,
    };
  });
}
