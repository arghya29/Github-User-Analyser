import { useState } from "react";
import type { GitHubUser, Repository, ProductivityStats } from "@/types/github";

interface AiInsightPanelProps {
  user: GitHubUser;
  repos: Repository[];
  totalContributions: number | null;
  productivity: ProductivityStats | null;
}

import {
  computeContributionTrend,
  computeLanguageProfile,
} from "@/lib/insightSignals";

type InsightType =
  | "bio"
  | "roast"
  | "consistency"
  | "growth"
  | "learning"
  | "resume"
  | "linkedin"
  | "skill-gap";
type ToneType = "Professional" | "Casual" | "Tech-Heavy";
type LengthType = "Short" | "Detailed";

function buildTopRepos(repos: Repository[]) {
  return [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
    }));
}

function buildTopLanguages(repos: Repository[]): string[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
}

function parseLinkedInResponse(rawText: string) {
  const headlines: string[] = [];
  let summary = "";

  const headlinesMatch = rawText.match(
    /---HEADLINES---([\s\S]*?)(?:---SUMMARY---|$)/i,
  );
  const summaryMatch = rawText.match(/---SUMMARY---([\s\S]*)/i);

  if (headlinesMatch && headlinesMatch[1]) {
    headlinesMatch[1]
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter((line) => line.length > 0)
      .forEach((line) => headlines.push(line));
  }

  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  }

  // Fallback if formatting was not exactly followed
  if (headlines.length === 0 && !summary) {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    return {
      headlines: lines.slice(0, Math.min(3, lines.length)),
      summary: lines.slice(Math.min(3, lines.length)).join("\n"),
    };
  }

  return { headlines, summary };
}

