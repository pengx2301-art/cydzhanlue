# 充易达系统 - 功能优化文档

**版本：** 2.0.0  
**优化时间：** 2026年3月19日  
**技术负责人：** WorkBuddy AI

---

## 📋 优化概述

本次优化为充易达系统新增了以下核心功能：

1. **商品对接管理** - 支持从大猿人等对接站获取商品
2. **商品上架功能** - 可选择商品并上架到本地系统
3. **对接站可用性验证** - 自动检查对接站是否可用
4. **自定义参数下单** - 支持灵活的参数配置
5. **手机号归属地查询** - 实时显示手机号归属地和运营商信息

---

## 🎯 功能详细说明

### 一、商品对接管理

#### 1.1 功能特点

- **多平台支持**：可配置多个对接站（目前支持大猿人）
- **可用性检查**：自动验证对接站是否可用
- **商品获取**：从对接站拉取商品列表
- **商品筛选**：支持按名称、分类筛选
- **批量上架**：可一次选择多个商品上架

#### 1.2 对接站配置

在 `product-connection.js` 中配置对接站：

```javascript
const connectionSites = {
    'dayuanren': {
        name: '大猿人',
        enabled: true,
        baseUrl: 'https://api.example.com', // 实际API地址
        apiKey: 'your-api-key', // 实际API密钥
        lastCheckTime: null,
        isAvailable: false
    }
};
```

#### 1.3 使用流程

1. **检查对接站状态**
   - 访问商品对接管理页面
   - 查看对接站是否可用
   - 点击"检查可用性"按钮刷新状态

2. **获取商品列表**
   - 只在对接站可用时显示"获取商品"按钮
   - 点击获取商品按钮
   - 系统会验证对接站可用性后再获取商品

3. **筛选和选择商品**
   - 使用搜索框搜索商品
   - 使用分类下拉框筛选
   - 勾选需要上架的商品

4. **上架商品**
   - 点击"上架选中商品"按钮
   - 商品会保存到本地数据库
   - 可在"已上架商品"区域查看

---

### 二、商品上架功能

#### 2.1 上架规则

- 只有可用的对接站才能上架商品
- 上架的商品会保存到本地数据库
- 每个商品包含完整的信息（名称、价格、成本价、库存等）
- 支持单个或批量上架

#### 2.2 商品数据结构

```javascript
{
    id: 'PROD_dayuanren_001',
    originalId: '001',
    siteId: 'dayuanren',
    siteName: '大猿人',
    name: '话费充值-10元',
    category: '话费充值',
    price: 10,
    costPrice: 9.5,
    stock: -1, // -1表示无限库存
    status: 'active',
    description: '全国通用，即时到账',
    parameters: [...],
    imageUrl: '',
    createdAt: '2026-03-19T10:00:00Z',
    updatedAt: '2026-03-19T10:00:00Z'
}
```

---

### 三、对接站可用性验证

#### 3.1 验证机制

- **自动验证**：每次获取商品前自动验证
- **手动验证**：点击"检查可用性"按钮
- **状态缓存**：验证结果会缓存一段时间
- **实时更新**：显示最后检查时间

#### 3.2 验证逻辑

```javascript
async function checkSiteAvailability(siteId) {
    // 1. 检查对接站配置
    const site = connectionSites[siteId];
    if (!site) throw new Error('对接站不存在');

    // 2. 调用健康检查接口
    const result = await httpRequest(healthCheckUrl);

    // 3. 更新状态
    site.isAvailable = result.status === 'ok';
    site.lastCheckTime = new Date().toISOString();

    return site.isAvailable;
}
```

#### 3.3 API接口

- `GET /api/connection/sites` - 获取所有对接站状态
- `GET /api/connection/:siteId/check` - 检查指定对接站可用性

---

### 四、自定义参数下单

#### 4.1 参数配置

商品可以配置自定义参数，支持多种类型：

```javascript
const parameters = [
    {
        name: 'phone',
        label: '手机号',
        type: 'text',
        placeholder: '请输入手机号码',
        required: true,
        pattern: /^1[3-9]\d{9}$/,
        errorMessage: '请输入有效的11位手机号码',
        realtimeValidation: true,
        realtimeFunction: 'getPhoneLocation'
    },
    {
        name: 'amount',
        label: '充值金额',
        type: 'select',
        options: [
            { label: '10元', value: 10 },
            { label: '20元', value: 20 }
        ],
        required: true
    },
    {
        name: 'remark',
        label: '备注',
        type: 'textarea',
        placeholder: '请输入备注信息（选填）',
        required: false,
        maxLength: 200
    }
];
```

#### 4.2 支持的参数类型

