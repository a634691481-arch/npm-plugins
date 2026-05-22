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

| 命令          | 说明                       |
| ------------- | -------------------------- |
| 🌐 运行 Web   | 在 Chrome 浏览器中运行项目 |
| 💬 运行微信   | 运行微信小程序             |
| 📎 运行支付宝 | 运行支付宝小程序           |
| 📦 发布 H5    | 发布 H5 版本               |
| 📋 项目列表   | 显示项目列表               |
| ⚙ 基本设置    | 配置 HBuilderX 安装路径    |

## 环境要求

- Node.js >= 14
- HBuilderX 已安装
- 项目根目录包含 `manifest.json`

## 配置文件

配置保存在 `~/.hbuilderx-cli.json`:

```json
{
  "hbxDir": "D:\\HBuilderX",
  "appid": "微信小程序AppID",
  "alipayAppid": "支付宝小程序AppID"
}
```

## 注意事项

- 首次使用需在"基本设置"中配置 HBuilderX 安装路径
- 默认搜索路径: `D:\HBuilderX`, `C:\Program Files\HBuilderX` 等
- 微信小程序 AppID 从 `manifest.json` 自动读取
