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

async function testAgentManagement() {
  console.log('=== 测试代理管理功能 ===\n');

  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('✓ 登录成功\n');

  // 测试1: 获取代理列表
  console.log('1. 测试获取代理列表...');
  const agentsRes = await testAPI('GET', '/api/agents', null, token);
  console.log(`   ${agentsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (agentsRes.code === 0) {
    console.log(`   代理总数: ${agentsRes.data.length}`);
    agentsRes.data.forEach(agent => {
      console.log(`   - ${agent.name} (余额: ¥${agent.balance})`);
    });
  }

  console.log('\n=== 代理管理功能测试完成 ===');
}

testAgentManagement().catch(err => {
  console.error('测试出错:', err);
});
