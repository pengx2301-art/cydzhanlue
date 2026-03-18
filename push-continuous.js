#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// 配置
const SUBMODULE_PATH = 'WorkBuddy/20260315203305';
const MAX_RETRIES = 100; // 最大重试次数
const RETRY_DELAY = 30000; // 30秒重试间隔

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`${colors.blue}[${timestamp}]${color} ${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkNetwork() {
  try {
    execSync('ping -n 1 github.com', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function checkSubmoduleStatus() {
  try {
    const output = execSync(`cd "${SUBMODULE_PATH}" && git status --short`, { encoding: 'utf-8' });
    return !output.trim();
  } catch (error) {
    return false;
  }
}

function pushSubmodule() {
  try {
    execSync(`cd "${SUBMODULE_PATH}" && git push origin main`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  log('=== Git 持续推送脚本启动 ===', colors.green);
  log(`目标: ${SUBMODULE_PATH}`, colors.yellow);
  log(`最大重试: ${MAX_RETRIES} 次`, colors.yellow);
  log(`重试间隔: ${RETRY_DELAY / 1000} 秒`, colors.yellow);
  console.log('');

  let attempts = 0;
  let success = false;

  while (attempts < MAX_RETRIES && !success) {
    attempts++;

    log(`尝试 #${attempts} / ${MAX_RETRIES}`, colors.blue);

    // 检查网络连接
    if (!checkNetwork()) {
      log('网络连接失败，等待下次尝试...', colors.yellow);
      await sleep(RETRY_DELAY);
      continue;
    }

    log('网络连接正常', colors.green);

    // 检查子模块状态
    if (!checkSubmoduleStatus()) {
      log('子模块有未提交的更改，跳过推送', colors.yellow);
      log('请先提交子模块的更改', colors.red);
      break;
    }

    // 尝试推送
    log('正在推送...', colors.blue);
    if (pushSubmodule()) {
      log('✓ 推送成功！', colors.green);
      success = true;
      break;
    } else {
      log('✗ 推送失败，等待下次尝试...', colors.yellow);
      await sleep(RETRY_DELAY);
    }
  }

  console.log('');
  if (success) {
    log(`=== 成功！共尝试 ${attempts} 次 ===`, colors.green);
    process.exit(0);
  } else {
    log(`=== 失败！已达到最大重试次数 ${MAX_RETRIES} 次 ===`, colors.red);
    process.exit(1);
  }
}

main().catch(error => {
  log(`发生错误: ${error.message}`, colors.red);
  process.exit(1);
});
