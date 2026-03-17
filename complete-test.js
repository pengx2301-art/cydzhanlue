#!/usr/bin/env node
/**
 * complete-test.js - 完整的服务器启动和测试脚本
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.join(__dirname, 'WorkBuddy/20260315203305');
const PORT = 8899;

console.log('🚀 启动完整测试...\n');
console.log(`项目目录: ${PROJECT_DIR}`);
console.log(`启动命令: node server.js\n`);

// 启动服务器
const server = spawn('node', ['server.js'], {
  cwd: PROJECT_DIR,
  stdio: ['inherit', 'inherit', 'inherit'] // 继承所有输出
});

server.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err.message);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n服务器已关闭，退出码: ${code}`);
  process.exit(code);
});

// 延迟后运行测试
setTimeout(async () => {
  console.log('\n\n════════════════════════════════════════');
  console.log('          开始 API 测试');
  console.log('════════════════════════════════════════\n');
  
  try {
    // 登录
    console.log('📝 步骤 1: 登录');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: '123456'
    });

    if (!loginRes.data || !loginRes.data.token) {
      console.log('❌ 登录失败');
      server.kill();
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ 登录成功\n');

    // 测试余额查询
    console.log('📝 步骤 2: 测试余额查询 API');
    console.log('   路径: /api/orders/3/balance');
    console.log('   方法: GET\n');

    const balanceRes = await request('GET', '/api/orders/3/balance', null, token);
    
    console.log('响应:');
    console.log(JSON.stringify(balanceRes, null, 2));

    if (balanceRes.code === 0) {
      console.log('\n✅ 测试成功!');
    } else {
      console.log(`\n⚠️  API 返回非零代码: ${balanceRes.code}`);
      console.log(`   消息: ${balanceRes.msg}`);
    }

    server.kill();
  } catch (err) {
    console.error('❌ 测试出错:', err.message);
    server.kill();
  }
}, 3000);

// 请求函数
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
          resolve({ error: data, raw: data });
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

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n🛑 收到终止信号，关闭服务器...');
  server.kill();
  process.exit(0);
});
