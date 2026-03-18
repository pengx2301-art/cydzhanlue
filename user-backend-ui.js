// ==================== 全局变量 ====================
let currentUser = null;
let currentBalance = 0;
let selectedProducts = [];
let authToken = localStorage.getItem('authToken');

// ==================== API配置 ====================
const API_BASE_URL = 'http://81.70.208.147:8899';

// ==================== 工具函数 ====================
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.msg || '请求失败');
        }
        
        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        showToast(error.message, 'danger');
        throw error;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMoney(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}

// ==================== 页面导航 ====================
function navigateTo(page) {
    // 更新侧边栏状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    // 切换页面
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(page);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // 页面加载时刷新数据
    if (page === 'dashboard') {
        loadDashboard();
    } else if (page === 'products') {
        loadProducts();
    } else if (page === 'orders') {
        loadOrders();
    } else if (page === 'topup') {
        loadTopupRecords();
    }
}

// 绑定导航点击事件
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        navigateTo(page);
    });
});

// ==================== 仪表盘功能 ====================
async function loadDashboard() {
    try {
        const data = await apiRequest('/api/user/dashboard');
        
        if (data.code === 200) {
            const dashboard = data.data;
            
            // 更新统计数据
            document.getElementById('dashboardBalance').textContent = formatMoney(dashboard.balance);
            document.getElementById('dashboardOrders').textContent = dashboard.totalOrders;
            document.getElementById('dashboardExpense').textContent = formatMoney(dashboard.totalExpense);
            document.getElementById('dashboardSuccess').textContent = dashboard.successOrders;
            
            // 更新顶部余额显示
            document.getElementById('balance').textContent = formatMoney(dashboard.balance);
            currentBalance = dashboard.balance;
            
            // 加载最近订单
            await loadRecentOrders(dashboard.recentOrders);
        }
    } catch (error) {
        console.error('加载仪表盘失败:', error);
    }
}

async function loadRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> 暂无订单
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.productName}</td>
            <td>${order.account}</td>
            <td>${formatMoney(order.amount)}</td>
            <td><span class="badge ${getStatusBadgeClass(order.status)}">${getStatusText(order.status)}</span></td>
            <td>${formatDate(order.createdAt)}</td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'badge-warning',
        'processing': 'badge-info',
        'success': 'badge-success',
        'failed': 'badge-danger'
    };
    return classes[status] || 'badge-info';
}

function getStatusText(status) {
    const texts = {
        'pending': '待处理',
        'processing': '处理中',
        'success': '成功',
        'failed': '失败'
    };
    return texts[status] || status;
}

