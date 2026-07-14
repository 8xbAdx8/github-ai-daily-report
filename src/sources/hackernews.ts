import { AI_KEYWORDS, HNStory, HNStorySchema, SourceReport } from "../types";
import { log } from "../utils";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1/search";

/**
 * Fetch top AI-related Hacker News stories from the past 24 hours.
 * Runs 6 parallel Algolia queries (3 keywords each), deduplicates,
 * and returns the top 15 stories sorted by points.
 */
export async function fetchHackerNews(): Promise<SourceReport> {
  const sourceName = "hackernews" as const;

  try {
    log("info", "Fetching Hacker News AI stories...");

    // Build 6 query groups from the 15 AI_KEYWORDS (3 keywords per group)
    const queryGroups: string[] = [];
    const batchSize = 3;
    for (let i = 0; i < AI_KEYWORDS.length; i += batchSize) {
      const batch = AI_KEYWORDS.slice(i, i + batchSize);
      // OR-join the keywords
      queryGroups.push(batch.map((k) => `"${k}"`).join(" OR "));
    }

    // Unix timestamp for 24 hours ago
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

    // Fetch all 6 queries in parallel
    const fetches = queryGroups.map((query) => {
      const params = new URLSearchParams({
        query,
        tags: "story",
        numericFilters: `created_at_i>${oneDayAgo}`,
        hitsPerPage: "10",
      });
      return fetch(`${ALGOLIA_BASE}?${params}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .catch((err) => {
          log("warn", `HN query failed for "${query}": ${err.message}`);
          return { hits: [] };
        });
    });

    const results = await Promise.allSettled(fetches);

    // Collect and deduplicate hits
    const seen = new Set<string>();
    const stories: HNStory[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const hit of result.value.hits ?? []) {
        if (seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);

        const story: HNStory = {
          title: hit.title ?? "Untitled",
          url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points ?? 0,
          numComments: hit.num_comments ?? 0,
          author: hit.author ?? "unknown",
          createdAt: hit.created_at ?? new Date().toISOString(),
        };

        const parsed = HNStorySchema.safeParse(story);
        if (parsed.success) {
          stories.push(parsed.data);
        }
      }
    }

    // Sort by points descending, take top 15
    stories.sort((a, b) => b.points - a.points);
    const top15 = stories.slice(0, 15);

    log("info", `Hacker News: ${top15.length} AI stories from ${stories.length} total`);

    return {
      sourceName,
      entries: top15,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `Hacker News fetch failed: ${message}`);
    return {
      sourceName,
      entries: [],
      error: message,
    };
  }
}
