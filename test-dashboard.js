const http = require('http');

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

async function testDashboard() {
  console.log('=== 测试Dashboard数据API ===\n');

  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('✓ 登录成功\n');

  // 测试1: 获取配置和品牌信息
  console.log('1. 测试获取配置和品牌信息...');
  const configRes = await testAPI('GET', '/api/config/brand', null, token);
  console.log(`   ${configRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (configRes.code === 0 && configRes.data.brand) {
    console.log(`   系统名称: ${configRes.data.brand.name}`);
  }

  // 测试2: 获取权限元数据
  console.log('\n2. 测试获取权限元数据...');
  const permsRes = await testAPI('GET', '/api/permissions/meta', null, token);
  console.log(`   ${permsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (permsRes.code === 0) {
    console.log(`   权限组数: ${permsRes.data.length}`);
  }

  // 测试3: 获取统计概览数据
  console.log('\n3. 测试获取统计概览数据...');
  // 尝试获取每日收入数据
  const revenueRes = await testAPI('GET', '/api/stats/revenue?days=7', null, token);
  console.log(`   ${revenueRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);

  console.log('\n=== Dashboard数据API测试完成 ===');
}

testDashboard().catch(err => {
  console.error('测试出错:', err);
});
