import * as cheerio from "cheerio";
import { GitHubRepo, GitHubRepoSchema, SourceReport } from "../types";
import { log } from "../utils";

const TRENDING_URL = "https://github.com/trending?since=daily";

/**
 * Fetch GitHub Trending page and parse repositories.
 * Returns a SourceReport with parsed repos, or error field on failure.
 * Never throws — wraps all errors in the report.
 */
export async function fetchGitHubTrending(): Promise<SourceReport> {
  const sourceName = "github-trending" as const;

  try {
    log("info", "Fetching GitHub Trending...");
    const response = await fetch(TRENDING_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const repos: GitHubRepo[] = [];

    // Each trending repo is an <article> with class "Box-row"
    $("article.Box-row").each((_, article) => {
      if (repos.length >= 10) return false; // Stop after 10

      const $article = $(article);

      // Repo name is in h2 > a, href is /owner/repo
      const nameEl = $article.find("h2 a");
      const fullName = nameEl.attr("href")?.replace(/^\//, "").trim() ?? "";
      const url = fullName ? `https://github.com/${fullName}` : "";

      // Description is the first non-empty <p> in the article
      const description =
        $article
          .find("p")
          .first()
          .text()
          .trim()
          .replace(/\s+/g, " ") ?? "";

      // Language from itemprop attribute
      const language =
        $article
          .find('[itemprop="programmingLanguage"]')
          .text()
          .trim() ?? "";

      // Stars gained today and total stars are in span.d-inline-block
      const starSpans = $article.find("span.d-inline-block");
      const starsGainedStr = starSpans.first().text().trim();
      const starsStr = starSpans.last().text().trim();

      const starsGained = parseStarCount(starsGainedStr);
      const stars = parseStarCount(starsStr);

      if (!fullName) return; // Skip malformed entries

      const repo: GitHubRepo = {
        fullName,
        url,
        description: description || "No description",
        language: language || "Unknown",
        stars,
        starsGained,
      };

      // Validate with Zod
      const parsed = GitHubRepoSchema.safeParse(repo);
      if (parsed.success) {
        repos.push(parsed.data);
      } else {
        log("warn", `Skipping malformed repo entry: ${fullName}`, {
          errors: parsed.error.issues,
        });
      }
    });

    log("info", `GitHub Trending: parsed ${repos.length} repos`);

    return {
      sourceName,
      entries: repos,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `GitHub Trending fetch failed: ${message}`);
    return {
      sourceName,
      entries: [],
      error: message,
    };
  }
}

/**
 * Parse GitHub star count strings like "1,234" or "12.5k" to numbers.
 */
function parseStarCount(text: string): number {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned.endsWith("k")) {
    const num = parseFloat(cleaned.slice(0, -1));
    return Math.round(num * 1000);
  }
  return parseInt(cleaned, 10) || 0;
}
