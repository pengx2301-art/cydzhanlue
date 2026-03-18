/**
 * 供货商管理模块 - v3.0.0
 * 优化版：支持接口配置和界面优化
 */

class SupplierManager {
    constructor(db) {
        this.db = db;
    }

    /**
     * 获取所有供货商
     */
    async getAllSuppliers() {
        return this.db.getSuppliers();
    }

    /**
     * 添加供货商（包含接口配置）
     */
    async addSupplier(supplierData) {
        const {
            name,
            type,
            apiConfig,
            enabled = true
        } = supplierData;

        // 验证接口配置
        if (!apiConfig || !apiConfig.baseUrl || !apiConfig.apiKey) {
            return { success: false, message: '接口配置不完整' };
        }

        // 验证接口可用性
        const isAvailable = await this.testApiConnection(apiConfig);
        
        if (!isAvailable) {
            return { success: false, message: '接口连接测试失败，请检查配置' };
        }

        const supplier = {
            id: 'SUP' + Date.now(),
            name: name,
            type: type, // 'product', 'service', 'both'
            apiConfig: apiConfig,
            enabled: enabled,
            available: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await this.db.createSupplier(supplier);

        return {
            success: true,
            supplier: supplier,
            message: '供货商添加成功'
        };
    }

    /**
     * 更新供货商
     */
    async updateSupplier(supplierId, updateData) {
        const supplier = await this.db.getSupplier(supplierId);
        
        if (!supplier) {
            return { success: false, message: '供货商不存在' };
        }

        // 如果更新了接口配置，重新测试连接
        if (updateData.apiConfig) {
            const isAvailable = await this.testApiConnection(updateData.apiConfig);
            if (!isAvailable) {
                return { success: false, message: '接口连接测试失败' };
            }
            updateData.available = true;
        }

        await this.db.updateSupplier(supplierId, {
            ...updateData,
            updatedAt: new Date()
        });

        return {
            success: true,
            message: '供货商更新成功'
        };
    }

    /**
     * 删除供货商
     */
    async deleteSupplier(supplierId) {
        const supplier = await this.db.getSupplier(supplierId);
        
        if (!supplier) {
            return { success: false, message: '供货商不存在' };
        }

        // 检查是否有关联商品
        const products = await this.db.getProductsBySupplier(supplierId);
        if (products.length > 0) {
            return { 
                success: false, 
                message: `无法删除，该供货商下有 ${products.length} 个商品` 
            };
        }

        await this.db.deleteSupplier(supplierId);

        return {
            success: true,
            message: '供货商删除成功'
        };
    }

    /**
     * 启用/禁用供货商
     */
    async toggleSupplier(supplierId, enabled) {
        await this.db.updateSupplier(supplierId, {
            enabled: enabled,
            updatedAt: new Date()
        });

        return {
            success: true,
            message: enabled ? '供货商已启用' : '供货商已禁用'
        };
    }

    /**
     * 测试接口连接
     */
    async testApiConnection(apiConfig) {
        const { baseUrl, apiKey, endpoint } = apiConfig;

        try {
            // 发送测试请求
            const response = await fetch(
                `${baseUrl}${endpoint || '/api/health'}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );

            return response.ok;
        } catch (error) {
            console.error('API连接测试失败:', error);
            return false;
        }
    }

    /**
     * 刷新供货商状态
     */
    async refreshSupplierStatus(supplierId) {
        const supplier = await this.db.getSupplier(supplierId);
        
        if (!supplier) {
            return { success: false, message: '供货商不存在' };
        }

        const isAvailable = await this.testApiConnection(supplier.apiConfig);

        await this.db.updateSupplier(supplierId, {
            available: isAvailable,
            lastCheckTime: new Date(),
            updatedAt: new Date()
        });

        return {
            success: true,
            available: isAvailable,
            message: isAvailable ? '接口正常' : '接口异常'
        };
    }

    /**
     * 批量刷新所有供货商状态
     */
    async refreshAllSuppliersStatus() {
        const suppliers = await this.getAllSuppliers();
        const results = [];

        for (const supplier of suppliers) {
            const result = await this.refreshSupplierStatus(supplier.id);
            results.push({
                supplierId: supplier.id,
                name: supplier.name,
                ...result
            });
        }

        return {
            success: true,
            results: results,
            message: `刷新完成，正常 ${results.filter(r => r.available).length}/${results.length} 个`
        };
    }

    /**
     * 获取供货商统计信息
     */
    async getSupplierStats(supplierId) {
        const supplier = await this.db.getSupplier(supplierId);
        
        if (!supplier) {
            return { success: false, message: '供货商不存在' };
        }

        const products = await this.db.getProductsBySupplier(supplierId);
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.status === 'listed').length;
        
        const orders = await this.db.getOrdersBySupplier(supplierId);
        const totalOrders = orders.length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;

        return {
            success: true,
            stats: {
                supplierId: supplier.id,
                name: supplier.name,
                totalProducts: totalProducts,
                activeProducts: activeProducts,
                totalOrders: totalOrders,
                completedOrders: completedOrders,
                available: supplier.available,
                lastCheckTime: supplier.lastCheckTime
            }
        };
    }

    /**
     * 搜索供货商
     */
    async searchSuppliers(keyword) {
        const suppliers = await this.getAllSuppliers();
        
        return suppliers.filter(supplier => 
            supplier.name.toLowerCase().includes(keyword.toLowerCase()) ||
            supplier.type.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    /**
     * 获取可用的供货商（用于商品对接）
     */
    async getAvailableSuppliers() {
        const suppliers = await this.getAllSuppliers();
        
        return suppliers.filter(supplier => 
            supplier.enabled && supplier.available
        );
    }
}

module.exports = SupplierManager;
