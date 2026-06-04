# @a634691481/hb-cli

HBuilderX CLI 管理工具 - 全局命令行工具

## 安装

```bash
npm install -g @a634691481/hb-cli
```

## 使用

在项目根目录下运行(需要有 `manifest.json`):

```bash
hb
```

## 功能

### ▶ 运行

| 编号 | 功能 |
|------|------|
| 1 | 🌐 运行 Web — 在 Chrome 浏览器中运行项目 |
| 2 | 💬 运行微信小程序 |
| 3 | 📎 运行支付宝小程序 |
| 4 | 📱 运行 Android |
| 5 | 📱 运行 Android(自定义基座) |

### ▶ 发布

| 编号 | 功能 |
|------|------|
| 6 | 📦 发布 H5 |
| 7 | 💬 发布微信小程序 |
| 8 | 📎 发布支付宝小程序 |
| 9 | 📱 Android/iOS云打包 — 通过 pack.config.json 配置文件打包 |

### ▶ 配置

| 编号 | 功能 |
|------|------|
| 10 | 📋 项目列表 |
| 11 | ⚙ 基本设置 — 配置 HBuilderX 安装路径 |

### Android/iOS云打包

- 首次使用自动在项目根目录生成 `pack.config.json`（带中文注释）
- 打包前显示当前 `versionName` 和 `versionCode`，支持手动输入新版本号
- 确认后自动更新 `manifest.json` 中的版本信息
- 执行 `pack --config pack.config.json --platform android`

## 环境要求

- Node.js >= 14
- HBuilderX 已安装
- 项目根目录包含 `manifest.json`

## 配置文件

主配置保存在 `~/.hbuilderx-cli.json`:

```json
{
  "hbxDir": "D:\\HBuilderX",
  "appid": "微信小程序AppID",
  "alipayAppid": "支付宝小程序AppID"
}
```

打包配置模板 `pack.config.json`（自动生成在项目根目录，含中文注释）:

```json
{
    //项目名字或项目绝对路径
    "project": "<项目名>",
    //打包平台
    "platform": "ios,android",
    //是否使用自定义基座
    "iscustom": false,
    //打包方式是否为安心打包
    "safemode": false,
    "android": { ... },
    "ios": { ... }
}
```

## 注意事项

- 首次使用需在"基本设置"中配置 HBuilderX 安装路径
- 默认搜索路径: `D:\HBuilderX`, `C:\Program Files\HBuilderX` 等
- 微信/支付宝小程序 AppID 从 `manifest.json` 自动读取（优先 `app-plus` 节点）
- `manifest.json` 支持 JavaScript 注释（`/* */`、`//`），使用 `strip-json-comments` 解析
- 菜单使用数字编号输入，非方向键选择
