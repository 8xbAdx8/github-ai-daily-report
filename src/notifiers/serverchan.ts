import { log } from "../utils";

const SERVERCHAN_API = "https://sctapi.ftqq.com";

/**
 * Send a digest to WeChat via Server酱 (ServerChan).
 * Uses the first heading line as the title (max 32 chars),
 * and the full markdown as the message body.
 * On dryRun, prints the payload instead of sending.
 * Never throws — logs errors and returns silently.
 */
export async function sendToServerChan(
  markdown: string,
  dryRun: boolean
): Promise<void> {
  const sendkey = process.env.SERVERCHAN_SENDKEY;
  if (!sendkey) {
    log("info", "Server酱: SERVERCHAN_SENDKEY not set — skipping");
    return;
  }

  // Extract first heading as title (max 32 chars for WeChat push card)
  const firstLine = markdown.split("\n")[0]?.replace(/^#+\s*/, "").trim() ?? "AI 技术日报";
  const title = firstLine.length > 32 ? firstLine.slice(0, 31) + "…" : firstLine;

  // Build form-encoded body (Server酱 uses traditional form POST)
  const body = new URLSearchParams({
    title,
    desp: markdown,
  });

  if (dryRun) {
    log("info", "Server酱 dry-run payload:", {
      url: `${SERVERCHAN_API}/${sendkey.slice(0, 4)}***.send`,
      title,
      despLength: markdown.length,
    });
    return;
  }

  try {
    const response = await fetch(`${SERVERCHAN_API}/${sendkey}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const result = await response.json();
    if (result.code !== 0) {
      throw new Error(`Server酱 API error ${result.code}: ${result.message ?? "unknown"}`);
    }

    log("info", "Server酱: message sent to WeChat successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `Server酱 send failed: ${message}`);
  }
}
