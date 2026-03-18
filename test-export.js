const http = require('http');
const fs = require('fs');

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

async function testExport() {
  console.log('=== 测试导出功能 ===\n');

  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('登录成功\n');

  // 获取订单列表
  const ordersRes = await testAPI('GET', '/api/orders', null, token);
  console.log(`获取到 ${ordersRes.data.total} 条订单\n`);

  if (ordersRes.data.total === 0) {
    console.log('没有订单可导出');
    return;
  }

  // 模拟导出功能（前端实现）
  console.log('生成 CSV 文件...');

  const orders = ordersRes.data.items;
  const headers = ['订单号', '用户', '产品', '金额', '状态', '创建时间'];
  const rows = orders.map(o => [
    o.order_no,
    o.member_name,
    o.product_name,
    o.amount,
    ['待处理', '处理中', '成功', '失败', '已退款'][o.status] || o.status,
    o.created_at
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`;

  fs.writeFileSync(filename, csvContent, 'utf-8');
  console.log(`✓ 导出成功: ${filename}`);
  console.log(`  文件大小: ${fs.statSync(filename).size} bytes`);
}

testExport().catch(err => {
  console.error('测试出错:', err);
});
