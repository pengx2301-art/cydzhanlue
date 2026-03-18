/**
 * 充易达系统 API服务器 - v3.1.0
 * 使用MySQL数据库，统一管理后台
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 导入数据库
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 8899;
const JWT_SECRET = process.env.JWT_SECRET || 'chongyida-secret-key-2026';

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use(express.static(__dirname));

// ==================== 认证中间件 ====================

/**
 * 用户认证中间件
 */
async function authenticateUser(req, res, next) {
    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) {
            return res.json({ success: false, message: '未提供认证Token' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.getUserById(decoded.userId);
        
        if (!user) {
            return res.json({ success: false, message: '用户不存在' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.json({ success: false, message: '认证失败' });
    }
}

/**
 * 管理员认证中间件
 */
async function authenticateAdmin(req, res, next) {
    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (!token) {
            return res.json({ success: false, message: '未提供认证Token' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await db.getAdminByUsername(decoded.username);
        
        if (!admin) {
            return res.json({ success: false, message: '管理员不存在' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.json({ success: false, message: '认证失败' });
    }
}

// ==================== 用户API ====================

/**
 * 用户登录
 */
app.post('/api/user/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        if (!phone || !password) {
            return res.json({ success: false, message: '手机号和密码不能为空' });
        }

        const user = await db.getUserByPhone(phone);
        
        if (!user) {
            return res.json({ success: false, message: '手机号或密码错误' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.json({ success: false, message: '手机号或密码错误' });
        }

        const token = jwt.sign(
            { userId: user.id, phone: user.phone },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                id: user.id,
                phone: user.phone,
                username: user.username,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('用户登录错误:', error);
        res.json({ success: false, message: '登录失败' });
    }
});

/**
 * 获取用户仪表盘
 */
app.get('/api/user/dashboard', authenticateUser, async (req, res) => {
    try {
        const data = await db.getUserDashboard(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('获取仪表盘数据错误:', error);
        res.json({ success: false, message: '获取数据失败' });
    }
});

/**
 * 获取商品列表
 */
app.get('/api/user/products', async (req, res) => {
    try {
        const filters = {
            category: req.query.category,
            keyword: req.query.keyword
        };
        
        const products = await db.getProducts(filters);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('获取商品列表错误:', error);
        res.json({ success: false, message: '获取商品失败' });
    }
});

/**
 * 获取商品详情
 */
app.get('/api/user/products/:id', async (req, res) => {
    try {
        const product = await db.getProductById(req.params.id);
        
        if (!product) {
            return res.json({ success: false, message: '商品不存在' });
        }

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('获取商品详情错误:', error);
        res.json({ success: false, message: '获取商品失败' });
    }
});

/**
 * 创建订单
 */
app.post('/api/user/orders', authenticateUser, async (req, res) => {
    try {
        const { product_id, account, quantity } = req.body;
        
        // 验证商品
        const product = await db.getProductById(product_id);
        if (!product) {
            return res.json({ success: false, message: '商品不存在' });
        }

        // 计算金额
        const totalAmount = product.price * (quantity || 1);
        const costAmount = (product.cost_price || product.price) * (quantity || 1);

        // 检查余额
        if (req.user.balance < totalAmount) {
            return res.json({ success: false, message: '余额不足' });
        }

        // 生成订单号
        const orderNo = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6);

        // 创建订单
        const orderId = await db.createOrder({
            order_no: orderNo,
            user_id: req.user.id,
            product_id: product_id,
            supplier_id: product.supplier_id,
            account: account,
            quantity: quantity || 1,
            total_amount: totalAmount,
            cost_amount: costAmount,
            status: 'pending'
        });

        // 扣除余额
        await db.updateUserBalance(req.user.id, -totalAmount);

        res.json({
            success: true,
            message: '订单创建成功',
            data: {
                order_id: orderId,
                order_no: orderNo,
                total_amount: totalAmount
            }
        });
    } catch (error) {
        console.error('创建订单错误:', error);
        res.json({ success: false, message: '创建订单失败' });
    }
});

/**
 * 获取用户订单列表
 */
app.get('/api/user/orders', authenticateUser, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        
        const result = await db.getOrders({ user_id: req.user.id }, page, pageSize);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取订单列表错误:', error);
        res.json({ success: false, message: '获取订单失败' });
    }
});

/**
 * 获取订单详情
 */
app.get('/api/user/orders/:id', authenticateUser, async (req, res) => {
    try {
        const orders = await db.getOrders({ user_id: req.user.id }, 1, 1);
        const order = orders.list.find(o => o.id == req.params.id);
        
        if (!order) {
            return res.json({ success: false, message: '订单不存在' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('获取订单详情错误:', error);
        res.json({ success: false, message: '获取订单失败' });
    }
});

/**
 * 创建加款申请
 */
app.post('/api/user/topup', authenticateUser, async (req, res) => {
    try {
        const { amount, note } = req.body;
        
        if (!amount || amount <= 0) {
            return res.json({ success: false, message: '加款金额必须大于0' });
        }

        const applicationNo = 'TOPUP' + Date.now() + Math.random().toString(36).substr(2, 6);

        await db.createTopupApplication({
            application_no: applicationNo,
            user_id: req.user.id,
            amount: amount,
            note: note
        });

        res.json({
            success: true,
            message: '加款申请提交成功',
            data: {
                application_no: applicationNo,
                amount: amount
            }
        });
    } catch (error) {
        console.error('创建加款申请错误:', error);
        res.json({ success: false, message: '提交申请失败' });
    }
});

/**
 * 获取加款申请列表
 */
app.get('/api/user/topup', authenticateUser, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        
        const result = await db.getTopupApplications({ user_id: req.user.id }, page, pageSize);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取加款申请错误:', error);
        res.json({ success: false, message: '获取申请记录失败' });
    }
});

// ==================== 管理员API ====================

/**
 * 管理员登录
 */
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.json({ success: false, message: '用户名和密码不能为空' });
        }

        const admin = await db.getAdminByUsername(username);
        
        if (!admin) {
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        // 更新最后登录时间
        await db.updateAdminLastLogin(admin.id);

        const token = jwt.sign(
            { adminId: admin.id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: '登录成功',
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('管理员登录错误:', error);
        res.json({ success: false, message: '登录失败' });
    }
});

/**
 * 获取仪表盘数据
 */
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const stats = await db.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('获取仪表盘数据错误:', error);
        res.json({ success: false, message: '获取数据失败' });
    }
});

/**
 * 获取用户列表
 */
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const filters = {
            phone: req.query.search
        };
        
        const result = await db.getUserList(page, pageSize, filters);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.json({ success: false, message: '获取用户列表失败' });
    }
});

/**
 * 添加用户
 */
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const { phone, username, password, balance } = req.body;
        
        // 验证手机号
        const existingUser = await db.getUserByPhone(phone);
        if (existingUser) {
            return res.json({ success: false, message: '该手机号已存在' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = await db.createUser({
            phone: phone,
            username: username,
            password: hashedPassword,
            balance: balance || 0,
            created_by: req.admin.id
        });

        res.json({
            success: true,
            message: '用户添加成功',
            data: { user_id: userId }
        });
    } catch (error) {
        console.error('添加用户错误:', error);
        res.json({ success: false, message: '添加用户失败' });
    }
});

/**
 * 删除用户
 */
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: '用户删除成功' });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.json({ success: false, message: '删除用户失败' });
    }
});

