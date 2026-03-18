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

async function test() {
  // 登录
  const loginRes = await testAPI('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  const token = loginRes.data.token;
  console.log('Token:', token.substring(0, 20));

  // 测试余额查询
  const balanceRes = await testAPI('GET', '/api/orders/3/balance', null, token);
  console.log('余额查询结果:', JSON.stringify(balanceRes, null, 2));
}

test();
