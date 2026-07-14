import { log, truncateMarkdown } from "../utils";

const DINGTALK_MAX_LENGTH = 4096;

/**
 * Send a Markdown digest to a DingTalk (钉钉) bot via webhook.
 * On dryRun, prints the payload instead of sending.
 */
export async function sendToDingtalk(
  markdown: string,
  dryRun: boolean
): Promise<void> {
  const webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
  if (!webhookUrl) {
    log("info", "DingTalk: DINGTALK_WEBHOOK_URL not set — skipping");
    return;
  }

  const text =
    markdown.length > DINGTALK_MAX_LENGTH
      ? truncateMarkdown(markdown, DINGTALK_MAX_LENGTH) + "…(已截断)"
      : markdown;

  const payload = {
    msgtype: "markdown",
    markdown: {
      title: "AI 技术日报",
      text,
    },
  };

  if (dryRun) {
    log("info", "DingTalk dry-run payload:", { payload });
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
        `DingTalk API error ${result.errcode}: ${result.errmsg}`
      );
    }

    log("info", "DingTalk: message sent successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `DingTalk send failed: ${message}`);
  }
}
