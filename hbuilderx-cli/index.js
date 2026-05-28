#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');
const { select, input } = require('@inquirer/prompts');

// ============ Config ============
const ROOT_DIR = process.cwd();
const PROJECT_NAME = path.basename(ROOT_DIR);
const CONFIG_FILE = path.join(os.homedir(), '.hbuilderx-cli.json');

// 检查当前目录是否有 manifest.json
if (!fs.existsSync(path.join(ROOT_DIR, 'manifest.json'))) {
  console.error(chalk.red('✖ 当前目录不是 HBuilderX 项目（未找到 manifest.json）'));
  process.exit(1);
}

const COMMON_HBX_PATHS = [
  'D:\\HBuilderX',
  'C:\\Program Files\\HBuilderX',
  'C:\\Program Files (x86)\\HBuilderX',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'HBuilderX'),
  path.join(process.env.ProgramFiles || '', 'HBuilderX'),
  path.join(process.env['ProgramFiles(x86)'] || '', 'HBuilderX'),
];

function findHBuilderX() {
  for (const dir of COMMON_HBX_PATHS) {
    if (fs.existsSync(path.join(dir, 'cli.exe'))) return dir;
  }
  return '';
}

let _manifestCache = null;
function getManifest() {
  if (_manifestCache) return _manifestCache;
  try {
    _manifestCache = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8'));
    return _manifestCache;
  } catch { return {}; }
}

function getManifestWxAppId() {
  return getManifest()?.['mp-weixin']?.appid || '';
}

function getManifestAlipayAppId() {
  return getManifest()?.['mp-alipay']?.appid || '';
}

function getManifestAppName() {
  return getManifest()?.name || '';
}

function getManifestVersion() {
  return getManifest()?.versionName || '';
}

function getManifestAppId() {
  return getManifest()?.appid || '';
}

function loadConfig() {
  const wxAppId = getManifestWxAppId();
  const aliAppId = getManifestAlipayAppId();
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    cfg = { hbxDir: '' };
  }
  if (!cfg.lastAction) cfg.lastAction = '';
  if (!cfg.hbxDir || !fs.existsSync(path.join(cfg.hbxDir, 'cli.exe'))) {
    const found = findHBuilderX();
    if (found) { cfg.hbxDir = found; saveConfig(cfg); }
  }
  cfg.appid = wxAppId || '';
  cfg.alipayAppid = aliAppId || '';
  cfg.manifestName = getManifestAppName() || '';
  cfg.manifestVersion = getManifestVersion() || '';
  cfg.manifestAppId = getManifestAppId() || '';
  return cfg;
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function cliCmd(args) {
  if (config.hbxDir) return `${path.join(config.hbxDir, 'cli.exe')} ${args}`;
  return `cli ${args}`;
}

let config = loadConfig();

