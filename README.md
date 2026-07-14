# 🤖 AI 技术日报 (GitHub AI Daily Report)

每天自动抓取 **GitHub Trending**、**Hacker News** 热帖、**ArXiv** AI 论文，用 DeepSeek 生成中文日报，推送到企业微信 / 钉钉 / 飞书 / Telegram。

## 前置条件

- [Bun](https://bun.sh) >= 1.0
- [DeepSeek API Key](https://platform.deepseek.com/api_keys)
- 至少一个聊天平台的 Webhook URL（可选）

## 快速开始

```bash
# 1. 克隆项目
cd github-ai-daily-report

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 DEEPSEEK_API_KEY 和需要的 Webhook URL

# 4. 本地测试（不实际发送）
bun run dry-run

# 5. 测试单个数据源
bun run src/index.ts --source=github --dry-run
```

## 获取 Webhook URL

| 平台 | 获取方式 |
|------|---------|
| **企业微信** | 群聊 → 群机器人 → 添加 → 复制 Webhook: [文档](https://developer.work.weixin.qq.com/document/path/91770) |
| **钉钉** | 群设置 → 智能群助手 → 添加机器人 → 自定义 → Webhook: [文档](https://open.dingtalk.com/document/orgapp/custom-bot-send-message-type) |
| **飞书** | 群设置 → 群机器人 → 添加 → 自定义机器人 → Webhook: [文档](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot) |
| **Telegram** | 找 [@BotFather](https://t.me/BotFather) 创建 Bot 获取 Token: [文档](https://core.telegram.org/bots#how-do-i-create-a-bot) |
| **Server酱** | [sct.ftqq.com](https://sct.ftqq.com/) 微信扫码登录 → 获取 SendKey: [文档](https://sct.ftqq.com/) |

## 配置 GitHub Actions

1. 在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加 Secrets：
   - `DEEPSEEK_API_KEY`（必填）
   - `SERVERCHAN_SENDKEY`（选填，推送到个人微信）
   - `WECOM_WEBHOOK_URL`、`DINGTALK_WEBHOOK_URL`、`FEISHU_WEBHOOK_URL`（选填）
   - `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`（选填）

2. 推送代码后，工作流会在每天 **UTC 00:00（北京时间 08:00）** 自动运行

3. 也可以手动触发：**Actions → AI Daily Digest → Run workflow**

## 本地测试

```bash
# 运行所有测试
bun test

# 干跑模式（不发送，打印输出）
bun run dry-run

# 只抓取特定数据源
bun run src/index.ts --source=hackernews --dry-run
```

## 项目结构

```
src/
├── index.ts              # CLI 入口
├── types.ts              # Zod schemas & 类型定义
├── utils.ts              # 工具函数
├── digest.ts             # LLM 摘要生成
├── template.ts           # Markdown 模板
├── sources/
│   ├── github-trending.ts  # GitHub Trending 抓取
│   ├── hackernews.ts       # Hacker News API
│   └── arxiv.ts            # ArXiv API
└── notifiers/
    ├── serverchan.ts        # Server酱 (个人微信)
    ├── wecom.ts             # 企业微信
    ├── dingtalk.ts          # 钉钉
    ├── feishu.ts            # 飞书
    └── telegram.ts          # Telegram
```
