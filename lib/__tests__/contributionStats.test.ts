import {
  computeCurrentStreak,
  computeProductivityStats,
} from "@/lib/contributionStats";
import type { ContributionDay, ContributionWeek } from "@/types/github";

/**
 * computeCurrentStreak reads the current UTC date to decide whether the final
 * day is an in-progress "today". We pin the clock to a fixed date so the ±1-day
 * boundary logic is deterministic and not flaky across the day the suite runs.
 */
const TODAY = "2026-06-15";
const NOW_MS = new Date(`${TODAY}T12:00:00.000Z`).getTime();

function day(date: string, count: number): ContributionDay {
  return { date, count };
}

/** Build consecutive daily entries ending on `endDate`, oldest first. */
function consecutiveDays(endDate: string, counts: number[]): ContributionDay[] {
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return counts.map((count, i) => {
    const d = new Date(end - (counts.length - 1 - i) * dayMs);
    return day(d.toISOString().slice(0, 10), count);
  });
}

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW_MS);
});

afterAll(() => {
  jest.useRealTimers();
});

describe("computeCurrentStreak", () => {
  it("returns 0 for empty input", () => {
    expect(computeCurrentStreak([])).toBe(0);
  });

  it("counts a simple run of consecutive non-zero days ending today", () => {
    const days = consecutiveDays(TODAY, [1, 2, 3, 4]); // 4 consecutive active days ending today
    expect(computeCurrentStreak(days)).toBe(4);
  });

  it("skips a trailing zero-count TODAY (in-progress day) and counts back from yesterday", () => {
    // ...3 active days, then today has 0 (not yet committed). Streak should be 3, not 0.
    const days = consecutiveDays(TODAY, [5, 5, 5, 0]);
    expect(computeCurrentStreak(days)).toBe(3);
  });

  it("does NOT skip a trailing zero more than a day in the past (genuine gap → streak 0)", () => {
    // Data ends 10 days ago with a zero. That trailing zero is a real gap, not
    // an in-progress today, so the streak has ended → 0.
    const staleEnd = new Date(NOW_MS - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const days = consecutiveDays(staleEnd, [5, 5, 5, 0]);
    expect(computeCurrentStreak(days)).toBe(0);
  });

  it("ends the streak at a gap (zero day) before today", () => {
    // [1, 0, 2, 3] ending today → only the trailing 2,3 count → streak 2
    const days = consecutiveDays(TODAY, [1, 0, 2, 3]);
    expect(computeCurrentStreak(days)).toBe(2);
  });

  it("counts a non-zero today as part of the streak (no skip)", () => {
    const days = consecutiveDays(TODAY, [0, 4, 4, 4]);
    expect(computeCurrentStreak(days)).toBe(3);
  });

  it("treats the final day within +1 day of today (yesterday) as current when zero", () => {
    // Ends yesterday with a zero → within ±1 day → skipped → counts back from the day before
    const yesterday = new Date(NOW_MS - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const days = consecutiveDays(yesterday, [7, 7, 0]);
    expect(computeCurrentStreak(days)).toBe(2);
  });
});

describe("computeProductivityStats", () => {
  function weekOf(days: ContributionDay[]): ContributionWeek {
    return { contributionDays: days };
  }

  it("computes longest streak across the whole window, independent of the current streak", () => {
    // A long past streak (5) then a gap then a short current streak (2).
    const days = [
      ...consecutiveDays("2026-05-01", [1, 1, 1, 1, 1]), // 5-day run in the past
      day("2026-05-10", 0), // gap
      ...consecutiveDays(TODAY, [2, 2]), // current 2-day run ending today
    ];
    const stats = computeProductivityStats([weekOf(days)]);
    expect(stats.longestStreak).toBe(5);
    expect(stats.currentStreak).toBe(2);
  });

  it("selects the single most productive day by count", () => {
    const days = [
      day("2026-06-01", 3),
      day("2026-06-02", 11),
      day("2026-06-03", 7),
    ];
    const stats = computeProductivityStats([weekOf(days)]);
    expect(stats.mostProductiveDay).toEqual({ date: "2026-06-02", count: 11 });
  });

  it("returns null for mostProductiveDay when there are no days", () => {
    const stats = computeProductivityStats([]);
    expect(stats.mostProductiveDay).toBeNull();
  });

  it("returns null for mostProductiveDay when every day has zero contributions", () => {
    // A brand-new / inactive account: a full window of zero-count days must not
    // report a bogus "most productive day" (the first day) with count 0.
    const days = [
      day("2026-06-01", 0),
      day("2026-06-02", 0),
      day("2026-06-03", 0),
    ];
    const stats = computeProductivityStats([weekOf(days)]);
    expect(stats.mostProductiveDay).toBeNull();
  });

  it("splits weekday vs weekend totals using UTC day-of-week", () => {
    // 2026-06-13 is a Saturday, 2026-06-14 a Sunday (weekend); 2026-06-15 Monday (weekday).
    const days = [
      day("2026-06-13", 4),
      day("2026-06-14", 6),
      day("2026-06-15", 5),
    ];
    const stats = computeProductivityStats([weekOf(days)]);
    expect(stats.weekendCount).toBe(10); // 4 + 6
    expect(stats.weekdayCount).toBe(5); // Monday
  });

  it("produces monthlyTotals in chronological order across month boundaries", () => {
    const days = [
      day("2026-04-20", 2),
      day("2026-05-05", 3),
      day("2026-06-01", 4),
    ];
    const stats = computeProductivityStats([weekOf(days)]);
    expect(stats.monthlyTotals.map((m) => m.count)).toEqual([2, 3, 4]);
    // Months should be ascending (Apr, May, Jun)
    expect(stats.monthlyTotals[0].month).toContain("Apr");
    expect(stats.monthlyTotals[2].month).toContain("Jun");
  });

  it("flattens and sorts unordered weeks before computing (order-independent input)", () => {
    // Provide weeks out of order; the up-front sort should still yield a correct streak.
    const older = weekOf(consecutiveDays("2026-06-08", [1, 1, 1, 1, 1, 1, 1]));
    const newer = weekOf(consecutiveDays(TODAY, [1, 1, 1, 1, 1, 1, 1]));
    const stats = computeProductivityStats([newer, older]); // deliberately reversed
    // 14 consecutive active days ending today
    expect(stats.currentStreak).toBe(14);
    expect(stats.longestStreak).toBe(14);
  });
});
