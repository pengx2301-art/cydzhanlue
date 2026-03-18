#!/bin/bash
#
# 充易达系统 - 云服务器自动部署脚本
# Cloud Server Auto-Deployment Script
#
# 使用方式：
#   chmod +x deploy-to-cloud.sh
#   ./deploy-to-cloud.sh
#

set -e  # 遇到错误立即退出

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     🚀 充易达系统 - 云服务器自动部署脚本              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════
# 配置变量 (Configuration)
# ═══════════════════════════════════════════════════════════════

SERVER_IP="81.70.208.147"
SERVER_USER="ubuntu"
SERVER_PASSWORD="Aa462300"
SSH_KEY_FILE=""
SERVER_ROOT="/app"
PROJECT_NAME="cyd-admin"

# ═══════════════════════════════════════════════════════════════
# 颜色定义 (Colors)
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════
# 辅助函数 (Helper Functions)
# ═══════════════════════════════════════════════════════════════

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ═══════════════════════════════════════════════════════════════
# 检查本地环境 (Check Local Environment)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 1/10: 检查本地环境..."

if ! command -v ssh &> /dev/null; then
    print_error "SSH 未安装，请先安装 OpenSSH"
    exit 1
fi

if ! command -v sshpass &> /dev/null; then
    print_warning "sshpass 未安装，将使用密码登录"
fi

print_success "本地环境检查完成"

# ═══════════════════════════════════════════════════════════════
# 测试服务器连接 (Test Server Connection)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 2/10: 测试服务器连接..."

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
        ${SERVER_USER}@${SERVER_IP} "echo 'Connection successful'" > /dev/null 2>&1
else
    echo "$SERVER_PASSWORD" | ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
        ${SERVER_USER}@${SERVER_IP} "echo 'Connection successful'" > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    print_success "服务器连接成功"
else
    print_error "服务器连接失败，请检查 IP 和密码"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# 检查服务器系统 (Check Server System)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 3/10: 检查服务器系统..."

if command -v sshpass &> /dev/null; then
    SERVER_OS=$(sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "cat /etc/os-release | grep '^ID=' | cut -d'=' -f2 | tr -d '\"'")
else
    SERVER_OS=$(echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "cat /etc/os-release | grep '^ID=' | cut -d'=' -f2 | tr -d '\"'")
fi

print_success "服务器系统: $SERVER_OS"

if [ "$SERVER_OS" != "ubuntu" ]; then
    print_warning "检测到非 Ubuntu 系统，部分命令可能需要调整"
fi

# ═══════════════════════════════════════════════════════════════
# 更新系统包 (Update System Packages)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 4/10: 更新系统包..."

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "sudo apt update && sudo apt upgrade -y" > /dev/null 2>&1
else
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "sudo apt update && sudo apt upgrade -y" > /dev/null 2>&1
fi

print_success "系统包更新完成"

# ═══════════════════════════════════════════════════════════════
# 安装 Node.js (Install Node.js)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 5/10: 安装 Node.js v20.x (LTS)..."

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "bash -s" << 'ENDSSH'
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        node --version
        npm --version
ENDSSH
else
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "bash -s" << 'ENDSSH'
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        node --version
        npm --version
ENDSSH
fi

print_success "Node.js 安装完成"

# ═══════════════════════════════════════════════════════════════
# 安装 PM2 (Install PM2)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 6/10: 安装 PM2..."

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "sudo npm install -g pm2"
else
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "sudo npm install -g pm2"
fi

print_success "PM2 安装完成"

# ═══════════════════════════════════════════════════════════════
# 创建项目目录 (Create Project Directory)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 7/10: 创建项目目录..."

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "sudo mkdir -p ${SERVER_ROOT} && sudo chown ${SERVER_USER}:${SERVER_USER} ${SERVER_ROOT}"
else
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "sudo mkdir -p ${SERVER_ROOT} && sudo chown ${SERVER_USER}:${SERVER_USER} ${SERVER_ROOT}"
fi

print_success "项目目录创建完成: ${SERVER_ROOT}"

# ═══════════════════════════════════════════════════════════════
# 上传代码和数据库 (Upload Code and Database)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 8/10: 上传代码和数据库..."

