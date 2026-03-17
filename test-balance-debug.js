/**
 * test-balance-debug.js - 测试余额 API 并调试 pathname 问题
 */

const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8899,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);

    if (body && method !== 'GET') {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function test() {
  try {
    // 1. 登录
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: '123456'
    });

    const token = loginRes.data.token;
    console.log('✅ 已登录');

    // 2. 测试不同的 URL 格式
    const testUrls = [
      '/api/orders/3/balance',           // 正常格式
      '/api/orders/1/balance',           // 其他订单 ID
      '/api/orders/2/balance',           // 其他订单 ID
    ];

    console.log('\n🔍 测试不同的 URL 格式:\n');

    for (const url of testUrls) {
      const res = await request('GET', url, null, token);
      console.log(`📍 ${url}`);
      console.log(`   状态: ${res.code}, 消息: ${res.msg}\n`);
    }

    // 3. 查看是否有数据分析 API
    console.log('📊 测试其他可能缺失的 API:\n');

    const otherApis = [
      '/api/dashboard/stats',
      '/api/dashboard',
      '/api/stats',
      '/api/analytics',
      '/api/orders/stats',
    ];

    for (const api of otherApis) {
      const res = await request('GET', api, null, token);
      console.log(`📍 ${api}`);
      console.log(`   状态: ${res.code}, 消息: ${res.msg}\n`);
    }

  } catch (err) {
    console.error('❌ 错误:', err.message);
  }
}

test();
