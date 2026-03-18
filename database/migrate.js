/**
 * 充易达系统 数据迁移工具 v3.1.0
 * 从JSON文件迁移到MySQL数据库
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'your_password', // 请修改为实际密码
    database: 'chongyida',
    charset: 'utf8mb4'
};

// JSON数据文件路径
const DATA_DIR = path.join(__dirname, '../data');

class DataMigrator {
    constructor(config) {
        this.config = config;
        this.connection = null;
        this.stats = {
            users: 0,
            orders: 0,
            suppliers: 0,
            products: 0,
            topupApps: 0,
            errors: 0
        };
    }

    // 连接数据库
    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            console.log('✓ 数据库连接成功');
            return true;
        } catch (error) {
            console.error('✗ 数据库连接失败:', error.message);
            return false;
        }
    }

    // 关闭数据库连接
    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log('✓ 数据库连接已关闭');
        }
    }

    // 读取JSON数据文件
    readJsonFile(filename) {
        const filepath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filepath)) {
            console.log(`  ⚠ 文件不存在: ${filename}`);
            return [];
        }
        try {
            const data = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`  ✗ 读取文件失败: ${filename}`, error.message);
            return [];
        }
    }

    // 迁移用户数据
    async migrateUsers() {
        console.log('\n=== 开始迁移用户数据 ===');
        const users = this.readJsonFile('users.json');

        if (users.length === 0) {
            console.log('  ⚠ 没有用户数据需要迁移');
            return;
        }

        for (const user of users) {
            try {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const sql = `
                    INSERT INTO users (phone, password, username, balance, total_spent, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        password = VALUES(password),
                        username = VALUES(username),
                        balance = VALUES(balance),
                        total_spent = VALUES(total_spent),
                        status = VALUES(status)
                `;
                
                await this.connection.execute(sql, [
                    user.phone,
                    hashedPassword,
                    user.username || null,
                    user.balance || 0,
                    user.total_spent || 0,
                    user.status !== undefined ? user.status : 1
                ]);

                this.stats.users++;
                console.log(`  ✓ 用户 ${user.phone} 迁移成功`);
            } catch (error) {
                this.stats.errors++;
                console.error(`  ✗ 用户 ${user.phone} 迁移失败:`, error.message);
            }
        }

        console.log(`✓ 用户迁移完成: ${this.stats.users} 条`);
    }

    // 迁移订单数据
    async migrateOrders() {
        console.log('\n=== 开始迁移订单数据 ===');
        const orders = this.readJsonFile('orders.json');

        if (orders.length === 0) {
            console.log('  ⚠ 没有订单数据需要迁移');
            return;
        }

        for (const order of orders) {
            try {
                // 查找或创建商品
                let productId = order.product_id;
                let supplierId = order.supplier_id || 1;

                if (!productId) {
                    // 如果没有商品ID，创建临时商品
                    const [result] = await this.connection.execute(
                        'SELECT id FROM products WHERE name = ?',
                        [order.product_name || '未知商品']
                    );
                    if (result.length === 0) {
                        const [insertResult] = await this.connection.execute(
                            'INSERT INTO products (supplier_id, name, price, status) VALUES (?, ?, ?, 1)',
                            [supplierId, order.product_name || '未知商品', order.amount || 0]
                        );
                        productId = insertResult.insertId;
                    } else {
                        productId = result[0].id;
                    }
                }

                // 查找用户ID
                const [user] = await this.connection.execute(
                    'SELECT id FROM users WHERE phone = ?',
                    [order.user_phone]
                );
                if (user.length === 0) {
                    console.error(`  ✗ 订单 ${order.order_no} 的用户不存在: ${order.user_phone}`);
                    this.stats.errors++;
                    continue;
                }

                const sql = `
                    INSERT INTO orders (order_no, user_id, product_id, supplier_id, account, quantity, total_amount, cost_amount, status, platform_order_id, error_message, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        error_message = VALUES(error_message)
                `;

                await this.connection.execute(sql, [
                    order.order_no,
                    user[0].id,
                    productId,
                    supplierId,
                    order.account,
                    order.quantity || 1,
                    order.total_amount,
                    order.cost_amount,
                    order.status || 'pending',
                    order.platform_order_id || null,
                    order.error_message || null,
                    order.created_at || new Date()
                ]);

                this.stats.orders++;
                console.log(`  ✓ 订单 ${order.order_no} 迁移成功`);
            } catch (error) {
                this.stats.errors++;
                console.error(`  ✗ 订单 ${order.order_no} 迁移失败:`, error.message);
            }
        }

        console.log(`✓ 订单迁移完成: ${this.stats.orders} 条`);
    }

    // 迁移供货商数据
    async migrateSuppliers() {
        console.log('\n=== 开始迁移供货商数据 ===');
        const suppliers = this.readJsonFile('suppliers.json');

        if (suppliers.length === 0) {
            console.log('  ⚠ 没有供货商数据需要迁移');
            return;
        }

        for (const supplier of suppliers) {
            try {
                const sql = `
                    INSERT INTO suppliers (name, type, api_url, api_key, api_secret, config, status, test_status, test_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        api_url = VALUES(api_url),
                        api_key = VALUES(api_key),
                        api_secret = VALUES(api_secret),
                        config = VALUES(config),
                        status = VALUES(status)
                `;

                await this.connection.execute(sql, [
                    supplier.name,
                    supplier.type,
                    supplier.api_url || null,
                    supplier.api_key || null,
                    supplier.api_secret || null,
                    supplier.config ? JSON.stringify(supplier.config) : null,
                    supplier.status !== undefined ? supplier.status : 1,
                    supplier.test_status || 0,
                    supplier.test_message || null
                ]);

                this.stats.suppliers++;
                console.log(`  ✓ 供货商 ${supplier.name} 迁移成功`);
            } catch (error) {
                this.stats.errors++;
                console.error(`  ✗ 供货商 ${supplier.name} 迁移失败:`, error.message);
            }
        }

        console.log(`✓ 供货商迁移完成: ${this.stats.suppliers} 条`);
    }

    // 迁移商品数据
    async migrateProducts() {
        console.log('\n=== 开始迁移商品数据 ===');
        const products = this.readJsonFile('products.json');

        if (products.length === 0) {
            console.log('  ⚠ 没有商品数据需要迁移');
            return;
        }

        for (const product of products) {
            try {
                const sql = `
                    INSERT INTO products (supplier_id, supplier_product_id, name, category, price, cost_price, stock, status, config)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        category = VALUES(category),
                        price = VALUES(price),
                        cost_price = VALUES(cost_price),
                        stock = VALUES(stock),
                        status = VALUES(status)
                `;

                await this.connection.execute(sql, [
                    product.supplier_id || 1,
                    product.supplier_product_id || null,
                    product.name,
                    product.category || null,
                    product.price,
                    product.cost_price || null,
                    product.stock !== undefined ? product.stock : -1,
                    product.status !== undefined ? product.status : 1,
                    product.config ? JSON.stringify(product.config) : null
                ]);

                this.stats.products++;
                console.log(`  ✓ 商品 ${product.name} 迁移成功`);
            } catch (error) {
                this.stats.errors++;
                console.error(`  ✗ 商品 ${product.name} 迁移失败:`, error.message);
            }
        }

        console.log(`✓ 商品迁移完成: ${this.stats.products} 条`);
    }

    // 迁移加款申请数据
    async migrateTopupApplications() {
        console.log('\n=== 开始迁移加款申请数据 ===');
        const apps = this.readJsonFile('topup_applications.json');

        if (apps.length === 0) {
            console.log('  ⚠ 没有加款申请数据需要迁移');
            return;
        }

        for (const app of apps) {
            try {
                // 查找用户ID
                const [user] = await this.connection.execute(
                    'SELECT id FROM users WHERE phone = ?',
                    [app.user_phone]
                );
                if (user.length === 0) {
                    console.error(`  ✗ 加款申请 ${app.application_no} 的用户不存在: ${app.user_phone}`);
                    this.stats.errors++;
                    continue;
                }

                const sql = `
                    INSERT INTO topup_applications (application_no, user_id, amount, status, note, admin_note, approved_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        admin_note = VALUES(admin_note),
                        approved_at = VALUES(approved_at)
                `;

                await this.connection.execute(sql, [
                    app.application_no,
                    user[0].id,
                    app.amount,
                    app.status || 'pending',
                    app.note || null,
                    app.admin_note || null,
                    app.approved_at || null,
                    app.created_at || new Date()
                ]);

                this.stats.topupApps++;
                console.log(`  ✓ 加款申请 ${app.application_no} 迁移成功`);
            } catch (error) {
                this.stats.errors++;
                console.error(`  ✗ 加款申请 ${app.application_no} 迁移失败:`, error.message);
            }
        }

        console.log(`✓ 加款申请迁移完成: ${this.stats.topupApps} 条`);
    }

    // 显示迁移统计
    showStats() {
        console.log('\n' + '='.repeat(50));
        console.log('迁移统计');
        console.log('='.repeat(50));
        console.log(`  用户:      ${this.stats.users} 条`);
        console.log(`  订单:      ${this.stats.orders} 条`);
        console.log(`  供货商:    ${this.stats.suppliers} 条`);
        console.log(`  商品:      ${this.stats.products} 条`);
        console.log(`  加款申请:  ${this.stats.topupApps} 条`);
        console.log(`  错误:      ${this.stats.errors} 条`);
        console.log('='.repeat(50));
    }

    // 执行迁移
    async migrate() {
        console.log('开始数据迁移...');
        console.log('='.repeat(50));

        const connected = await this.connect();
        if (!connected) {
            console.error('无法连接到数据库，迁移终止');
            return false;
        }

        try {
            await this.migrateSuppliers();
            await this.migrateProducts();
            await this.migrateUsers();
            await this.migrateOrders();
            await this.migrateTopupApplications();

            this.showStats();
            return true;
        } catch (error) {
            console.error('迁移过程中发生错误:', error);
            return false;
        } finally {
            await this.close();
        }
    }
}

// 主函数
async function main() {
    const migrator = new DataMigrator(dbConfig);
    const success = await migrator.migrate();
    
    if (success) {
        console.log('\n✓ 数据迁移完成！');
        process.exit(0);
    } else {
        console.log('\n✗ 数据迁移失败！');
        process.exit(1);
    }
}

// 如果直接运行此脚本，执行迁移
if (require.main === module) {
    main();
}

module.exports = DataMigrator;
