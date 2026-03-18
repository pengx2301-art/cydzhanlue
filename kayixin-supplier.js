/**
 * 卡易信供货商对接模块
 * API版本: v1.0
 * 基于常见的充值API接口规范实现
 */

const crypto = require('crypto');
const axios = require('axios');

class KayixinSupplier {
    constructor(config) {
        this.apiUrl = config.apiUrl || 'http://api.kayixin.com';
        this.username = config.username;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 30000;
    }

    /**
     * 生成签名 (MD5)
     * @param {Object} params - 请求参数
     * @returns {string} 签名
     */
    generateSignature(params) {
        // 按字母顺序排序参数
        const sortedKeys = Object.keys(params).sort();
        const signString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
        
        // 拼接API密钥
        const signStringWithKey = `${signString}&key=${this.apiKey}`;
        
        // MD5加密并转为大写
        return crypto.createHash('md5').update(signStringWithKey).digest('hex').toUpperCase();
    }

    /**
     * 发送请求
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @returns {Promise<Object>} 响应数据
     */
    async request(endpoint, params) {
        try {
            // 添加用户名和时间戳
            const requestData = {
                username: this.username,
                timestamp: Date.now(),
                ...params
            };

            // 生成签名
            const sign = this.generateSignature(requestData);
            requestData.sign = sign;

            console.log(`[卡易信] 请求: ${this.apiUrl}${endpoint}`);
            console.log(`[卡易信] 参数:`, requestData);

            const response = await axios.post(`${this.apiUrl}${endpoint}`, requestData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: this.timeout
            });

            console.log(`[卡易信] 响应:`, response.data);

            return response.data;
        } catch (error) {
            console.error(`[卡易信] 请求失败:`, error.message);
            throw new Error(`卡易信API请求失败: ${error.message}`);
        }
    }

    /**
     * 获取商品列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Array>} 商品列表
     */
    async getProductList(params = {}) {
        const requestData = {
            type: params.type || 'list',
            page: params.page || 1,
            size: params.size || 100,
            classid: params.classId || ''
        };

        const response = await this.request('/api/goods', requestData);

        if (response.code === 1 || response.code === '1') {
            return {
                success: true,
                data: response.data || response.list || [],
                total: response.total || 0
            };
        } else {
            return {
                success: false,
                message: response.msg || response.message || '获取商品列表失败'
            };
        }
    }

    /**
     * 提交订单
     * @param {Object} orderData - 订单数据
     * @returns {Promise<Object>} 订单结果
     */
    async submitOrder(orderData) {
        const requestData = {
            type: 'submit',
            pid: orderData.productId,        // 商品ID
            out_trade_no: orderData.externalOrderNo, // 外部订单号
            num: orderData.quantity || 1,    // 数量
            account: orderData.account || '', // 充值账号
            notify_url: orderData.callbackUrl || '' // 回调地址
        };

        // 如果是卡密商品，可以添加其他参数
        if (orderData.remark) {
            requestData.remark = orderData.remark;
        }

        const response = await this.request('/api/order', requestData);

        if (response.code === 1 || response.code === '1') {
            return {
                success: true,
                data: {
                    orderNo: response.orderNo || response.orderno || response.order_id,
                    externalOrderNo: orderData.externalOrderNo,
                    totalPrice: response.price || response.total || orderData.quantity * orderData.price
                }
            };
        } else {
            return {
                success: false,
                message: response.msg || response.message || '提交订单失败'
            };
        }
    }

    /**
     * 查询订单详情
     * @param {string} orderNo - 订单号
     * @returns {Promise<Object>} 订单详情
     */
    async getOrderDetail(orderNo) {
        const requestData = {
            type: 'query',
            orderNo: orderNo
        };

        const response = await this.request('/api/order', requestData);

        if (response.code === 1 || response.code === '1') {
            return {
                success: true,
                data: response.data || response
            };
        } else {
            return {
                success: false,
                message: response.msg || response.message || '查询订单失败'
            };
        }
    }

    /**
     * 查询用户余额
     * @returns {Promise<Object>} 余额信息
     */
    async getBalance() {
        const requestData = {
            type: 'balance'
        };

        const response = await this.request('/api/user', requestData);

        if (response.code === 1 || response.code === '1') {
            return {
                success: true,
                data: {
                    balance: response.balance || response.money || 0
                }
            };
        } else {
            return {
                success: false,
                message: response.msg || response.message || '查询余额失败'
            };
        }
    }

    /**
     * 撤销订单
     * @param {string} orderNo - 订单号
     * @returns {Promise<Object>} 撤销结果
     */
    async cancelOrder(orderNo) {
        const requestData = {
            type: 'cancel',
            orderNo: orderNo
        };

        const response = await this.request('/api/order', requestData);

        if (response.code === 1 || response.code === '1') {
            return {
                success: true,
                message: response.msg || '撤销成功'
            };
        } else {
            return {
                success: false,
                message: response.msg || response.message || '撤销订单失败'
            };
        }
    }

    /**
     * 测试连接
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection() {
        try {
            const result = await this.getBalance();
            return {
                success: result.success,
                message: result.success ? '连接成功' : result.message
            };
        } catch (error) {
            return {
                success: false,
                message: `连接失败: ${error.message}`
            };
        }
    }
}

module.exports = KayixinSupplier;
