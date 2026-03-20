#!/usr/bin/env node
/**
 * 服务器补丁脚本：为 server.js 添加多供货商支持
 * 在服务器上执行：node /app/patch-suppliers.js
 */

const fs = require('fs');
const path = require('path');

const serverFile = '/app/server.js';

// 读取原始文件
let code = fs.readFileSync(serverFile, 'utf8');

// 检查是否已经打过补丁
if (code.includes('kasushouSign') || code.includes('MULTI_SUPPLIER_PATCH')) {
    console.log('✅ 补丁已经应用过，跳过');
    process.exit(0);
}

// 备份原始文件
fs.writeFileSync(serverFile + '.bak', code);
console.log('✅ 已备份原始文件 server.js.bak');

// =====================================================
// 补丁1: 在 dyrSign 函数前插入新供货商签名/请求函数
// =====================================================
const SIGN_PATCH = `
  /* ════════════════════════════════════════════════════
     MULTI_SUPPLIER_PATCH - 多供货商支持 (v3.3.0)
     ════════════════════════════════════════════════════ */

  // 卡速售签名: SHA1(timestamp + JSON.stringify(sortedData) + apiKey)
  function kasushouSign(data, apiKey) {
    const crypto = require('crypto');
    const timestamp = Date.now().toString();
    const sorted = {};
    Object.keys(data).sort().forEach(k => { sorted[k] = data[k]; });
    const signStr = timestamp + JSON.stringify(sorted) + apiKey;
    const sign = crypto.createHash('sha1').update(signStr).digest('hex');
    return { sign, timestamp };
  }

  // 卡速售请求封装
  function kasushouRequest(cfg, endpoint, data, timeoutMs) {
    const https = require('https');
    const http = require('http');
    const { sign, timestamp } = kasushouSign(data, cfg.api_key);
    const postData = JSON.stringify(data);
    const baseUrl = cfg.api_domain.startsWith('http') ? cfg.api_domain : 'https://' + cfg.api_domain;
    return new Promise((resolve, reject) => {
      const urlObj = new URL(baseUrl + endpoint);
      const mod = urlObj.protocol === 'https:' ? https : http;
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-App-Id': cfg.userid,
          'X-Timestamp': timestamp,
          'X-Sign': sign,
        },
        timeout: timeoutMs || 10000,
      };
      const req = mod.request(options, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('响应非JSON: ' + d.slice(0,200))); } });
      });
      req.on('error', e => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.write(postData);
      req.end();
    });
  }

  // 卡易信签名: MD5(排序参数&key=apiKey) 大写
  function kayixinSign(params, apiKey) {
    const crypto = require('crypto');
    const sorted = Object.keys(params).filter(k => k !== 'sign').sort();
    const signStr = sorted.map(k => k + '=' + params[k]).join('&') + '&key=' + apiKey;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  }

  // 卡易信请求封装
  function kayixinRequest(cfg, endpoint, params, timeoutMs) {
    const qs = require('querystring');
    const https = require('https');
    const http = require('http');
    const allParams = { username: cfg.userid, timestamp: Date.now(), ...params };
    allParams.sign = kayixinSign(allParams, cfg.api_key);
    const postData = qs.stringify(allParams);
    const baseUrl = cfg.api_domain.startsWith('http') ? cfg.api_domain : 'http://' + cfg.api_domain;
    return new Promise((resolve, reject) => {
      const urlObj = new URL(baseUrl + endpoint);
      const mod = urlObj.protocol === 'https:' ? https : http;
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
        timeout: timeoutMs || 10000,
      };
      const req = mod.request(options, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('响应非JSON: ' + d.slice(0,200))); } });
      });
      req.on('error', e => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.write(postData);
      req.end();
    });
  }

  // 客客帮签名: MD5(排序参数&AppSecret=secret) 大写
  function kekebangSign(params, appSecret) {
    const crypto = require('crypto');
    const sorted = Object.keys(params).filter(k => k !== 'sign').sort();
    const signStr = sorted.map(k => k + '=' + params[k]).join('&') + '&AppSecret=' + appSecret;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  }

  // 客客帮请求封装
  function kekebangRequest(cfg, endpoint, params, timeoutMs) {
    const qs = require('querystring');
    const https = require('https');
    const allParams = { AppKey: cfg.userid, ...params };
    allParams.Sign = kekebangSign(allParams, cfg.api_key);
    const postData = qs.stringify(allParams);
    return new Promise((resolve, reject) => {
      const baseUrl = 'https://purchase.kekebang.com.cn';
      const urlObj = new URL(baseUrl + endpoint);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
        timeout: timeoutMs || 10000,
      };
      const req = https.request(options, r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('响应非JSON: ' + d.slice(0,200))); } });
      });
      req.on('error', e => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.write(postData);
      req.end();
    });
  }

`;