export default function AiInsightPanel({
  user,
  repos,
  totalContributions,
  productivity,
}: AiInsightPanelProps) {
  const [activeType, setActiveType] = useState<InsightType | null>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New states for UI Customization (Phase 2)
  const [bioTone, setBioTone] = useState<ToneType>("Professional");
  const [bioLength, setBioLength] = useState<LengthType>("Short");

  const generate = async (type: InsightType) => {
    setActiveType(type);
    setLoading(true);
    setError("");
    setText(null);
    setCopiedId(null);

    const total = productivity
      ? productivity.weekdayCount + productivity.weekendCount
      : 0;
    const weekdayPct =
      productivity && total > 0
        ? Math.round((productivity.weekdayCount / total) * 100)
        : undefined;
    const weekendPct = weekdayPct !== undefined ? 100 - weekdayPct : undefined;
    const mostProductiveDay = productivity?.mostProductiveDay
      ? `${productivity.mostProductiveDay.date} (${productivity.mostProductiveDay.count} contributions)`
      : undefined;
    // Growth/learning signals, derived from data the panel already receives —
    // productivity.monthlyTotals and the repo list — so neither mode costs an
    // extra GitHub request.
    const trend = computeContributionTrend(productivity?.monthlyTotals);
    const languageProfile = computeLanguageProfile(repos);

    // Tone and length apply to every analytical insight, not the roast.
    const usesToneLength = type !== "roast";

    try {
      const response = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          username: user.login,
          bio: user.bio,
          topLanguages: buildTopLanguages(repos),
          topRepos: buildTopRepos(repos),
          totalContributions: totalContributions ?? undefined,
          currentStreak: productivity?.currentStreak,
          longestStreak: productivity?.longestStreak,
          weekdayPct,
          weekendPct,
          mostProductiveDay,
          contributionTrend: trend?.direction,
          contributionChangePct: trend?.changePct ?? undefined,
          recentAvgPerMonth: trend?.recentAvgPerMonth,
          previousAvgPerMonth: trend?.previousAvgPerMonth,
          languageCount: languageProfile.languageCount,
          primaryLanguageSharePct:
            languageProfile.primaryLanguageSharePct ?? undefined,
          secondaryLanguages: languageProfile.secondaryLanguages,
          recentLanguages: languageProfile.recentLanguages,
          // Tone and length apply to every analytical insight
          tone: usesToneLength ? bioTone : undefined,
          length: usesToneLength ? bioLength : undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      if (!response.ok || !data) {
        setError(
          data?.error || "Failed to generate AI insight — please try again",
        );
      } else if (data.error) {
        setError(data.error);
      } else if (!text) {
        setError("Failed to generate AI insight — please try again");
      } else {
        setText(text);
      }
    } catch {
      setError("Failed to generate AI insight — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = async (textToCopy: string, id: string) => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText)
        return;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard access denied — silently ignore
    }
  };

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        AI Insights
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Generated by AI from this profile&apos;s public data — for fun,
        double-check before using anywhere serious.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          Tone:
          <select
            value={bioTone}
            onChange={(e) => setBioTone(e.target.value as ToneType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="Professional">Professional</option>
            <option value="Casual">Casual</option>
            <option value="Tech-Heavy">Tech-Heavy</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          Length:
          <select
            value={bioLength}
            onChange={(e) => setBioLength(e.target.value as LengthType)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="Short">Short Summary</option>
            <option value="Detailed">Detailed</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => generate("bio")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "bio" ? "Writing..." : "Generate Bio"}
        </button>
        <button
          onClick={() => generate("roast")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "roast" ? "Cooking..." : "Roast or Toast"}
        </button>
        <button
          onClick={() => generate("consistency")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "consistency"
            ? "Analyzing..."
            : "Consistency"}
        </button>
        <button
          onClick={() => generate("growth")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "growth" ? "Assessing..." : "Growth"}
        </button>
        <button
          onClick={() => generate("learning")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "learning" ? "Reviewing..." : "Learning"}
        </button>
        <button
          onClick={() => generate("resume")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "resume" ? "Writing..." : "Resume Bullets"}
        </button>
        <button
          onClick={() => generate("linkedin")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "linkedin"
            ? "Optimizing..."
            : "LinkedIn Profile"}
        </button>
        <button
          onClick={() => generate("skill-gap")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg transition-colors"
        >
          {loading && activeType === "skill-gap" ? "Analyzing..." : "Skill Gap"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
          {error}
        </p>
      )}

      {text &&
        (() => {
          if (activeType === "resume" || activeType === "skill-gap") {
            const items = text
              .split("\n")
              .map((line) => line.trim())
              .filter(
                (line) =>
                  line.startsWith("-") ||
                  line.startsWith("*") ||
                  line.startsWith("•") ||
                  /^\d+\./.test(line),
              )
              .map((line) =>
                line
                  .replace(/^[-*•]\s*/, "")
                  .replace(/^\d+\.\s*/, "")
                  .trim(),
              );

            const finalItems =
              items.length > 0
                ? items
                : text
                    .split("\n")
                    .map((l) => l.trim())
                    .filter((l) => l.length > 0);

            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {activeType === "resume"
                      ? "Recruiter Ready Bullet Points"
                      : "Complementary Technologies to Learn"}
                  </span>
                  <button
                    onClick={() => handleCopyText(text, "all")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-all shadow-sm"
                  >
                    {copiedId === "all" ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 text-emerald-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Copied All!
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy All
                      </>
                    )}
                  </button>
                </div>

                <ul className="space-y-2.5">
                  {finalItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="group flex items-start justify-between gap-4 p-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                    >
                      <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1">
                        • {item}
                      </span>
                      <button
                        onClick={() => handleCopyText(item, `item-${idx}`)}
                        aria-label="Copy bullet point"
                        className="flex items-center justify-center p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-all opacity-80 group-hover:opacity-100"
                        title="Copy bullet point"
                      >
                        {copiedId === `item-${idx}` ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-emerald-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          if (activeType === "linkedin") {
            const parsed = parseLinkedInResponse(text);
            return (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Suggested Headlines
                    </span>
                  </div>
                  <div className="space-y-2">
                    {parsed.headlines.map((hl, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 rounded-lg hover:border-cyan-400 dark:hover:border-cyan-500 transition-all duration-200"
                      >
                        <span className="text-gray-700 dark:text-gray-300 text-sm font-medium flex-1">
                          {hl}
                        </span>
                        <button
                          onClick={() => handleCopyText(hl, `headline-${idx}`)}
                          aria-label="Copy Headline"
                          className="flex items-center justify-center p-1.5 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-all opacity-80 group-hover:opacity-100"
                          title="Copy Headline"
                        >
                          {copiedId === `headline-${idx}` ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-emerald-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {parsed.summary && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        About / Summary
                      </span>
                      <button
                        onClick={() =>
                          handleCopyText(parsed.summary, "linkedin-summary")
                        }
                        className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                      >
                        {copiedId === "linkedin-summary"
                          ? "Copied Summary!"
                          : "Copy Summary"}
                      </button>
                    </div>
                    <div className="p-3.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {parsed.summary}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() =>
                      handleCopyText(
                        [...parsed.headlines, parsed.summary]
                          .filter(Boolean)
                          .join("\n\n"),
                        "linkedin-full",
                      )
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition-all shadow-sm"
                  >
                    {copiedId === "linkedin-full" ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 text-emerald-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Copied Full Output!
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy Full Output
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {text}
              </p>
              {activeType !== null && activeType !== "roast" && (
                <button
                  onClick={() => handleCopyText(text, "plain")}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {copiedId === "plain" ? "Copied!" : "Copy to clipboard"}
                </button>
              )}
            </div>
          );
        })()}
    </div>
  );
}
