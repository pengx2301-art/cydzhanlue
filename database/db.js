/**
 * 充易达系统 数据库访问层 v3.1.0
 * MySQL数据库操作封装
 */

const mysql = require('mysql2/promise');

// 数据库配置
const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'chongyida',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(config);

/**
 * 数据库类
 */
class Database {
    /**
     * 执行查询
     */
    async query(sql, params = []) {
        try {
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('数据库查询错误:', error);
            throw error;
        }
    }

    /**
     * 执行插入
     */
    async insert(sql, params = []) {
        try {
            const [result] = await pool.execute(sql, params);
            return result.insertId;
        } catch (error) {
            console.error('数据库插入错误:', error);
            throw error;
        }
    }

    /**
     * 执行更新
     */
    async update(sql, params = []) {
        try {
            const [result] = await pool.execute(sql, params);
            return result.affectedRows;
        } catch (error) {
            console.error('数据库更新错误:', error);
            throw error;
        }
    }

    /**
     * 执行删除
     */
    async delete(sql, params = []) {
        try {
            const [result] = await pool.execute(sql, params);
            return result.affectedRows;
        } catch (error) {
            console.error('数据库删除错误:', error);
            throw error;
        }
    }

    /**
     * 开始事务
     */
    async beginTransaction() {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        return conn;
    }

    /**
     * 提交事务
     */
    async commitTransaction(conn) {
        try {
            await conn.commit();
        } finally {
            conn.release();
        }
    }

    /**
     * 回滚事务
     */
    async rollbackTransaction(conn) {
        try {
            await conn.rollback();
        } finally {
            conn.release();
        }
    }

    // ==================== 用户操作 ====================

    /**
     * 通过手机号查找用户
     */
    async getUserByPhone(phone) {
        const sql = 'SELECT * FROM users WHERE phone = ? AND status = 1';
        const users = await this.query(sql, [phone]);
        return users.length > 0 ? users[0] : null;
    }

