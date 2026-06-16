const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`📦 版本升级: ${pkg.version} → ${newVersion}`);

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

execSync('npm publish --access public', { stdio: 'inherit' });

console.log(`✅ 发布成功: @${pkg.name}@${newVersion}`);
