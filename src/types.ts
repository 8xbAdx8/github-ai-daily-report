import { z } from "zod";

// ─── Max digest length (safe for all 4 platforms after JSON envelope) ───
export const MAX_DIGEST_LENGTH = 3500;

// ─── AI keywords for Hacker News filtering ───
export const AI_KEYWORDS = [
  "artificial intelligence",
  "LLM",
  "GPT",
  "Claude",
  "Gemini",
  "machine learning",
  "deep learning",
  "transformer",
  "neural network",
  "OpenAI",
  "Anthropic",
  "Stable Diffusion",
  "LangChain",
  "RAG",
  "agent",
] as const;

// ─── GitHub Trending ───
export const GitHubRepoSchema = z.object({
  fullName: z.string().min(1),
  url: z.string().url(),
  description: z.string(),
  language: z.string(),
  stars: z.number().int().nonnegative(),
  starsGained: z.number().int().nonnegative(),
});

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

// ─── Hacker News ───
export const HNStorySchema = z.object({
  title: z.string().min(1),
  url: z.string().url().nullable(),
  points: z.number().int().nonnegative(),
  numComments: z.number().int().nonnegative(),
  author: z.string(),
  createdAt: z.string(),
});

export type HNStory = z.infer<typeof HNStorySchema>;

// ─── ArXiv ───
export const ArxivPaperSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  authors: z.string(),
  summary: z.string(),
  published: z.string(),
});

export type ArxivPaper = z.infer<typeof ArxivPaperSchema>;

// ─── Source report (union of entries) ───
export const SourceReportSchema = z.object({
  sourceName: z.enum(["github-trending", "hackernews", "arxiv"]),
  entries: z.array(
    z.union([GitHubRepoSchema, HNStorySchema, ArxivPaperSchema])
  ),
  error: z.string().optional(),
});

export type SourceReport = z.infer<typeof SourceReportSchema>;

// ─── Digest input/output ───
export const DigestInputSchema = z.object({
  date: z.string(),
  sources: z.array(SourceReportSchema),
});

export type DigestInput = z.infer<typeof DigestInputSchema>;

export const SourcesStatusSchema = z.record(z.string(), z.string());

export const DigestOutputSchema = z.object({
  markdown: z.string().max(MAX_DIGEST_LENGTH + 200, "Digest exceeds maximum length"),
  sourcesStatus: SourcesStatusSchema,
});

export type DigestOutput = z.infer<typeof DigestOutputSchema>;

// ─── Notifier payload ───
export const NotifierPayloadSchema = z.object({
  platform: z.enum(["wecom", "dingtalk", "feishu", "telegram"]),
  body: z.record(z.unknown()),
  dryRun: z.boolean(),
});

export type NotifierPayload = z.infer<typeof NotifierPayloadSchema>;