    /**
     * 通过ID查找用户
     */
    async getUserById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const users = await this.query(sql, [id]);
        return users.length > 0 ? users[0] : null;
    }

    /**
     * 创建用户
     */
    async createUser(user) {
        const sql = `
            INSERT INTO users (phone, password, username, balance, total_spent, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.insert(sql, [
            user.phone,
            user.password,
            user.username || null,
            user.balance || 0,
            user.total_spent || 0,
            user.status !== undefined ? user.status : 1,
            user.created_by || null
        ]);
    }

    /**
     * 更新用户余额
     */
    async updateUserBalance(userId, amount, conn = null) {
        const sql = 'UPDATE users SET balance = balance + ?, total_spent = total_spent + ABS(?) WHERE id = ?';
        if (conn) {
            const [result] = await conn.execute(sql, [amount, amount, userId]);
            return result.affectedRows;
        }
        return await this.update(sql, [amount, amount, userId]);
    }

    /**
     * 获取用户列表
     */
    async getUserList(page = 1, pageSize = 20, filters = {}) {
        const offset = (page - 1) * pageSize;
        let where = 'WHERE 1=1';
        const params = [];

        if (filters.phone) {
            where += ' AND phone LIKE ?';
            params.push(`%${filters.phone}%`);
        }
        if (filters.status !== undefined) {
            where += ' AND status = ?';
            params.push(filters.status);
        }

        const countSql = `SELECT COUNT(*) as total FROM users ${where}`;
        const listSql = `
            SELECT id, phone, username, balance, total_spent, status, created_at
            FROM users ${where}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [total] = await this.query(countSql, params);
        const list = await this.query(listSql, [...params, pageSize, offset]);

        return {
            list,
            total: total.total,
            page,
            pageSize,
            totalPages: Math.ceil(total.total / pageSize)
        };
    }

    // ==================== 管理员操作 ====================

    /**
     * 通过用户名查找管理员
     */
    async getAdminByUsername(username) {
        const sql = 'SELECT * FROM admins WHERE username = ? AND status = 1';
        const admins = await this.query(sql, [username]);
        return admins.length > 0 ? admins[0] : null;
    }

    /**
     * 更新管理员最后登录时间
     */
    async updateAdminLastLogin(adminId) {
        const sql = 'UPDATE admins SET last_login_at = NOW() WHERE id = ?';
        return await this.update(sql, [adminId]);
    }

    // ==================== 商品操作 ====================

    /**
     * 获取商品列表
     */
    async getProducts(filters = {}) {
        let where = 'WHERE p.status = 1';
        const params = [];

        if (filters.supplier_id) {
            where += ' AND p.supplier_id = ?';
            params.push(filters.supplier_id);
        }
        if (filters.category) {
            where += ' AND p.category = ?';
            params.push(filters.category);
        }
        if (filters.keyword) {
            where += ' AND p.name LIKE ?';
            params.push(`%${filters.keyword}%`);
        }

        const sql = `
            SELECT p.*, s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            ${where}
            ORDER BY p.created_at DESC
        `;

        return await this.query(sql, params);
    }

    /**
     * 通过ID获取商品
     */
    async getProductById(id) {
        const sql = `
            SELECT p.*, s.name as supplier_name, s.type as supplier_type, s.api_url, s.api_key, s.api_secret
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?
        `;
        const products = await this.query(sql, [id]);
        return products.length > 0 ? products[0] : null;
    }

    /**
     * 创建商品
     */
    async createProduct(product) {
        const sql = `
            INSERT INTO products (supplier_id, name, category, price, cost_price, stock, status, config)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.insert(sql, [
            product.supplier_id,
            product.name,
            product.category || null,
            product.price,
            product.cost_price || null,
            product.stock !== undefined ? product.stock : -1,
            product.status !== undefined ? product.status : 1,
            product.config ? JSON.stringify(product.config) : null
        ]);
    }

    // ==================== 订单操作 ====================

    /**
     * 创建订单
     */
    async createOrder(order) {
        const sql = `
            INSERT INTO orders (order_no, user_id, product_id, supplier_id, account, quantity, total_amount, cost_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.insert(sql, [
            order.order_no,
            order.user_id,
            order.product_id,
            order.supplier_id,
            order.account,
            order.quantity || 1,
            order.total_amount,
            order.cost_amount,
            order.status || 'pending'
        ]);
    }

    /**
     * 更新订单状态
     */
    async updateOrderStatus(orderId, status, data = {}) {
        const updates = ['status = ?', 'updated_at = NOW()'];
        const params = [status];

        if (data.platform_order_id) {
            updates.push('platform_order_id = ?');
            params.push(data.platform_order_id);
        }
        if (data.platform_status) {
            updates.push('platform_status = ?');
            params.push(data.platform_status);
        }
        if (data.error_message) {
            updates.push('error_message = ?');
            params.push(data.error_message);
        }
        if (status === 'success' || status === 'failed') {
            updates.push('completed_at = NOW()');
        }

        params.push(orderId);
        const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;
        return await this.update(sql, params);
    }

    /**
     * 获取订单列表
     */
    async getOrders(filters = {}, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;
        let where = 'WHERE 1=1';
        const params = [];

        if (filters.user_id) {
            where += ' AND o.user_id = ?';
            params.push(filters.user_id);
        }
        if (filters.supplier_id) {
            where += ' AND o.supplier_id = ?';
            params.push(filters.supplier_id);
        }
        if (filters.status) {
            where += ' AND o.status = ?';
            params.push(filters.status);
        }
        if (filters.keyword) {
            where += ' AND o.order_no LIKE ?';
            params.push(`%${filters.keyword}%`);
        }

        const countSql = `SELECT COUNT(*) as total FROM orders o ${where}`;
        const listSql = `
            SELECT o.*, u.phone as user_phone, p.name as product_name, s.name as supplier_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN suppliers s ON o.supplier_id = s.id
            ${where}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [total] = await this.query(countSql, params);
        const list = await this.query(listSql, [...params, pageSize, offset]);

        return {
            list,
            total: total.total,
            page,
            pageSize,
            totalPages: Math.ceil(total.total / pageSize)
        };
    }

    // ==================== 加款申请操作 ====================

    /**
     * 创建加款申请
     */
    async createTopupApplication(app) {
        const sql = `
            INSERT INTO topup_applications (application_no, user_id, amount, note)
            VALUES (?, ?, ?, ?)
        `;
        return await this.insert(sql, [
            app.application_no,
            app.user_id,
            app.amount,
            app.note || null
        ]);
    }

    /**
     * 审核加款申请
     */
    async approveTopupApplication(appId, adminId, status, note) {
        const conn = await this.beginTransaction();
        try {
            // 更新申请状态
            const updateSql = `
                UPDATE topup_applications
                SET status = ?, admin_id = ?, admin_note = ?, approved_at = NOW()
                WHERE id = ? AND status = 'pending'
            `;
            const affected = await conn.execute(updateSql, [status, adminId, note || null, appId]);

            if (affected[0].affectedRows === 0) {
                await conn.rollback();
                return false;
            }

            // 如果通过，更新用户余额
            if (status === 'approved') {
                const [app] = await conn.execute('SELECT user_id, amount FROM topup_applications WHERE id = ?', [appId]);
                await conn.execute(
                    'UPDATE users SET balance = balance + ? WHERE id = ?',
                    [app[0].amount, app[0].user_id]
                );
            }

            await this.commitTransaction(conn);
            return true;
        } catch (error) {
            await this.rollbackTransaction(conn);
            throw error;
        }
    }

    /**
     * 获取加款申请列表
     */
    async getTopupApplications(filters = {}, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;
        let where = 'WHERE 1=1';
        const params = [];

        if (filters.user_id) {
            where += ' AND t.user_id = ?';
            params.push(filters.user_id);
        }
        if (filters.status) {
            where += ' AND t.status = ?';
            params.push(filters.status);
        }

        const countSql = `SELECT COUNT(*) as total FROM topup_applications t ${where}`;
        const listSql = `
            SELECT t.*, u.phone as user_phone, a.username as admin_username
            FROM topup_applications t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN admins a ON t.admin_id = a.id
            ${where}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [total] = await this.query(countSql, params);
        const list = await this.query(listSql, [...params, pageSize, offset]);

        return {
            list,
            total: total.total,
            page,
            pageSize,
            totalPages: Math.ceil(total.total / pageSize)
        };
    }

    // ==================== 供货商操作 ====================

    /**
     * 获取供货商列表
     */
    async getSuppliers(filters = {}) {
        let where = 'WHERE 1=1';
        const params = [];

        if (filters.type) {
            where += ' AND type = ?';
            params.push(filters.type);
        }
        if (filters.status !== undefined) {
            where += ' AND status = ?';
            params.push(filters.status);
        }

        const sql = `
            SELECT id, name, type, api_url, status, test_status, test_message, created_at
            FROM suppliers ${where}
            ORDER BY created_at DESC
        `;

        return await this.query(sql, params);
    }

    /**
     * 通过ID获取供货商
     */
    async getSupplierById(id) {
        const sql = 'SELECT * FROM suppliers WHERE id = ?';
        const suppliers = await this.query(sql, [id]);
        return suppliers.length > 0 ? suppliers[0] : null;
    }

    /**
     * 创建供货商
     */
    async createSupplier(supplier) {
        const sql = `
            INSERT INTO suppliers (name, type, api_url, api_key, api_secret, config, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await this.insert(sql, [
            supplier.name,
            supplier.type || null,
            supplier.api_url || null,
            supplier.api_key || null,
            supplier.api_secret || null,
            supplier.config ? JSON.stringify(supplier.config) : null,
            supplier.status !== undefined ? supplier.status : 1
        ]);
    }

    /**
     * 更新供货商
     */
    async updateSupplier(id, data) {
        const updates = [];
        const params = [];

        if (data.name) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.type) {
            updates.push('type = ?');
            params.push(data.type);
        }
        if (data.api_url) {
            updates.push('api_url = ?');
            params.push(data.api_url);
        }
        if (data.api_key) {
            updates.push('api_key = ?');
            params.push(data.api_key);
        }
        if (data.api_secret) {
            updates.push('api_secret = ?');
            params.push(data.api_secret);
        }
        if (data.config) {
            updates.push('config = ?');
            params.push(JSON.stringify(data.config));
        }
        if (data.status !== undefined) {
            updates.push('status = ?');
            params.push(data.status);
        }

        if (updates.length === 0) return 0;

        updates.push('updated_at = NOW()');
        params.push(id);

        const sql = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`;
        return await this.update(sql, params);
    }

    /**
     * 删除供货商
     */
    async deleteSupplier(id) {
        const sql = 'DELETE FROM suppliers WHERE id = ?';
        return await this.delete(sql, [id]);
    }

    // ==================== 统计操作 ====================

    /**
     * 获取仪表盘统计数据
     */
    async getDashboardStats() {
        const stats = {};

        // 总用户数
        const [userCount] = await this.query('SELECT COUNT(*) as count FROM users WHERE status = 1');
        stats.totalUsers = userCount.count;

        // 总订单数
        const [orderCount] = await this.query('SELECT COUNT(*) as count FROM orders');
        stats.totalOrders = orderCount.count;

        // 总余额
        const [totalBalance] = await this.query('SELECT SUM(balance) as total FROM users WHERE status = 1');
        stats.totalBalance = totalBalance.total || 0;

        // 总营收
        const [totalRevenue] = await this.query('SELECT SUM(cost_amount) as total FROM orders WHERE status = "success"');
        stats.totalRevenue = totalRevenue.total || 0;

        // 供货商数
        const [supplierCount] = await this.query('SELECT COUNT(*) as count FROM suppliers WHERE status = 1');
        stats.totalSuppliers = supplierCount.count;

        // 今日订单数
        const [todayOrders] = await this.query('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()');
        stats.todayOrders = todayOrders.count;

        // 今日营收
        const [todayRevenue] = await this.query('SELECT SUM(cost_amount) as total FROM orders WHERE status = "success" AND DATE(created_at) = CURDATE()');
        stats.todayRevenue = todayRevenue.total || 0;

        return stats;
    }

    /**
     * 获取用户仪表盘数据
     */
    async getUserDashboard(userId) {
        // 用户信息
        const user = await this.getUserById(userId);

        // 订单统计
        const [orderStats] = await this.query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM orders WHERE user_id = ?
        `, [userId]);

        // 最近订单
        const recentOrders = await this.query(`
            SELECT o.*, p.name as product_name
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
            LIMIT 10
        `, [userId]);

        return {
            user,
            orderStats: orderStats,
            recentOrders
        };
    }

    /**
     * 关闭连接池
     */
    async close() {
        await pool.end();
    }
}

// 导出单例
const db = new Database();
module.exports = db;
