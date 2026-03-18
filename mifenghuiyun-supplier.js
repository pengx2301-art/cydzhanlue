/**
 * 蜜蜂汇云供应商对接模块 - v3.0.0
 * 
 * 业务逻辑：我们作为供应商，对接蜜蜂汇云采购平台
 * 模式：推单API模式（有服务器）
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

class MifenghuiyunSupplier {
    constructor(config) {
        this.config = {
            baseUrl: config.baseUrl || 'https://api.mifenghuiyun.com',
            appId: config.appId || '',
            appSecret: config.appSecret || '',
            merchantId: config.merchantId || '',
            callbackUrl: config.callbackUrl || '',
            timeout: config.timeout || 10000
        };
    }

    /**
     * 生成签名
     */
    generateSign(params) {
        // 按字母顺序排序参数
        const sortedKeys = Object.keys(params).sort();
        const signStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
        const signWithSecret = signStr + `&appSecret=${this.config.appSecret}`;
        return crypto.createHash('md5').update(signWithSecret).digest('hex').toUpperCase();
    }

    /**
     * 发送HTTP请求
     */
    async request(endpoint, params = {}, method = 'POST') {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.config.baseUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            // 添加公共参数
            const publicParams = {
                appId: this.config.appId,
                merchantId: this.config.merchantId,
                timestamp: Date.now(),
                nonce: Math.random().toString(36).substring(7),
                ...params
            };

            // 生成签名
            publicParams.sign = this.generateSign(publicParams);

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: this.config.timeout
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (jsonData.code === 0 || jsonData.success === true) {
                            resolve(jsonData);
                        } else {
                            reject(new Error(jsonData.message || '请求失败'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });

            if (method === 'POST') {
                req.write(JSON.stringify(publicParams));
            }

            req.end();
        });
    }

    /**
     * 上报订单状态（核心接口）
     * 用于向平台上报订单的充值结果
     */
    async updateStatus(orderData) {
        const params = {
            orderId: orderData.orderId, // 平台订单ID
            status: orderData.status, // 1-处理中 2-成功 3-失败
            message: orderData.message || '', // 处理结果说明
            rechargeAmount: orderData.rechargeAmount || 0, // 充值金额
            originalAmount: orderData.originalAmount || 0, // 面值
            balance: orderData.balance || 0, // 余额（如果需要）
            remark: orderData.remark || '' // 备注
        };

        return await this.request('/userapi/sgd/updateStatus', params, 'POST');
    }

    /**
     * 查询订单状态
     */
    async queryOrder(orderId) {
        const params = {
            orderId: orderId
        };

        return await this.request('/userapi/sgd/queryOrder', params, 'POST');
    }

    /**
     * 获取可报价商品列表
     */
    async getSupplyGoodManageList() {
        const params = {};

        return await this.request('/userapi/supply/getSupplyGoodManageList', params, 'POST');
    }

    /**
     * 修改商品报价
     */
    async editSupplyGoodManageStock(goods) {
        const params = {
            goods: JSON.stringify(goods) // 商品数组
        };

        return await this.request('/userapi/supply/editSupplyGoodManageStock', params, 'POST');
    }

    /**
     * 修改话费商品省份报价
     */
    async editSupplyGoodManageStockWithProv(provinceData) {
        const params = {
            provinceData: JSON.stringify(provinceData)
        };

        return await this.request('/userapi/supply/editSupplyGoodManageStockWithProv', params, 'POST');
    }

    /**
     * 查询推单功能开关
     */
    async getSupplyGoodManageSwitch() {
        const params = {};

        return await this.request('/userapi/supply/getSupplyGoodManageSwitch', params, 'POST');
    }

    /**
     * 修改推单功能开关
     */
    async editSupplyGoodManageSwitch(enabled) {
        const params = {
            status: enabled ? 1 : 0
        };

        return await this.request('/userapi/supply/editSupplyGoodManageSwitch', params, 'POST');
    }

    /**
     * 获取风控统计信息
     */
    async getOrderStat(startTime, endTime) {
        const params = {
            startTime: startTime,
            endTime: endTime
        };

        return await this.request('/userapi/supply/getOrderStat', params, 'POST');
    }

    /**
     * 测试连接
     */
    async testConnection() {
        try {
            await this.getSupplyGoodManageSwitch();
            return { success: true, message: '连接成功' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * 处理推单回调
     * 供外部平台调用，接收订单
     */
    async handlePushOrder(callbackData) {
        // 验证签名
        const expectedSign = this.generateSign(callbackData);
        if (callbackData.sign !== expectedSign) {
            return { success: false, message: '签名验证失败' };
        }

        // 验证时间戳（防止重放攻击）
        const now = Date.now();
        if (now - callbackData.timestamp > 300000) { // 5分钟有效期
            return { success: false, message: '请求已过期' };
        }

        // 处理订单
        const order = {
            orderId: callbackData.orderId,
            productName: callbackData.productName,
            phoneNumber: callbackData.phoneNumber,
            amount: callbackData.amount,
            originalAmount: callbackData.originalAmount,
            province: callbackData.province,
            operator: callbackData.operator,
            platform: 'mifenghuiyun',
            status: 'pending',
            createdAt: new Date(callbackData.timestamp)
        };

        // 保存到数据库
        // await db.createZilaidanOrder(order);

        return {
            success: true,
            message: '订单接收成功',
            data: order
        };
    }
}

module.exports = MifenghuiyunSupplier;
