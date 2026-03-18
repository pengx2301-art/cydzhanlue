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

async function testUserManagement() {
  console.log('=== 测试用户管理功能 ===\n');

  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('✓ 登录成功\n');

  // 测试1: 获取用户列表
  console.log('1. 测试获取用户列表...');
  const membersRes = await testAPI('GET', '/api/members', null, token);
  console.log(`   ${membersRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (membersRes.code === 0) {
    console.log(`   用户总数: ${membersRes.data.total}`);
    console.log(`   正常用户: ${membersRes.data.active}`);
  }

  // 测试2: 搜索用户
  console.log('\n2. 测试搜索用户...');
  const searchRes = await testAPI('GET', '/api/members?keyword=test', null, token);
  console.log(`   ${searchRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (searchRes.code === 0) {
    console.log(`   找到 ${searchRes.data.items.length} 个匹配用户`);
  }

  // 测试3: 调整余额（使用第一个用户ID）
  let userId = 6; // test用户的ID
  console.log('\n3. 测试调整用户余额...');
  const balanceRes = await testAPI('POST', `/api/members/${userId}/balance`, {
    type: 'add',
    amount: 1,
    remark: '测试'
  }, token);
  console.log(`   ${balanceRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);

  // 测试4: 获取余额变动日志
  console.log('\n4. 测试获取余额变动日志...');
  const logsRes = await testAPI('GET', '/api/balance-logs', null, token);
  console.log(`   ${logsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (logsRes.code === 0) {
    console.log(`   日志总数: ${logsRes.data.total}`);
  }

  console.log('\n=== 用户管理功能测试完成 ===');
}

testUserManagement().catch(err => {
  console.error('测试出错:', err);
});