- **text** - 文本输入
- **number** - 数字输入（支持min、max、step）
- **select** - 下拉选择
- **textarea** - 多行文本

#### 4.3 验证规则

- **required** - 是否必填
- **pattern** - 正则表达式验证
- **min/max** - 数值范围
- **maxLength** - 最大长度
- **realtimeValidation** - 实时验证

#### 4.4 下单流程

1. 选择商品
2. 系统自动加载商品参数配置
3. 用户填写参数
4. 实时验证（如手机号归属地）
5. 提交订单
6. 系统验证所有参数
7. 创建订单

---

### 五、手机号归属地查询

#### 5.1 功能特点

- **实时查询**：输入手机号后立即显示归属地
- **智能缓存**：查询结果缓存24小时，减少API调用
- **运营商识别**：基于号段自动识别运营商
- **友好提示**：错误时显示清晰的提示信息

#### 5.2 显示内容

- 省份（如：广东省）
- 城市（如：广州市）
- 运营商（如：中国移动）

#### 5.3 使用方式

在下单页面输入手机号，系统会自动显示归属地信息：

```
📍 广东省 广州市 中国移动
```

#### 5.4 API接口

- `GET /api/phone/location?phone=13800138000` - 查询手机号归属地
- `POST /api/orders/validate-parameter` - 实时验证参数

#### 5.5 缓存机制

- 使用手机号前7位作为缓存key
- 缓存时间：24小时
- 自动过期清理

---

## 📁 文件结构

```
Claw/
├── product-connection.js      # 商品对接管理模块
├── order-module.js            # 下单功能模块
├── api-server.js              # API服务器（主文件）
├── package.json               # 项目配置
├── product-connection.html    # 商品对接管理页面
├── order-page.html            # 下单页面
├── DEPLOYMENT_GUIDE.md        # 部署指南
└── OPTIMIZATION_GUIDE.md      # 本文档
```

---

## 🚀 部署指南

### 方式一：本地开发

#### 1. 安装依赖

```bash
cd c:/Users/60496/WorkBuddy/Claw
npm install
```

#### 2. 启动服务器

```bash
npm start
```

#### 3. 访问系统

- 商品对接管理：http://localhost:8899/product-connection.html
- 下单页面：http://localhost:8899/order-page.html
- API文档：http://localhost:8899/api/version

### 方式二：云服务器部署

#### 1. 上传文件到服务器

```bash
# 在本地执行
cd c:/Users/60496/WorkBuddy/Claw
scp api-server.js ubuntu@81.70.208.147:/app/
scp product-connection.js ubuntu@81.70.208.147:/app/
scp order-module.js ubuntu@81.70.208.147:/app/
scp package.json ubuntu@81.70.208.147:/app/
scp product-connection.html ubuntu@81.70.208.147:/app/
scp order-page.html ubuntu@81.70.208.147:/app/
```

#### 2. 连接服务器并安装依赖

```bash
# 连接服务器
ssh ubuntu@81.70.208.147

# 进入项目目录
cd /app

# 安装依赖
npm install
```

#### 3. 使用PM2管理服务

```bash
# 启动服务
pm2 start api-server.js --name "cyd-enhanced"

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 4. 访问系统

- 商品对接管理：http://81.70.208.147:8899/product-connection.html
- 下单页面：http://81.70.208.147:8899/order-page.html

---

## 🔧 配置说明

### 1. 对接站配置

编辑 `product-connection.js` 文件：

```javascript
const connectionSites = {
    'dayuanren': {
        name: '大猿人',
        enabled: true,
        baseUrl: 'https://api.example.com', // 修改为实际地址
        apiKey: 'your-api-key', // 修改为实际密钥
        lastCheckTime: null,
        isAvailable: false
    }
};
```

### 2. 数据库配置

目前使用JSON文件存储数据，未来可迁移到MySQL：

```javascript
// 商品数据
const products = require('./products.json');

// 订单数据
const orders = require('./orders.json');
```

### 3. 端口配置

编辑 `api-server.js` 文件：

```javascript
const PORT = 8899; // 修改为你需要的端口
```

---

## 📡 API接口文档

### 对接站管理

#### 获取所有对接站状态

```
GET /api/connection/sites

Response:
{
  "success": true,
  "data": [
    {
      "id": "dayuanren",
      "name": "大猿人",
      "enabled": true,
      "isAvailable": true,
      "lastCheckTime": "2026-03-19T10:00:00Z"
    }
  ]
}
```

#### 检查对接站可用性

```
GET /api/connection/:siteId/check

Response:
{
  "success": true,
  "data": {
    "siteId": "dayuanren",
    "isAvailable": true
  }
}
```

#### 获取对接站商品列表

```
GET /api/connection/:siteId/products

