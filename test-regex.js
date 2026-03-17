/**
 * test-regex.js - 测试正则表达式匹配
 */

const pathname = '/api/orders/3/balance';

console.log(`测试 pathname: ${pathname}\n`);

// 测试订单详情
const orderDetailMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
console.log(`订单详情正则 (/^\/api\/orders\/(\\d+)$/):`);
console.log(`  匹配: ${orderDetailMatch ? '✅ 是' : '❌ 否'}`);
if (orderDetailMatch) console.log(`  捕获: [${orderDetailMatch.join(', ')}]`);
console.log();

// 测试余额查询
const orderBalanceMatch = pathname.match(/^\/api\/orders\/(\d+)\/balance$/);
console.log(`余额查询正则 (/^\/api\/orders\/(\\d+)\/balance$/):`);
console.log(`  匹配: ${orderBalanceMatch ? '✅ 是' : '❌ 否'}`);
if (orderBalanceMatch) console.log(`  捕获: [${orderBalanceMatch.join(', ')}]`);
console.log();

// 测试其他路由
const otherMatches = {
  '/api/orders/3': '/^\/api\/orders\/(\d+)$/',
  '/api/orders': '/^\/api\/orders$/',
  '/api/orders/3/status': '/^\/api\/orders\/(\d+)\/status$/',
};

console.log('其他路由测试:\n');
Object.entries(otherMatches).forEach(([url, pattern]) => {
  try {
    const regex = new RegExp(pattern);
    const match = url.match(regex);
    console.log(`${url} vs ${pattern}`);
    console.log(`  匹配: ${match ? '✅ 是' : '❌ 否'}\n`);
  } catch (e) {
    console.log(`错误: ${e.message}\n`);
  }
});
