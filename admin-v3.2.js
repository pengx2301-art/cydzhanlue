/**
 * 充易达管理系统 - v3.2.0
 * 总后台JavaScript逻辑 - 支持新供货商
 */

const API_BASE = '/api';
let currentPage = 'dashboard';

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupNavigation();
    setupEventListeners();
});

// ==================== 登录检查 ====================

function checkLoginStatus() {
    const token = localStorage.getItem('adminToken');
    if (!token && currentPage !== 'login') {
        window.location.href = '/admin/login.html';
    }
}

// ==================== 导航设置 ====================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // 更新导航状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });

    // 显示对应页面
    document.querySelectorAll('.page').forEach(p => {
        p.style.display = 'none';
    });
    document.getElementById(`${page}-page`).style.display = 'block';

    currentPage = page;

    // 加载页面数据
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'suppliers':
            loadSuppliers();
            break;
        case 'products':
            loadProducts();
            break;
        case 'topups':
            loadTopups();
            break;
        case 'zilaidan':
            loadZilaidan();
            break;
    }
}

// ==================== 事件监听 ====================

function setupEventListeners() {
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // 导出按钮
    const exportButtons = document.querySelectorAll('.export-btn');
    exportButtons.forEach(btn => {
        btn.addEventListener('click', handleExport);
    });
}

// ==================== 仪表盘 ====================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.data);
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

function updateDashboardStats(stats) {
    const cards = {
        'totalUsers': stats.total_users || 0,
        'totalOrders': stats.total_orders || 0,
        'totalBalance': stats.total_balance || 0,
        'todayOrders': stats.today_orders || 0,
        'todayRevenue': stats.today_revenue || 0,
        'totalSuppliers': stats.total_suppliers || 0,
        'pendingTopups': stats.pending_topups || 0
    };

    Object.entries(cards).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatNumber(value);
        }
    });
}

// ==================== 供货商管理（v3.2.0 更新）====================

async function loadSuppliers() {
    try {
        const response = await fetch(`${API_BASE}/admin/suppliers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderSuppliersTable(data.data);
        }
    } catch (error) {
        console.error('加载供货商列表失败:', error);
        showToast('加载失败', 'error');
    }
}

function renderSuppliersTable(suppliers) {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">暂无供货商</td></tr>';
        return;
    }

    const supplierTypeMap = {
        'mifenghuiyun': '蜜蜂汇云',
        'kasushou': '卡速售',
        'kayixin': '卡易信'
    };

    suppliers.forEach(supplier => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${supplier.id}</td>
            <td>${supplier.name}</td>
            <td><span class="badge badge-${supplier.supplier_type}">${supplierTypeMap[supplier.supplier_type] || supplier.supplier_type}</span></td>
            <td>${supplier.status === 1 ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-danger">禁用</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="testSupplier(${supplier.id})">测试</button>
                <button class="btn btn-sm btn-info" onclick="editSupplier(${supplier.id})">编辑</button>
                <button class="btn btn-sm btn-warning" onclick="syncProducts(${supplier.id})">同步商品</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})">删除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 显示添加供货商模态框
function showAddSupplierModal() {
    const modal = document.getElementById('addSupplierModal');
    if (!modal) return;

    // 清空表单
    document.getElementById('addSupplierName').value = '';
    document.getElementById('addSupplierType').value = 'mifenghuiyun';
    document.getElementById('addSupplierApiUrl').value = '';
    document.getElementById('addSupplierAppId').value = '';
    document.getElementById('addSupplierApiKey').value = '';

    modal.style.display = 'block';
}

// 添加供货商（v3.2.0 更新）
async function addSupplier() {
    const name = document.getElementById('addSupplierName').value;
    const supplier_type = document.getElementById('addSupplierType').value;
    
    let api_config = {};
    
    // 根据供货商类型获取不同的配置
    switch(supplier_type) {
        case 'kasushou':
            api_config = {
                apiUrl: document.getElementById('addSupplierApiUrl').value,
                appId: document.getElementById('addSupplierAppId').value,
                apiKey: document.getElementById('addSupplierApiKey').value
            };
            break;
        case 'kayixin':
            api_config = {
                apiUrl: document.getElementById('addSupplierApiUrl').value,
                username: document.getElementById('addSupplierUsername').value,
                apiKey: document.getElementById('addSupplierApiKey').value
            };
            break;
        case 'mifenghuiyun':
        default:
            api_config = {
                api_url: document.getElementById('addSupplierApiUrl').value,
                api_key: document.getElementById('addSupplierApiKey').value,
                api_secret: document.getElementById('addSupplierApiSecret').value
            };
            break;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                name,
                supplier_type,
                api_config,
                status: 1
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('供货商添加成功', 'success');
            closeModal('addSupplierModal');
            loadSuppliers();
        } else {
            showToast(data.message || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加供货商失败:', error);
        showToast('网络错误', 'error');
    }
}

// 测试供货商连接（v3.2.0 新增）
async function testSupplier(supplierId) {
    try {
        showToast('正在测试连接...', 'info');
        
        const response = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/test`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('连接测试成功', 'success');
        } else {
            showToast(data.message || '连接测试失败', 'error');
        }
    } catch (error) {
        console.error('测试供货商连接失败:', error);
        showToast('网络错误', 'error');
    }
}