Response:
{
  "success": true,
  "data": {
    "siteId": "dayuanren",
    "products": [...],
    "count": 10
  }
}
```

### 商品管理

#### 上架商品

```
POST /api/products/onboard

Request Body:
{
  "siteId": "dayuanren",
  "productIds": ["001", "002", "003"]
}

Response:
{
  "success": true,
  "message": "成功上架 3 个商品",
  "data": [...]
}
```

#### 获取已上架商品

```
GET /api/products/onboarded

Response:
{
  "success": true,
  "data": {
    "products": [...],
    "count": 5
  }
}
```

#### 删除商品

```
DELETE /api/products/:productId

Response:
{
  "success": true,
  "message": "商品已删除"
}
```

### 订单管理

#### 获取商品参数配置

```
GET /api/products/:productId/parameters

Response:
{
  "success": true,
  "data": [
    {
      "name": "phone",
      "label": "手机号",
      "type": "text",
      "required": true,
      ...
    }
  ]
}
```

#### 实时验证参数

```
POST /api/orders/validate-parameter

Request Body:
{
  "paramName": "phone",
  "value": "13800138000"
}

Response:
{
  "valid": true,
  "message": "广东省 广州市 中国移动",
  "data": {...}
}
```

#### 创建订单

```
POST /api/orders/create

Request Body:
{
  "productId": "PROD_dayuanren_001",
  "productName": "话费充值-10元",
  "parameters": {
    "phone": "13800138000",
    "amount": 10,
    "remark": "测试"
  },
  "amount": 10,
  "memberId": "MEMBER001"
}

Response:
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "orderId": "ORD16476876000001234",
    ...
  }
}
```

### 手机号归属地查询

#### 查询归属地

```
GET /api/phone/location?phone=13800138000

Response:
{
  "success": true,
  "province": "广东省",
  "city": "广州市",
  "carrier": "中国移动",
  "isp": "4G",
  "phone": "13800138000"
}
```

---

## 🎨 使用示例

### 示例1：添加新对接站

1. 编辑 `product-connection.js`
2. 添加新的对接站配置

```javascript
const connectionSites = {
    'dayuanren': { /* ... */ },
    'new-platform': {
        name: '新平台',
        enabled: true,
        baseUrl: 'https://api.newplatform.com',
        apiKey: 'new-api-key',
        lastCheckTime: null,
        isAvailable: false
    }
};
```

3. 重启服务器
4. 访问商品对接管理页面即可看到新平台

### 示例2：自定义商品参数

1. 在上架商品时配置参数

```javascript
const product = {
    name: '流量充值-1GB',
    parameters: [
        {
            name: 'phone',
            label: '手机号',
            type: 'text',
            required: true,
            pattern: /^1[3-9]\d{9}$/,
            errorMessage: '请输入有效的11位手机号码',
            realtimeValidation: true,
            realtimeFunction: 'getPhoneLocation'
        },
        {
            name: 'packetType',
            label: '流量包类型',
            type: 'select',
            options: [
                { label: '日包', value: 'daily' },
                { label: '周包', value: 'weekly' },
                { label: '月包', value: 'monthly' }
            ],
            required: true
        }
    ]
};
```

2. 下单时会自动显示这些参数

---

## ⚠️ 注意事项

1. **对接站配置**
   - 务必使用真实的API地址和密钥
   - 确保网络连接正常
   - 定期检查对接站可用性

2. **数据安全**
   - 敏感信息（如API密钥）应妥善保管
   - 生产环境建议使用环境变量
   - 定期备份数据

3. **性能优化**
   - 手机号归属地查询有24小时缓存
   - 对接站状态建议定期刷新
   - 大量商品上架时建议分批处理

4. **错误处理**
   - 所有API调用都包含错误处理
   - 前端有友好的错误提示
   - 建议添加日志记录

---

## 🔮 未来规划

### 短期计划（1-2周）
- [ ] 添加数据库支持（MySQL）
- [ ] 实现订单查询功能
- [ ] 添加数据统计报表
- [ ] 优化手机号归属地查询（使用更准确的API）

### 中期计划（1-2月）
- [ ] 多用户权限管理
- [ ] 订单批量处理
- [ ] 数据导出功能
- [ ] 系统监控和告警

### 长期计划（3-6月）
- [ ] 微服务架构改造
- [ ] 移动端APP开发
- [ ] 人工智能推荐
- [ ] 区块链技术应用

---

## 📞 技术支持

如有问题或建议，请联系：

- **技术支持：** WorkBuddy AI
- **文档版本：** 2.0.0
- **最后更新：** 2026年3月19日

---

## 📄 许可证

MIT License

---

**祝您使用愉快！** 🎉
