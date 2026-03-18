/**
 * 用户后台模块 - v3.0.0
 * 提供用户独立的后台系统
 */

class UserBackend {
    constructor(db) {
        this.db = db;
        this.userSession = new Map(); // 用户会话管理
    }

    /**
     * 用户登录
     */
    async login(username, password) {
        // 实现用户登录逻辑
        return {
            success: true,
            token: 'user_token_' + Date.now(),
            userInfo: {
                id: 1,
                username: username,
                balance: 1000,
                role: 'user'
            }
        };
    }

    /**
     * 获取用户仪表盘数据
     */
    async getDashboard(userId) {
        const totalOrders = await this.db.countOrders(userId);
        const totalSpent = await this.db.getTotalSpent(userId);
        const balance = await this.db.getBalance(userId);
        const todayOrders = await this.db.getTodayOrders(userId);

        return {
            totalOrders: totalOrders,
            totalSpent: totalSpent,
            balance: balance,
            todayOrders: todayOrders,
            recentOrders: await this.db.getRecentOrders(userId, 10)
        };
    }

    /**
     * 获取可用商品列表
     */
    async getAvailableProducts(filters = {}) {
        // 从上架商品中筛选
        return this.db.getProducts({
            status: 'listed',
            ...filters
        });
    }

    /**
     * 单个商品下单
     */
    async createSingleOrder(userId, orderData) {
        const { productId, quantity, customParams } = orderData;

        // 验证商品
        const product = await this.db.getProduct(productId);
        if (!product || product.status !== 'listed') {
            return { success: false, message: '商品不存在或已下架' };
        }

        // 验证库存
        if (product.stock < quantity) {
            return { success: false, message: '库存不足' };
        }

        // 计算价格
        const totalPrice = product.price * quantity;

        // 验证余额
        const balance = await this.db.getBalance(userId);
        if (balance < totalPrice) {
            return { success: false, message: '余额不足' };
        }

        // 创建订单
        const order = {
            id: 'ORD' + Date.now(),
            userId: userId,
            productId: productId,
            productName: product.name,
            quantity: quantity,
            totalPrice: totalPrice,
            status: 'pending',
            customParams: customParams || {},
            createdAt: new Date()
        };

        await this.db.createOrder(order);

        // 扣除余额
        await this.db.deductBalance(userId, totalPrice);

        // 扣减库存
        await this.db.deductStock(productId, quantity);

        return {
            success: true,
            order: order,
            message: '订单创建成功'
        };
    }

    /**
     * 批量下单
     */
    async createBulkOrders(userId, orders) {
        const results = [];
        let totalAmount = 0;

        // 验证所有订单
        for (const orderData of orders) {
            const product = await this.db.getProduct(orderData.productId);
            if (!product || product.status !== 'listed') {
                results.push({
                    success: false,
                    productId: orderData.productId,
                    message: '商品不存在或已下架'
                });
                continue;
            }

            if (product.stock < orderData.quantity) {
                results.push({
                    success: false,
                    productId: orderData.productId,
                    message: '库存不足'
                });
                continue;
            }

            totalAmount += product.price * orderData.quantity;
        }

        // 验证总余额
        const balance = await this.db.getBalance(userId);
        if (balance < totalAmount) {
            return {
                success: false,
                message: '总余额不足',
                required: totalAmount,
                available: balance
            };
        }

        // 创建所有订单
        for (const orderData of orders) {
            const result = await this.createSingleOrder(userId, orderData);
            results.push(result);
        }

        return {
            success: true,
            results: results,
            message: `成功创建 ${results.filter(r => r.success).length} 个订单`
        };
    }

    /**
     * 申请加款
     */
    async applyTopup(userId, amount, proof, remark) {
        const application = {
            id: 'TOPUP' + Date.now(),
            userId: userId,
            amount: amount,
            proof: proof,
            remark: remark,
            status: 'pending', // pending, approved, rejected
            createdAt: new Date()
        };

        await this.db.createTopupApplication(application);

        return {
            success: true,
            application: application,
            message: '加款申请已提交，等待审核'
        };
    }

    /**
     * 获取用户的加款申请记录
     */
    async getTopupApplications(userId, status = null) {
        return this.db.getTopupApplications(userId, status);
    }

    /**
     * 获取用户订单列表
     */
    async getUserOrders(userId, filters = {}) {
        return this.db.getUserOrders(userId, filters);
    }

    /**
     * 获取订单详情
     */
    async getOrderDetail(orderId, userId) {
        const order = await this.db.getOrder(orderId);
        
        // 验证订单归属
        if (order.userId !== userId) {
            throw new Error('无权访问该订单');
        }

        return order;
    }
}

module.exports = UserBackend;
