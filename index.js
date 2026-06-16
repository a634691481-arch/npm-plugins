#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chalk = require('chalk');
const boxen = require('boxen');
const ora = require('ora');
const { input } = require('@inquirer/prompts');

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

const stripJsonComments = require('strip-json-comments');
let _manifestCache = null;
function getManifest() {
  if (_manifestCache) return _manifestCache;
  try {
    const raw = fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8');
    _manifestCache = JSON.parse(stripJsonComments(raw));
    return _manifestCache;
  } catch { return {}; }
}

function getManifestWxAppId() {
  const m = getManifest();
  const ap = m?.['app-plus'] || {};
  return ap?.['mp-weixin']?.appid || m?.['mp-weixin']?.appid || '';
}

function getManifestAlipayAppId() {
  const m = getManifest();
  const ap = m?.['app-plus'] || {};
  return ap?.['mp-alipay']?.appid || m?.['mp-alipay']?.appid || '';
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

function getManifestVersionCode() {
  return getManifest()?.versionCode || 0;
}

function nextVersionName(curName) {
  const parts = curName.split('.');
  if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
    parts[2] = String(parseInt(parts[2], 10) + 1);
    return parts.join('.');
  }
  return curName;
}

function updateManifestVersion(newName, newCode) {
  const mp = path.join(ROOT_DIR, 'manifest.json');
  let raw = fs.readFileSync(mp, 'utf8');
  raw = raw.replace(/"versionName"\s*:\s*"[^"]*"/, () => `"versionName" : "${newName}"`);
  raw = raw.replace(/"versionCode"\s*:\s*\d+/, () => `"versionCode" : ${newCode}`);
  fs.writeFileSync(mp, raw, 'utf8');
  _manifestCache = null;
}

function saveLastAction(action) {
  const mp = path.join(ROOT_DIR, 'manifest.json');
  try {
    let raw = fs.readFileSync(mp, 'utf8');
    if (raw.includes('"_lastAction"')) {
      raw = raw.replace(/"\_lastAction"\s*:\s*"[^"]*"/, `"_lastAction": "${action}"`);
    } else {
      const firstBrace = raw.indexOf('{');
      raw = raw.slice(0, firstBrace + 1) + `\n\t"_lastAction": "${action}",` + raw.slice(firstBrace + 1);
    }
    fs.writeFileSync(mp, raw, 'utf8');
    _manifestCache = null;
  } catch (e) {
    console.error(chalk.red('✖ 写入 _lastAction 失败:'), e.message);
  }
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
  if (!cfg.hbxDir || !fs.existsSync(path.join(cfg.hbxDir, 'cli.exe'))) {
    const found = findHBuilderX();
    if (found) { cfg.hbxDir = found; saveConfig(cfg); }
  }
  cfg.appid = wxAppId || '';
  cfg.alipayAppid = aliAppId || '';
  cfg.manifestName = getManifestAppName() || '';
  cfg.manifestVersion = getManifestVersion() || '';
  cfg.manifestAppId = getManifestAppId() || '';
  cfg.lastAction = getManifest()._lastAction || '';
  return cfg;
}

function saveConfig(cfg) {
  const clean = { hbxDir: cfg.hbxDir };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(clean, null, 2));
}

function cliCmd(args) {
  if (config.hbxDir) return `${path.join(config.hbxDir, 'cli.exe')} ${args}`;
  return `cli ${args}`;
}

let config = loadConfig();
let _hbxOpened = false;

