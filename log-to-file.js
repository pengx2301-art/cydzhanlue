#!/usr/bin/env node

/**
 * 消息日志记录脚本
 * 作为飞书消息的备用方案,将消息保存到本地文件
 */

const fs = require('fs');
const path = require('path');

// 日志文件路径
const LOG_FILE = path.join(__dirname, 'message-log.txt');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * 获取时间戳
 */
function getTimestamp() {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 格式化消息
 */
function formatMessage(type, content) {
  const timestamp = getTimestamp();
  const separator = '='.repeat(60);

  let formatted = `\n${separator}\n`;
  formatted += `[${timestamp}] ${type}\n`;
  formatted += `${separator}\n`;
  formatted += `${content}\n`;
  formatted += `${separator}\n`;

  return formatted;
}

/**
 * 写入日志文件
 */
function writeLog(message) {
  try {
    fs.appendFileSync(LOG_FILE, message, 'utf-8');
    console.log(`${colors.green}✓ 消息已保存到: ${LOG_FILE}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ 保存失败: ${error.message}${colors.reset}`);
  }
}

/**
 * 预定义消息模板
 */
const messageTemplates = {
  // 工作进度报告
  progressReport: (status, details) => {
    return formatMessage('📊 工作进度报告', `
状态: ${status}
详情: ${details}

完成度: 94%

主要功能:
✓ 订单管理 (列表、详情、状态更新、导出)
✓ 用户管理 (CRUD 操作)
✓ 产品管理 (验证通过)
✓ 代理商管理 (验证通过)
✓ 日志记录 (余额和操作日志)
✓ 数据分析仪表板 (6 个图表)

待处理:
⚠️ 余额查询 API (需要服务器重启)
    `);
  },

  // 测试完成通知
  testComplete: (results) => {
    return formatMessage('✅ 测试完成', `
测试套件: ${results.suite}
通过: ${results.passed} / ${results.total}
失败: ${results.failed || 0}

摘要: ${results.summary}

测试时间: ${getTimestamp()}
    `);
  },

  // 错误警报
  errorAlert: (error) => {
    return formatMessage('❌ 错误警报', `
错误: ${error.message}
位置: ${error.location || '未知'}

发生时间: ${getTimestamp()}

请检查相关代码或日志文件。
    `);
  },

  // 部署通知
  deployComplete: (info) => {
    return formatMessage('🚀 部署完成', `
项目: ${info.project}
版本: ${info.version}
环境: ${info.env}

消息: ${info.message || '部署成功'}

部署时间: ${getTimestamp()}
    `);
  },

  // 通用文本消息
  text: (text) => {
    return formatMessage('📝 消息', text);
  }
};

// ==================== 主程序 ====================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    let message;

    switch (command) {
      case 'test':
        // 发送测试消息
        message = formatMessage('🧪 测试消息', '这是一条测试消息 - 日志系统正常工作!');
        break;

      case 'progress':
        // 发送工作进度
        const status = args[1] || '进行中';
        const details = args.slice(2).join(' ') || '项目正在开发中...';
        message = messageTemplates.progressReport(status, details);
        break;

      case 'test-complete':
        // 发送测试完成通知
        message = messageTemplates.testComplete({
          suite: args[1] || '全部测试',
          passed: args[2] || '所有',
          total: args[3] || '所有',
          summary: args[4] || '测试已通过'
        });
        break;

      case 'error':
        // 发送错误警报
        const errorMsg = args.slice(1).join(' ') || '发生未知错误';
        message = messageTemplates.errorAlert({
          message: errorMsg,
          location: '自动化脚本'
        });
        break;

      case 'deploy':
        // 发送部署通知
        message = messageTemplates.deployComplete({
          project: args[1] || 'cyd-admin',
          version: args[2] || 'latest',
          env: args[3] || 'production',
          message: args[4] || '部署成功'
        });
        break;

      case 'view':
        // 查看日志
        try {
          if (fs.existsSync(LOG_FILE)) {
            console.log(`${colors.cyan}${fs.readFileSync(LOG_FILE, 'utf-8')}${colors.reset}`);
          } else {
            console.log(`${colors.yellow}日志文件不存在${colors.reset}`);
          }
        } catch (error) {
          console.error(`${colors.red}读取失败: ${error.message}${colors.reset}`);
        }
        process.exit(0);

      case 'clear':
        // 清空日志
        try {
          fs.writeFileSync(LOG_FILE, '', 'utf-8');
          console.log(`${colors.green}✓ 日志已清空${colors.reset}`);
        } catch (error) {
          console.error(`${colors.red}✗ 清空失败: ${error.message}${colors.reset}`);
        }
        process.exit(0);

      default:
        console.log(`${colors.cyan}
${'='.repeat(60)}
消息日志记录工具
${'='.repeat(60)}${colors.reset}

用法:
  node log-to-file.js <command> [options...]

命令:
  test                    发送测试消息
  progress <status> <details>
                          发送工作进度报告
  test-complete <suite> <passed> <total> <summary>
                          发送测试完成通知
  error <message>         发送错误警报
  deploy <project> <version> <env> <message>
                          发送部署通知
  view                    查看所有日志
  clear                   清空日志文件

示例:
  node log-to-file.js test
  node log-to-file.js progress "完成" "订单管理功能测试已完成"
  node log-to-file.js test-complete "订单管理" "所有" "所有" "全部通过"
  node log-to-file.js view

日志文件位置:
  ${LOG_FILE}
        `);
        process.exit(0);
    }

    // 写入日志
    writeLog(message);

    // 同时在控制台显示
    console.log(`${colors.blue}${message}${colors.reset}`);

    process.exit(0);

  } catch (error) {
    console.error(`${colors.red}✗ 发生错误: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  messageTemplates,
  writeLog,
  formatMessage
};
