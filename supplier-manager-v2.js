/**
 * 供货商管理器 - 统一管理所有供货商对接
 */

const MifenghuiyunSupplier = require('./mifenghuiyun-supplier');
const KasushouSupplier = require('./kasushou-supplier');
const KayixinSupplier = require('./kayixin-supplier');

class SupplierManager {
    constructor() {
        this.suppliers = new Map();
        this.supplierTypes = {
            'mifenghuiyun': MifenghuiyunSupplier,
            'kasushou': KasushouSupplier,
            'kayixin': KayixinSupplier
        };
    }

    /**
     * 添加供货商
     * @param {string} id - 供货商ID
     * @param {string} type - 供货商类型
     * @param {Object} config - 配置信息
     */
    addSupplier(id, type, config) {
        const SupplierClass = this.supplierTypes[type];
        if (!SupplierClass) {
            throw new Error(`不支持的供货商类型: ${type}`);
        }

        const supplier = new SupplierClass(config);
        this.suppliers.set(id, supplier);
        console.log(`[供货商管理器] 添加供货商: ${id} (${type})`);
    }

    /**
     * 获取供货商
     * @param {string} id - 供货商ID
     * @returns {Object} 供货商实例
     */
    getSupplier(id) {
        const supplier = this.suppliers.get(id);
        if (!supplier) {
            throw new Error(`供货商不存在: ${id}`);
        }
        return supplier;
    }

    /**
     * 移除供货商
     * @param {string} id - 供货商ID
     */
    removeSupplier(id) {
        this.suppliers.delete(id);
        console.log(`[供货商管理器] 移除供货商: ${id}`);
    }

    /**
     * 获取所有供货商ID
     * @returns {Array} 供货商ID列表
     */
    getAllSupplierIds() {
        return Array.from(this.suppliers.keys());
    }

    /**
     * 从数据库加载供货商配置
     */
    async loadSuppliersFromDB() {
        try {
            const suppliers = await db.getAllSuppliers();
            for (const supplier of suppliers) {
                const config = JSON.parse(supplier.api_config || '{}');
                this.addSupplier(supplier.id, supplier.supplier_type, config);
            }
            console.log(`[供货商管理器] 从数据库加载了 ${suppliers.length} 个供货商`);
        } catch (error) {
            console.error('[供货商管理器] 加载供货商配置失败:', error);
        }
    }

    /**
     * 测试所有供货商连接
     */
    async testAllSuppliers() {
        const results = {};
        const supplierIds = this.getAllSupplierIds();

        for (const id of supplierIds) {
            try {
                const supplier = this.getSupplier(id);
                const result = await supplier.testConnection();
                results[id] = result;
            } catch (error) {
                results[id] = {
                    success: false,
                    message: error.message
                };
            }
        }

        return results;
    }
}

// 创建全局实例
const supplierManager = new SupplierManager();

module.exports = supplierManager;