// ============ Display ============
function ts() {
  const d = new Date();
  return chalk.dim(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
}

const ACTION_NAMES = { '1': '运行 Web', '2': '运行微信小程序', '3': '运行支付宝小程序', '4': '运行 Android', '5': '运行 Android(自定义基座)', '6': '发布 H5', '7': '发布微信小程序', '8': '发布支付宝小程序', '9': 'Android/iOS云打包', '10': '项目列表', '11': '基本设置' };

function printMenu() {
  console.log(chalk.bold('\n  ' + chalk.underline.cyan('▶ 运行')));
  console.log(`    ${chalk.cyan('1')}. 🌐 运行 Web`);
  console.log(`    ${chalk.cyan('2')}. 💬 运行微信小程序`);
  console.log(`    ${chalk.cyan('3')}. 📎 运行支付宝小程序`);
  console.log(`    ${chalk.cyan('4')}. 📱 运行 Android`);
  console.log(`    ${chalk.cyan('5')}. 📱 运行 Android(自定义基座)`);
  console.log(chalk.bold('\n  ' + chalk.underline.yellow('▶ 发布')));
  console.log(`    ${chalk.cyan('6')}. 📦 发布 H5`);
  console.log(`    ${chalk.cyan('7')}. 💬 发布微信小程序`);
  console.log(`    ${chalk.cyan('8')}. 📎 发布支付宝小程序`);
  console.log(`    ${chalk.cyan('9')}. 📱 Android/iOS云打包`);
  console.log(chalk.bold('\n  ' + chalk.underline.magenta('▶ 配置')));
  console.log(`    ${chalk.cyan('10')}. 📋 项目列表`);
  console.log(`    ${chalk.cyan('11')}. ⚙  基本设置`);
  console.log(`    ${chalk.cyan('0')}. ✕  退出`);
  console.log();
}

function header() {
  console.clear();
  const curAction = config.lastAction || '';
  const lastLabel = curAction ? chalk.dim('上次: ') + (ACTION_NAMES[curAction] || curAction) : '';
  const info =
    chalk.dim('名称') + '   ' + chalk.bold(config.manifestName || PROJECT_NAME) + '\n' +
    chalk.dim('路径') + '   ' + chalk.dim(ROOT_DIR) + '\n' +
    chalk.dim('版本') + '   ' + (config.manifestVersion ? chalk.bold(config.manifestVersion) : chalk.dim('-')) + '\n' +
    chalk.dim('微信') + '   ' + (config.appid ? config.appid : chalk.red('未设置')) + '\n' +
    chalk.dim('支付宝') + ' ' + (config.alipayAppid || chalk.dim('未设置')) + '\n' +
    chalk.dim('工具') + '   ' + (config.hbxDir ? chalk.cyan(path.basename(config.hbxDir)) : chalk.red('未找到')) +
    (lastLabel ? '\n' + chalk.dim('─'.repeat(30)) + '\n' + lastLabel : '');
  console.log(boxen(chalk.bold.yellow(' HBuilderX CLI 管理工具 ') + chalk.dim(' (开发版)') + '\n\n' + info,
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
    proc.on('close', code => {
      sp.stop();
      console.log(`  ${ts()} ${chalk.cyan('$')} ${chalk.dim(cmd)}\n`);
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
  if (_hbxOpened) return;
  if (!config.hbxDir || !fs.existsSync(path.join(config.hbxDir, 'cli.exe'))) {
    console.log(`  ${ts()} ${chalk.yellow('⚠ HBuilderX 未配置或未找到')}`);
    _hbxOpened = true;
    return;
  }
  _hbxOpened = true;
  const cmd = cliCmd('open');
  return new Promise(resolve => {
    const sp = ora({ text: '启动 HBuilderX...', color: 'cyan' }).start();
    const isWin = process.platform === 'win32';
    const proc = spawn(isWin ? 'cmd.exe' : 'sh',
      isWin ? ['/c', cmd] : ['-c', cmd],
      { windowsHide: true, cwd: ROOT_DIR });
    let done = false;
    const t = setTimeout(() => { if (!done) { sp.stop(); done = true; resolve(); } }, 3000);
    proc.on('close', () => { if (!done) { sp.stop(); done = true; clearTimeout(t); resolve(); } });
    proc.on('error', () => { if (!done) { sp.stop(); done = true; clearTimeout(t); resolve(); } });
  });
}

async function exec(label, cmd) {
  header();
  console.log(`  ${chalk.bold.cyan('▶')} ${label}\n`);
  const code = cmd ? await runCmd(cmd) : 0;
  await input({ message: '按 Enter 键返回菜单', default: '' });
  return code;
}

async function importProject() {
  if (!config.hbxDir || !fs.existsSync(path.join(config.hbxDir, 'cli.exe'))) return;
  return new Promise(resolve => {
    const sp = ora({ text: '导入项目...', color: 'cyan' }).start();
    const isWin = process.platform === 'win32';
    const cmd = cliCmd(`project open --path "${ROOT_DIR}"`);
    const proc = spawn(isWin ? 'cmd.exe' : 'sh',
      isWin ? ['/c', cmd] : ['-c', cmd],
      { windowsHide: true, cwd: ROOT_DIR });
    let done = false;
    const t = setTimeout(() => { if (!done) { sp.stop(); done = true; resolve(); } }, 2000);
    proc.on('close', () => { if (!done) { sp.stop(); done = true; clearTimeout(t); resolve(); } });
    proc.on('error', () => { if (!done) { sp.stop(); done = true; clearTimeout(t); resolve(); } });
  });
}

// ============ Commands ============
async function pubWeb() {
  await openHbx();
  await importProject();
  await exec('发布 H5', cliCmd(`publish web --project ${PROJECT_NAME}`));
}

async function runWeb() {
  await openHbx();
  await importProject();
  await exec('运行 Web', cliCmd(`launch web --project ${PROJECT_NAME} --browser Chrome`));
}

async function runWx() {
  await openHbx();
  await importProject();
  await exec('运行微信小程序', cliCmd(`launch mp-weixin --project ${PROJECT_NAME}`));
}

async function runAli() {
  await openHbx();
  await importProject();
  await exec('运行支付宝小程序', cliCmd(`launch mp-alipay --project ${PROJECT_NAME}`));
}

async function runAppAndroid() {
  await openHbx();
  await importProject();
  await exec('运行 Android', cliCmd(`launch app-android --project ${PROJECT_NAME} --ui true`));
}

async function runAppAndroidCustom() {
  await openHbx();
  await importProject();
  await exec('运行 Android(自定义基座)', cliCmd(`launch app-android --project ${PROJECT_NAME} --playground custom`));
}

async function listProjects() {
  await openHbx();
  await importProject();
  await exec('项目列表', cliCmd('project list'));
}

async function pubWx() {
  await openHbx();
  await importProject();
  await exec('发布微信小程序', cliCmd(`publish mp-weixin --project ${PROJECT_NAME}`));
}

async function pubAli() {
  await openHbx();
  await importProject();
  await exec('发布支付宝小程序', cliCmd(`publish mp-alipay --project ${PROJECT_NAME}`));
}

const PACK_CONFIG_FILE = path.join(ROOT_DIR, 'pack.config.json');
function getDefaultPackConfig() {
  return `{

    //项目名字或项目绝对路径

    "project": "${PROJECT_NAME}",

    //打包平台 默认值android  值有"android","ios" 如果要打多个逗号隔开打包平台

    "platform": "ios,android",

    //是否使用自定义基座 默认值false  true自定义基座 false自定义证书

    "iscustom": false,

    //打包方式是否为安心打包默认值false,true安心打包,false传统打包

    "safemode": false,

    //android打包参数

    "android": {

        //安卓包名

        "packagename": "com.test.android",

        //安卓打包类型 默认值0 0 使用自有证书 1 使用公共证书 2 使用老版证书 3 使用云端证书

        "androidpacktype": "1",

        //安卓使用自有证书自有打包证书参数

        //安卓打包证书别名,自有证书打包填写的参数

        "certalias": "",

        //安卓打包证书文件路径,自有证书打包填写的参数

        "certfile": "",

        //安卓打包证书密码,自有证书打包填写的参数

        "certpassword": "",

        //安卓打包证书库密码（HBuilderx4.41支持）,自有证书打包填写的参数

        "storePassword": "",

        //安卓平台要打的渠道包 取值有"google","yyb","360","huawei","xiaomi","oppo","vivo"，如果要打多个逗号隔开

        "channels": ""

    },

    //ios打包参数

    "ios": {

        //ios appid

        "bundle": "com.test.ios",

        //ios打包支持的设备类型 默认值iPhone 值有"iPhone","iPad" 如果要打多个逗号隔开打包平台

        "supporteddevice": "iPhone,iPad",

        //iOS使用自定义证书打包的profile文件路径

        "profile": "",

        //iOS使用自定义证书打包的p12文件路径

        "certfile": "",

        //iOS使用自定义证书打包的证书密码

        "certpassword": "123"

    },

    //是否混淆 true混淆 false关闭

    "isconfusion": false,

    //开屏广告 true打开 false关闭

    "splashads": false,

    //悬浮红包广告true打开 false关闭

    "rpads": false,

    //push广告 true打开 false关闭

    "pushads": false,

    //加入换量联盟 true加入 false不加入

    "exchange": false

}`;
}

async function packAndroid() {
  const exists = fs.existsSync(PACK_CONFIG_FILE);
  if (!exists) {
    header();
    console.log(`  ${chalk.bold.cyan('▶')} 创建打包配置\n`);
    console.log(`  ${chalk.yellow('⚠')} ${chalk.dim('pack.config.json 不存在，正在创建默认配置...')}`);
    fs.writeFileSync(PACK_CONFIG_FILE, getDefaultPackConfig(), 'utf8');
    console.log(`  ${chalk.green('✔')} 已创建 ${chalk.cyan('pack.config.json')}\n`);
    console.log(`  ${chalk.yellow('⚠')} 请编辑 pack.config.json 中的证书、包名等信息后再打包\n`);
    const edit = await input({ message: '按 Enter 开始打包，或输入 q 返回菜单:', default: '' });
    if (edit.trim().toLowerCase() === 'q') return;
  }

  // 版本确认
  header();
  console.log(`  ${chalk.bold.cyan('▶')} Android/iOS云打包\n`);
  _manifestCache = null;
  const curName = getManifestVersion();
  const curCode = getManifestVersionCode();
  console.log(`  ${chalk.dim('当前版本')}   ${chalk.bold(curName)}  ${chalk.dim('(versionCode: ' + curCode + ')')}`);
  console.log(`  ${chalk.dim('─'.repeat(30))}\n`);

  const autoUp = await input({ message: '是否自动升级版本号? (Y 升级 / n 不升级)', default: 'Y' });
  const isAuto = autoUp.trim().toLowerCase() !== 'n' && autoUp.trim().toLowerCase() !== 'no';

  const defaultName = isAuto ? nextVersionName(curName) : curName;
  const defaultCode = isAuto ? String(curCode + 1) : String(curCode);

  const newName = await input({ message: 'versionName:', default: defaultName });
  const newCodeStr = await input({ message: 'versionCode:', default: defaultCode });
  const newCode = parseInt(newCodeStr, 10);

  if (!newName || isNaN(newCode)) {
    console.log(`  ${chalk.red('✖ 输入无效')}`);
    await new Promise(r => setTimeout(r, 800));
    return;
  }

  console.log(`\n  ${chalk.dim('打包版本')}   ${chalk.bold(newName)}  ${chalk.cyan.bold('(versionCode: ' + newCode + ')')}\n`);

  const confirm = await input({ message: '按 Enter 确认打包，输入 q 返回:', default: '' });
  if (confirm.trim().toLowerCase() === 'q') return;

  updateManifestVersion(newName, newCode);
  console.log(`  ${chalk.green('✔')} manifest.json 已更新\n`);

  await openHbx();
  await importProject();
  await exec('Android/iOS云打包', cliCmd(`pack --config ${PACK_CONFIG_FILE} --platform android`));
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
    printMenu();

    const lastAction = config.lastAction;
    const lastHint = lastAction
      ? chalk.dim(` (上次: ${ACTION_NAMES[lastAction] || lastAction})`)
      : '';

    const raw = await input({
      message: chalk.bold('请输入操作编号:') + lastHint,
      default: lastAction || '',
    });

    const action = raw.trim();

    if (action === '0') {
      console.clear();
      console.log(boxen(chalk.cyan('再见!'), { padding: 1, borderStyle: 'double', borderColor: 'cyan' }));
      process.exit(0);
    }

    const fnMap = { '1': runWeb, '2': runWx, '3': runAli, '4': runAppAndroid, '5': runAppAndroidCustom, '6': pubWeb, '7': pubWx, '8': pubAli, '9': packAndroid, '10': listProjects, '11': basicSettings };
    const fn = fnMap[action];
    if (fn) {
      saveLastAction(action);
      config.lastAction = action;
      await fn();
    } else {
      console.log(`  ${chalk.red('✖ 无效编号，请输入 0-11')}`);
      await new Promise(r => setTimeout(r, 800));
    }
  }
}

main().catch(err => {
  console.error(chalk.red('错误:'), err.message);
  process.exit(1);
});
