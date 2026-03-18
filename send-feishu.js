#!/usr/bin/env node

/**
 * 飞书机器人消息发送脚本
 * 使用 Webhook 方式发送消息到飞书群
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

// ==================== 配置区域 ====================

// 飞书机器人 Webhook URL
const WEBHOOK_URL = 'https://www.codebuddy.cn/v2/backgroundagent/feishuProxy/webhook/cli_a93f958aab611cce';

// 消息类型: text | post | interactive
const MESSAGE_TYPE = 'text';

// 消息内容
const MESSAGE_CONTENT = {
  text: '这是一条测试消息 - 来自 WorkBuddy'
};

// ================================================

/**
 * 发送消息到飞书
 * @param {string} url - Webhook URL
 * @param {object} data - 消息数据
 */
function sendFeishuMessage(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          // 检查多种成功响应格式
          const isSuccess = res.statusCode === 200 && (
            result.code === 0 ||
            result.success === true ||
            result.Success === true
          );
          if (isSuccess) {
            resolve({ success: true, data: result });
          } else {
            reject(new Error(`发送失败: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          // 如果无法解析 JSON,但状态码是 200,也认为成功
          if (res.statusCode === 200) {
            resolve({ success: true, data: body });
          } else {
            reject(new Error(`解析响应失败: ${error.message}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 构建不同类型的消息
 */
function buildMessage(type, content) {
  switch (type) {
    case 'text':
      return { msg_type: 'text', content };

    case 'post':
      return {
        msg_type: 'post',
        content: {
          post: {
            zh_cn: {
              title: content.title || '通知',
              content: content.elements || [
                [{ tag: 'text', text: content.text }]
              ]
            }
          }
        }
      };

    case 'interactive':
      return {
        msg_type: 'interactive',
        card: content.card
      };

    default:
      throw new Error(`不支持的消息类型: ${type}`);
  }
}

/**
 * 预定义的消息模板
 */
const messageTemplates = {
  // 工作进度报告
  progressReport: (status, details) => ({
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '📊 工作进度报告',
          content: [
            [
              { tag: 'text', text: `状态: ${status}\n` }
            ],
            [
              { tag: 'text', text: details }
            ],
            [
              { tag: 'text', text: `\n时间: ${new Date().toLocaleString('zh-CN')}` }
            ]
          ]
        }
      }
    }
  }),

  // 测试完成通知
  testComplete: (results) => ({
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '✅ 测试完成',
          content: [
            [
              { tag: 'text', text: `测试套件: ${results.suite}\n` },
              { tag: 'text', text: `通过: ${results.passed} / ${results.total}\n` },
              { tag: 'text', text: `失败: ${results.failed}\n` }
            ],
            [
              { tag: 'text', text: results.summary || '所有测试已完成' }
            ]
          ]
        }
      }
    }
  }),

  // 错误警报
  errorAlert: (error) => ({
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '❌ 错误警报',
          content: [
            [
              { tag: 'text', text: `错误: ${error.message}\n` }
            ],
            [
              { tag: 'text', text: `位置: ${error.location || '未知'}\n` }
            ],
            [
              { tag: 'text', text: `时间: ${new Date().toLocaleString('zh-CN')}` }
            ]
          ]
        }
      }
    }
  }),

  // 部署通知
  deployComplete: (info) => ({
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: '🚀 部署完成',
          content: [
            [
              { tag: 'text', text: `项目: ${info.project}\n` },
              { tag: 'text', text: `版本: ${info.version}\n` },
              { tag: 'text', text: `环境: ${info.env}\n` }
            ],
            [
              { tag: 'text', text: info.message || '代码已成功部署' }
            ]
          ]
        }
      }
    }
  })
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
        message = buildMessage('text', { text: '✅ 飞书 Webhook 测试成功!' });
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

      default:
        console.log(`
用法:
  node send-feishu.js <command> [options...]

命令:
  test                    发送测试消息
  progress <status> <details>
                          发送工作进度报告
  test-complete <suite> <passed> <total> <summary>
                          发送测试完成通知
  error <message>         发送错误警报
  deploy <project> <version> <env> <message>
                          发送部署通知

示例:
  node send-feishu.js test
  node send-feishu.js progress "完成" "订单管理功能测试已完成"
  node send-feishu.js test-complete "订单管理" "所有" "所有" "全部通过"
  node send-feishu.js deploy "cyd-admin" "v1.0.0" "production"
        `);
        process.exit(0);
    }

    console.log('正在发送消息到飞书...');
    const result = await sendFeishuMessage(WEBHOOK_URL, message);
    console.log('✓ 消息发送成功!');
    console.log('响应:', JSON.stringify(result.data, null, 2));
    process.exit(0);

  } catch (error) {
    console.error('✗ 发送失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  sendFeishuMessage,
  messageTemplates
};
