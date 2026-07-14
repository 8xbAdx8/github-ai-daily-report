import { fetchGitHubTrending } from "./sources/github-trending";
import { fetchHackerNews } from "./sources/hackernews";
import { fetchArxiv } from "./sources/arxiv";
import { generateDigest } from "./digest";
import { sendToWecom } from "./notifiers/wecom";
import { sendToDingtalk } from "./notifiers/dingtalk";
import { sendToFeishu } from "./notifiers/feishu";
import { sendToTelegram } from "./notifiers/telegram";
import { sendToServerChan } from "./notifiers/serverchan";
import { formatDate, log } from "./utils";
import { DigestInput, SourceReport } from "./types";

/**
 * Parse simple CLI flags from Bun.argv.
 * Supports: --dry-run, --source=<name>
 */
function parseArgs(): { dryRun: boolean; source: string | null } {
  const args = Bun.argv.slice(2);
  let dryRun = false;
  let source: string | null = null;

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--source=")) {
      source = arg.slice("--source=".length);
    }
  }

  return { dryRun, source };
}

async function main(): Promise<void> {
  const { dryRun, source } = parseArgs();

  // Check required env
  if (!process.env.DEEPSEEK_API_KEY) {
    log("error", "Missing required environment variable: DEEPSEEK_API_KEY");
    log(
      "info",
      "Copy .env.example to .env and fill in your keys, then run again."
    );
    process.exit(1);
  }

  log("info", `Starting digest generation${dryRun ? " (dry-run)" : ""}...`);

  // ─── Phase 1: Fetch sources ───
  const fetchers: Array<{ name: string; fn: () => Promise<SourceReport> }> = [];

  if (!source || source === "github") {
    fetchers.push({ name: "github", fn: fetchGitHubTrending });
  }
  if (!source || source === "hackernews") {
    fetchers.push({ name: "hackernews", fn: fetchHackerNews });
  }
  if (!source || source === "arxiv") {
    fetchers.push({ name: "arxiv", fn: fetchArxiv });
  }

  const results = await Promise.allSettled(
    fetchers.map((f) => f.fn())
  );

  const reports: SourceReport[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      sourceName: fetchers[i].name as SourceReport["sourceName"],
      entries: [],
      error: String(r.reason),
    };
  });

  // ─── Phase 2: Generate digest ───
  const input: DigestInput = {
    date: formatDate(new Date()),
    sources: reports,
  };

  const digest = await generateDigest(input);

  if (dryRun) {
    log("info", "=== DRY-RUN OUTPUT ===");
    console.log(JSON.stringify({ digest, reports }, null, 2));
    log("info", `Digest markdown (${digest.markdown.length} chars):`);
    console.log(digest.markdown);
    return;
  }

  // ─── Phase 3: Send to notifiers ───
  const notifiers: Array<{
    name: string;
    fn: (md: string, dry: boolean) => Promise<void>;
    envVar: string;
  }> = [
    {
      name: "WeCom",
      fn: sendToWecom,
      envVar: "WECOM_WEBHOOK_URL",
    },
    {
      name: "DingTalk",
      fn: sendToDingtalk,
      envVar: "DINGTALK_WEBHOOK_URL",
    },
    {
      name: "Feishu",
      fn: sendToFeishu,
      envVar: "FEISHU_WEBHOOK_URL",
    },
    {
      name: "Telegram",
      fn: sendToTelegram,
      envVar: "TELEGRAM_BOT_TOKEN",
    },
    {
      name: "Server酱",
      fn: sendToServerChan,
      envVar: "SERVERCHAN_SENDKEY",
    },
  ];

  const activeNotifiers = notifiers.filter(
    (n) => process.env[n.envVar]
  );

  if (activeNotifiers.length === 0) {
    log("warn", "No notifier webhooks configured — digest generated but not sent");
    log("info", "Set at least one: SERVERCHAN_SENDKEY, WECOM_WEBHOOK_URL, DINGTALK_WEBHOOK_URL, FEISHU_WEBHOOK_URL, or TELEGRAM_BOT_TOKEN");
    console.log("\n=== GENERATED DIGEST ===\n");
    console.log(digest.markdown);
    return;
  }

  await Promise.allSettled(
    activeNotifiers.map((n) => n.fn(digest.markdown, false))
  );

  // ─── Summary ───
  const sourceSummary = reports
    .map((r) => `${r.sourceName}: ${r.error ? "❌" : "✅"} ${r.entries.length} entries`)
    .join(" | ");

  const notifySummary = activeNotifiers.map((n) => n.name).join(", ");

  log("info", `Digest complete. Sources: ${sourceSummary}`);
  log("info", `Sent to: ${notifySummary}`);

  // Exit code: 0 if at least one source succeeded; 1 if ALL failed
  const anySuccess = reports.some((r) => !r.error && r.entries.length > 0);
  if (!anySuccess) {
    log("error", "All data sources failed — no content in digest");
    process.exit(1);
  }
}

main().catch((err) => {
  log("error", `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
