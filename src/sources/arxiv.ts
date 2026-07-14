import * as cheerio from "cheerio";
import { ArxivPaper, ArxivPaperSchema, SourceReport } from "../types";
import { log, sleep } from "../utils";

const ARXIV_API =
  "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=10&start=0";

/**
 * Fetch latest AI papers from ArXiv.
 * Respects ArXiv rate limits with a 3s delay before the request.
 */
export async function fetchArxiv(): Promise<SourceReport> {
  const sourceName = "arxiv" as const;

  try {
    log("info", "Fetching ArXiv papers (waiting 3s for rate limit)...");
    await sleep(3000);

    const response = await fetch(ARXIV_API);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xml: { xmlMode: true } });

    const papers: ArxivPaper[] = [];

    $("entry").each((_, entry) => {
      if (papers.length >= 10) return false;

      const $entry = $(entry);

      const title = $entry.find("title").text().trim().replace(/\s+/g, " ");
      const id = $entry.find("id").text().trim();

      // Collect authors (first 3)
      const authorEls = $entry.find("author name");
      const authorNames: string[] = [];
      authorEls.each((_, el) => {
        if (authorNames.length >= 3) return false;
        authorNames.push($(el).text().trim());
      });
      const authors =
        authorNames.join(", ") +
        (authorEls.length > 3 ? ` et al. (${authorEls.length} total)` : "");

      // Summary — first 300 chars
      const fullSummary = $entry.find("summary").text().trim();
      const summary =
        fullSummary.length > 300
          ? fullSummary.slice(0, 300).replace(/\s+\S*$/, "") + "…"
          : fullSummary;

      const published = $entry.find("published").text().trim();

      if (!title || !id) return; // Skip malformed entries

      const paper: ArxivPaper = {
        title,
        url: id,
        authors,
        summary,
        published,
      };

      const parsed = ArxivPaperSchema.safeParse(paper);
      if (parsed.success) {
        papers.push(parsed.data);
      } else {
        log("warn", `Skipping malformed ArXiv entry: ${title}`, {
          errors: parsed.error.issues,
        });
      }
    });

    log("info", `ArXiv: parsed ${papers.length} papers`);

    return {
      sourceName,
      entries: papers,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `ArXiv fetch failed: ${message}`);
    return {
      sourceName,
      entries: [],
      error: message,
    };
  }
}
