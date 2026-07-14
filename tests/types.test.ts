import { describe, expect, test } from "bun:test";
import {
  GitHubRepoSchema,
  HNStorySchema,
  ArxivPaperSchema,
  SourceReportSchema,
  DigestInputSchema,
  DigestOutputSchema,
  AI_KEYWORDS,
  MAX_DIGEST_LENGTH,
} from "../src/types";

describe("GitHubRepoSchema", () => {
  test("parses valid repo", () => {
    const result = GitHubRepoSchema.safeParse({
      fullName: "microsoft/vscode",
      url: "https://github.com/microsoft/vscode",
      description: "Visual Studio Code",
      language: "TypeScript",
      stars: 162847,
      starsGained: 245,
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid repo", () => {
    const result = GitHubRepoSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  test("requires fullName", () => {
    const result = GitHubRepoSchema.safeParse({
      fullName: "",
      url: "https://github.com/a/b",
      description: "",
      language: "",
      stars: 0,
      starsGained: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("HNStorySchema", () => {
  test("parses valid story", () => {
    const result = HNStorySchema.safeParse({
      title: "Show HN: My Project",
      url: "https://example.com",
      points: 100,
      numComments: 50,
      author: "user123",
      createdAt: "2026-07-14T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("handles null url", () => {
    const result = HNStorySchema.safeParse({
      title: "Ask HN: Question",
      url: null,
      points: 10,
      numComments: 5,
      author: "asker",
      createdAt: "2026-07-14T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("ArxivPaperSchema", () => {
  test("parses valid paper", () => {
    const result = ArxivPaperSchema.safeParse({
      title: "Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      authors: "Vaswani et al.",
      summary: "A new architecture...",
      published: "2017-06-12T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("SourceReportSchema", () => {
  test("parses with entries", () => {
    const result = SourceReportSchema.safeParse({
      sourceName: "github-trending",
      entries: [
        {
          fullName: "a/b",
          url: "https://github.com/a/b",
          description: "desc",
          language: "TS",
          stars: 100,
          starsGained: 10,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("parses with error", () => {
    const result = SourceReportSchema.safeParse({
      sourceName: "hackernews",
      entries: [],
      error: "Network error",
    });
    expect(result.success).toBe(true);
  });
});

describe("DigestOutputSchema", () => {
  test("validates digest output", () => {
    const result = DigestOutputSchema.safeParse({
      markdown: "# Report\n\nContent here",
      sourcesStatus: { "github-trending": "✅ 10 entries" },
    });
    expect(result.success).toBe(true);
  });
});

describe("AI_KEYWORDS", () => {
  test("has exactly 15 keywords", () => {
    expect(AI_KEYWORDS.length).toBe(15);
  });

  test("all are non-empty strings", () => {
    for (const kw of AI_KEYWORDS) {
      expect(kw.length).toBeGreaterThan(0);
    }
  });
});

describe("MAX_DIGEST_LENGTH", () => {
  test("is a reasonable value", () => {
    expect(MAX_DIGEST_LENGTH).toBeGreaterThan(1000);
    expect(MAX_DIGEST_LENGTH).toBeLessThan(5000);
  });
});