// ============ Display ============
function ts() {
  const d = new Date();
  return chalk.dim(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
}

function header() {
  console.clear();
  const info =
    chalk.dim('名称') + '   ' + chalk.bold(config.manifestName || PROJECT_NAME) + '\n' +
    chalk.dim('版本') + '   ' + (config.manifestVersion ? chalk.bold(config.manifestVersion) : chalk.dim('-')) + '\n' +
    chalk.dim('微信') + '   ' + (config.appid ? config.appid : chalk.red('未设置')) + '\n' +
    chalk.dim('支付宝') + ' ' + (config.alipayAppid || chalk.dim('未设置')) + '\n' +
    chalk.dim('工具') + '   ' + (config.hbxDir ? chalk.cyan(path.basename(config.hbxDir)) : chalk.red('未找到'));
  console.log(boxen(chalk.bold.yellow(' HBuilderX CLI 管理工具 ') + '\n\n' + info,
    { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
  ));
}

function runCmd(cmd) {
  return new Promise(resolve => {
    const sp = ora({ text: '正在执行...', color: 'cyan' }).start();
    const isWin = process.platform === 'win32';
    const proc = spawn(isWin ? 'cmd.exe' : 'sh',
      isWin ? ['/c', cmd] : ['-c', cmd],
      { stdio: 'inherit', windowsHide: true, cwd: ROOT_DIR });
    sp.stop();
    console.log(`  ${ts()} ${chalk.cyan('$')} ${chalk.dim(cmd)}\n`);
    proc.on('close', code => {
      const msg = code === 0 ? chalk.green('✔ 完成') : chalk.red('✖ 失败 (exit: ' + code + ')');
      console.log(`\n${boxen(` ${ts()} ${msg}`, { padding: { left: 1, right: 1 }, borderStyle: 'single', borderColor: code === 0 ? 'green' : 'red' })}`);
      resolve(code);
    });
    proc.on('error', err => {
      sp.stop();
      console.log(`  ${ts()} ${chalk.red('✖ ' + err.message)}`);
      resolve(-1);
    });
  });
}

async function openHbx() {
  const cmd = cliCmd('open');
  return new Promise(resolve => {
    const sp = ora({ text: '启动 HBuilderX...', color: 'cyan' }).start();
    const isWin = process.platform === 'win32';
    const proc = spawn(isWin ? 'cmd.exe' : 'sh',
      isWin ? ['/c', cmd] : ['-c', cmd],
      { windowsHide: true, cwd: ROOT_DIR });
    let done = false;
    const t = setTimeout(() => { if (!done) { sp.stop(); done = true; resolve(); } }, 5000);
    proc.on('close', () => { if (!done) { sp.stop(); done = true; clearTimeout(t); resolve(); } });
    proc.on('error', () => { if (!done) { sp.stop(); done = true; clearTimeout(t); resolve(); } });
  });
}

async function exec(label, cmd) {
  header();
  console.log(`  ${chalk.bold.cyan('▶')} ${label}\n`);
  const code = cmd ? await runCmd(cmd) : 0;
  if (code === 0) {
    await input({ message: '按 Enter 键返回菜单', default: '' });
  }
  return code;
}

// ============ Commands ============
async function pubWeb() {
  await openHbx();
  await exec('发布 H5', cliCmd(`publish web --project ${PROJECT_NAME}`));
}

async function runWeb() {
  await openHbx();
  await exec('运行 Web', cliCmd(`launch web --project ${PROJECT_NAME} --browser Chrome`));
}

async function runWx() {
  await openHbx();
  await exec('运行微信', cliCmd(`launch mp-weixin --project ${PROJECT_NAME}`));
}

async function runAli() {
  await openHbx();
  await exec('运行支付宝', cliCmd(`launch mp-alipay --project ${PROJECT_NAME}`));
}

async function listProjects() {
  await openHbx();
  await exec('项目列表', cliCmd('project list'));
}

async function basicSettings() {
  header();
  console.log(`  ${chalk.bold.cyan('▶')} 基本设置\n`);

  config.hbxDir = await input({ message: 'HBuilderX 安装目录:', default: config.hbxDir || 'D:\\HBuilderX' });

  saveConfig(config);
  _manifestCache = null;
  config.appid = getManifestWxAppId() || config.appid;
  config.alipayAppid = getManifestAlipayAppId() || config.alipayAppid;
  config.manifestName = getManifestAppName() || config.manifestName;
  config.manifestVersion = getManifestVersion() || config.manifestVersion;
  config.manifestAppId = getManifestAppId() || config.manifestAppId;
  const sp = ora({ text: '保存中...', color: 'green' }).start();
  await new Promise(r => setTimeout(r, 600));
  sp.succeed('已保存');
}

// ============ Main Loop ============
async function main() {
  while (true) {
    header();

    const defaultAction = config.lastAction || undefined;
    const action = await select({
      message: chalk.bold('选择操作:'),
      choices: [
        { name: '(1) 🌐 运行 Web', value: '3' },
        { name: '(2) 💬 运行微信', value: '4' },
        { name: '(3) 📎 运行支付宝', value: '5' },
        { name: '(4) 📦 发布 H5', value: '1' },
        { name: '(5) 📋 项目列表', value: '6' },
        { name: '(6) ⚙  基本设置', value: 's' },
        // { name: '(0) ✕  退出', value: '0' },
      ],
      default: defaultAction,
      loop: false,
      pageSize: 10,
    });

    switch (action) {
      case '1': await pubWeb(); config.lastAction = '1'; saveConfig(config); break;
      case '3': await runWeb(); config.lastAction = '3'; saveConfig(config); break;
      case '4': await runWx(); config.lastAction = '4'; saveConfig(config); break;
      case '5': await runAli(); config.lastAction = '5'; saveConfig(config); break;
      case '6': await listProjects(); config.lastAction = '6'; saveConfig(config); break;
      case 's': await basicSettings(); config.lastAction = 's'; saveConfig(config); break;
      case '0':
        console.clear();
        console.log(boxen(chalk.cyan('再见!'), { padding: 1, borderStyle: 'double', borderColor: 'cyan' }));
        process.exit(0);
    }
  }
}

main().catch(err => {
  console.error(chalk.red('错误:'), err.message);
  process.exit(1);
});
