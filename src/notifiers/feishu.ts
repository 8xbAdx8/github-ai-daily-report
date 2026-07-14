import { log } from "../utils";

/**
 * Send a Markdown digest to a Feishu (飞书) bot via webhook.
 * Uses the interactive card format with a single markdown element.
 * On dryRun, prints the payload instead of sending.
 */
export async function sendToFeishu(
  markdown: string,
  dryRun: boolean
): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!webhookUrl) {
    log("info", "Feishu: FEISHU_WEBHOOK_URL not set — skipping");
    return;
  }

  // Feishu cards support up to ~30KB; no truncation needed for typical digest
  const payload = {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: "🤖 AI 技术日报",
        },
        template: "blue" as const,
      },
      elements: [
        {
          tag: "markdown",
          content: markdown,
        },
      ],
    },
  };

  if (dryRun) {
    log("info", "Feishu dry-run payload:", { payload });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.code !== 0 && result.StatusCode !== 0) {
      throw new Error(
        `Feishu API error: ${JSON.stringify(result)}`
      );
    }

    log("info", "Feishu: message sent successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `Feishu send failed: ${message}`);
  }
}
