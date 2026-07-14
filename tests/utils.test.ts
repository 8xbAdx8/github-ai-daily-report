import { describe, expect, test } from "bun:test";
import { truncateMarkdown, formatDate, sleep, log } from "../src/utils";

describe("truncateMarkdown", () => {
  test("returns full string when under maxLen", () => {
    const md = "# Title\n\nShort paragraph.";
    expect(truncateMarkdown(md, 100)).toBe(md);
  });

  test("truncates at paragraph boundary", () => {
    const md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const result = truncateMarkdown(md, 40);
    expect(result).toContain("…");
    expect(result).toContain("First paragraph");
    expect(result).not.toContain("Third paragraph");
  });

  test("handles single long paragraph", () => {
    const md = "A".repeat(100) + ". B".repeat(100) + ".";
    const result = truncateMarkdown(md, 50);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result).toContain("…");
  });

  test("short string unchanged", () => {
    const md = "Hello world";
    expect(truncateMarkdown(md, 100)).toBe(md);
  });
});

describe("formatDate", () => {
  test("formats UTC date as YYYY-MM-DD", () => {
    const date = new Date("2026-07-14T12:00:00Z");
    expect(formatDate(date)).toBe("2026-07-14");
  });

  test("handles single digit month/day with padding", () => {
    const date = new Date("2026-01-05T00:00:00Z");
    expect(formatDate(date)).toBe("2026-01-05");
  });
});

describe("sleep", () => {
  test("resolves after specified time", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe("log", () => {
  test("does not throw", () => {
    expect(() => log("info", "test message")).not.toThrow();
    expect(() => log("warn", "warning", { key: "val" })).not.toThrow();
    expect(() => log("error", "error message")).not.toThrow();
  });
});