// ==================== 商品管理功能 ====================
async function loadProducts() {
    try {
        const data = await apiRequest('/api/user/products');
        
        if (data.code === 200) {
            displayProducts(data.data.products);
        }
    } catch (error) {
        console.error('加载商品失败:', error);
        document.getElementById('productsContainer').innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <p class="mt-3 text-muted">加载商品失败，请刷新重试</p>
                <button class="btn btn-primary" onclick="loadProducts()">
                    <i class="bi bi-arrow-clockwise"></i> 刷新
                </button>
            </div>
        `;
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsContainer');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                <p class="mt-3 text-muted">暂无商品</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="col-md-4">
            <div class="product-card" onclick="selectProduct('${product.id}')">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="product-name">${product.name}</div>
                    <span class="badge ${product.enabled ? 'badge-success' : 'badge-warning'}">
                        ${product.enabled ? '已上架' : '已下架'}
                    </span>
                </div>
                <div class="product-price">${formatMoney(product.price)}</div>
                <div class="text-muted small mb-2">供货商: ${product.supplier}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">销量: ${product.salesCount || 0}</small>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openOrderModal('${product.id}')">
                        <i class="bi bi-cart"></i> 下单
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function selectProduct(productId) {
    const card = event.currentTarget;
    card.classList.toggle('selected');
    
    if (card.classList.contains('selected')) {
        selectedProducts.push(productId);
    } else {
        selectedProducts = selectedProducts.filter(id => id !== productId);
    }
    
    showToast(`已选择 ${selectedProducts.length} 个商品`);
}

async function refreshProducts() {
    await loadProducts();
    showToast('商品列表已刷新');
}

// ==================== 订单管理功能 ====================
async function loadOrders(page = 1) {
    try {
        const search = document.getElementById('orderSearch')?.value || '';
        const status = document.getElementById('orderStatusFilter')?.value || '';
        
        const data = await apiRequest(`/api/user/orders?page=${page}&search=${search}&status=${status}`);
        
        if (data.code === 200) {
            displayOrders(data.data.orders);
        }
    } catch (error) {
        console.error('加载订单失败:', error);
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> 暂无订单
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.productName}</td>
            <td>${order.account}</td>
            <td>${formatMoney(order.amount)}</td>
            <td><span class="badge ${getStatusBadgeClass(order.status)}">${getStatusText(order.status)}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="viewOrderDetails('${order.orderId}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewOrderDetails(orderId) {
    try {
        const data = await apiRequest(`/api/user/order/${orderId}`);
        
        if (data.code === 200) {
            const order = data.data.order;
            alert(`
订单详情
---------
订单号: ${order.orderId}
商品名称: ${order.productName}
充值账号: ${order.account}
订单金额: ${formatMoney(order.amount)}
订单状态: ${getStatusText(order.status)}
创建时间: ${formatDate(order.createdAt)}
${order.completedAt ? `完成时间: ${formatDate(order.completedAt)}` : ''}
备注: ${order.note || '无'}
            `);
        }
    } catch (error) {
        console.error('获取订单详情失败:', error);
    }
}

// ==================== 加款申请功能 ====================
async function loadTopupRecords() {
    try {
        const data = await apiRequest('/api/user/topup/applications');
        
        if (data.code === 200) {
            displayTopupRecords(data.data.applications);
        }
    } catch (error) {
        console.error('加载加款记录失败:', error);
    }
}

function displayTopupRecords(applications) {
    const tbody = document.getElementById('topupRecordsTable');
    
    if (!applications || applications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> 暂无记录
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = applications.map(app => `
        <tr>
            <td>${formatDate(app.createdAt)}</td>
            <td>${formatMoney(app.amount)}</td>
            <td>${getPaymentMethodText(app.method)}</td>
            <td><span class="badge ${getTopupStatusBadgeClass(app.status)}">${getTopupStatusText(app.status)}</span></td>
        </tr>
    `).join('');
}

function getPaymentMethodText(method) {
    const methods = {
        'alipay': '支付宝',
        'wechat': '微信支付',
        'bank': '银行转账'
    };
    return methods[method] || method;
}

function getTopupStatusBadgeClass(status) {
    const classes = {
        'pending': 'badge-warning',
        'approved': 'badge-success',
        'rejected': 'badge-danger'
    };
    return classes[status] || 'badge-info';
}

function getTopupStatusText(status) {
    const texts = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    return texts[status] || status;
}

// 提交加款申请
document.getElementById('topupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('topupAmount').value);
    const method = document.getElementById('topupMethod').value;
    const note = document.getElementById('topupNote').value;
    
    try {
        const data = await apiRequest('/api/user/topup/apply', {
            method: 'POST',
            body: JSON.stringify({ amount, method, note })
        });
        
        if (data.code === 200) {
            showToast('加款申请提交成功！', 'success');
            document.getElementById('topupForm').reset();
            await loadTopupRecords();
        }
    } catch (error) {
        console.error('提交加款申请失败:', error);
    }
});

// ==================== 下单功能 ====================
let orderModal;
let selectedProduct = null;

async function openOrderModal(productId) {
    try {
        const data = await apiRequest('/api/user/products');
        
        if (data.code === 200) {
            const product = data.data.products.find(p => p.id === productId);
            if (!product) {
                showToast('商品不存在', 'danger');
                return;
            }
            
            selectedProduct = product;
            
            // 填充商品选择
            const select = document.getElementById('orderProduct');
            select.innerHTML = data.data.products.map(p => `
                <option value="${p.id}" ${p.id === productId ? 'selected' : ''}>
                    ${p.name} - ${formatMoney(p.price)}
                </option>
            `).join('');
            
            // 更新订单金额
            updateOrderTotal();
            
            // 显示模态框
            orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
            orderModal.show();
        }
    } catch (error) {
        console.error('打开下单模态框失败:', error);
    }
}

// 商品选择改变时更新价格
document.getElementById('orderProduct')?.addEventListener('change', async (e) => {
    const productId = e.target.value;
    
    try {
        const data = await apiRequest('/api/user/products');
        
        if (data.code === 200) {
            selectedProduct = data.data.products.find(p => p.id === productId);
            updateOrderTotal();
        }
    } catch (error) {
        console.error('获取商品信息失败:', error);
    }
});

function updateOrderTotal() {
    if (selectedProduct) {
        document.getElementById('orderTotal').textContent = formatMoney(selectedProduct.price);
    }
}

async function submitOrder() {
    const productId = document.getElementById('orderProduct').value;
    const account = document.getElementById('orderAccount').value.trim();
    
    if (!productId || !account) {
        showToast('请填写完整信息', 'warning');
        return;
    }
    
    try {
        const data = await apiRequest('/api/user/order/single', {
            method: 'POST',
            body: JSON.stringify({
                productId,
                account,
                params: {}
            })
        });
        
        if (data.code === 200) {
            showToast('订单提交成功！', 'success');
            orderModal.hide();
            
            // 清空表单
            document.getElementById('orderAccount').value = '';
            
            // 刷新数据
            await loadDashboard();
            await loadOrders();
        }
    } catch (error) {
        console.error('提交订单失败:', error);
    }
}

// ==================== 退出登录 ====================
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    if (!authToken) {
        // 跳转到登录页面
        alert('请先登录');
        window.location.href = '/login.html';
        return;
    }
    
    // 加载用户信息
    const userInfo = localStorage.getItem('currentUser');
    if (userInfo) {
        currentUser = JSON.parse(userInfo);
        document.getElementById('username').textContent = currentUser.username;
    }
    
    // 加载仪表盘数据
    loadDashboard();
    
    // 搜索和筛选事件
    document.getElementById('orderSearch')?.addEventListener('input', debounce(() => {
        loadOrders();
    }, 500));
    
    document.getElementById('orderStatusFilter')?.addEventListener('change', () => {
        loadOrders();
    });
});

// 防抖函数
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

// ==================== 批量下单功能 ====================
function openBulkOrderModal() {
    if (selectedProducts.length === 0) {
        showToast('请先选择商品', 'warning');
        return;
    }
    
    // TODO: 实现批量下单模态框
    showToast('批量下单功能开发中...', 'info');
}

async function submitBulkOrder() {
    const accounts = []; // 从表单获取多个账号
    
    try {
        const data = await apiRequest('/api/user/order/bulk', {
            method: 'POST',
            body: JSON.stringify({
                productId: selectedProducts[0], // 暂时使用第一个商品
                accounts
            })
        });
        
        if (data.code === 200) {
            showToast('批量订单提交成功！', 'success');
            selectedProducts = [];
            await loadDashboard();
            await loadOrders();
        }
    } catch (error) {
        console.error('提交批量订单失败:', error);
    }
}
