const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 8899,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('登录结果:', JSON.stringify(parsed, null, 2));
      process.exit(0);
    } catch (e) {
      console.error('解析失败:', e);
      process.exit(1);
    }
  });
});

req.write(JSON.stringify({ username: 'admin', password: '123456' }));
req.end();
