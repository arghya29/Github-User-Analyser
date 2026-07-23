import {
  aggregateLanguagesByBytes,
  aggregateLanguagesByCount,
  hasByteLanguageData,
} from "@/lib/repoStats";
import type { Repository } from "@/types/github";

function repo(overrides: Partial<Repository> = {}): Repository {
  return {
    name: "r",
    description: "",
    stargazers_count: 0,
    forks_count: 0,
    language: "",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Repository;
}

describe("aggregateLanguagesByBytes", () => {
  it("aggregates byte totals across repos and returns percentages summing sensibly", () => {
    const repos = [
      repo({
        languages: [
          { name: "TypeScript", bytes: 750 },
          { name: "CSS", bytes: 250 },
        ],
      }),
    ];
    const result = aggregateLanguagesByBytes(repos);
    expect(result).toEqual([
      { name: "TypeScript", value: 75 },
      { name: "CSS", value: 25 },
    ]);
  });

  it("combines the same language across multiple repos", () => {
    const repos = [
      repo({ languages: [{ name: "Go", bytes: 300 }] }),
      repo({
        languages: [
          { name: "Go", bytes: 100 },
          { name: "Python", bytes: 100 },
        ],
      }),
    ];
    const result = aggregateLanguagesByBytes(repos);
    // Go 400 / 500 = 80%, Python 100 / 500 = 20%
    expect(result).toEqual([
      { name: "Go", value: 80 },
      { name: "Python", value: 20 },
    ]);
  });

  it("rounds percentages to one decimal place", () => {
    const repos = [
      repo({
        languages: [
          { name: "A", bytes: 1 },
          { name: "B", bytes: 2 },
        ],
      }),
    ];
    const result = aggregateLanguagesByBytes(repos);
    // A = 1/3 = 33.333...% → 33.3 ; B = 2/3 = 66.666...% → 66.7
    expect(result).toEqual([
      { name: "B", value: 66.7 },
      { name: "A", value: 33.3 },
    ]);
  });

  it("sorts descending by percentage", () => {
    const repos = [
      repo({
        languages: [
          { name: "Small", bytes: 100 },
          { name: "Big", bytes: 900 },
        ],
      }),
    ];
    const result = aggregateLanguagesByBytes(repos);
    expect(result[0].name).toBe("Big");
    expect(result[1].name).toBe("Small");
  });

  it("returns an empty array when there is no byte data at all", () => {
    expect(
      aggregateLanguagesByBytes([repo({ languages: [] }), repo({})]),
    ).toEqual([]);
  });

  it("skips repos with no languages field but still aggregates the rest", () => {
    const repos = [
      repo({}), // no languages
      repo({ languages: [{ name: "Rust", bytes: 500 }] }),
    ];
    expect(aggregateLanguagesByBytes(repos)).toEqual([
      { name: "Rust", value: 100 },
    ]);
  });
});

describe("aggregateLanguagesByCount", () => {
  it("counts repos per primary language and sorts descending", () => {
    const repos = [
      repo({ language: "TypeScript" }),
      repo({ language: "TypeScript" }),
      repo({ language: "Python" }),
    ];
    expect(aggregateLanguagesByCount(repos)).toEqual([
      { name: "TypeScript", count: 2 },
      { name: "Python", count: 1 },
    ]);
  });

  it("ignores repos with no primary language", () => {
    const repos = [repo({ language: "" }), repo({ language: "Java" })];
    expect(aggregateLanguagesByCount(repos)).toEqual([
      { name: "Java", count: 1 },
    ]);
  });

  it("returns an empty array when no repo has a language", () => {
    expect(
      aggregateLanguagesByCount([
        repo({ language: "" }),
        repo({ language: "" }),
      ]),
    ).toEqual([]);
  });
});

describe("hasByteLanguageData", () => {
  it("returns true when at least one repo has non-empty languages", () => {
    expect(
      hasByteLanguageData([
        repo({}),
        repo({ languages: [{ name: "C", bytes: 10 }] }),
      ]),
    ).toBe(true);
  });

  it("returns false when no repo has language byte data", () => {
    expect(hasByteLanguageData([repo({}), repo({ languages: [] })])).toBe(
      false,
    );
  });

  it("returns false for an empty repo list", () => {
    expect(hasByteLanguageData([])).toBe(false);
  });
});
