#!/usr/bin/env node
/**
 * 补丁2: 修改 test-connect 路由支持多供货商
 */
const fs = require('fs');
const serverFile = '/app/server.js';
let code = fs.readFileSync(serverFile, 'utf8');

if (code.includes('MULTI_SUPPLIER_TEST_PATCH')) {
    console.log('✅ test-connect 补丁已经应用过');
    process.exit(0);
}

// 精确查找 test-connect 中大猿人的核心逻辑
const OLD = `    try {
      // 使用 /user 接口（查询用户信息）验证连通性，参数仅 userid
      const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);
      if (j.errno === '0' || j.errno === 0) {
        db.get('suppliers').find({ id })
          .assign({ last_test: now(), test_status: 'ok', balance: j.data?.balance || '' })
          .write();
        return ok(res, {
          username: j.data?.username || '',
          balance:  j.data?.balance  || '',
          userid:   j.data?.id       || cfg.userid,
        }, '连接成功');
      } else {
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, \`接口返回错误：\${j.errmsg || ('errno=' + j.errno)}\`);
      }
    } catch (e) {
      db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
      return fail(res, \`连接失败：\${e.message}\`);
    }`;

const NEW = `    // MULTI_SUPPLIER_TEST_PATCH
    const apiType = (cfg.api_type || 'dayuanren').toLowerCase();
    try {
      if (apiType === 'kasushou') {
        const j = await kasushouRequest(cfg, '/api/v2/product/list', { page: 1, pageSize: 1 }, 10000);
        if (j && (j.code === 200 || j.code === 0 || j.code === '200' || j.code === '0')) {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'ok' }).write();
          return ok(res, { balance: 0 }, '卡速售连接成功');
        }
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, '卡速售连接失败: ' + (j && (j.message || j.msg) || JSON.stringify(j)));
      } else if (apiType === 'kayixin') {
        const j = await kayixinRequest(cfg, '/api/product/list', { page: 1, pageSize: 1 }, 10000);
        if (j && (j.code === 200 || j.code === 0 || j.code === '200' || j.code === '0')) {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'ok' }).write();
          return ok(res, { balance: 0 }, '卡易信连接成功');
        }
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, '卡易信连接失败: ' + (j && (j.message || j.msg) || JSON.stringify(j)));
      } else if (apiType === 'kekebang') {
        const j = await kekebangRequest(cfg, '/api/open/sku/list', { bId: 1 }, 10000);
        if (j && (j.Code === '0' || j.Code === 0)) {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'ok' }).write();
          return ok(res, { balance: 0 }, '客客帮连接成功');
        }
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, '客客帮连接失败: ' + (j && (j.Msg || j.msg) || JSON.stringify(j)));
      } else {
        // 默认大猿人
        // 使用 /user 接口（查询用户信息）验证连通性，参数仅 userid
        const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);
        if (j.errno === '0' || j.errno === 0) {
          db.get('suppliers').find({ id })
            .assign({ last_test: now(), test_status: 'ok', balance: j.data?.balance || '' })
            .write();
          return ok(res, {
            username: j.data?.username || '',
            balance:  j.data?.balance  || '',
            userid:   j.data?.id       || cfg.userid,
          }, '连接成功');
        } else {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
          return fail(res, \`接口返回错误：\${j.errmsg || ('errno=' + j.errno)}\`);
        }
      }
    } catch (e) {
      db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
      return fail(res, \`连接失败：\${e.message}\`);
    }`;

if (code.includes(OLD)) {
    code = code.replace(OLD, NEW);
    fs.writeFileSync(serverFile, code);
    console.log('✅ test-connect 多供货商补丁应用成功');
} else {
    console.log('❌ 未找到精确匹配，请手动检查 server.js 第2130行附近');
    process.exit(1);
}
