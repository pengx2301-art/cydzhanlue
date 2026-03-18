# 充易达系统 - 功能优化快速开始

## 🎉 新功能概览

本次更新为充易达系统带来了以下重大改进：

### ✨ 核心功能

1. **🛒 商品对接管理**
   - 支持对接大猿人等平台
   - 自动获取商品列表
   - 批量选择和上架商品

2. **✅ 对接站可用性验证**
   - 自动检查对接站状态
   - 只有可用的对接站才能获取商品
   - 实时状态显示

3. **⚙️ 自定义参数下单**
   - 灵活的参数配置
   - 支持多种输入类型
   - 实时参数验证

4. **📍 手机号归属地查询**
   - 实时显示归属地信息
   - 自动识别运营商
   - 智能缓存优化

---

## 🚀 快速开始

### 第一步：安装依赖

```bash
cd c:/Users/60496/WorkBuddy/Claw
npm install
```

### 第二步：配置对接站

编辑 `product-connection.js` 文件，修改对接站配置：

```javascript
const connectionSites = {
    'dayuanren': {
        name: '大猿人',
        enabled: true,
        baseUrl: 'https://api.example.com', // 修改为实际API地址
        apiKey: 'your-api-key', // 修改为实际API密钥
        lastCheckTime: null,
        isAvailable: false
    }
};
```

### 第三步：启动服务器

```bash
npm start
```

### 第四步：访问系统

- **商品对接管理**: http://localhost:8899/product-connection.html
- **快速下单**: http://localhost:8899/order-page.html
- **API文档**: http://localhost:8899/api/version

---

## 📖 使用指南

### 商品对接管理

1. **检查对接站状态**
   - 打开商品对接管理页面
   - 查看对接站是否可用（绿色=可用，红色=不可用）
   - 点击"检查可用性"刷新状态

2. **获取商品**
   - 只有绿色的对接站才能获取商品
   - 点击"获取商品"按钮
   - 系统会自动验证并拉取商品列表

3. **选择商品上架**
   - 勾选要上架的商品
   - 点击"上架选中商品"
   - 商品会保存到本地系统

### 快速下单

1. **选择商品**
   - 从下拉列表选择商品
   - 订单金额会自动显示

2. **填写参数**
   - 根据商品要求填写参数
   - 输入手机号会自动显示归属地
   - 必填项标有红色星号

3. **提交订单**
   - 点击"确认下单"
   - 系统会验证所有参数
   - 成功后显示订单号

---

## 🎯 功能亮点

### 1. 智能验证系统

```javascript
// 自动验证手机号格式
if (/^1[3-9]\d{9}$/.test(phone)) {
    // 实时查询归属地
    const location = await getPhoneLocation(phone);
    // 显示: 📍 广东省 广州市 中国移动
}
```

### 2. 灵活的参数配置

```javascript
// 商品可以自定义任意参数
const parameters = [
    {
        name: 'phone',
        label: '手机号',
        type: 'text',
        realtimeValidation: true // 实时验证
    },
    {
        name: 'amount',
        label: '充值金额',
        type: 'select',
        options: [
            { label: '10元', value: 10 },
            { label: '20元', value: 20 }
        ]
    }
];
```

### 3. 对接站可用性检查

```javascript
// 只有可用的对接站才能获取商品
const isAvailable = await checkSiteAvailability('dayuanren');
if (!isAvailable) {
    throw new Error('对接站不可用');
}
```

---

## 📡 API接口速查

### 对接站管理
- `GET /api/connection/sites` - 获取所有对接站
- `GET /api/connection/:siteId/check` - 检查可用性
- `GET /api/connection/:siteId/products` - 获取商品列表

### 商品管理
- `POST /api/products/onboard` - 上架商品
- `GET /api/products/onboarded` - 已上架商品
- `DELETE /api/products/:productId` - 删除商品

### 订单管理
- `GET /api/products/:productId/parameters` - 获取参数配置
- `POST /api/orders/validate-parameter` - 验证参数
- `POST /api/orders/create` - 创建订单

### 其他
- `GET /api/phone/location` - 查询手机号归属地
- `GET /api/health` - 健康检查
- `GET /api/version` - 版本信息

---

## 🔧 配置说明

### 修改端口

编辑 `api-server.js`:

```javascript
const PORT = 8899; // 改为你需要的端口
```

### 添加新对接站

编辑 `product-connection.js`:

```javascript
const connectionSites = {
    'dayuanren': { /* ... */ },
    'new-platform': {
        name: '新平台',
        enabled: true,
        baseUrl: 'https://api.newplatform.com',
        apiKey: 'your-api-key'
    }
};
```

### 自定义参数验证

在商品参数配置中添加验证规则：

```javascript
{
    name: 'customField',
    label: '自定义字段',
    type: 'text',
    pattern: /^[A-Za-z0-9]+$/,
    errorMessage: '只能包含字母和数字',
    realtimeValidation: false
}
```

---

## 💡 使用技巧

### 1. 批量上架商品
- 使用搜索框快速找到商品
- 勾选需要的商品
- 一次上架多个商品

### 2. 快速下单
- 常用商品可以收藏（待实现）
- 使用快捷键提交（待实现）
- 历史订单快速复制（待实现）

### 3. 数据管理
- 定期导出已上架商品
- 备份订单数据
- 监控对接站状态

---

## ❓ 常见问题

### Q1: 对接站显示不可用怎么办？

**A:** 
1. 检查网络连接
2. 确认API地址和密钥正确
3. 点击"检查可用性"刷新
4. 查看服务器日志排查问题

### Q2: 手机号归属地查询失败？

**A:**
1. 检查手机号格式是否正确（11位数字）
2. 网络连接是否正常
3. API服务是否可用
4. 查看缓存是否过期

### Q3: 如何添加自定义参数？

**A:**
1. 在商品参数配置中添加新参数
2. 指定参数类型（text/number/select/textarea）
3. 设置验证规则
4. 下单时会自动显示

### Q4: 商品上架后找不到？

**A:**
1. 刷新页面
2. 检查"已上架商品"区域
3. 查看浏览器控制台是否有错误
4. 确认商品状态为"active"

---

## 📚 文档索引

- **详细文档**: [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)
- **部署指南**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **工作报告**: [工作报告.md](./工作报告.md)

---

## 🎨 界面预览

### 商品对接管理页面
- 对接站状态卡片（绿色/红色标识）
- 商品列表表格
- 批量操作按钮
- 搜索和筛选功能

### 下单页面
- 商品选择下拉框
- 金额显示区域
- 参数输入表单
- 手机号归属地实时显示
- 提交订单按钮

---

## 🔄 更新日志

### v2.0.0 (2026-03-19)
- ✨ 新增商品对接管理功能
- ✨ 新增商品上架功能
- ✨ 新增对接站可用性验证
- ✨ 新增自定义参数下单
- ✨ 新增手机号归属地查询
- 🐛 修复已知问题
- 📝 完善文档

---

## 🤝 贡献

欢迎提交问题反馈和建议！

---

## 📄 许可证

MIT License

---

**立即体验新功能，开始使用充易达系统增强版！** 🎉

如有任何问题，请参考详细文档或联系技术支持。
