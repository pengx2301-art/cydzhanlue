const http = require('http');

// 简单的HTTP请求
function testAPI(method, path, body, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8899,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // 如果有token，添加到Authorization头
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

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    if (body && method !== 'GET') {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('=== 开始测试订单管理功能 ===\n');

  // 测试1: 登录
  console.log('1. 测试登录...');
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  console.log('登录结果:', loginRes.code === 0 ? '✓ 成功' : '✗ 失败');
  if (loginRes.code !== 0) {
    console.log('错误:', loginRes.msg);
    return;
  }

  const token = loginRes.data.token;
  console.log('Token:', token.substring(0, 20) + '...\n');

  // 测试2: 获取订单列表
  console.log('2. 测试获取订单列表...');
  const ordersRes = await testAPI('GET', '/api/orders', null, token);
  console.log('订单列表:', ordersRes.code === 0 ? '✓ 成功' : '✗ 失败');
  if (ordersRes.code !== 0) {
    console.log('错误详情:', JSON.stringify(ordersRes, null, 2));
  }
  if (ordersRes.code === 0) {
    console.log('订单总数:', ordersRes.data.total);
    console.log('待处理:', ordersRes.data.pending);
    console.log('成功:', ordersRes.data.success);
    console.log('失败:', ordersRes.data.failed);
  }

  // 获取第一个订单ID
  let orderId = 1;
  if (ordersRes.code === 0 && ordersRes.data.items.length > 0) {
    orderId = ordersRes.data.items[0].id;
  }
  console.log('测试订单ID:', orderId, '\n');

  // 测试3: 获取订单详情
  console.log('3. 测试获取订单详情...');
  const detailRes = await testAPI('GET', `/api/orders/${orderId}`, null, token);
  console.log('订单详情:', detailRes.code === 0 ? '✓ 成功' : '✗ 失败');
  if (detailRes.code === 0) {
    console.log('订单号:', detailRes.data.order_no);
    console.log('用户:', detailRes.data.member_name);
    console.log('金额:', detailRes.data.amount);
    console.log('状态:', detailRes.data.status);
  }

  // 测试4: 查询余额
  console.log('\n4. 测试查询余额...');
  const balanceRes = await testAPI('GET', `/api/orders/${orderId}/balance`, null, token);
  console.log('查询余额:', balanceRes.code === 0 ? '✓ 成功' : '✗ 失败');
  if (balanceRes.code === 0) {
    console.log('用户:', balanceRes.data.member_name);
    console.log('余额:', balanceRes.data.balance);
  } else {
    console.log('错误:', balanceRes.msg);
  }

  // 测试5: 更新订单状态
  console.log('\n5. 测试更新订单状态...');
  const updateRes = await testAPI('PUT', `/api/orders/${orderId}/status`, { status: 1, remark: '测试' }, token);
  console.log('更新状态:', updateRes.code === 0 ? '✓ 成功' : '✗ 失败');

  console.log('\n=== 测试完成 ===');
}

runTests().catch(err => {
  console.error('测试出错:', err);
});
