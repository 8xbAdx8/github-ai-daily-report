import { log, truncateMarkdown } from "../utils";

const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Characters that must be escaped in Telegram MarkdownV2.
 * Escape order: these 18 special characters.
 */
const MARKDOWNV2_SPECIAL = /[_*[\]()~`>#+\-=|{}.!]/g;

function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWNV2_SPECIAL, "\\$&");
}

/**
 * Send a Markdown digest to a Telegram chat via Bot API.
 * Uses MarkdownV2 parse mode with proper escaping.
 * On dryRun, prints the payload instead of sending.
 */
export async function sendToTelegram(
  markdown: string,
  dryRun: boolean
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    log(
      "info",
      "Telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping"
    );
    return;
  }

  // Truncate and escape for MarkdownV2
  const raw =
    markdown.length > TELEGRAM_MAX_LENGTH
      ? truncateMarkdown(markdown, TELEGRAM_MAX_LENGTH) + "…(已截断)"
      : markdown;

  const escaped = escapeMarkdownV2(raw);

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: escaped,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: false,
  };

  if (dryRun) {
    log("info", "Telegram dry-run payload:", { payload });
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(
        `Telegram API error ${result.error_code}: ${result.description}`
      );
    }

    log("info", "Telegram: message sent successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `Telegram send failed: ${message}`);
  }
}