/**
 * 获取订单列表
 */
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const filters = {
            status: req.query.status,
            keyword: req.query.search
        };
        
        const result = await db.getOrders(filters, page, pageSize);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取订单列表错误:', error);
        res.json({ success: false, message: '获取订单列表失败' });
    }
});

/**
 * 获取加款申请列表
 */
app.get('/api/admin/topup', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const filters = {
            status: req.query.status
        };
        
        const result = await db.getTopupApplications(filters, page, pageSize);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('获取加款申请错误:', error);
        res.json({ success: false, message: '获取加款申请失败' });
    }
});

/**
 * 审核加款申请
 */
app.put('/api/admin/topup/:id', authenticateAdmin, async (req, res) => {
    try {
        const { status, note } = req.body;
        
        const success = await db.approveTopupApplication(
            parseInt(req.params.id),
            req.admin.id,
            status,
            note
        );

        if (success) {
            res.json({ success: true, message: '审核成功' });
        } else {
            res.json({ success: false, message: '审核失败，申请可能已被处理' });
        }
    } catch (error) {
        console.error('审核加款申请错误:', error);
        res.json({ success: false, message: '审核失败' });
    }
});

/**
 * 获取供货商列表
 */
app.get('/api/admin/suppliers', authenticateAdmin, async (req, res) => {
    try {
        const suppliers = await db.getSuppliers();
        res.json({ success: true, data: suppliers });
    } catch (error) {
        console.error('获取供货商列表错误:', error);
        res.json({ success: false, message: '获取供货商列表失败' });
    }
});

