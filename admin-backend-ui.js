// ==================== 总后台管理系统 JavaScript ====================
// API基础URL
const API_BASE_URL = 'http://81.70.208.147:8899';

// 工具函数
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

function formatMoney(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 页面导航
function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(page);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // 页面加载时刷新数据
    if (page === 'dashboard') loadDashboard();
    else if (page === 'topup-audit') loadTopupApplications();
    else if (page === 'zilaidan') loadZilaidan();
    else if (page === 'supplier') loadSuppliers();
    else if (page === 'orders') loadAllOrders();
    else if (page === 'users') loadUsers();
}

// 绑定导航事件
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.getAttribute('data-page'));
    });
});

// ==================== 仪表盘 ====================
async function loadDashboard() {
    try {
        // 模拟数据（实际应该从API获取）
        document.getElementById('totalBalance').textContent = '¥0.00';
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('totalRevenue').textContent = '¥0.00';
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('totalSuppliers').textContent = '0';
        
        // 加载最近加款申请
        await loadRecentTopup();
    } catch (error) {
        console.error('加载仪表盘失败:', error);
    }
}

async function loadRecentTopup() {
    const tbody = document.getElementById('recentTopupTable');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted"><i class="bi bi-inbox"></i> 暂无申请</td></tr>';
}

// ==================== 加款审核 ====================
async function loadTopupApplications() {
    const tbody = document.getElementById('topupApplicationsTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted"><i class="bi bi-inbox"></i> 暂无申请</td></tr>';
}

// ==================== 自来单管理 ====================
async function loadZilaidan() {
    loadPlatformConfig();
    loadZilaidanOrders();
}

function loadPlatformConfig() {
    const container = document.getElementById('platformConfigContainer');
    container.innerHTML = `
        <div class="platform-card enabled">
            <div class="platform-name">蜜蜂汇云</div>
            <p class="text-muted small">作为供货商，接收订单</p>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary">配置</button>
                <button class="btn btn-sm btn-success">测试连接</button>
            </div>
        </div>
        <div class="platform-card disabled">
            <div class="platform-name">客客帮</div>
            <p class="text-muted small">作为供货商，接收订单</p>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary">配置</button>
                <button class="btn btn-sm btn-success">测试连接</button>
            </div>
        </div>
    `;
}

async function loadZilaidanOrders() {
    const tbody = document.getElementById('zilaidanOrdersTable');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted"><i class="bi bi-inbox"></i> 暂无订单</td></tr>';
}

async function refreshZilaidanOrders() {
    showToast('正在刷新...', 'info');
    await loadZilaidanOrders();
    showToast('刷新成功');
}

// ==================== 供货商管理 ====================
async function loadSuppliers() {
    const container = document.getElementById('suppliersContainer');
    container.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox"></i> 暂无供货商</div>';
}

// 添加供货商
document.getElementById('addSupplierForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showToast('添加供货商功能开发中...', 'info');
});

// ==================== 订单管理 ====================
async function loadAllOrders() {
    const tbody = document.getElementById('allOrdersTable');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted"><i class="bi bi-inbox"></i> 暂无订单</td></tr>';
}

// ==================== 用户管理 ====================
async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted"><i class="bi bi-inbox"></i> 暂无用户</td></tr>';
}

// ==================== 退出登录 ====================
function logout() {
    if (confirm('确定要退出登录吗？')) {
        window.location.href = '/login.html';
    }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // 绑定筛选和搜索事件
    document.getElementById('topupStatusFilter')?.addEventListener('change', loadTopupApplications);
    document.getElementById('zilaidanPlatformFilter')?.addEventListener('change', loadZilaidanOrders);
    document.getElementById('zilaidanStatusFilter')?.addEventListener('change', loadZilaidanOrders);
    document.getElementById('supplierSearch')?.addEventListener('input', debounce(loadSuppliers, 500));
    document.getElementById('orderSearch')?.addEventListener('input', debounce(loadAllOrders, 500));
    document.getElementById('orderStatusFilter')?.addEventListener('change', loadAllOrders);
    document.getElementById('userSearch')?.addEventListener('input', debounce(loadUsers, 500));
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
