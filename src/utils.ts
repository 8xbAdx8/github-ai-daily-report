/**
 * Truncate Markdown text at the nearest paragraph boundary within maxLen.
 * Preserves complete paragraphs — never cuts mid-sentence.
 */
export function truncateMarkdown(md: string, maxLen: number): string {
  if (md.length <= maxLen) return md;

  // Split by paragraph boundaries (double newline)
  const paragraphs = md.split(/\n\n+/);
  let result = "";
  for (const para of paragraphs) {
    const candidate = result ? result + "\n\n" + para : para;
    if (candidate.length > maxLen) break;
    result = candidate;
  }

  // If even the first paragraph is too long, cut at the last sentence boundary
  if (!result && paragraphs.length > 0) {
    const first = paragraphs[0];
    if (first.length > maxLen) {
      const sentences = first.split(/(?<=[。.！!？?\n])\s*/);
      let partial = "";
      for (const s of sentences) {
        if (partial.length + s.length > maxLen - 20) break;
        partial += s;
      }
      return partial + "…";
    }
    return first;
  }

  return result ? result + "\n\n…" : md.slice(0, maxLen - 3) + "…";
}

/**
 * Format a Date as YYYY-MM-DD string (UTC).
 */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Promise-based sleep.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simple console logger with ISO timestamps.
 */
export function log(
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
): void {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const extraStr = extra ? " " + JSON.stringify(extra) : "";
  const line = `${prefix} ${message}${extraStr}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
