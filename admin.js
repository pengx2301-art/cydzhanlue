/**
 * 充易达系统 总后台管理 v3.1.0
 * 统一管理所有功能
 */

const API_BASE = '/api';
let currentPage = 'dashboard';

// ==================== 页面导航 ====================

function showPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    document.getElementById(pageName).classList.add('active');
    
    // 更新菜单激活状态
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // 更新标题
    const titles = {
        'dashboard': '仪表盘',
        'users': '用户管理',
        'orders': '订单管理',
        'topup': '加款审核',
        'suppliers': '供货商管理',
        'products': '商品管理',
        'zilaidan': '自来单管理'
    };
    document.getElementById('pageTitle').textContent = titles[pageName];
    
    currentPage = pageName;
    
    // 加载页面数据
    loadPageData(pageName);
}

function loadPageData(pageName) {
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'topup':
            loadTopupApplications();
            break;
        case 'suppliers':
            loadSuppliers();
            break;
        case 'products':
            loadProducts();
            break;
        case 'zilaidan':
            loadZilaidanOrders();
            break;
    }
}

// ==================== 仪表盘 ====================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('totalBalance').textContent = (stats.totalBalance || 0).toFixed(2);
            document.getElementById('totalRevenue').textContent = (stats.totalRevenue || 0).toFixed(2);
            document.getElementById('totalSuppliers').textContent = stats.totalSuppliers || 0;
            document.getElementById('todayOrders').textContent = stats.todayOrders || 0;
            document.getElementById('todayRevenue').textContent = (stats.todayRevenue || 0).toFixed(2);
        }
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

// ==================== 用户管理 ====================

