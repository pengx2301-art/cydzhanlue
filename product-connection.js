/**
 * 商品对接管理模块
 * 用于对接大猿人等第三方平台，获取商品并上架到本地系统
 */

const http = require('http');
const https = require('https');
const url = require('url');

/**
 * 对接站配置
 */
const connectionSites = {
    'dayuanren': {
        name: '大猿人',
        enabled: true,
        baseUrl: 'https://api.example.com', // 实际API地址
        apiKey: 'your-api-key', // 实际API密钥
        lastCheckTime: null,
        isAvailable: false
    },
    // 可以添加更多对接站
    // 'platform2': {
    //     name: '平台名称',
    //     enabled: true,
    //     baseUrl: 'https://api.example2.com',
    //     apiKey: 'your-api-key-2',
    //     lastCheckTime: null,
    //     isAvailable: false
    // }
};

/**
 * HTTP请求封装
 */
function httpRequest(options) {
    return new Promise((resolve, reject) => {
        const protocol = options.protocol === 'https:' ? https : http;
        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

/**
 * 检查对接站是否可用
 * @param {string} siteId - 对接站ID
 * @returns {Promise<boolean>}
 */
async function checkSiteAvailability(siteId) {
    const site = connectionSites[siteId];
    if (!site) {
        throw new Error('对接站不存在');
    }

    try {
        // 尝试调用健康检查或商品列表接口
        const options = {
            hostname: url.parse(site.baseUrl).hostname,
            port: url.parse(site.baseUrl).port || (site.baseUrl.startsWith('https') ? 443 : 80),
            path: '/api/health', // 健康检查接口
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${site.apiKey}`
            },
            protocol: url.parse(site.baseUrl).protocol
        };

        const result = await httpRequest(options);
        
        site.isAvailable = result.status === 'ok' || result.success === true;
        site.lastCheckTime = new Date().toISOString();

        return site.isAvailable;

    } catch (error) {
        console.error(`检查对接站 ${site.name} 失败:`, error.message);
        site.isAvailable = false;
        site.lastCheckTime = new Date().toISOString();
        return false;
    }
}

/**
 * 获取对接站商品列表
 * @param {string} siteId - 对接站ID
 * @param {Object} params - 查询参数（可选）
 * @returns {Promise<Array>}
 */
async function fetchSiteProducts(siteId, params = {}) {
    const site = connectionSites[siteId];
    if (!site) {
        throw new Error('对接站不存在');
    }

    if (!site.enabled) {
        throw new Error('对接站未启用');
    }

    // 检查对接站是否可用
    const isAvailable = await checkSiteAvailability(siteId);
    if (!isAvailable) {
        throw new Error('对接站不可用，无法获取商品信息');
    }

    try {
        const query = new URLSearchParams(params).toString();
        const options = {
            hostname: url.parse(site.baseUrl).hostname,
            port: url.parse(site.baseUrl).port || (site.baseUrl.startsWith('https') ? 443 : 80),
            path: `/api/products?${query}`, // 商品列表接口
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${site.apiKey}`
            },
            protocol: url.parse(site.baseUrl).protocol
        };

        const result = await httpRequest(options);

        if (result.code === 200 || result.success === true) {
            return result.data || result.products || [];
        } else {
            throw new Error(result.message || '获取商品列表失败');
        }

    } catch (error) {
        console.error(`获取 ${site.name} 商品失败:`, error.message);
        throw error;
    }
}

/**
 * 上架商品到本地系统
 * @param {string} siteId - 对接站ID
 * @param {Array} productIds - 要上架的商品ID列表
 * @returns {Promise<Object>}
 */
async function onboardProducts(siteId, productIds) {
    const site = connectionSites[siteId];
    if (!site) {
        throw new Error('对接站不存在');
    }

    // 检查对接站是否可用
    const isAvailable = await checkSiteAvailability(siteId);
    if (!isAvailable) {
        throw new Error('对接站不可用，无法上架商品');
    }

    // 获取对接站商品详细信息
    const allProducts = await fetchSiteProducts(siteId);
    const productsToOnboard = allProducts.filter(p => productIds.includes(p.id));

    if (productsToOnboard.length === 0) {
        throw new Error('未找到要上架的商品');
    }

    // 这里应该将商品保存到本地数据库
    const onboardedProducts = [];

    for (const product of productsToOnboard) {
        const localProduct = {
            id: `PROD_${siteId}_${product.id}`,
            originalId: product.id,
            siteId: siteId,
            siteName: site.name,
            name: product.name,
            category: product.category || '默认分类',
            price: product.price || 0,
            costPrice: product.costPrice || 0,
            stock: product.stock || -1, // -1表示无限库存
            status: 'active',
            description: product.description || '',
            parameters: product.parameters || [], // 商品所需的参数
            imageUrl: product.imageUrl || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 保存到数据库（这里需要根据实际数据库实现调整）
        // database.saveProduct(localProduct);
        
        onboardedProducts.push(localProduct);
        console.log(`已上架商品: ${product.name} (来自 ${site.name})`);
    }

    return {
        success: true,
        message: `成功上架 ${onboardedProducts.length} 个商品`,
        data: onboardedProducts
    };
}

/**
 * 获取已上架商品列表
 * @returns {Promise<Array>}
 */
async function getOnboardedProducts() {
    // 从数据库获取已上架商品
    // const products = await database.getProducts();
    // return products;
    
    // 临时返回示例数据
    return [];
}

/**
 * 删除已上架商品
 * @param {string} productId - 商品ID
 * @returns {Promise<Object>}
 */
async function removeProduct(productId) {
    // 从数据库删除商品
    // await database.deleteProduct(productId);
    
    return {
        success: true,
        message: '商品已删除'
    };
}

/**
 * 获取所有对接站状态
 * @returns {Array}
 */
function getConnectionSitesStatus() {
    return Object.keys(connectionSites).map(siteId => ({
        id: siteId,
        name: connectionSites[siteId].name,
        enabled: connectionSites[siteId].enabled,
        isAvailable: connectionSites[siteId].isAvailable,
        lastCheckTime: connectionSites[siteId].lastCheckTime
    }));
}

module.exports = {
    checkSiteAvailability,
    fetchSiteProducts,
    onboardProducts,
    getOnboardedProducts,
    removeProduct,
    getConnectionSitesStatus,
    connectionSites
};