# 创建临时压缩包
LOCAL_PROJECT_PATH="WorkBuddy/20260317184320/WorkBuddy/20260315203305"
TEMP_ZIP="cyd-temp.zip"

if [ -d "$LOCAL_PROJECT_PATH" ]; then
    cd "$LOCAL_PROJECT_PATH"
    zip -r "../../$TEMP_ZIP" server.js cyd.json package.json backup-database.js backup-scheduler.js generate-api-docs.js -q
    cd ../..
    
    if command -v sshpass &> /dev/null; then
        sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$TEMP_ZIP" ${SERVER_USER}@${SERVER_IP}:${SERVER_ROOT}/
    else
        echo "$SERVER_PASSWORD" | scp -o StrictHostKeyChecking=no "$TEMP_ZIP" ${SERVER_USER}@${SERVER_IP}:${SERVER_ROOT}/
    fi
    
    # 解压文件
    if command -v sshpass &> /dev/null; then
        sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_ROOT} && unzip -o $TEMP_ZIP && rm $TEMP_ZIP"
    else
        echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_ROOT} && unzip -o $TEMP_ZIP && rm $TEMP_ZIP"
    fi
    
    # 清理临时文件
    rm "$TEMP_ZIP"
    
    print_success "代码和数据库上传完成"
else
    print_error "本地项目目录不存在: $LOCAL_PROJECT_PATH"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# 安装项目依赖 (Install Dependencies)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 9/10: 安装项目依赖..."

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_ROOT} && npm install"
else
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_ROOT} && npm install"
fi

print_success "项目依赖安装完成"

# ═══════════════════════════════════════════════════════════════
# 启动 PM2 服务 (Start PM2 Service)
# ═══════════════════════════════════════════════════════════════

print_info "步骤 10/10: 启动 PM2 服务..."

# 创建 PM2 配置文件
PM2_CONFIG=$(cat <<'EOF'
module.exports = {
  apps: [{
    name: 'cyd-admin',
    script: './server.js',
    cwd: '/app',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1536',
    env: {
      NODE_ENV: 'production',
      PORT: 8899
    },
    error_file: '/var/log/cyd-admin-error.log',
    out_file: '/var/log/cyd-admin-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
)

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "echo '$PM2_CONFIG' > ${SERVER_ROOT}/ecosystem.config.js"
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 start ${SERVER_ROOT}/ecosystem.config.js"
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 save"
    sshpass -p "$SERVER_PASSWORD" ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 startup ubuntu -u ${SERVER_USER} --hp /home/${SERVER_USER}"
else
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "echo '$PM2_CONFIG' > ${SERVER_ROOT}/ecosystem.config.js"
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 start ${SERVER_ROOT}/ecosystem.config.js"
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 save"
    echo "$SERVER_PASSWORD" | ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 startup ubuntu -u ${SERVER_USER} --hp /home/${SERVER_USER}"
fi

print_success "PM2 服务启动完成"

# ═══════════════════════════════════════════════════════════════
# 测试访问 (Test Access)
# ═══════════════════════════════════════════════════════════════

print_info "测试服务器访问..."

sleep 3

HEALTH_CHECK=$(curl -s "http://${SERVER_IP}:8899/api/health" 2>&1 || echo "failed")

if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    print_success "服务运行正常！"
else
    print_warning "服务可能还在启动中，请稍后手动访问测试"
fi

# ═══════════════════════════════════════════════════════════════
# 部署完成 (Deployment Complete)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║     ✅ 部署完成！                                  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📍 服务器信息："
echo "   IP 地址: http://${SERVER_IP}"
echo "   API 端口: 8899"
echo "   健康检查: http://${SERVER_IP}:8899/api/health"
echo "   版本信息: http://${SERVER_IP}:8899/api/version"
echo ""
echo "🔧 管理命令："
echo "   查看状态: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 list'"
echo "   查看日志: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 logs'"
echo "   重启服务: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 restart cyd-admin'"
echo "   停止服务: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 stop cyd-admin'"
echo ""
echo "✨ 现在可以通过公网 IP 访问充易达系统了！"
echo ""
