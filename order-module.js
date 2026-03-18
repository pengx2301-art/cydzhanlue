/**
 * 下单功能模块 - 支持自定义参数变量
 */

const http = require('http');
const https = require('https');

/**
 * 手机号归属地查询
 */
const phoneLocationCache = new Map();

/**
 * 查询手机号归属地
 * @param {string} phone - 手机号
 * @returns {Promise<Object>}
 */
async function getPhoneLocation(phone) {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return {
            success: false,
            message: '手机号格式不正确'
        };
    }

    // 检查缓存
    const cacheKey = phone.substring(0, 7); // 使用前7位作为缓存key
    if (phoneLocationCache.has(cacheKey)) {
        return phoneLocationCache.get(cacheKey);
    }

    try {
        // 使用免费API查询手机号归属地
        const options = {
            hostname: 'www.tianapi.com',
            port: 80,
            path: `/apiv3/mobilenumber/index?num=${phone.substring(0, 7)}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const result = await httpGet(options);

        if (result.code === 200 && result.result) {
            const locationData = {
                success: true,
                province: result.result.province,
                city: result.result.city,
                carrier: result.result.carrier,
                isp: result.result.isp,
                phone: phone
            };

            // 缓存结果（24小时）
            phoneLocationCache.set(cacheKey, locationData);
            setTimeout(() => {
                phoneLocationCache.delete(cacheKey);
            }, 24 * 60 * 60 * 1000);

            return locationData;
        } else {
            throw new Error(result.msg || '查询失败');
        }
    } catch (error) {
        console.error('查询手机号归属地失败:', error.message);
        
        // 返回基本归属地信息（基于号段）
        const prefix = phone.substring(0, 3);
        const basicLocation = {
            success: true,
            province: '未知',
            city: '未知',
            carrier: getCarrierByPrefix(prefix),
            phone: phone
        };

        phoneLocationCache.set(cacheKey, basicLocation);
        return basicLocation;
    }
}

/**
 * 根据号段获取运营商
 * @param {string} prefix - 号码前缀
 * @returns {string}
 */
function getCarrierByPrefix(prefix) {
    const carriers = {
        '130': '中国联通', '131': '中国联通', '132': '中国联通',
        '133': '中国电信', '134': '中国移动', '135': '中国移动',
        '136': '中国移动', '137': '中国移动', '138': '中国移动',
        '139': '中国移动', '145': '中国联通', '147': '中国移动',
        '149': '中国移动', '150': '中国移动', '151': '中国移动',
        '152': '中国移动', '153': '中国电信', '155': '中国联通',
        '156': '中国联通', '157': '中国移动', '158': '中国移动',
        '159': '中国移动', '165': '中国联通', '166': '中国联通',
        '167': '中国移动', '170': '虚拟运营商', '171': '虚拟运营商',
        '172': '中国联通', '173': '中国电信', '174': '中国移动',
        '175': '中国移动', '176': '中国移动', '177': '中国电信',
        '178': '中国移动', '180': '中国电信', '181': '中国电信',
        '182': '中国移动', '183': '中国移动', '184': '中国移动',
        '185': '中国联通', '186': '中国联通', '187': '中国移动',
        '188': '中国移动', '189': '中国电信', '191': '中国电信',
        '198': '中国移动', '199': '中国电信'
    };

    return carriers[prefix] || '未知运营商';
}

/**
 * HTTP GET请求
 */
function httpGet(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * 订单参数验证规则
 */
const parameterValidators = {
    // 手机号参数
    phone: {
        type: 'string',
        required: true,
        pattern: /^1[3-9]\d{9}$/,
        errorMessage: '请输入有效的11位手机号码',
        realtimeValidation: true, // 是否支持实时验证
        realtimeFunction: 'getPhoneLocation' // 实时验证函数
    },
    // 充值金额参数
    amount: {
        type: 'number',
        required: true,
        min: 10,
        max: 500,
        step: 10,
        errorMessage: '充值金额必须在10-500元之间，且为10的倍数'
    },
    // 订单备注
    remark: {
        type: 'string',
        required: false,
        maxLength: 200,
        errorMessage: '备注不能超过200个字符'
    },
    // 自定义参数示例
    customField: {
        type: 'string',
        required: false,
        pattern: /^[A-Za-z0-9]+$/,
        errorMessage: '自定义字段只能包含字母和数字'
    }
};

/**
 * 验证订单参数
 * @param {Object} params - 参数对象
 * @param {Array} schema - 参数验证规则
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateOrderParameters(params, schema) {
    const errors = [];

    for (const [paramName, rules] of Object.entries(schema)) {
        const value = params[paramName];

        // 检查必填参数
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push({
                field: paramName,
                message: rules.errorMessage || `${paramName}是必填项`
            });
            continue;
        }

        // 如果值不存在且不是必填，跳过验证
        if (!rules.required && (value === undefined || value === null || value === '')) {
            continue;
        }

        // 类型验证
        if (rules.type === 'number' && isNaN(value)) {
            errors.push({
                field: paramName,
                message: `${paramName}必须是数字`
            });
            continue;
        }

        // 正则验证
        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
                field: paramName,
                message: rules.errorMessage || `${paramName}格式不正确`
            });
            continue;
        }

        // 数字范围验证
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                errors.push({
                    field: paramName,
                    message: `${paramName}不能小于${rules.min}`
                });
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push({
                    field: paramName,
                    message: `${paramName}不能大于${rules.max}`
                });
            }
            if (rules.step !== undefined && value % rules.step !== 0) {
                errors.push({
                    field: paramName,
                    message: `${paramName}必须是${rules.step}的倍数`
                });
            }
        }

        // 字符串长度验证
        if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
            errors.push({
                field: paramName,
                message: `${paramName}不能超过${rules.maxLength}个字符`
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 实时验证参数（支持手机号归属地查询等）
 * @param {string} paramName - 参数名
 * @param {*} value - 参数值
 * @param {Object} schema - 参数规则
 * @returns {Promise<Object>}
 */
async function validateParameterRealtime(paramName, value, schema) {
    const rules = schema[paramName];
    
    if (!rules || !rules.realtimeValidation) {
        return { valid: true, data: null };
    }

    try {
        // 调用实时验证函数
        if (paramName === 'phone' && rules.realtimeFunction === 'getPhoneLocation') {
            const locationData = await getPhoneLocation(value);
            
            if (!locationData.success) {
                return {
                    valid: false,
                    message: locationData.message || '验证失败',
                    data: null
                };
            }

            return {
                valid: true,
                message: `${locationData.province} ${locationData.city} ${locationData.carrier}`,
                data: locationData
            };
        }

        return { valid: true, data: null };
    } catch (error) {
        return {
            valid: false,
            message: error.message || '验证失败',
            data: null
        };
    }
}

/**
 * 创建订单
 * @param {Object} orderData - 订单数据
 * @param {Object} schema - 参数验证规则
 * @returns {Promise<Object>}
 */
async function createOrder(orderData, schema = parameterValidators) {
    // 1. 验证参数
    const validation = validateOrderParameters(orderData, schema);
    if (!validation.valid) {
        return {
            success: false,
            message: '参数验证失败',
            errors: validation.errors
        };
    }

    // 2. 生成订单号
    const orderId = generateOrderId();

    // 3. 构建订单对象
    const order = {
        orderId: orderId,
        memberId: orderData.memberId,
        productId: orderData.productId,
        productName: orderData.productName,
        parameters: orderData.parameters || {},
        amount: orderData.amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // 4. 保存订单到数据库
    // await database.saveOrder(order);

    // 5. 调用对接站API下单
    // const orderResult = await callSiteAPI(order);

    console.log(`订单创建成功: ${orderId}`);

    return {
        success: true,
        message: '订单创建成功',
        data: order
    };
}

/**
 * 生成订单号
 * @returns {string}
 */
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${timestamp}${random}`;
}

/**
 * 获取商品参数配置
 * @param {string} productId - 商品ID
 * @returns {Array}
 */
function getProductParameters(productId) {
    // 从数据库获取商品参数配置
    // const product = await database.getProduct(productId);
    // return product.parameters;

    // 临时返回示例数据
    return [
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
                { label: '20元', value: 20 },
                { label: '30元', value: 30 },
                { label: '50元', value: 50 },
                { label: '100元', value: 100 }
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
}

module.exports = {
    getPhoneLocation,
    validateOrderParameters,
    validateParameterRealtime,
    createOrder,
    generateOrderId,
    getProductParameters,
    parameterValidators,
    getCarrierByPrefix
};
