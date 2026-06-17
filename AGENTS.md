# AGENTS.md

Repo: `npm-plugins` — currently a single package under `hbuilderx-cli/`.

**Package:** `@a634691481/hb-cli` (bin: `hb`), entry `index.js` (~517 lines).

## Commands

| Where                     | Command                                      | What         |
| ------------------------- | -------------------------------------------- | ------------ |
| any HBuilderX project dir | `hb` or `node <repo>/hbuilderx-cli/index.js` | run the tool |

> Publishing is handled automatically by CI (push to `main` → auto bump patch → `npm publish`).

## Hard constraints

- **Windows-only** — spawns `cli.exe`, uses `cmd.exe /c`
- **CJS-only deps** — `chalk@4`, `@inquirer/prompts@3`, `boxen@5`, `ora@5`, `strip-json-comments`; never upgrade to ESM
- **No build, no tests, no lint, no typecheck**
- Menu uses `@inquirer/prompts` `input` (numeric), not `select`

## Config

`~/.hbuilderx-cli.json` stores HBuilderX path + last action per project. AppIDs are auto-read from the project's `manifest.json` (parsed with `strip-json-comments`).

## `src/` is empty

All logic is in `index.js`. Do not create additional files in `src/` without justification.

## HBuilderX CLI commands

The tool wraps `cli.exe` with these subcommands:

| Menu                 | CLI command                                               |
| -------------------- | --------------------------------------------------------- |
| Run Web              | `launch web --project <name> --browser Chrome`            |
| Run Wx               | `launch mp-weixin --project <name>`                       |
| Run Ali              | `launch mp-alipay --project <name>`                       |
| Run Android          | `launch app-android --project <name> --ui true`           |
| Run Android (custom) | `launch app-android --project <name> --playground custom` |
| Pub H5               | `publish web --project <name>`                            |
| Pub Wx               | `publish mp-weixin --project <name>`                      |
| Pub Ali              | `publish mp-alipay --project <name>`                      |
| Cloud pack           | `pack --config pack.config.json --platform android`       |
| Project list         | `project list`                                            |

> More detail in `hbuilderx-cli/AGENTS.md`.

## 多助手协作策略

根据任务复杂度自动启用并行助手（无需用户手动要求）：

**自动启用条件：**

- 复杂 Bug 排查（跨文件、跨层分析）
- 大范围重构（多模块联动）
- 新功能设计（架构评估 + 现有代码分析）
- 性能问题定位（多维度并行检测）

**不启用条件：**

- 单文件明确修改
- 配置调整
- 简单问答

**并行策略：**

- 启动 2-5 个助手，分别负责不同维度
- 汇总各助手结果后给出统一结论
