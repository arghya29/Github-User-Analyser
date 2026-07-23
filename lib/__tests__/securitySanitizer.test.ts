import {
  sanitizeUsername,
  sanitizeRepoName,
  escapeHtml,
  escapeCsvCell,
} from "@/lib/securitySanitizer";

// Note: this is the *throwing* sanitizer used by the API routes (e.g.
// pages/api/readme.ts). It is a different module from lib/validation.ts, which
// strips invalid characters instead of throwing — the two share function names
// but have deliberately different contracts, so both are worth covering.

describe("sanitizeUsername", () => {
  it("returns a valid username unchanged", () => {
    expect(sanitizeUsername("octocat")).toBe("octocat");
    expect(sanitizeUsername("a")).toBe("a");
    expect(sanitizeUsername("user-123")).toBe("user-123");
  });

  it("trims surrounding whitespace before validating", () => {
    expect(sanitizeUsername("  octocat  ")).toBe("octocat");
  });

  it("accepts the maximum length (39 chars) and rejects 40", () => {
    expect(sanitizeUsername("a".repeat(39))).toHaveLength(39);
    expect(() => sanitizeUsername("a".repeat(40))).toThrow(
      "Invalid username parameter format.",
    );
  });

  it("rejects leading and trailing hyphens", () => {
    expect(() => sanitizeUsername("-lead")).toThrow();
    expect(() => sanitizeUsername("trail-")).toThrow();
  });

  it("rejects empty input, spaces, and path-traversal characters", () => {
    expect(() => sanitizeUsername("")).toThrow();
    expect(() => sanitizeUsername("a b")).toThrow();
    expect(() => sanitizeUsername("../etc")).toThrow();
    expect(() => sanitizeUsername("a/b")).toThrow();
  });

  // Documents actual behavior: this regex permits consecutive internal hyphens
  // (unlike GitHub's own rule). Captured so a future tightening is a conscious change.
  it("permits consecutive internal hyphens (documented behavior)", () => {
    expect(sanitizeUsername("a--b")).toBe("a--b");
  });
});

describe("sanitizeRepoName", () => {
  it("returns a valid repo name unchanged", () => {
    expect(sanitizeRepoName("my.repo_name-1")).toBe("my.repo_name-1");
    expect(sanitizeRepoName("README.md")).toBe("README.md");
  });

  it("accepts the maximum length (100 chars) and rejects 101", () => {
    expect(sanitizeRepoName("a".repeat(100))).toHaveLength(100);
    expect(() => sanitizeRepoName("a".repeat(101))).toThrow(
      "Invalid repository parameter format.",
    );
  });

  it("rejects spaces and slash-based path traversal", () => {
    expect(() => sanitizeRepoName("repo name")).toThrow();
    expect(() => sanitizeRepoName("../../etc/passwd")).toThrow();
    expect(() => sanitizeRepoName("a/b")).toThrow();
  });

  // Documents actual behavior: `.` and `-`/`_` are legal repo characters, so a
  // dots-only name passes the regex. It is not a traversal risk at the call site
  // (pages/api/readme.ts) because the value is encodeURIComponent'd into a single
  // path segment before the GitHub request.
  it("permits a dots-only name (safe: callers encodeURIComponent it)", () => {
    expect(sanitizeRepoName("..")).toBe("..");
  });
});

describe("escapeHtml", () => {
  it("escapes all five HTML-sensitive characters", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(escapeHtml(`"'&`)).toBe("&quot;&#x27;&amp;");
  });

  it("escapes ampersands first, so already-encoded entities are double-escaped", () => {
    // Ordering matters: `&` is replaced before the others, so a literal "&amp;"
    // in the input becomes "&amp;amp;". This is correct for escaping raw text.
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });

  it("leaves a plain string untouched", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("escapeCsvCell", () => {
  it("neutralizes formula-injection lead characters by prefixing a quote", () => {
    // CWE-1236: leading = + - @ tab CR are treated as formulas by spreadsheets.
    expect(escapeCsvCell("=1+1")).toBe(`"'=1+1"`);
    expect(escapeCsvCell("+cmd")).toBe(`"'+cmd"`);
    expect(escapeCsvCell("-5")).toBe(`"'-5"`);
    expect(escapeCsvCell("@x")).toBe(`"'@x"`);
    expect(escapeCsvCell("\tlead")).toBe(`"'\tlead"`);
    expect(escapeCsvCell("\rlead")).toBe(`"'\rlead"`);
  });

  it("wraps in double quotes and doubles embedded quotes", () => {
    expect(escapeCsvCell('a"b')).toBe(`"a""b"`);
    expect(escapeCsvCell("a,b")).toBe(`"a,b"`);
    expect(escapeCsvCell("line1\nline2")).toBe(`"line1\nline2"`);
  });

  it("does not prefix a quote for a safe leading character", () => {
    expect(escapeCsvCell("plain")).toBe(`"plain"`);
    expect(escapeCsvCell("123")).toBe(`"123"`);
  });

  it("handles null, undefined, and non-string values", () => {
    expect(escapeCsvCell(null)).toBe(`""`);
    expect(escapeCsvCell(undefined)).toBe(`""`);
    expect(escapeCsvCell(123)).toBe(`"123"`);
    expect(escapeCsvCell(true)).toBe(`"true"`);
  });
});
