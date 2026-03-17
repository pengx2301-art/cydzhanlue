/**
 * test-direct-server.js - 直接启动服务器并测试
 */

const { spawn } = require('child_process');
const http = require('http');

const serverProcess = spawn('node', ['server.js'], {
  cwd: './WorkBuddy/20260315203305',
  stdio: ['inherit', 'pipe', 'pipe'] // 获取 stdout 和 stderr
});

// 捕获输出
serverProcess.stdout.on('data', (data) => {
  console.log('[SERVER]', data.toString());
});

serverProcess.stderr.on('data', (data) => {
  console.log('[SERVER ERR]', data.toString());
});

setTimeout(() => {
  testAPI();
}, 3000);

function testAPI() {
  console.log('\n📍 发送测试请求到 /api/orders/3/balance\n');

  const options = {
    hostname: 'localhost',
    port: 8899,
    path: '/api/orders/3/balance',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test',
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('响应:', data);
      serverProcess.kill();
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('错误:', err);
    serverProcess.kill();
    process.exit(1);
  });

  req.end();
}
