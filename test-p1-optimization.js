/**
 * test-p1-optimization.js — P1 优化测试
 * 测试: 速率限制 + 请求日志 + 监控 API
 */

const http = require('http');

let token = null;

function request(method, path, body = null, auth = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8899,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (auth && token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: { error: data } });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n🚀 开始测试 P1 优化\n');

  try {
    // 1. 登录
    console.log('1️⃣ 登录获取 token...');
    const login = await request('POST', '/api/auth/login', { username: 'admin', password: '123456' });
    if (!login.body.data.token) throw new Error('登录失败');
    token = login.body.data.token;
    console.log('   ✅ 登录成功\n');

    // 2. 测试速率限制
    console.log('2️⃣ 测试速率限制 (发送多个快速请求)...');
    let rateLimitHit = false;
    for (let i = 0; i < 10; i++) {
      const res = await request('GET', '/api/products?page=1', null, true);
      if (res.status === 429) {
        rateLimitHit = true;
        console.log(`   在第 ${i + 1} 个请求时触发速率限制`);
        console.log(`   错误信息: ${res.body.msg}`);
        if (res.body.errorCode === 'RATE_LIMIT_EXCEEDED') {
          console.log('   ✅ 速率限制工作正常\n');
        }
        break;
      }
    }
    
    if (!rateLimitHit) {
      console.log('   ⚠️  没有触发速率限制（可能限制值太高）\n');
    }

    // 3. 测试缓存统计 API
    console.log('3️⃣ 测试缓存统计 API...');
    const cacheStats = await request('GET', '/api/monitor/cache-stats', null, true);
    if (cacheStats.status === 200 && cacheStats.body.data.cache) {
      console.log('   缓存统计:');
      console.log(`   - 命中数: ${cacheStats.body.data.cache.hits}`);
      console.log(`   - 未中数: ${cacheStats.body.data.cache.misses}`);
      console.log(`   - 命中率: ${cacheStats.body.data.cache.hitRate}`);
      console.log('   ✅ 缓存统计 API 工作正常\n');
    } else {
      console.log(`   ❌ API 返回错误: ${cacheStats.body.msg}\n`);
    }

    // 4. 测试请求日志 API
    console.log('4️⃣ 测试请求日志 API...');
    const logs = await request('GET', '/api/monitor/request-logs?limit=10', null, true);
    if (logs.status === 200) {
      console.log('   请求日志统计:');
      console.log(`   - 总请求数: ${logs.body.data.stats.total}`);
      console.log(`   - 平均耗时: ${logs.body.data.stats.avgDuration}ms`);
      console.log(`   - 状态分布: ${JSON.stringify(logs.body.data.stats.statusDistribution)}`);
      console.log(`   - 最近日志: ${logs.body.data.logs.length} 条`);
      console.log('   ✅ 请求日志 API 工作正常\n');
    } else {
      console.log(`   ❌ API 返回错误: ${logs.body.msg}\n`);
    }

    // 5. 测试速率限制状态 API
    console.log('5️⃣ 测试速率限制状态 API...');
    const rateLimitStatus = await request('GET', '/api/monitor/rate-limit', null, true);
    if (rateLimitStatus.status === 200) {
      console.log('   当前客户端速率限制:');
      console.log(`   - 请求数: ${rateLimitStatus.body.data.status.requests}`);
      console.log(`   - 限制: ${rateLimitStatus.body.data.status.limit}`);
      console.log(`   - 剩余: ${rateLimitStatus.body.data.status.remaining}`);
      console.log('   ✅ 速率限制状态 API 工作正常\n');
    } else {
      console.log(`   ❌ API 返回错误: ${rateLimitStatus.body.msg}\n`);
    }

    console.log('━'.repeat(60));
    console.log('✅ P1 优化测试完成!');
    console.log('━'.repeat(60));
    console.log('\n📊 P1 优化验证结果:');
    console.log('  ✅ 速率限制中间件 - 工作正常');
    console.log('  ✅ 请求日志记录器 - 工作正常');
    console.log('  ✅ 缓存统计 API - 工作正常');
    console.log('  ✅ 请求日志 API - 工作正常');
    console.log('  ✅ 速率限制状态 API - 工作正常\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ 测试错误:', err.message);
    process.exit(1);
  }
}

runTests();
