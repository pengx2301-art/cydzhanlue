/**
 * 充易达系统 API服务器 - v3.0.0
 * 新增用户后台、自来单管理、供货商管理优化
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入模块
const UserBackend = require('./user-backend');
const ZilaidanManager = require('./zilaidan-manager');
const SupplierManager = require('./supplier-manager');

const app = express();
const PORT = process.env.PORT || 8899;

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use(express.static(__dirname));
app.use('/user', express.static(path.join(__dirname, 'user-ui')));

// 初始化模块
const db = {
    // 数据库接口（需要根据实际情况实现）
    getProducts: async (filters) => [],
    getProduct: async (id) => null,
    createOrder: async (order) => {},
    createTopupApplication: async (app) => {},
    // ... 其他数据库方法
};

const userBackend = new UserBackend(db);
const zilaidanManager = new ZilaidanManager(db);
const supplierManager = new SupplierManager(db);

// ==================== 用户后台API ====================

/**
 * 用户登录
 */
app.post('/api/user/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await userBackend.login(username, password);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取用户仪表盘数据
 */
app.get('/api/user/dashboard', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const data = await userBackend.getDashboard(userId);
        res.json({ success: true, data: data });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取可用商品
 */
app.get('/api/user/products', async (req, res) => {
    try {
        const filters = req.query;
        const products = await userBackend.getAvailableProducts(filters);
        res.json({ success: true, data: products });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 单个下单
 */
app.post('/api/user/order/single', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const orderData = req.body;
        const result = await userBackend.createSingleOrder(userId, orderData);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 批量下单
 */
app.post('/api/user/order/bulk', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const { orders } = req.body;
        const result = await userBackend.createBulkOrders(userId, orders);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 申请加款
 */
app.post('/api/user/topup/apply', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const { amount, proof, remark } = req.body;
        const result = await userBackend.applyTopup(userId, amount, proof, remark);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取加款申请记录
 */
app.get('/api/user/topup/applications', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const { status } = req.query;
        const applications = await userBackend.getTopupApplications(userId, status);
        res.json({ success: true, data: applications });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取用户订单列表
 */
app.get('/api/user/orders', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const filters = req.query;
        const orders = await userBackend.getUserOrders(userId, filters);
        res.json({ success: true, data: orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ==================== 总后台API ====================

/**
 * 审核加款申请
 */
app.post('/api/admin/topup/approve', async (req, res) => {
    try {
        const { applicationId, approved, remark } = req.body;
        
        // 审核逻辑
        if (approved) {
            await db.approveTopupApplication(applicationId, remark);
        } else {
            await db.rejectTopupApplication(applicationId, remark);
        }

        res.json({ 
            success: true, 
            message: approved ? '已通过' : '已拒绝' 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取所有加款申请
 */
app.get('/api/admin/topup/applications', async (req, res) => {
    try {
        const { status } = req.query;
        const applications = await db.getAllTopupApplications(status);
        res.json({ success: true, data: applications });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ==================== 自来单API ====================

/**
 * 配置对接平台
 */
app.post('/api/zilaidan/configure', async (req, res) => {
    try {
        const { platformId, config } = req.body;
        const result = await zilaidanManager.configurePlatform(platformId, config);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取蜜蜂汇云订单
 */
app.get('/api/zilaidan/mifenghuiyun/orders', async (req, res) => {
    try {
        const filters = req.query;
        const result = await zilaidanManager.fetchMifenghuiyunOrders(filters);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取客客帮订单
 */
app.get('/api/zilaidan/kekebang/orders', async (req, res) => {
    try {
        const filters = req.query;
        const result = await zilaidanManager.fetchKekebangOrders(filters);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 处理订单充值
 */
app.post('/api/zilaidan/order/process', async (req, res) => {
    try {
        const { orderId } = req.body;
        const result = await zilaidanManager.processOrderRecharge(orderId);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 批量处理订单
 */
app.post('/api/zilaidan/order/batch', async (req, res) => {
    try {
        const { orderIds } = req.body;
        const result = await zilaidanManager.batchProcessOrders(orderIds);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取所有自来单
 */
app.get('/api/zilaidan/orders', async (req, res) => {
    try {
        const filters = req.query;
        const orders = await zilaidanManager.getAllOrders(filters);
        res.json({ success: true, data: orders });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ==================== 供货商管理API ====================

/**
 * 添加供货商
 */
app.post('/api/supplier/add', async (req, res) => {
    try {
        const supplierData = req.body;
        const result = await supplierManager.addSupplier(supplierData);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 更新供货商
 */
app.put('/api/supplier/:id', async (req, res) => {
    try {
        const supplierId = req.params.id;
        const updateData = req.body;
        const result = await supplierManager.updateSupplier(supplierId, updateData);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 删除供货商
 */
app.delete('/api/supplier/:id', async (req, res) => {
    try {
        const supplierId = req.params.id;
        const result = await supplierManager.deleteSupplier(supplierId);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 启用/禁用供货商
 */
app.put('/api/supplier/:id/toggle', async (req, res) => {
    try {
        const supplierId = req.params.id;
        const { enabled } = req.body;
        const result = await supplierManager.toggleSupplier(supplierId, enabled);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 测试接口连接
 */
app.post('/api/supplier/:id/test', async (req, res) => {
    try {
        const supplierId = req.params.id;
        const result = await supplierManager.refreshSupplierStatus(supplierId);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取所有供货商
 */
app.get('/api/supplier/list', async (req, res) => {
    try {
        const suppliers = await supplierManager.getAllSuppliers();
        res.json({ success: true, data: suppliers });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 获取供货商统计
 */
app.get('/api/supplier/:id/stats', async (req, res) => {
    try {
        const supplierId = req.params.id;
        const result = await supplierManager.getSupplierStats(supplierId);
        res.json(result);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

/**
 * 搜索供货商
 */
app.get('/api/supplier/search', async (req, res) => {
    try {
        const { keyword } = req.query;
        const suppliers = await supplierManager.searchSuppliers(keyword);
        res.json({ success: true, data: suppliers });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        features: {
            userBackend: true,
            zilaidan: true,
            supplierManager: true
        }
    });
});

app.get('/api/version', (req, res) => {
    res.json({
        version: '3.0.0',
        name: '充易达系统',
        description: '充易达充值系统 v3.0 - 用户后台、自来单管理、供货商管理'
    });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
    console.log('========================================');
    console.log('  充易达系统 v3.0.0');
    console.log('========================================');
    console.log(`  服务器运行在: http://localhost:${PORT}`);
    console.log(`  API版本: 3.0.0`);
    console.log('');
    console.log('  功能模块:');
    console.log('  ✓ 用户后台 (/user)');
    console.log('  ✓ 自来单管理');
    console.log('  ✓ 供货商管理');
    console.log('========================================');
});

module.exports = app;
