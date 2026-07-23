import {
  computeContributionTrend,
  computeLanguageProfile,
} from "@/lib/insightSignals";
import type { Repository } from "@/types/github";

const month = (m: string, count: number) => ({ month: m, count });

// Helper: a chronological series (oldest → newest), as computeProductivityStats emits.
const series = (...counts: number[]) => counts.map((c, i) => month(`M${i}`, c));

describe("computeContributionTrend", () => {
  it("returns null when there is not enough history to compare", () => {
    expect(computeContributionTrend([])).toBeNull();
    expect(computeContributionTrend(undefined)).toBeNull();
    expect(computeContributionTrend(series(10))).toBeNull();
  });

  it("reports acceleration when recent months outpace the previous ones", () => {
    // 6 full months + a trailing in-progress month that gets excluded.
    const trend = computeContributionTrend(series(10, 10, 10, 40, 40, 40, 1));
    expect(trend).not.toBeNull();
    expect(trend!.direction).toBe("accelerating");
    expect(trend!.recentAvgPerMonth).toBe(40);
    expect(trend!.previousAvgPerMonth).toBe(10);
    expect(trend!.changePct).toBe(300);
    expect(trend!.monthsCompared).toBe(3);
  });

  it("reports cooling when recent months fall away", () => {
    const trend = computeContributionTrend(series(50, 50, 50, 10, 10, 10, 1));
    expect(trend!.direction).toBe("cooling");
    expect(trend!.changePct).toBe(-80);
  });

  it("reports steady when the change is inside the noise threshold", () => {
    // 100 -> 105 is +5%, below the 15% threshold.
    const trend = computeContributionTrend(
      series(100, 100, 100, 105, 105, 105, 1),
    );
    expect(trend!.direction).toBe("steady");
  });

  it("excludes the in-progress final month, which would otherwise fake a decline", () => {
    // Six identical months, then a partial current month with almost nothing in it.
    // Included, it would drag the recent average down and report a false "cooling".
    const withPartial = computeContributionTrend(
      series(30, 30, 30, 30, 30, 30, 2),
    );
    expect(withPartial!.direction).toBe("steady");
    expect(withPartial!.recentAvgPerMonth).toBe(30);

    // Opting out proves the partial month is what would have skewed it.
    const notExcluded = computeContributionTrend(
      series(30, 30, 30, 30, 30, 30, 2),
      {
        excludeCurrentMonth: false,
      },
    );
    expect(notExcluded!.direction).toBe("cooling");
  });

  it("treats ramping up from zero as acceleration without dividing by zero", () => {
    const trend = computeContributionTrend(series(0, 0, 0, 20, 20, 20, 5));
    expect(trend!.direction).toBe("accelerating");
    expect(trend!.changePct).toBeNull(); // no baseline — a percentage would be meaningless
    expect(Number.isFinite(trend!.recentAvgPerMonth)).toBe(true);
  });

  it("stays steady when there is no activity at all", () => {
    const trend = computeContributionTrend(series(0, 0, 0, 0, 0, 0, 0));
    expect(trend!.direction).toBe("steady");
  });
});

function repo(partial: Partial<Repository>): Repository {
  return {
    name: "r",
    description: "",
    html_url: "",
    stargazers_count: 0,
    forks_count: 0,
    language: "",
    updated_at: new Date().toISOString(),
    ...partial,
  } as Repository;
}

describe("computeLanguageProfile", () => {
  const now = new Date("2026-07-01T00:00:00Z");
  const recently = "2026-06-20T00:00:00Z"; // within 90 days
  const longAgo = "2024-01-01T00:00:00Z"; // outside 90 days

  it("handles an empty repo list", () => {
    const profile = computeLanguageProfile([], { now });
    expect(profile.languageCount).toBe(0);
    expect(profile.primaryLanguage).toBeNull();
    expect(profile.primaryLanguageSharePct).toBeNull();
    expect(profile.secondaryLanguages).toEqual([]);
    expect(profile.recentLanguages).toEqual([]);
  });

  it("weights languages by bytes and identifies the primary one", () => {
    const profile = computeLanguageProfile(
      [
        repo({
          updated_at: longAgo,
          languages: [
            { name: "TypeScript", bytes: 8000 },
            { name: "CSS", bytes: 2000 },
          ],
        }),
      ],
      { now },
    );
    expect(profile.primaryLanguage).toBe("TypeScript");
    expect(profile.primaryLanguageSharePct).toBe(80);
    expect(profile.languageCount).toBe(2);
    expect(profile.secondaryLanguages).toContain("CSS"); // 20% clears the 5% floor
  });

  it("drops trivial languages from the secondary list", () => {
    const profile = computeLanguageProfile(
      [
        repo({
          updated_at: longAgo,
          languages: [
            { name: "Go", bytes: 9900 },
            { name: "Makefile", bytes: 1 }, // ~0.01% — noise, not a skill
          ],
        }),
      ],
      { now },
    );
    expect(profile.primaryLanguage).toBe("Go");
    expect(profile.secondaryLanguages).not.toContain("Makefile");
  });

  it("reports only recently-touched repos as current focus", () => {
    const profile = computeLanguageProfile(
      [
        repo({
          updated_at: recently,
          languages: [{ name: "Rust", bytes: 100 }],
        }),
        repo({ updated_at: longAgo, languages: [{ name: "PHP", bytes: 100 }] }),
      ],
      { now },
    );
    expect(profile.recentLanguages).toContain("Rust");
    expect(profile.recentLanguages).not.toContain("PHP");
    // Both still count toward overall breadth.
    expect(profile.languageCount).toBe(2);
  });

  it("falls back to the repo primary language when byte detail is absent (REST path)", () => {
    const profile = computeLanguageProfile(
      [
        repo({
          language: "Python",
          updated_at: recently,
          languages: undefined,
        }),
        repo({ language: "Python", updated_at: longAgo, languages: undefined }),
        repo({ language: "Ruby", updated_at: longAgo, languages: undefined }),
      ],
      { now },
    );
    expect(profile.primaryLanguage).toBe("Python");
    expect(profile.languageCount).toBe(2);
    expect(profile.recentLanguages).toEqual(["Python"]);
  });

  it("ignores repos with no language information", () => {
    const profile = computeLanguageProfile(
      [repo({ language: "", updated_at: recently, languages: [] })],
      { now },
    );
    expect(profile.languageCount).toBe(0);
    expect(profile.primaryLanguage).toBeNull();
  });
});