async function loadUsers() {
    try {
        const search = document.getElementById('userSearch').value;
        const url = search ? `${API_BASE}/admin/users?search=${search}` : `${API_BASE}/admin/users`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const users = data.data.list;
            const tbody = document.getElementById('userTableBody');
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.phone}</td>
                    <td>${user.username || '-'}</td>
                    <td>¥${user.balance.toFixed(2)}</td>
                    <td>¥${user.total_spent.toFixed(2)}</td>
                    <td>
                        <span class="status-badge ${user.status ? 'status-success' : 'status-failed'}">
                            ${user.status ? '启用' : '禁用'}
                        </span>
                    </td>
                    <td>${new Date(user.created_at).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-primary" onclick="editUser(${user.id})">编辑</button>
                        <button class="btn btn-danger" onclick="deleteUser(${user.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

async function addUser(event) {
    event.preventDefault();
    
    const user = {
        phone: document.getElementById('addUserPhone').value,
        username: document.getElementById('addUserName').value,
        password: document.getElementById('addUserPassword').value,
        balance: parseFloat(document.getElementById('addUserBalance').value) || 0
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(user)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('用户添加成功', 'success');
            closeModal('addUserModal');
            loadUsers();
        } else {
            showToast(data.message || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加用户失败:', error);
        showToast('网络错误', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('确定要删除该用户吗？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('用户删除成功', 'success');
            loadUsers();
        } else {
            showToast(data.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showToast('网络错误', 'error');
    }
}

// ==================== 订单管理 ====================

async function loadOrders() {
    try {
        const status = document.getElementById('orderStatusFilter').value;
        const search = document.getElementById('orderSearch').value;
        
        let url = `${API_BASE}/admin/orders`;
        const params = new URLSearchParams();
        
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const orders = data.data.list;
            const tbody = document.getElementById('orderTableBody');
            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td>${order.order_no}</td>
                    <td>${order.user_phone}</td>
                    <td>${order.product_name}</td>
                    <td>${order.account}</td>
                    <td>¥${order.total_amount.toFixed(2)}</td>
                    <td>
                        <span class="status-badge status-${order.status}">
                            ${getStatusText(order.status)}
                        </span>
                    </td>
                    <td>${new Date(order.created_at).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-primary" onclick="viewOrder(${order.id})">查看</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载订单列表失败:', error);
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待处理',
        'processing': '处理中',
        'success': '成功',
        'failed': '失败',
        'refunded': '已退款'
    };
    return statusMap[status] || status;
}

// ==================== 加款审核 ====================

async function loadTopupApplications() {
    try {
        const status = document.getElementById('topupStatusFilter').value;
        const url = status ? `${API_BASE}/admin/topup?status=${status}` : `${API_BASE}/admin/topup`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const apps = data.data.list;
            const tbody = document.getElementById('topupTableBody');
            tbody.innerHTML = apps.map(app => `
                <tr>
                    <td>${app.application_no}</td>
                    <td>${app.user_phone}</td>
                    <td>¥${app.amount.toFixed(2)}</td>
                    <td>${app.note || '-'}</td>
                    <td>
                        <span class="status-badge status-${app.status}">
                            ${getTopupStatusText(app.status)}
                        </span>
                    </td>
                    <td>${new Date(app.created_at).toLocaleString()}</td>
                    <td>
                        ${app.status === 'pending' ? `
                            <button class="btn btn-success" onclick="approveTopup(${app.id}, true)">通过</button>
                            <button class="btn btn-danger" onclick="approveTopup(${app.id}, false)">拒绝</button>
                        ` : '-'}
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载加款申请失败:', error);
    }
}

function getTopupStatusText(status) {
    const statusMap = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    return statusMap[status] || status;
}

async function approveTopup(appId, approved) {
    const note = approved ? '审核通过' : prompt('请输入拒绝原因:');
    if (!approved && !note) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/topup/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                status: approved ? 'approved' : 'rejected',
                note: note
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(approved ? '审核通过' : '审核拒绝', 'success');
            loadTopupApplications();
        } else {
            showToast(data.message || '审核失败', 'error');
        }
    } catch (error) {
        console.error('审核失败:', error);
        showToast('网络错误', 'error');
    }
}

// ==================== 供货商管理 ====================

async function loadSuppliers() {
    try {
        const response = await fetch(`${API_BASE}/admin/suppliers`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const suppliers = data.data;
            const tbody = document.getElementById('supplierTableBody');
            tbody.innerHTML = suppliers.map(supplier => `
                <tr>
                    <td>${supplier.id}</td>
                    <td>${supplier.name}</td>
                    <td>${supplier.type || '-'}</td>
                    <td>${supplier.api_url || '-'}</td>
                    <td>
                        <span class="status-badge ${supplier.test_status === 1 ? 'status-success' : supplier.test_status === 2 ? 'status-failed' : 'status-pending'}">
                            ${supplier.test_status === 1 ? '成功' : supplier.test_status === 2 ? '失败' : '未测试'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${supplier.status ? 'status-success' : 'status-failed'}">
                            ${supplier.status ? '启用' : '禁用'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-primary" onclick="testSupplier(${supplier.id})">测试</button>
                        <button class="btn btn-warning" onclick="editSupplier(${supplier.id})">编辑</button>
                        <button class="btn btn-danger" onclick="deleteSupplier(${supplier.id})">删除</button>
                    </td>
                </tr>
            `).join('');
            
            // 更新商品表单的供货商选项
            updateSupplierOptions(suppliers);
        }
    } catch (error) {
        console.error('加载供货商列表失败:', error);
    }
}

function updateSupplierOptions(suppliers) {
    const select = document.getElementById('addProductSupplier');
    select.innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function addSupplier(event) {
    event.preventDefault();
    
    const supplier = {
        name: document.getElementById('addSupplierName').value,
        type: document.getElementById('addSupplierType').value,
        api_url: document.getElementById('addSupplierApiUrl').value,
        api_key: document.getElementById('addSupplierApiKey').value,
        api_secret: document.getElementById('addSupplierApiSecret').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(supplier)
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

// ==================== 商品管理 ====================

async function loadProducts() {
    try {
        const category = document.getElementById('productCategoryFilter').value;
        const url = category ? `${API_BASE}/admin/products?category=${category}` : `${API_BASE}/admin/products`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const products = data.data;
            const tbody = document.getElementById('productTableBody');
            tbody.innerHTML = products.map(product => `
                <tr>
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.category || '-'}</td>
                    <td>${product.supplier_name || '-'}</td>
                    <td>¥${product.price.toFixed(2)}</td>
                    <td>¥${(product.cost_price || 0).toFixed(2)}</td>
                    <td>${product.stock === -1 ? '无限' : product.stock}</td>
                    <td>
                        <span class="status-badge ${product.status ? 'status-success' : 'status-failed'}">
                            ${product.status ? '上架' : '下架'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-primary" onclick="editProduct(${product.id})">编辑</button>
                        <button class="btn btn-danger" onclick="deleteProduct(${product.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
    }
}

async function addProduct(event) {
    event.preventDefault();
    
    const product = {
        name: document.getElementById('addProductName').value,
        category: document.getElementById('addProductCategory').value,
        supplier_id: parseInt(document.getElementById('addProductSupplier').value),
        price: parseFloat(document.getElementById('addProductPrice').value),
        cost_price: parseFloat(document.getElementById('addProductCostPrice').value) || null
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(product)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('商品添加成功', 'success');
            closeModal('addProductModal');
            loadProducts();
        } else {
            showToast(data.message || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加商品失败:', error);
        showToast('网络错误', 'error');
    }
}

// ==================== 自来单管理 ====================

async function loadZilaidanOrders() {
    try {
        const platform = document.getElementById('zilaidanPlatformFilter').value;
        const url = platform ? `${API_BASE}/admin/zilaidan?platform=${platform}` : `${API_BASE}/admin/zilaidan`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const orders = data.data;
            const tbody = document.getElementById('zilaidanTableBody');
            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td>${order.platform_order_id}</td>
                    <td>${order.platform}</td>
                    <td>${order.account}</td>
                    <td>¥${(order.amount || 0).toFixed(2)}</td>
                    <td>${order.status}</td>
                    <td>${new Date(order.created_at).toLocaleString()}</td>
                    <td>
                        ${!order.local_order_id ? `
                            <button class="btn btn-primary" onclick="processZilaidanOrder('${order.platform_order_id}')">处理</button>
                        ` : '-'}
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载自来单失败:', error);
    }
}

async function fetchZilaidanOrders() {
    try {
        const response = await fetch(`${API_BASE}/admin/zilaidan/fetch`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`成功拉取 ${data.count || 0} 条订单`, 'success');
            loadZilaidanOrders();
        } else {
            showToast(data.message || '拉取失败', 'error');
        }
    } catch (error) {
        console.error('拉取自来单失败:', error);
        showToast('网络错误', 'error');
    }
}

// ==================== 通用功能 ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminInfo');
        window.location.href = '/login.html';
    }
}

// ==================== 初始化 ====================

window.addEventListener('load', () => {
    // 检查登录状态
    const token = localStorage.getItem('adminToken');
    const adminInfo = localStorage.getItem('adminInfo');
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    // 显示管理员信息
    if (adminInfo) {
        const admin = JSON.parse(adminInfo);
        document.getElementById('adminName').textContent = admin.name || admin.username;
    }
    
    // 加载默认页面
    loadDashboard();
});

// 搜索框事件监听
document.getElementById('userSearch').addEventListener('input', debounce(loadUsers, 500));
document.getElementById('orderSearch').addEventListener('input', debounce(loadOrders, 500));
document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);
document.getElementById('topupStatusFilter').addEventListener('change', loadTopupApplications);
document.getElementById('productCategoryFilter').addEventListener('change', loadProducts);
document.getElementById('zilaidanPlatformFilter').addEventListener('change', loadZilaidanOrders);

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
