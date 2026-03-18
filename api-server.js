/**
 * 充易达系统 - 增强版API服务器
 * 包含商品对接、下单、手机号归属地查询等功能
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// 导入功能模块
const productConnection = require('./product-connection');
const orderModule = require('./order-module');

const app = express();
const PORT = 8899;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('dashboard-ui'));

// ==================== 对接站管理接口 ====================

/**
 * 获取所有对接站状态
 * GET /api/connection/sites
 */
app.get('/api/connection/sites', (req, res) => {
    try {
        const sites = productConnection.getConnectionSitesStatus();
        res.json({
            success: true,
            data: sites
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 检查对接站可用性
 * GET /api/connection/:siteId/check
 */
app.get('/api/connection/:siteId/check', async (req, res) => {
    try {
        const { siteId } = req.params;
        const isAvailable = await productConnection.checkSiteAvailability(siteId);
        
        res.json({
            success: true,
            data: {
                siteId,
                isAvailable
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 获取对接站商品列表
 * GET /api/connection/:siteId/products
 */
app.get('/api/connection/:siteId/products', async (req, res) => {
    try {
        const { siteId } = req.params;
        const params = req.query; // 支持查询参数
        
        const products = await productConnection.fetchSiteProducts(siteId, params);
        
        res.json({
            success: true,
            data: {
                siteId,
                products,
                count: products.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 上架商品
 * POST /api/products/onboard
 */
app.post('/api/products/onboard', async (req, res) => {
    try {
        const { siteId, productIds } = req.body;
        
        if (!siteId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: '参数错误'
            });
        }
        
        const result = await productConnection.onboardProducts(siteId, productIds);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 获取已上架商品列表
 * GET /api/products/onboarded
 */
app.get('/api/products/onboarded', async (req, res) => {
    try {
        const products = await productConnection.getOnboardedProducts();
        
        res.json({
            success: true,
            data: {
                products,
                count: products.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 删除已上架商品
 * DELETE /api/products/:productId
 */
app.delete('/api/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await productConnection.removeProduct(productId);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== 下单接口 ====================

/**
 * 获取商品参数配置
 * GET /api/products/:productId/parameters
 */
app.get('/api/products/:productId/parameters', (req, res) => {
    try {
        const { productId } = req.params;
        const parameters = orderModule.getProductParameters(productId);
        
        res.json({
            success: true,
            data: parameters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 实时验证参数（支持手机号归属地查询）
 * POST /api/orders/validate-parameter
 */
app.post('/api/orders/validate-parameter', async (req, res) => {
    try {
        const { paramName, value } = req.body;
        
        if (!paramName || value === undefined) {
            return res.status(400).json({
                success: false,
                message: '参数错误'
            });
        }
        
        const result = await orderModule.validateParameterRealtime(
            paramName, 
            value, 
            orderModule.parameterValidators
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * 创建订单
 * POST /api/orders/create
 */
app.post('/api/orders/create', async (req, res) => {
    try {
        const orderData = req.body;
        const result = await orderModule.createOrder(orderData);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== 手机号归属地查询接口 ====================

/**
 * 查询手机号归属地
 * GET /api/phone/location
 */
app.get('/api/phone/location', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: '请提供手机号'
            });
        }
        
        const result = await orderModule.getPhoneLocation(phone);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== 系统接口 ====================

/**
 * 健康检查
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

/**
 * 版本信息
 * GET /api/version
 */
app.get('/api/version', (req, res) => {
    res.json({
        version: '2.0.0',
        name: '充易达系统 - 增强版',
        features: [
            '商品对接管理',
            '商品上架功能',
            '自定义参数订单',
            '手机号归属地查询'
        ]
    });
});

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      🚀 充易达系统 - 增强版已启动                          ║
║                                                           ║
║      📡 服务地址: http://localhost:${PORT}                  ║
║      🎉 新增功能:                                         ║
║        • 商品对接管理                                      ║
║        • 对接站可用性检查                                  ║
║        • 商品选择和上架                                    ║
║        • 自定义参数下单                                    ║
║        • 手机号归属地查询                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
