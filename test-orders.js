/**
 * 自动测试脚本 - 订单管理功能
 * 测试所有订单管理相关功能
 */

const http = require('http');

const BASE_URL = 'http://localhost:8899';
let sessionId = null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, passed) {
  if (passed) {
    log(`✓ ${name}`, colors.green);
  } else {
    log(`✗ ${name}`, colors.red);
  }
  return passed;
}

// HTTP 请求封装
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Cookie'] = `session=${token}`;
    }

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

// 测试登录
async function testLogin() {
  log('\n=== 测试登录功能 ===', colors.blue);
  
  const res = await request('POST', '/api/login', {
    username: 'admin',
    password: 'admin123'
  });

  if (res.data.code === 0) {
    sessionId = res.data.data.token;
    logTest('管理员登录成功', true);
    log(`Session ID: ${sessionId.substring(0, 20)}...`, colors.yellow);
    return true;
  } else {
    logTest('管理员登录失败', false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 测试获取订单列表
async function testGetOrders() {
  log('\n=== 测试获取订单列表 ===', colors.blue);
  
  const res = await request('GET', '/api/orders', null, sessionId);
  
  if (res.data.code === 0) {
    logTest('获取订单列表成功', true);
    log(`订单总数: ${res.data.data.total}`, colors.yellow);
    log(`待处理: ${res.data.data.pending}, 成功: ${res.data.data.success}, 失败: ${res.data.data.failed}`, colors.yellow);
    
    if (res.data.data.items.length > 0) {
      log(`\n第一条订单:`, colors.magenta);
      log(`  订单号: ${res.data.data.items[0].order_no}`, colors.magenta);
      log(`  用户: ${res.data.data.items[0].member_name}`, colors.magenta);
      log(`  产品: ${res.data.data.items[0].product_name}`, colors.magenta);
      log(`  金额: ¥${res.data.data.items[0].amount}`, colors.magenta);
      log(`  状态: ${res.data.data.items[0].status}`, colors.magenta);
    }
    return true;
  } else {
    logTest('获取订单列表失败', false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 测试获取订单详情
async function testGetOrderDetail(orderId) {
  log('\n=== 测试获取订单详情 ===', colors.blue);
  
  const res = await request('GET', `/api/orders/${orderId}`, null, sessionId);
  
  if (res.data.code === 0) {
    logTest(`获取订单 ${orderId} 详情成功`, true);
    const order = res.data.data;
    log(`订单号: ${order.order_no}`, colors.yellow);
    log(`用户信息: ${order.member_name} (ID: ${order.member_id})`, colors.yellow);
    log(`余额: ¥${order.member_info?.balance || 'N/A'}`, colors.yellow);
    log(`产品: ${order.product_name}`, colors.yellow);
    log(`金额: ¥${order.amount}`, colors.yellow);
    log(`类型: ${order.order_type}`, colors.yellow);
    log(`状态: ${order.status}`, colors.yellow);
    return true;
  } else {
    logTest(`获取订单 ${orderId} 详情失败`, false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 测试更新订单状态
async function testUpdateOrderStatus(orderId, newStatus) {
  log('\n=== 测试更新订单状态 ===', colors.blue);
  log(`订单 ${orderId} -> 状态 ${newStatus}`, colors.yellow);
  
  const res = await request('PUT', `/api/orders/${orderId}/status`, {
    status: newStatus,
    remark: '自动化测试'
  }, sessionId);
  
  if (res.data.code === 0) {
    logTest(`更新订单 ${orderId} 状态为 ${newStatus} 成功`, true);
    return true;
  } else {
    logTest(`更新订单 ${orderId} 状态失败`, false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 测试查询订单余额
async function testQueryBalance(orderId) {
  log('\n=== 测试查询订单余额 ===', colors.blue);
  
  const res = await request('GET', `/api/orders/${orderId}/balance`, null, sessionId);
  
  if (res.data.code === 0) {
    logTest(`查询订单 ${orderId} 余额成功`, true);
    const data = res.data.data;
    log(`用户: ${data.member_name} (ID: ${data.member_id})`, colors.yellow);
    log(`余额: ¥${data.balance}`, colors.yellow);
    log(`冻结余额: ¥${data.freeze_balance || 0}`, colors.yellow);
    return true;
  } else {
    logTest(`查询订单 ${orderId} 余额失败`, false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 测试接口充值
async function testInterfaceRecharge(orderId) {
  log('\n=== 测试接口充值 ===', colors.blue);
  
  const res = await request('POST', `/api/orders/${orderId}/recharge`, {
    manual: true
  }, sessionId);
  
  if (res.data.code === 0) {
    logTest(`接口充值订单 ${orderId} 成功`, true);
    log(`订单号: ${res.data.data.order_no}`, colors.yellow);
    log(`状态: ${res.data.data.status}`, colors.yellow);
    return true;
  } else {
    logTest(`接口充值订单 ${orderId} 失败`, false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 测试订单退款
async function testRefund(orderId) {
  log('\n=== 测试订单退款 ===', colors.blue);
  
  const res = await request('PUT', `/api/orders/${orderId}/status`, {
    status: 4,
    auto_refund: true,
    remark: '自动化测试退款'
  }, sessionId);
  
  if (res.data.code === 0) {
    logTest(`订单 ${orderId} 退款成功`, true);
    return true;
  } else {
    logTest(`订单 ${orderId} 退款失败`, false);
    log(`错误: ${res.data.msg}`, colors.red);
    return false;
  }
}

// 主测试流程
async function runTests() {
  log('╔══════════════════════════════════════╗', colors.blue);
  log('║   订单管理功能自动化测试           ║', colors.blue);
  log('╚══════════════════════════════════════╝', colors.blue);

  const results = [];

  // 测试1: 登录
  results.push(await testLogin());
  if (!results[0]) {
    log('\n❌ 登录失败，无法继续测试', colors.red);
    process.exit(1);
  }

  // 测试2: 获取订单列表
  results.push(await testGetOrders());

  // 获取第一个订单ID用于后续测试
  let orderId = 1;
  const ordersRes = await request('GET', '/api/orders', null, sessionId);
  if (ordersRes.data.code === 0 && ordersRes.data.data.items.length > 0) {
    orderId = ordersRes.data.data.items[0].id;
  }

  // 测试3: 获取订单详情
  results.push(await testGetOrderDetail(orderId));

  // 测试4: 查询余额
  results.push(await testQueryBalance(orderId));

  // 测试5: 更新订单状态 (0 -> 1 待处理 -> 处理中)
  results.push(await testUpdateOrderStatus(orderId, 1));

  // 测试6: 更新订单状态 (1 -> 2 处理中 -> 成功)
  results.push(await testUpdateOrderStatus(orderId, 2));

  // 测试7: 接口充值
  results.push(await testInterfaceRecharge(orderId));

  // 测试8: 订单退款
  results.push(await testRefund(orderId));

  // 输出测试结果
  log('\n═══════════════════════════════════════', colors.blue);
  log('测试结果汇总:', colors.blue);
  log('═══════════════════════════════════════', colors.blue);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(`\n通过: ${passed}/${total}`, passed === total ? colors.green : colors.yellow);
  log(`失败: ${total - passed}/${total}`, passed === total ? colors.green : colors.red);
  
  if (passed === total) {
    log('\n✅ 所有测试通过！', colors.green);
    process.exit(0);
  } else {
    log('\n❌ 部分测试失败，请检查日志', colors.red);
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  log(`\n❌ 测试过程中出错: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
