import { ArxivPaper, GitHubRepo, HNStory } from "./types";

// ─── Section emojis ───
const SECTION_ICONS: Record<string, string> = {
  "github-trending": "🔥",
  hackernews: "💬",
  arxiv: "📄",
};

const SECTION_TITLES: Record<string, string> = {
  "github-trending": "GitHub 今日热门",
  hackernews: "Hacker News 热论",
  arxiv: "ArXiv 最新论文",
};

/**
 * Format a single entry for raw listing mode.
 */
type EntryFormatter = (entry: unknown) => string;

const ENTRY_FORMATTERS: Record<string, EntryFormatter> = {
  "github-trending": (entry) => {
    const repo = entry as GitHubRepo;
    const lang = repo.language !== "Unknown" ? ` \`${repo.language}\`` : "";
    return `⭐ +${repo.starsGained} | [${repo.fullName}](${repo.url})${lang} — ${repo.description}`;
  },
  hackernews: (entry) => {
    const story = entry as HNStory;
    return `💬 ${story.points}pts | [${story.title}](${story.url}) — by ${story.author}`;
  },
  arxiv: (entry) => {
    const paper = entry as ArxivPaper;
    return `📄 [${paper.title}](${paper.url}) — ${paper.authors}`;
  },
};

/**
 * Build a raw listing section for a source.
 * Returns a Markdown section string, or null if no entries.
 */
export function rawListSection(
  sourceName: string,
  entries: unknown[]
): string | null {
  const icon = SECTION_ICONS[sourceName] ?? "📌";
  const title = SECTION_TITLES[sourceName] ?? sourceName;
  const formatter = ENTRY_FORMATTERS[sourceName];

  if (!entries.length || !formatter) return null;

  const lines = entries
    .map((entry) => `- ${formatter(entry)}`)
    .join("\n");

  return `## ${icon} ${title}\n\n${lines}`;
}

/**
 * Format a section using a custom per-entry formatter.
 */
export function formatSection<T>(
  icon: string,
  title: string,
  entries: T[],
  formatter: (entry: T) => string
): string {
  if (!entries.length) return "";
  const lines = entries.map((entry) => `- ${formatter(entry)}`).join("\n");
  return `## ${icon} ${title}\n\n${lines}`;
}
