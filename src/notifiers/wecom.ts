import { log, truncateMarkdown } from "../utils";

const WECOM_MAX_LENGTH = 4096;

/**
 * Send a Markdown digest to a WeCom (企业微信) bot via webhook.
 * On dryRun, prints the payload instead of sending.
 * Never throws — logs errors and returns silently.
 */
export async function sendToWecom(
  markdown: string,
  dryRun: boolean
): Promise<void> {
  const webhookUrl = process.env.WECOM_WEBHOOK_URL;
  if (!webhookUrl) {
    log("info", "WeCom: WECOM_WEBHOOK_URL not set — skipping");
    return;
  }

  // Truncate to platform limit
  const content =
    markdown.length > WECOM_MAX_LENGTH
      ? truncateMarkdown(markdown, WECOM_MAX_LENGTH) + "…(已截断)"
      : markdown;

  const payload = {
    msgtype: "markdown",
    markdown: { content },
  };

  if (dryRun) {
    log("info", "WeCom dry-run payload:", { payload });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.errcode !== 0) {
      throw new Error(
        `WeCom API error ${result.errcode}: ${result.errmsg}`
      );
    }

    log("info", "WeCom: message sent successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `WeCom send failed: ${message}`);
  }
}
