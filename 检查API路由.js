const fs = require('fs');

const serverCode = fs.readFileSync('WorkBuddy/20260315203305/server.js', 'utf-8');

// 查找所有 API 路由
const apiRoutes = [];
const lines = serverCode.split('\n');

lines.forEach((line, index) => {
  const match = line.match(/\/\* ── (GET|POST|PUT|DELETE) (\/[^ ]+).*\*\//);
  if (match) {
    apiRoutes.push({
      line: index + 1,
      method: match[1],
      path: match[2],
      code: line.trim()
    });
  }
});

console.log('找到的所有 API 路由:');
console.log('='.repeat(80));

apiRoutes.forEach(route => {
  console.log(`行 ${route.line}: ${route.method} ${route.path}`);
});

console.log('\n'.repeat(2));
console.log('查找 balance 相关的 API:');
console.log('='.repeat(80));

const balanceRoutes = apiRoutes.filter(r => r.path.includes('balance'));
balanceRoutes.forEach(route => {
  console.log(`行 ${route.line}: ${route.method} ${route.path}`);
});

console.log('\n'.repeat(2));
console.log('查找 orders 相关的 API:');
console.log('='.repeat(80));

const ordersRoutes = apiRoutes.filter(r => r.path.includes('orders'));
ordersRoutes.forEach(route => {
  console.log(`行 ${route.line}: ${route.method} ${route.path}`);
});
