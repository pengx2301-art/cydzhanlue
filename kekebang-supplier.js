/**
 * 客客帮供货商对接模块
 * API版本: v1.0
 * 文档地址: https://docs.kekebang.com.cn
 * 正式域名: https://purchase.kekebang.com.cn
 */

const crypto = require('crypto');
const axios = require('axios');

class KekebangSupplier {
    constructor(config) {
        this.apiUrl = config.apiUrl || 'https://purchase.kekebang.com.cn';
        this.supplyApiUrl = config.supplyApiUrl || 'https://openapi.kekebang.com.cn';
        this.appKey = config.appKey;
        this.appSecret = config.appSecret;
        this.timeout = config.timeout || 30000;
    }

    /**
     * 生成签名
     * @param {Object} params - 请求参数
     * @returns {string} 签名
     */
    generateSignature(params) {
        // 排除sign参数
        const signParams = {};
        Object.keys(params).forEach(key => {
            if (key !== 'sign') {
                signParams[key] = params[key];
            }
        });

        // 按参数名首字母升序排序
        const sortedKeys = Object.keys(signParams).sort();
        
        // 拼接字符串
        let signString = '';
        sortedKeys.forEach(key => {
            signString += key + signParams[key];
        });

        // 追加AppSecret
        signString += this.appSecret;

        // MD5加密
        return crypto.createHash('md5').update(signString).digest('hex');
    }

    /**
     * 发送请求
     * @param {string} endpoint - API端点
     * @param {Object} params - 请求参数
     * @param {string} apiType - API类型 (purchase/supply)
     * @returns {Promise<Object>} 响应数据
     */
    async request(endpoint, params, apiType = 'purchase') {
        try {
            const baseUrl = apiType === 'purchase' ? this.apiUrl : this.supplyApiUrl;
            const timestamp = Math.floor(Date.now() / 1000);

            // 构建请求参数
            const requestParams = {
                app_key: this.appKey,
                timestamp: timestamp,
                ...params
            };

            // 生成签名
            const sign = this.generateSignature(requestParams);
            requestParams.sign = sign;

            console.log(`[客客帮] 请求: ${baseUrl}${endpoint}`);
            console.log(`[客客帮] 参数:`, requestParams);

            const response = await axios.post(`${baseUrl}${endpoint}`, requestParams, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });

            console.log(`[客客帮] 响应:`, response.data);

            return response.data;
        } catch (error) {
            console.error(`[客客帮] 请求失败:`, error.message);
            throw new Error(`客客帮API请求失败: ${error.message}`);
        }
    }

    /**
     * 获取商品列表（供货商视角）
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 商品列表
     */
    async getProductList(params = {}) {
        const data = {
            b_id: params.bId || 1, // 1-话费
            goods_id: params.goodsId || '',
            supply_status: params.supplyStatus || -1, // -1-全部
            pageSize: params.pageSize || 100,
            page: params.page || 1
        };

        const requestParams = {
            data: JSON.stringify(data)
        };

        const response = await this.request('/openapi/suppler/v1/get-goods-infos', requestParams, 'supply');

        if (response.code === 0) {
            return {
                success: true,
                data: response.data.goods_info || [],
                total: response.data.stat_info?.total || 0
            };
        } else {
            return {
                success: false,
                message: response.message || '获取商品列表失败'
            };
        }
    }

    /**
     * 提交订单（采购方视角）
     * @param {Object} orderData - 订单数据
     * @returns {Promise<Object>} 订单结果
     */
    async submitOrder(orderData) {
        const requestParams = {
            biz_code: orderData.bizCode || 1, // 1-话费, 2-权益, 4-娱币
            order_id: orderData.externalOrderNo,
            sku_code: orderData.skuCode,
            notify_url: orderData.callbackUrl || '',
            data: orderData.data || {}
        };

        const response = await this.request('/openapi/purchase/v1/submit-order', requestParams, 'purchase');

        if (response.code === '00000') {
            return {
                success: true,
                data: {
                    orderId: response.data.order_id,
                    terraceId: response.data.terrace_id,
                    account: response.data.account,
                    orderState: response.data.order_state,
                    returnMsg: response.data.return_msg
                }
            };
        } else {
            return {
                success: false,
                message: response.message || '提交订单失败'
            };
        }
    }

    /**
     * 查询订单详情
     * @param {string} orderId - 订单号
     * @param {number} bizCode - 业务类型
     * @returns {Promise<Object>} 订单详情
     */
    async getOrderDetail(orderId, bizCode = 1) {
        const requestParams = {
            biz_code: bizCode,
            order_id: orderId
        };

        const response = await this.request('/openapi/purchase/v1/query-order', requestParams, 'purchase');

        if (response.code === '00000') {
            return {
                success: true,
                data: response.data
            };
        } else {
            return {
                success: false,
                message: response.message || '查询订单失败'
            };
        }
    }

    /**
     * 查询用户余额（如果API支持）
     * @returns {Promise<Object>} 余额信息
     */
    async getBalance() {
        // 客客帮暂无公开的余额查询接口
        // 这里返回一个模拟的成功响应
        return {
            success: true,
            data: {
                balance: 0,
                message: '客客帮暂无余额查询接口'
            }
        };
    }

    /**
     * 撤销订单（如果API支持）
     * @param {string} orderId - 订单号
     * @param {number} bizCode - 业务类型
     * @returns {Promise<Object>} 撤销结果
     */
    async cancelOrder(orderId, bizCode = 1) {
        // 客客帮暂无公开的撤销订单接口
        // 这里返回一个模拟的响应
        return {
            success: false,
            message: '客客帮暂无撤销订单接口'
        };
    }

    /**
     * 测试连接
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection() {
        try {
            // 尝试获取商品列表来测试连接
            const result = await this.getProductList({
                bId: 1,
                page: 1,
                pageSize: 1
            });

            if (result.success) {
                return {
                    success: true,
                    message: '连接成功'
                };
            } else {
                return {
                    success: false,
                    message: result.message || '连接失败'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `连接失败: ${error.message}`
            };
        }
    }

    /**
     * 获取商品SKU代码
     * @param {string} goodsId - 商品ID
     * @returns {Promise<string>} SKU代码
     */
    async getGoodsSkuCode(goodsId) {
        const result = await this.getProductList({
            goodsId: goodsId,
            page: 1,
            pageSize: 1
        });

        if (result.success && result.data.length > 0) {
            return result.data[0].goods_id;
        }
        return null;
    }
}

module.exports = KekebangSupplier;