// 同步供货商商品（v3.2.0 新增）
async function syncProducts(supplierId) {
    try {
        showToast('正在同步商品...', 'info');
        
        const response = await fetch(`${API_BASE}/admin/suppliers/${supplierId}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                page: 1,
                limit: 100
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`成功获取 ${data.data.length} 个商品`, 'success');
            // 可以选择显示商品列表或直接导入到数据库
        } else {
            showToast(data.message || '同步商品失败', 'error');
        }
    } catch (error) {
        console.error('同步商品失败:', error);
        showToast('网络错误', 'error');
    }
}

// 删除供货商
async function deleteSupplier(supplierId) {
    if (!confirm('确定要删除该供货商吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/suppliers/${supplierId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('供货商删除成功', 'success');
            loadSuppliers();
        } else {
            showToast(data.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除供货商失败:', error);
        showToast('网络错误', 'error');
    }
}

// 供货商类型变化时显示对应的配置项（v3.2.0 新增）
function handleSupplierTypeChange() {
    const type = document.getElementById('addSupplierType').value;
    const configContainer = document.getElementById('supplierConfigContainer');
    
    let configHTML = '';
    
    switch(type) {
        case 'kasushou':
            configHTML = `
                <div class="form-group">
                    <label>API地址</label>
                    <input type="text" id="addSupplierApiUrl" placeholder="https://api.kasushou.com">
                </div>
                <div class="form-group">
                    <label>App ID</label>
                    <input type="text" id="addSupplierAppId" placeholder="App ID">
                </div>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="addSupplierApiKey" placeholder="API Key">
                </div>
            `;
            break;
        case 'kayixin':
            configHTML = `
                <div class="form-group">
                    <label>API地址</label>
                    <input type="text" id="addSupplierApiUrl" placeholder="http://api.kayixin.com">
                </div>
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" id="addSupplierUsername" placeholder="用户名">
                </div>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="addSupplierApiKey" placeholder="API Key">
                </div>
            `;
            break;
        case 'mifenghuiyun':
        default:
            configHTML = `
                <div class="form-group">
                    <label>API地址</label>
                    <input type="text" id="addSupplierApiUrl" placeholder="http://api.mifenghuiyun.com">
                </div>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="addSupplierApiKey" placeholder="API Key">
                </div>
                <div class="form-group">
                    <label>API Secret</label>
                    <input type="password" id="addSupplierApiSecret" placeholder="API Secret">
                </div>
            `;
            break;
    }
    
    configContainer.innerHTML = configHTML;
}

// ==================== 用户管理 ====================

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderUsersTable(data.data);
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">暂无用户</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.id}</td>
            <td>${user.phone}</td>
            <td>${user.name || '-'}</td>
            <td>¥${parseFloat(user.balance || 0).toFixed(2)}</td>
            <td>${user.status === 1 ? '<span class="badge badge-success">正常</span>' : '<span class="badge badge-danger">禁用</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">删除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== 订单管理 ====================

async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/admin/orders`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderOrdersTable(data.data);
        }
    } catch (error) {
        console.error('加载订单列表失败:', error);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">暂无订单</td></tr>';
        return;
    }

    const statusMap = {
        'pending': '待处理',
        'processing': '处理中',
        'completed': '已完成',
        'failed': '失败',
        'refunded': '已退款'
    };

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order.id}</td>
            <td>${order.order_no}</td>
            <td>${order.product_name || '-'}</td>
            <td>¥${parseFloat(order.amount || 0).toFixed(2)}</td>
            <td><span class="badge badge-${order.status}">${statusMap[order.status] || order.status}</span></td>
            <td>${formatDate(order.created_at)}</td>
            <td>${order.user_phone || '-'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewOrder(${order.id})">查看</button>
                <button class="btn btn-sm btn-warning" onclick="refundOrder(${order.id})">退款</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== 工具函数 ====================

function formatNumber(num) {
    if (typeof num !== 'number') return num;
    return num.toLocaleString('zh-CN');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearch(e) {
    const keyword = e.target.value;
    console.log('搜索:', keyword);
    // 实现搜索逻辑
}

function handleExport(e) {
    console.log('导出数据');
    // 实现导出逻辑
}

// ==================== 其他页面 ====================

function loadProducts() {
    console.log('加载商品列表');
}

function loadTopups() {
    console.log('加载加款申请');
}

function loadZilaidan() {
    console.log('加载自来单配置');
}