/**
 * 添加供货商
 */
app.post('/api/admin/suppliers', authenticateAdmin, async (req, res) => {
    try {
        const supplierId = await db.createSupplier(req.body);
        res.json({
            success: true,
            message: '供货商添加成功',
            data: { supplier_id: supplierId }
        });
    } catch (error) {
        console.error('添加供货商错误:', error);
        res.json({ success: false, message: '添加供货商失败' });
    }
});

/**
 * 删除供货商
 */
app.delete('/api/admin/suppliers/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.deleteSupplier(req.params.id);
        res.json({ success: true, message: '供货商删除成功' });
    } catch (error) {
        console.error('删除供货商错误:', error);
        res.json({ success: false, message: '删除供货商失败' });
    }
});

/**
 * 获取商品列表
 */
app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
    try {
        const filters = {
            supplier_id: req.query.supplier_id,
            category: req.query.category,
            keyword: req.query.keyword
        };
        
        const products = await db.getProducts(filters);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('获取商品列表错误:', error);
        res.json({ success: false, message: '获取商品列表失败' });
    }
});

/**
 * 添加商品
 */
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
    try {
        const productId = await db.createProduct(req.body);
        res.json({
            success: true,
            message: '商品添加成功',
            data: { product_id: productId }
        });
    } catch (error) {
        console.error('添加商品错误:', error);
        res.json({ success: false, message: '添加商品失败' });
    }
});

/**
 * 获取自来单列表
 */
app.get('/api/admin/zilaidan', authenticateAdmin, async (req, res) => {
    try {
        const platform = req.query.platform;
        const orders = await db.query(
            'SELECT * FROM zilaidan_orders WHERE ? = ? ORDER BY created_at DESC LIMIT 100',
            [platform ? 'platform' : '1=1', platform ? platform : '1']
        );
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('获取自来单错误:', error);
        res.json({ success: false, message: '获取自来单失败' });
    }
});

// ==================== 系统API ====================

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API服务器运行正常',
        version: '3.1.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * 版本信息
 */
app.get('/api/version', (req, res) => {
    res.json({
        version: '3.1.0',
        name: '充易达系统',
        description: '使用MySQL数据库的统一管理后台',
        features: [
            '用户后台',
            '总后台管理',
            '订单管理',
            '加款审核',
            '供货商管理',
            '自来单管理'
        ]
    });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
    console.log('=================================');
    console.log(`充易达系统 API服务器 v3.1.0`);
    console.log(`服务器运行在: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
    console.log(`=================================`);
});

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    await db.close();
    process.exit(0);
});

module.exports = app;
