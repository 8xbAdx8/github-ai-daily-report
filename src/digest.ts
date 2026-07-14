import { DigestInput, DigestOutput, MAX_DIGEST_LENGTH, SourcesStatusSchema } from "./types";
import { log, truncateMarkdown, formatDate } from "./utils";
import { DIGEST_TEMPLATE, formatSection, rawListSection } from "./template";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1/chat/completions";
const SYSTEM_PROMPT = `你是一个 AI 技术日报编辑。请将以下原始数据整理成简洁的 Markdown 日报。

规则：
1. 每个章节选择一个最重要的项目写 2-3 句中文摘要
2. 其余项目只列出标题+链接，一行一个
3. 不要重复信息，不要添加主观评价
4. 如果某个来源没有数据，跳过该章节，不要写"暂无数据"
5. 总长度不超过 3500 字符
6. 输出格式必须严格遵循模板结构`;

/**
 * Generate a daily digest from source reports.
 * Calls DeepSeek LLM for summarization; falls back to raw listing on failure.
 */
export async function generateDigest(input: DigestInput): Promise<DigestOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    log("warn", "DEEPSEEK_API_KEY not set — using raw listing mode");
    return buildRawDigest(input);
  }

  try {
    log("info", "Generating LLM digest via DeepSeek...");

    const userMessage = JSON.stringify(input, null, 2);

    const response = await fetch(DEEPSEEK_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawMarkdown: string =
      data.choices?.[0]?.message?.content ?? "";

    if (!rawMarkdown) {
      throw new Error("DeepSeek returned empty response");
    }

    // Truncate if over limit
    const markdown = truncateMarkdown(rawMarkdown, MAX_DIGEST_LENGTH);

    // Build sources status
    const sourcesStatus: Record<string, string> = {};
    for (const src of input.sources) {
      sourcesStatus[src.sourceName] = src.error
        ? `❌ ${src.error}`
        : `✅ ${src.entries.length} entries`;
    }

    log("info", `LLM digest generated: ${markdown.length} chars`);

    return {
      markdown,
      sourcesStatus: SourcesStatusSchema.parse(sourcesStatus),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", `LLM digest failed, falling back to raw listing: ${message}`);
    return buildRawDigest(input);
  }
}

/**
 * Build a raw listing digest without LLM — just title + link per section.
 */
function buildRawDigest(input: DigestInput): DigestOutput {
  const date = formatDate(new Date());
  const sections: string[] = [];

  // Status tracking
  const sourcesStatus: Record<string, string> = {};

  for (const src of input.sources) {
    if (src.error) {
      sourcesStatus[src.sourceName] = `❌ ${src.error}`;
      continue;
    }
    if (src.entries.length === 0) {
      sourcesStatus[src.sourceName] = "⚠️ No entries";
      continue;
    }

    sourcesStatus[src.sourceName] = `✅ ${src.entries.length} entries`;

    const section = rawListSection(src.sourceName, src.entries);
    if (section) {
      sections.push(section);
    }
  }

  const sourcesStatusStr = Object.entries(sourcesStatus)
    .map(([name, status]) => `${name}: ${status}`)
    .join(" · ");

  const markdown = `# 🤖 AI 技术日报 — ${date}\n\n> 数据来源: GitHub Trending · Hacker News · ArXiv\n\n${sections.join("\n\n")}\n\n---\n*📊 来源状态: ${sourcesStatusStr}*`;

  return {
    markdown,
    sourcesStatus: SourcesStatusSchema.parse(sourcesStatus),
  };
}
