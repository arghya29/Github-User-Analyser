import { formatAsJSON } from "@/lib/exportDataFormatter";
import type { UserData } from "@/types/github";

function userData(overrides: Record<string, unknown> = {}): UserData {
  return {
    user: {
      login: "octocat",
      name: "The Octocat",
      bio: "Building things",
      public_repos: 8,
      followers: 100,
      following: 10,
    },
    repos: [
      {
        name: "hello-world",
        description: "My first repo",
        stargazers_count: 5,
        forks_count: 2,
        language: "TypeScript",
        updated_at: "2026-01-01T00:00:00Z",
        html_url: "https://github.com/octocat/hello-world",
      },
    ],
    contributions: { totalContributions: 42 },
    engagement: null,
    productivity: null,
    ...overrides,
  } as unknown as UserData;
}

describe("formatAsJSON", () => {
  it("produces parseable JSON containing the expected top-level keys", () => {
    const parsed = JSON.parse(formatAsJSON(userData()));
    expect(parsed).toMatchObject({
      username: "octocat",
      name: "The Octocat",
      bio: "Building things",
      publicReposCount: 8,
      followers: 100,
      following: 10,
      totalContributions: 42,
      engagement: null,
      productivity: null,
    });
    expect(Array.isArray(parsed.repositories)).toBe(true);
    expect(parsed.repositories[0]).toMatchObject({
      name: "hello-world",
      stars: 5,
      forks: 2,
      language: "TypeScript",
    });
  });

  it("serializes without throwing when rich fields are null and repos empty", () => {
    const parsed = JSON.parse(
      formatAsJSON(
        userData({
          repos: undefined,
          contributions: null,
          engagement: null,
          productivity: null,
        }),
      ),
    );
    expect(parsed.totalContributions).toBe(0);
    expect(parsed.engagement).toBeNull();
    expect(parsed.productivity).toBeNull();
    expect(parsed.repositories).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    const data = userData();
    expect(formatAsJSON(data)).toBe(formatAsJSON(data));
  });
});
