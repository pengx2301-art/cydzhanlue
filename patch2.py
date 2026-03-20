#!/usr/bin/env python3
# 补丁: 修改 test-connect 支持多供货商
import re

with open('/app/server.js', 'r', encoding='utf-8') as f:
    code = f.read()

if 'MULTI_SUPPLIER_TEST_PATCH' in code:
    print('已经打过补丁，跳过')
    exit(0)

# 查找 test-connect 中需要替换的代码行
old = "      // 使用 /user 接口（查询用户信息）验证连通性，参数仅 userid\n      const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);"

new = """      // MULTI_SUPPLIER_TEST_PATCH
      const apiType = (cfg.api_type || 'dayuanren').toLowerCase();
      if (apiType === 'kasushou') {
        const j2 = await kasushouRequest(cfg, '/api/v2/product/list', { page: 1, pageSize: 1 }, 10000);
        if (j2 && (String(j2.code) === '200' || String(j2.code) === '0')) {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'ok' }).write();
          return ok(res, { balance: 0 }, '卡速售连接成功');
        }
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, '卡速售连接失败: ' + (j2 && (j2.message || j2.msg) || JSON.stringify(j2)));
      } else if (apiType === 'kayixin') {
        const j2 = await kayixinRequest(cfg, '/api/product/list', { page: 1, pageSize: 1 }, 10000);
        if (j2 && (String(j2.code) === '200' || String(j2.code) === '0')) {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'ok' }).write();
          return ok(res, { balance: 0 }, '卡易信连接成功');
        }
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, '卡易信连接失败: ' + (j2 && (j2.message || j2.msg) || JSON.stringify(j2)));
      } else if (apiType === 'kekebang') {
        const j2 = await kekebangRequest(cfg, '/api/open/sku/list', { bId: 1 }, 10000);
        if (j2 && (String(j2.Code) === '0')) {
          db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'ok' }).write();
          return ok(res, { balance: 0 }, '客客帮连接成功');
        }
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, '客客帮连接失败: ' + (j2 && (j2.Msg || j2.msg) || JSON.stringify(j2)));
      }
      // 默认大猿人
      // 使用 /user 接口（查询用户信息）验证连通性，参数仅 userid
      const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);"""

if old in code:
    code = code.replace(old, new, 1)
    with open('/app/server.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print('✅ test-connect 多供货商支持已注入')
else:
    print('❌ 未找到精确匹配字符串')
    # 输出附近代码帮助调试
    idx = code.find('test-connect')
    print('附近代码:')
    print(code[idx:idx+500])
