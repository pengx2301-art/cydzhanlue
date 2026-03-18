/**
 * 卡速售供货商对接模块
 * API版本: v2.0
 * 文档地址: https://doc.kasushou.com/api/v2api
 */

const crypto = require('crypto');
const axios = require('axios');

class KasushouSupplier {
    constructor(config) {
        this.apiUrl = config.apiUrl || 'https://api.kasushou.com';
        this.appId = config.appId;
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 30000;
    }

    /**
     * 生成签名
     * @param {Object} data - 请求数据
     * @param {string} timestamp - 13位时间戳
     * @returns {string} 签名
     */
    generateSignature(data, timestamp) {
        // 参数按ASCII码排序
        const sortedData = {};
        Object.keys(data).sort().forEach(key => {
            sortedData[key] = data[key];
        });

        // 序列化为JSON字符串
        const dataString = JSON.stringify(sortedData);

        // 拼接签名字符串
        const signString = `${timestamp}${dataString}${this.apiKey}`;

        // SHA1哈希
        return crypto.createHash('sha1').update(signString).digest('hex');
    }

    /**
     * 生成请求头
     * @param {Object} data - 请求数据
     * @returns {Object} 请求头
     */
    generateHeaders(data) {
        const timestamp = Date.now().toString();
        const sign = this.generateSignature(data, timestamp);

        return {
            'Content-Type': 'application/json; charset=utf-8',
            'Sign': sign,
            'Timestamp': timestamp,
            'UserId': this.appId
        };
    }

    /**
     * 发送请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async request(endpoint, data) {
        try {
            const headers = this.generateHeaders(data);
            const url = `${this.apiUrl}${endpoint}`;

            console.log(`[卡速售] 请求: ${url}`);
            console.log(`[卡速售] 数据:`, data);

            const response = await axios.post(url, data, {
                headers,
                timeout: this.timeout
            });

            console.log(`[卡速售] 响应:`, response.data);

            return response.data;
        } catch (error) {
            console.error(`[卡速售] 请求失败:`, error.message);
            throw new Error(`卡速售API请求失败: ${error.message}`);
        }
    }

    /**
     * 获取商品列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Array>} 商品列表
     */
    async getProductList(params = {}) {
        const data = {
            cate_id: params.cateId || 0,
            keyword: params.keyword || '',
            limit: params.limit || 100,
            page: params.page || 1
        };

        const response = await this.request('/api/v1/goods/list', data);

        if (response.code === 200) {
            return {
                success: true,
                data: response.data.list,
                total: response.data.total
            };
        } else {
            return {
                success: false,
                message: response.msg || '获取商品列表失败'
            };
        }
    }

    /**
     * 提交订单
     * @param {Object} orderData - 订单数据
     * @returns {Promise<Object>} 订单结果
     */
    async submitOrder(orderData) {
        const data = {
            id: orderData.productId,           // 商品ID
            url: orderData.callbackUrl || '', // 回调地址
            external_orderno: orderData.externalOrderNo, // 三方订单号
            safe_price: orderData.safePrice || '', // 安全价格
            mark: orderData.mark || '',        // 备注
            quantity: orderData.quantity || 1 // 数量
        };

        // 如果是手工订单，添加attach参数
        if (orderData.attach) {
            data.attach = orderData.attach;
        }

        const response = await this.request('/api/v1/order/buy', data);

        if (response.code === 200) {
            return {
                success: true,
                data: {
                    orderSn: response.data.ordersn,
                    externalOrderNo: response.data.external_orderno,
                    totalPrice: response.data.total_price
                }
            };
        } else {
            return {
                success: false,
                message: response.msg || '提交订单失败'
            };
        }
    }

    /**
     * 查询订单详情
     * @param {string} orderSn - 订单号
     * @returns {Promise<Object>} 订单详情
     */
    async getOrderDetail(orderSn) {
        const data = {
            ordersn: orderSn,
            external_orderno: '',
            day: 0
        };

        const response = await this.request('/api/v1/order/detail', data);

        if (response.code === 200) {
            return {
                success: true,
                data: response.data
            };
        } else {
            return {
                success: false,
                message: response.msg || '查询订单失败'
            };
        }
    }

    /**
     * 查询用户余额
     * @returns {Promise<Object>} 余额信息
     */
    async getBalance() {
        const data = {};

        const response = await this.request('/api/v1/user/balance', data);

        if (response.code === 200) {
            return {
                success: true,
                data: {
                    balance: response.data.balance
                }
            };
        } else {
            return {
                success: false,
                message: response.msg || '查询余额失败'
            };
        }
    }

    /**
     * 撤销订单
     * @param {string} orderSn - 订单号
     * @returns {Promise<Object>} 撤销结果
     */
    async cancelOrder(orderSn) {
        const data = {
            ordersn: orderSn
        };

        const response = await this.request('/api/v1/order/cancel', data);

        if (response.code === 200) {
            return {
                success: true,
                message: response.msg || '撤销成功'
            };
        } else {
            return {
                success: false,
                message: response.msg || '撤销订单失败'
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

module.exports = KasushouSupplier;
