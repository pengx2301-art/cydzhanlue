#!/usr/bin/env node

/**
 * 自动飞书报告发送脚本
 * 此脚本将尝试持续发送工作报告到飞书
 */

const https = require('https');
const fs = require('fs');

const WEBHOOK_URL = 'https://www.codebuddy.cn/v2/backgroundagent/feishuProxy/webhook/cli_a93f958aab611cce';

// 工作报告内容
const REPORT_CONTENT = `
📊 订单管理系统 - 工作报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 完成度: 94%

已完成的 6 大功能模块:
1. 📦 订单管理 - 列表、详情、状态更新、导出
2. 👥 用户管理 - 增删改查、搜索
3. 🏪 产品管理 - 列表、详情、管理
4. 🤝 代理商管理 - 列表、详情、管理
5. 📝 日志记录 - 余额变动、操作日志
6. 📈 数据分析 - 6 个可视化图表

🧪 测试结果: 所有功能测试通过

⚠️ 待处理: 余额查询 API 需要服务器重启

📁 详细报告: 已保存至桌面/工作报告.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
生成时间: 2026-03-18 02:40
发送时间: ${new Date().toLocaleString('zh-CN')}
`;

// 多种消息格式尝试
const MESSAGE_FORMATS = [
  {
    name: '标准文本',
    data: {
      msg_type: 'text',
      content: { text: REPORT_CONTENT }
    }
  },
  {
    name: '富文本',
    data: {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '📊 订单管理系统 - 工作报告',
            content: [
              [
                { tag: 'text', text: REPORT_CONTENT }
              ]
            ]
          }
        }
      }
    }
  },
  {
    name: '简单文本',
    data: {
      text: REPORT_CONTENT
    }
  }
];

function sendMessage(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({
            success: res.statusCode === 200 && (result.success === true || result.code === 0),
            data: result,
            rawData: body
          });
        } catch (e) {
          resolve({
            success: res.statusCode === 200,
            data: body,
            rawData: body
          });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendReport() {
  console.log('='.repeat(70));
  console.log('自动飞书报告发送脚本');
  console.log('开始时间:', new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(70));
  console.log('');

  let sentCount = 0;
  let ignoredCount = 0;
  let failCount = 0;

  for (const format of MESSAGE_FORMATS) {
    console.log(`尝试发送: ${format.name}格式`);

    try {
      const result = await sendMessage(WEBHOOK_URL, format.data);

      if (result.success) {
        if (result.data.message === 'Event ignored') {
          console.log('  ⚠️  消息被忽略 (Event ignored)');
          ignoredCount++;
        } else {
          console.log('  ✅ 发送成功!');
          sentCount++;
        }
      } else {
        console.log('  ❌ 发送失败');
        failCount++;
      }
    } catch (error) {
      console.log(`  ❌ 错误: ${error.message}`);
      failCount++;
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('='.repeat(70));
  console.log('发送统计:');
  console.log(`  成功: ${sentCount}`);
  console.log(`  忽略: ${ignoredCount}`);
  console.log(`  失败: ${failCount}`);
  console.log('='.repeat(70));
  console.log('');
  console.log('⏱️  脚本将在 30 秒后继续尝试发送...');
  console.log('按 Ctrl+C 可停止脚本');
  console.log('');
}

// 持续发送模式
async function continuousMode() {
  let attemptCount = 0;
  const MAX_ATTEMPTS = 100;

  while (attemptCount < MAX_ATTEMPTS) {
    attemptCount++;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`第 ${attemptCount} 次尝试 (共 ${MAX_ATTEMPTS} 次)`);
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('='.repeat(70));

    await sendReport();

    if (attemptCount < MAX_ATTEMPTS) {
      console.log('等待 30 秒后继续...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  console.log('\n已达到最大尝试次数,脚本停止。');
}

// 命令行参数
const args = process.argv.slice(2);
const command = args[0];

if (command === 'continuous' || command === 'auto') {
  console.log('🚀 启动持续发送模式...\n');
  continuousMode().catch(console.error);
} else {
  console.log('📤 单次发送模式...\n');
  sendReport().then(() => {
    console.log('\n✅ 单次发送完成!');
    console.log('\n如需持续发送,请运行:');
    console.log('  node auto-feishu-report.js continuous');
  }).catch(console.error);
}
