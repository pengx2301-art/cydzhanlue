#!/usr/bin/env node

/**
 * 飞书代理服务详细诊断
 */

const https = require('https');

const WEBHOOK_URL = 'https://www.codebuddy.cn/v2/backgroundagent/feishuProxy/webhook/cli_a93f958aab611cce';

// 测试多种不同的消息格式,包括 WorkBuddy 特有的格式
const testMessages = [
  {
    name: '1. 标准飞书文本消息',
    data: {
      msg_type: 'text',
      content: {
        text: '🧪 诊断消息 1 - 标准飞书文本格式'
      }
    }
  },
  {
    name: '2. WorkBuddy 任务消息格式',
    data: {
      type: 'message',
      content: '🧪 诊断消息 2 - WorkBuddy 任务格式',
      timestamp: Date.now()
    }
  },
  {
    name: '3. 简单文本消息',
    data: {
      text: '🧪 诊断消息 3 - 简单文本'
    }
  },
  {
    name: '4. 包含 workbuddy 标识的消息',
    data: {
      source: 'workbuddy',
      message: '🧪 诊断消息 4 - 带 workbuddy 标识',
      type: 'notification'
    }
  },
  {
    name: '5. 富文本卡片消息',
    data: {
      msg_type: 'interactive',
      card: {
        config: {
          wide_screen_mode: true
        },
        header: {
          title: {
            tag: 'plain_text',
            content: '📊 诊断消息'
          }
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'plain_text',
              content: '这是一条诊断消息 - 富文本卡片格式'
            }
          }
        ]
      }
    }
  },
  {
    name: '6. 飞书富文本消息',
    data: {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '📊 诊断消息',
            content: [
              [
                { tag: 'text', text: '这是一条诊断消息 - 富文本格式' }
              ]
            ]
          }
        }
      }
    }
  }
];

function sendRequest(url, data, testName) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`测试: ${testName}`);
    console.log('='.repeat(70));
    console.log('请求数据:', JSON.stringify(data, null, 2));
    console.log('请求 URL:', url);
    console.log('');

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'WorkBuddy-Feishu-Client/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      console.log('响应状态码:', res.statusCode);
      console.log('响应 Content-Type:', res.headers['content-type']);
      console.log('');

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        console.log('响应内容:', body);
        try {
          const result = JSON.parse(body);
          resolve({
            success: res.statusCode === 200,
            data: result,
            rawData: body,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({
            success: res.statusCode === 200,
            data: body,
            rawData: body,
            statusCode: res.statusCode
          });
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
  console.log('飞书代理服务详细诊断');
  console.log('时间:', new Date().toLocaleString('zh-CN'));
  console.log('');

  let successCount = 0;
  let ignoredCount = 0;
  let failCount = 0;

  for (const test of testMessages) {
    try {
      const result = await sendRequest(WEBHOOK_URL, test.data, test.name);

      if (result.success) {
        if (result.data.success === true) {
          if (result.data.message === 'Event ignored') {
            console.log(`⚠️  结果: 消息被服务器忽略 (Event ignored)`);
            ignoredCount++;
          } else {
            console.log(`✓ 结果: 消息发送成功`);
            successCount++;
          }
        } else {
          console.log(`✗ 结果: 服务器返回成功状态,但响应异常`);
          failCount++;
        }
      } else {
        console.log(`✗ 结果: HTTP 请求失败 (${result.statusCode})`);
        failCount++;
      }
    } catch (error) {
      console.error(`✗ 结果: 发生错误 - ${error.message}`);
      failCount++;
    }

    // 等待 1.5 秒再发送下一个
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('诊断总结');
  console.log('='.repeat(70));
  console.log(`总测试数: ${testMessages.length}`);
  console.log(`✓ 成功: ${successCount}`);
  console.log(`⚠️  忽略: ${ignoredCount}`);
  console.log(`✗ 失败: ${failCount}`);
  console.log('');

  console.log('诊断建议:');
  if (ignoredCount > 0) {
    console.log('1. 所有消息都被 "Event ignored",这说明:');
    console.log('   - Webhook URL 是有效的');
    console.log('   - 请求成功到达服务器');
    console.log('   - 但消息格式可能不符合 WorkBuddy 代理服务的要求');
    console.log('   - 或者 WorkBuddy 的飞书配置还没有完全建立连接');
    console.log('');
    console.log('2. 可能的解决方案:');
    console.log('   a) 在 WorkBuddy 中重新配置飞书集成');
    console.log('   b) 检查 WorkBuddy 的 Claw 远程控制是否启用');
    console.log('   c) 确认飞书机器人已添加到单聊中');
    console.log('   d) 查看飞书机器人是否需要先通过 WorkBuddy 触发首次连接');
  }
  console.log('');

  console.log('请检查您的飞书单聊,确认是否收到任何消息。');
}

main().catch(console.error);
