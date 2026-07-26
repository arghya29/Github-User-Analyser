import { filterAndSortRepos } from "@/lib/repoFiltering";
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

const sample: Repository[] = [
  repo({
    name: "alpha",
    language: "TypeScript",
    stargazers_count: 10,
    forks_count: 1,
    updated_at: "2026-01-03T00:00:00Z",
  }),
  repo({
    name: "Beta",
    language: "Go",
    stargazers_count: 50,
    forks_count: 9,
    updated_at: "2026-01-01T00:00:00Z",
  }),
  repo({
    name: "gamma",
    language: "TypeScript",
    stargazers_count: 30,
    forks_count: 3,
    updated_at: "2026-01-05T00:00:00Z",
  }),
];

const NO_FILTER: string[] = [];

describe("filterAndSortRepos", () => {
  it("sorts by stars (descending) by default option", () => {
    const result = filterAndSortRepos(sample, "stars", NO_FILTER, "");
    expect(result.map((r) => r.name)).toEqual(["Beta", "gamma", "alpha"]);
  });

  it("sorts by forks descending", () => {
    const result = filterAndSortRepos(sample, "forks", NO_FILTER, "");
    expect(result.map((r) => r.name)).toEqual(["Beta", "gamma", "alpha"]);
  });

  it("sorts by most recently updated", () => {
    const result = filterAndSortRepos(sample, "updated", NO_FILTER, "");
    expect(result.map((r) => r.name)).toEqual(["gamma", "alpha", "Beta"]);
  });

  it("filters by active languages", () => {
    const result = filterAndSortRepos(sample, "stars", ["TypeScript"], "");
    expect(result.map((r) => r.name)).toEqual(["gamma", "alpha"]);
  });

  it("filters by a case-insensitive name query", () => {
    const result = filterAndSortRepos(sample, "stars", NO_FILTER, "BET");
    expect(result.map((r) => r.name)).toEqual(["Beta"]);
  });

  it("applies language filter, query, and sort together", () => {
    const result = filterAndSortRepos(sample, "stars", ["TypeScript"], "a");
    // TypeScript repos with 'a' in the name: alpha, gamma → sorted by stars desc
    expect(result.map((r) => r.name)).toEqual(["gamma", "alpha"]);
  });

  it("does not mutate the input array", () => {
    const input = [...sample];
    const snapshot = input.map((r) => r.name);
    filterAndSortRepos(input, "stars", NO_FILTER, "");
    expect(input.map((r) => r.name)).toEqual(snapshot);
  });
});
