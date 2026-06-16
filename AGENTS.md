# AGENTS.md

Repo: `npm-plugins` — currently a single package under `hbuilderx-cli/`.

**Package:** `@a634691481/hb-cli` (bin: `hb`), entry `index.js` (~517 lines).

## Commands

| Where | Command | What |
|-------|---------|------|
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

| Menu | CLI command |
|------|-------------|
| Run Web | `launch web --project <name> --browser Chrome` |
| Run Wx | `launch mp-weixin --project <name>` |
| Run Ali | `launch mp-alipay --project <name>` |
| Run Android | `launch app-android --project <name> --ui true` |
| Run Android (custom) | `launch app-android --project <name> --playground custom` |
| Pub H5 | `publish web --project <name>` |
| Pub Wx | `publish mp-weixin --project <name>` |
| Pub Ali | `publish mp-alipay --project <name>` |
| Cloud pack | `pack --config pack.config.json --platform android` |
| Project list | `project list` |

> More detail in `hbuilderx-cli/AGENTS.md`.