// 插入到 dyrSign 函数定义前
code = code.replace(
    '  function dyrSign(params, apikey) {',
    SIGN_PATCH + '  function dyrSign(params, apikey) {'
);

// =====================================================
// 补丁2: 修改 test-connect 路由，支持多供货商
// =====================================================
const OLD_TEST = `  if (supTestMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supTestMatch[1]);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    if (!cfg) return fail(res, '请先保存接口配置');
    if (!cfg.enabled) return fail(res, '接口已禁用');

    try {
      const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);`;

const NEW_TEST = `  if (supTestMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supTestMatch[1]);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    if (!cfg) return fail(res, '请先保存接口配置');
    if (!cfg.enabled) return fail(res, '接口已禁用');

    // 多供货商类型判断
    const apiType = cfg.api_type || 'dayuanren';

    try {
      let j;
      if (apiType === 'kasushou') {
        j = await kasushouRequest(cfg, '/api/v2/product/list', { page: 1, pageSize: 5 }, 10000);
        if (j && (j.code === 200 || j.code === 0)) return ok(res, { balance: 0 }, '卡速售连接成功');
        return fail(res, '卡速售连接失败: ' + (j && j.message || '未知错误'));
      } else if (apiType === 'kayixin') {
        j = await kayixinRequest(cfg, '/api/product/list', { page: 1, pageSize: 5 }, 10000);
        if (j && (j.code === 200 || j.code === 0)) return ok(res, { balance: 0 }, '卡易信连接成功');
        return fail(res, '卡易信连接失败: ' + (j && j.message || '未知错误'));
      } else if (apiType === 'kekebang') {
        j = await kekebangRequest(cfg, '/api/open/sku/list', { bId: 1 }, 10000);
        if (j && j.Code === '0') return ok(res, { balance: 0 }, '客客帮连接成功');
        return fail(res, '客客帮连接失败: ' + (j && j.Msg || '未知错误'));
      }

      // 默认大猿人
      const j2 = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);`;

// 查找并替换 test-connect 中的旧代码片段
if (code.includes(OLD_TEST)) {
    code = code.replace(OLD_TEST, NEW_TEST);
    console.log('✅ 补丁2 (test-connect 多供货商) 已应用');
} else {
    console.log('⚠️  补丁2 (test-connect) 未找到精确匹配，跳过');
}

// =====================================================
// 补丁3: 在 test-connect 的成功结果处补充关闭括号
// =====================================================
// 找到大猿人原来的 j.data 返回，并在 ok() 后加上 else 的闭合
const OLD_BALANCE = `      const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);
      if (j.errno === '0' || j.errno === 0) {
        const balance = j.data && j.data.money != null ? Number(j.data.money) : 0;
        return ok(res, { balance }, '连接成功，余额：' + balance);
      } else {
        return fail(res, \`连接失败：\${j.errmsg || ('errno=' + j.errno)}\`);
      }`;

// 检查是否存在 j2 版本（已经被补丁2处理）
if (code.includes('const j2 = await dyrRequest(cfg')) {
    // 修复: j -> j2
    code = code.replace(
        "const j2 = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);\n      if (j.errno",
        "const j2 = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);\n      if (j2.errno"
    );
    code = code.replace(
        "return ok(res, { balance }, '连接成功，余额：' + balance);",
        "return ok(res, { balance }, '连接成功，余额：' + balance);\n      }"
    );
    code = code.replace(
        "return fail(res, `连接失败：${j.errmsg || ('errno=' + j.errno)}`);",
        "return fail(res, `连接失败：${j2.errmsg || ('errno=' + j2.errno)}`);"
    );
    console.log('✅ 补丁3 (大猿人变量j->j2) 已应用');
}

// 写入修改后的文件
fs.writeFileSync(serverFile, code);
console.log('✅ server.js 已更新，多供货商支持已集成');
console.log('   支持的供货商类型: dayuanren, kasushou, kayixin, kekebang');
console.log('');
console.log('请运行: pm2 restart cyd-admin');
