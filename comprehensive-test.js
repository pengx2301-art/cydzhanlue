#!/usr/bin/env node
/**
 * comprehensive-test.js - 完整系统测试
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, 'WorkBuddy/20260315203305');
const PORT = 8899;

console.log('🚀 启动完整系统测试...\n');

const server = spawn('node', ['server.js'], {
  cwd: PROJECT_DIR,
  stdio: ['inherit', 'inherit', 'inherit']
});

server.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err.message);
  process.exit(1);
});

setTimeout(async () => {
  console.log('\n\n════════════════════════════════════════');
  console.log('          系统测试')
  console.log('════════════════════════════════════════\n');
  
  try {
    let token = '';
    let testsPassed = 0;
    let testsFailed = 0;

    // 测试集合
    const tests = [
      {
        name: '登录测试',
        method: 'POST',
        path: '/api/auth/login',
        body: { username: 'admin', password: '123456' },
        requireAuth: false,
        validate: (res) => res.data && res.data.token
      },
      {
        name: '获取订单列表',
        method: 'GET',
        path: '/api/orders?page=1&limit=10',
        requireAuth: true,
        validate: (res) => Array.isArray(res.data.items)
      },
      {
        name: '获取用户列表',
        method: 'GET',
        path: '/api/members?page=1&limit=10',
        requireAuth: true,
        validate: (res) => Array.isArray(res.data.items)
      },
      {
        name: '获取产品列表',
        method: 'GET',
        path: '/api/products?page=1&limit=10',
        requireAuth: true,
        validate: (res) => Array.isArray(res.data.items)
      },
      {
        name: '获取角色列表',
        method: 'GET',
        path: '/api/roles',
        requireAuth: true,
        validate: (res) => Array.isArray(res.data)
      },
      {
        name: '获取余额变动日志',
        method: 'GET',
        path: '/api/balance-logs?page=1&limit=10',
        requireAuth: true,
        validate: (res) => res.data && typeof res.data === 'object'
      },
      {
        name: '获取操作日志',
        method: 'GET',
        path: '/api/operation-logs?page=1&limit=10',
        requireAuth: true,
        validate: (res) => res.data && typeof res.data === 'object'
      },
      {
        name: '获取余额管理统计',
        method: 'GET',
        path: '/api/balance/overview',
        requireAuth: true,
        validate: (res) => res.data && res.data.stats
      },
      {
        name: '查询订单用户余额 (ID: 3)',
        method: 'GET',
        path: '/api/orders/3/balance',
        requireAuth: true,
        validate: (res) => res.data && typeof res.data.balance === 'number'
      },
      {
        name: '查询订单用户余额 (ID: 1)',
        method: 'GET',
        path: '/api/orders/1/balance',
        requireAuth: true,
        validate: (res) => res.data && typeof res.data.balance === 'number'
      },
      {
        name: '获取充值申请',
        method: 'GET',
        path: '/api/recharge-applies?status=pending',
        requireAuth: true,
        validate: (res) => res.data && typeof res.data === 'object'
      },
      {
        name: '获取提现申请',
        method: 'GET',
        path: '/api/withdraw-applies',
        requireAuth: true,
        validate: (res) => res.data && typeof res.data === 'object'
      }
    ];

    // 运行测试
    for (const test of tests) {
      try {
        const res = await request(test.method, test.path, test.body, test.requireAuth ? token : null);

        // 保存登录返回的 token
        if (test.name === '登录测试' && res.data && res.data.token) {
          token = res.data.token;
        }

        // 验证响应
        if (res.code === 0 && test.validate(res)) {
          console.log(`✅ ${test.name}`);
          testsPassed++;
        } else {
          console.log(`❌ ${test.name}`);
          console.log(`   错误: ${res.msg || '验证失败'}`);
          testsFailed++;
        }
      } catch (err) {
        console.log(`❌ ${test.name}`);
        console.log(`   异常: ${err.message}`);
        testsFailed++;
      }
    }

    console.log(`\n════════════════════════════════════════`);
    console.log(`测试结果: ${testsPassed}/${tests.length} 通过`);
    console.log(`✅ 成功: ${testsPassed}  ❌ 失败: ${testsFailed}`);
    console.log(`════════════════════════════════════════\n`);

    server.kill();
  } catch (err) {
    console.error('❌ 测试出错:', err.message);
    server.kill();
  }
}, 3000);

function request(method, pathname, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: pathname,
      method: method,
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
          resolve({ error: data, msg: 'JSON parse error' });
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

process.on('SIGINT', () => {
  console.log('\n\n🛑 测试中止');
  server.kill();
  process.exit(0);
});
