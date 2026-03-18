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

async function testProductManagement() {
  console.log('=== 测试产品管理功能 ===\n');

  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('✓ 登录成功\n');

  // 测试1: 获取产品列表
  console.log('1. 测试获取产品列表...');
  const productsRes = await testAPI('GET', '/api/products', null, token);
  console.log(`   ${productsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (productsRes.code === 0) {
    console.log(`   产品总数: ${productsRes.data.total}`);
    console.log(`   正常: ${productsRes.data.enabled}`);
  }

  // 测试2: 获取产品分类
  console.log('\n2. 测试获取产品分类...');
  const categoriesRes = await testAPI('GET', '/api/categories', null, token);
  console.log(`   ${categoriesRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (categoriesRes.code === 0) {
    console.log(`   分类总数: ${categoriesRes.data.length}`);
  }

  // 测试3: 获取供应商列表
  console.log('\n3. 测试获取供应商列表...');
  const suppliersRes = await testAPI('GET', '/api/suppliers', null, token);
  console.log(`   ${suppliersRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (suppliersRes.code === 0) {
    console.log(`   供应商总数: ${suppliersRes.data.length}`);
  }

  console.log('\n=== 产品管理功能测试完成 ===');
}

testProductManagement().catch(err => {
  console.error('测试出错:', err);
});
