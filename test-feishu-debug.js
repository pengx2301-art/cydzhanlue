#!/usr/bin/env node

/**
 * 飞书 Webhook 调试脚本
 */

const https = require('https');

const WEBHOOK_URL = 'https://www.codebuddy.cn/v2/backgroundagent/feishuProxy/webhook/cli_a93f958aab611cce';

// 测试多种消息格式
const testMessages = [
  {
    name: '文本消息 (标准格式)',
    data: {
      msg_type: 'text',
      content: {
        text: '🧪 调试消息 1 - 标准文本格式'
      }
    }
  },
  {
    name: '文本消息 (简化格式)',
    data: {
      msg_type: 'text',
      content: {
        text: '🧪 调试消息 2 - 简化文本格式'
      }
    }
  },
  {
    name: '富文本消息',
    data: {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '📊 调试消息',
            content: [
              [{ tag: 'text', text: '这是一条调试消息 - 富文本格式' }]
            ]
          }
        }
      }
    }
  },
  {
    name: '纯文本 (无 msg_type)',
    data: {
      text: '🧪 调试消息 3 - 纯文本'
    }
  }
];

function sendRequest(url, data, testName) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    console.log(`\n========== ${testName} ==========`);
    console.log('请求数据:', JSON.stringify(data, null, 2));
    console.log('请求 URL:', url);
    console.log('请求方法: POST');

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

    console.log('请求头:', options.headers);

    const req = https.request(options, (res) => {
      let body = '';
      console.log('\n响应状态码:', res.statusCode);
      console.log('响应头:', res.headers);

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('响应内容:', body);
        try {
          const result = JSON.parse(body);
          resolve({ success: res.statusCode === 200, data: result, rawData: body });
        } catch (e) {
          resolve({ success: res.statusCode === 200, data: body, rawData: body });
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('飞书 Webhook 调试工具');
  console.log('='.repeat(50));

  for (const test of testMessages) {
    try {
      const result = await sendRequest(WEBHOOK_URL, test.data, test.name);
      if (result.success) {
        console.log(`✓ ${test.name} - 请求已发送`);
      } else {
        console.log(`✗ ${test.name} - 发送失败`);
      }
    } catch (error) {
      console.error(`✗ ${test.name} - 错误:`, error.message);
    }

    // 等待 1 秒再发送下一个
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n========== 调试完成 ==========');
  console.log('请检查您的飞书群,确认是否收到任何消息');
  console.log('\n可能的问题:');
  console.log('1. Webhook URL 不正确或已失效');
  console.log('2. 消息格式不符合飞书要求');
  console.log('3. 飞书机器人权限不足');
  console.log('4. Webhook 代理服务配置问题');
}

main().catch(console.error);
