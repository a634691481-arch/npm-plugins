# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## 项目概述

`@a634691481/hb-cli` — HBuilderX CLI 管理工具。一个全局命令行工具，提供交互式菜单来管理 HBuilderX 项目（运行 Web/微信/支付宝小程序、发布 H5、项目列表等）。

## 关键命令

| 命令 | 说明 |
|------|------|
| `hb` | 运行交互式 CLI（入口：`index.js`） |
| `npm run release` | 自动 patch 版本号自增并发布到 npm |

## 项目结构

```
hbuilderx-cli/
├── index.js           # 单文件入口，包含全部逻辑
├── package.json       # name: @a634691481/hb-cli, bin: hb
├── release.js         # 版本发布脚本（bump patch + npm publish）
├── README.md
└── AGENTS.md
```

整个项目只有 **一个核心源文件** `index.js`，所有功能（配置管理、菜单渲染、命令执行）都在此文件中。

## 架构概要

### 配置系统

- 配置文件路径：`~/.hbuilderx-cli.json`
- 微信/支付宝 appid 从项目根目录的 `manifest.json` 自动读取（键路径：`mp-weixin.appid` / `mp-alipay.appid`）
- HBuilderX 安装路径通过自动搜索常见目录或用户手动设置

### 核心流程

1. `loadConfig()` — 启动时加载配置，合并 manifest.json 中的 appid
2. `header()` — 绘制带项目信息和 appid 状态的横幅
3. `main()` — 主循环，`@inquirer/prompts` 的 `select` 呈现菜单
4. 各命令函数调用 HBuilderX CLI（`cli.exe`）执行操作

### 依赖

- `chalk@4` — 终端颜色
- `@inquirer/prompts@3` — 交互式输入（select, input）
- `boxen@5` — 边框盒子
- `ora@5` — loading spinner

注意：这些依赖均为 ESM-incompatible 的 CJS 版本，不要升级到 ESM 版本。

### HBuilderX 命令映射

| 菜单选项 | HBuilderX CLI 命令 |
|----------|-------------------|
| 运行 Web | `cli launch web --project <name> --browser Chrome` |
| 运行微信 | `cli launch mp-weixin --project <name>` |
| 运行支付宝 | `cli launch mp-alipay --project <name>` |
| 发布 H5 | `cli publish web --project <name>` |
| 项目列表 | `cli project list` |

### 发布流程

`release.js` 执行：
1. 读取 `package.json` 当前版本
2. patch 版本号 +1
3. 写回 `package.json`
4. 执行 `npm publish`

## 开发注意

- 无 lint/test 配置，保持简单
- 仅支持 Windows（`cli.exe` 路径硬编码、`cmd.exe /c` 执行命令）
- 修改后通过 `node index.js` 在含 `manifest.json` 的项目目录中测试
