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

async function testLogs() {
  console.log('=== 测试日志功能 ===\n');

  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('✓ 登录成功\n');

  // 测试1: 获取余额变动日志
  console.log('1. 测试获取余额变动日志...');
  const balanceLogsRes = await testAPI('GET', '/api/balance-logs', null, token);
  console.log(`   ${balanceLogsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (balanceLogsRes.code === 0) {
    console.log(`   日志总数: ${balanceLogsRes.data.total}`);
    // 显示最近的5条
    console.log('   最近5条记录:');
    balanceLogsRes.data.items.slice(0, 5).forEach((log, i) => {
      console.log(`   ${i+1}. ${log.member_name} ${log.change_type === 'add' ? '+' : '-'}¥${log.amount} (${log.remark})`);
    });
  }

  // 测试2: 获取操作日志
  console.log('\n2. 测试获取操作日志...');
  const operationLogsRes = await testAPI('GET', '/api/operation-logs', null, token);
  console.log(`   ${operationLogsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (operationLogsRes.code === 0) {
    console.log(`   日志总数: ${operationLogsRes.data.total}`);
    // 显示最近的5条
    console.log('   最近5条记录:');
    operationLogsRes.data.items.slice(0, 5).forEach((log, i) => {
      console.log(`   ${i+1}. ${log.username} ${log.action} - ${log.detail}`);
    });
  }

  // 测试3: 获取登录日志
  console.log('\n3. 测试获取登录日志...');
  const loginLogsRes = await testAPI('GET', '/api/login-logs', null, token);
  console.log(`   ${loginLogsRes.code === 0 ? '✓ 成功' : '✗ 失败'}`);
  if (loginLogsRes.code === 0) {
    console.log(`   日志总数: ${loginLogsRes.data.total}`);
  }

  console.log('\n=== 日志功能测试完成 ===');
}

testLogs().catch(err => {
  console.error('测试出错:', err);
});
