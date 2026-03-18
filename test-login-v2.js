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
      if (parsed.data && parsed.data.token) {
        console.log('✅ 登录成功!');
        console.log('Token:', parsed.data.token.substring(0, 20) + '...');
      } else {
        console.log('❌ 登录失败:', parsed.msg);
        if (parsed.context) console.log('错误详情:', parsed.context);
      }
      process.exit(0);
    } catch (e) {
      console.error('解析失败:', e);
      process.exit(1);
    }
  });
});

// 尝试使用更长的密码
req.write(JSON.stringify({ username: 'admin', password: '1234567890' }));
req.end();
