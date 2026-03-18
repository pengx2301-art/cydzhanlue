/**
 * 充易达系统 API服务器 - v3.2.0
 * 使用MySQL数据库，统一管理后台，新增供货商对接
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 导入数据库
const db = require('./database/db');

// 导入供货商管理器
const supplierManager = require('./supplier-manager-v2');

const app = express();
const PORT = process.env.PORT || 8899;
const JWT_SECRET = process.env.JWT_SECRET || 'chongyida-secret-key-2026';

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use(express.static(__dirname));

// ==================== 初始化供货商 ====================

// 启动时加载供货商配置
(async () => {
    try {
        await supplierManager.loadSuppliersFromDB();
        console.log('[服务器] 供货商配置加载完成');
    } catch (error) {
        console.error('[服务器] 加载供货商配置失败:', error);
    }
})();

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

// ==================== 健康检查 ====================

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: '服务器运行正常',
        version: '3.2.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * 版本信息
 */
app.get('/api/version', (req, res) => {
    res.json({ 
        version: '3.2.0',
        releaseDate: '2026-03-19',
        features: [
            'MySQL数据库',
            'JWT认证',
            '供货商管理',
            '蜜蜂汇云对接',
            '卡速售对接',
            '卡易信对接'
        ]
    });
});

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
            token: token,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                balance: user.balance,
                total_orders: user.total_orders || 0
            }
        });
    } catch (error) {
        console.error('用户登录错误:', error);
        res.json({ success: false, message: '登录失败，请稍后重试' });
    }
});

/**
 * 获取用户信息
 */
app.get('/api/user/info', authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                balance: user.balance,
                total_orders: user.total_orders || 0,
                total_spent: user.total_spent || 0
            }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.json({ success: false, message: '获取用户信息失败' });
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

        const token = jwt.sign(
            { adminId: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: '登录成功',
            token: token,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('管理员登录错误:', error);
        res.json({ success: false, message: '登录失败，请稍后重试' });
    }
});

/**
 * 获取统计数据
 */
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.json({ success: false, message: '获取统计数据失败' });
    }
});

// ==================== 供货商管理API ====================

/**
 * 添加供货商
 */
app.post('/api/admin/suppliers', authenticateAdmin, async (req, res) => {
    try {
        const { 
            name, 
            supplier_type, 
            api_config, 
            status = 1 
        } = req.body;

        if (!name || !supplier_type || !api_config) {
            return res.json({ success: false, message: '缺少必要参数' });
        }

        const supplierId = await db.createSupplier({
            name,
            supplier_type,
            api_config: JSON.stringify(api_config),
            status
        });

        // 重新加载供货商配置
        await supplierManager.loadSuppliersFromDB();

        res.json({
            success: true,
            message: '添加供货商成功',
            data: { id: supplierId }
        });
    } catch (error) {
        console.error('添加供货商错误:', error);
        res.json({ success: false, message: '添加供货商失败' });
    }
});

/**
 * 获取供货商列表
 */
app.get('/api/admin/suppliers', authenticateAdmin, async (req, res) => {
    try {
        const suppliers = await db.getAllSuppliers();
        res.json({ success: true, data: suppliers });
    } catch (error) {
        console.error('获取供货商列表错误:', error);
        res.json({ success: false, message: '获取供货商列表失败' });
    }
});

/**
 * 更新供货商
 */
app.put('/api/admin/suppliers/:id', authenticateAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;
        const { name, supplier_type, api_config, status } = req.body;

        await db.updateSupplier(supplierId, {
            name,
            supplier_type,
            api_config: JSON.stringify(api_config),
            status
        });

        // 重新加载供货商配置
        await supplierManager.loadSuppliersFromDB();

        res.json({ success: true, message: '更新供货商成功' });
    } catch (error) {
        console.error('更新供货商错误:', error);
        res.json({ success: false, message: '更新供货商失败' });
    }
});

/**
 * 删除供货商
 */
app.delete('/api/admin/suppliers/:id', authenticateAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;
        await db.deleteSupplier(supplierId);

        // 重新加载供货商配置
        await supplierManager.loadSuppliersFromDB();

        res.json({ success: true, message: '删除供货商成功' });
    } catch (error) {
        console.error('删除供货商错误:', error);
        res.json({ success: false, message: '删除供货商失败' });
    }
});

/**
 * 测试供货商连接
 */
app.post('/api/admin/suppliers/:id/test', authenticateAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;
        const supplier = supplierManager.getSupplier(supplierId);
        
        if (!supplier) {
            return res.json({ success: false, message: '供货商不存在' });
        }

        const result = await supplier.testConnection();
        res.json(result);
    } catch (error) {
        console.error('测试供货商连接错误:', error);
        res.json({ success: false, message: error.message });
    }
});

/**
 * 测试所有供货商连接
 */
app.post('/api/admin/suppliers/test-all', authenticateAdmin, async (req, res) => {
    try {
        const results = await supplierManager.testAllSuppliers();
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('测试所有供货商连接错误:', error);
        res.json({ success: false, message: '测试失败' });
    }
});

// ==================== 供货商商品API ====================

/**
 * 从供货商获取商品列表
 */
app.post('/api/admin/suppliers/:id/products', authenticateAdmin, async (req, res) => {
    try {
        const supplierId = req.params.id;
        const params = req.body;

        const supplier = supplierManager.getSupplier(supplierId);
        if (!supplier) {
            return res.json({ success: false, message: '供货商不存在' });
        }

        const result = await supplier.getProductList(params);
        res.json(result);
    } catch (error) {
        console.error('获取供货商商品列表错误:', error);
        res.json({ success: false, message: error.message });
    }
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
    console.log(`
========================================
    充易达系统 API服务器 v3.2.0
========================================
运行地址: http://localhost:${PORT}
启动时间: ${new Date().toLocaleString('zh-CN')}
========================================
支持的供货商:
  - 蜜蜂汇云 (mifenghuiyun)
  - 卡速售 (kasushou)
  - 卡易信 (kayixin)
========================================
    `);
});
