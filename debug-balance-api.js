/**
 * debug-balance-api.js - 调试余额查询 API
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 8899;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
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

async function debug() {
  try {
    console.log('🔍 调试余额查询 API...\n');

    // 1. 登录
    console.log('1️⃣  正在登录...');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    console.log('   响应状态:', loginRes.status);
    console.log('   响应数据:', JSON.stringify(loginRes.body, null, 2));

    if (!loginRes.body.data || !loginRes.body.data.token) {
      console.log('❌ 登录失败，无法获取 token');
      return;
    }

    const token = loginRes.body.data.token;
    console.log(`   ✅ Token: ${token.substring(0, 30)}...\n`);

    // 2. 获取订单列表
    console.log('2️⃣  正在获取订单列表...');
    const ordersRes = await request('GET', '/api/orders?page=1&limit=10', null, token);
    console.log('   响应状态:', ordersRes.status);
    if (ordersRes.body.data && ordersRes.body.data.items) {
      console.log(`   找到 ${ordersRes.body.data.total} 个订单\n`);
      if (ordersRes.body.data.items.length > 0) {
        const firstOrder = ordersRes.body.data.items[0];
        console.log('   第一个订单:', JSON.stringify(firstOrder, null, 2));
        console.log();

        // 3. 测试余额查询
        console.log(`3️⃣  正在查询订单 ID ${firstOrder.id} 的用户余额...`);
        const balanceUrl = `/api/orders/${firstOrder.id}/balance`;
        console.log(`   请求路径: ${balanceUrl}`);
        console.log(`   请求方法: GET`);
        console.log(`   授权令牌: Bearer ${token.substring(0, 30)}...\n`);

        const balanceRes = await request('GET', balanceUrl, null, token);
        console.log('   响应状态:', balanceRes.status);
        console.log('   响应头:', JSON.stringify(balanceRes.headers, null, 2));
        console.log('   响应数据:', JSON.stringify(balanceRes.body, null, 2));

        if (balanceRes.body.code === -1 && balanceRes.body.msg === 'API 接口不存在') {
          console.log('\n⚠️  警告: 服务器返回 "API 接口不存在"');
          console.log('   这可能意味着路由匹配失败。');
          console.log('\n   让我们测试其他可能的路由格式...\n');

          // 测试其他路由格式
          const altRoutes = [
            `/api/member/${firstOrder.member_id}/balance`,
            `/api/balance/${firstOrder.id}`,
            `/api/members/${firstOrder.member_id}/balance`,
          ];

          for (const route of altRoutes) {
            console.log(`   测试: ${route}`);
            const altRes = await request('GET', route, null, token);
            console.log(`   状态: ${altRes.status}, 消息: ${altRes.body.msg || altRes.body.error || 'OK'}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ 错误:', err.message);
  }
}

debug();
