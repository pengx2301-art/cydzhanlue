/**
 * quick-test.js — 快速验证测试
 * 用于快速验证 P0 优化是否正常工作
 */

const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8899,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function quickTest() {
  console.log('\n🚀 快速验证 P0 优化\n');

  try {
    // 1. 测试错误处理增强
    console.log('1️⃣ 测试错误响应是否包含 timestamp...');
    const loginErr = await request('POST', '/api/auth/login', { username: 'x' });
    console.log('   响应:', JSON.stringify(loginErr, null, 2));
    if (loginErr.timestamp) {
      console.log('   ✅ timestamp 字段存在!\n');
    } else {
      console.log('   ❌ 缺少 timestamp 字段\n');
    }

    // 2. 测试验证中间件
    console.log('2️⃣ 测试验证错误是否包含 errorCode...');
    const valErr = await request('POST', '/api/auth/login', { username: 'x', password: '123' });
    console.log('   响应:', JSON.stringify(valErr, null, 2));
    if (valErr.errorCode) {
      console.log('   ✅ errorCode 字段存在!\n');
    } else {
      console.log('   ❌ 缺少 errorCode 字段\n');
    }

    // 3. 测试产品列表缓存
    console.log('3️⃣ 测试产品列表 API...');
    const prod1 = await request('GET', '/api/products?page=1');
    console.log('   第一次请求完成');
    console.log('   响应类型:', typeof prod1);
    if (prod1.data && prod1.data.items) {
      console.log('   ✅ 产品列表 API 正常工作!\n');
    } else {
      console.log('   ❌ 响应格式异常\n');
      console.log('   完整响应:', JSON.stringify(prod1, null, 2));
    }

    // 4. 测试订单列表缓存
    console.log('4️⃣ 测试订单列表 API...');
    const orders = await request('GET', '/api/orders');
    if (orders.data && orders.data.items) {
      console.log('   ✅ 订单列表 API 正常工作!\n');
    } else {
      console.log('   ❌ 响应格式异常\n');
      console.log('   完整响应:', JSON.stringify(orders, null, 2));
    }

    console.log('✅ 快速验证完成!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ 测试错误:', err.message);
    process.exit(1);
  }
}

quickTest();
