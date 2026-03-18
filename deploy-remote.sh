#!/bin/bash
# 充易达系统v2.0 一键部署脚本
# 在云服务器上运行此脚本即可完成部署

set -e  # 遇到错误立即退出

echo "========================================"
echo "  充易达系统v2.0 一键部署脚本"
echo "========================================"
echo ""

# 配置
APP_DIR="/app"
REPO_URL="git@github.com:pengx2301-art/cydzhanlue.git"
TEMP_DIR="$APP_DIR/temp_deploy"
BACKUP_DIR="$APP_DIR/backup_$(date +%Y%m%d_%H%M%S)"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}请不要使用root用户运行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤1: 备份现有文件...${NC}"
# 备份现有文件
mkdir -p "$BACKUP_DIR" 2>/dev/null || true
for file in api-server.js product-connection.js order-module.js package.json; do
    if [ -f "$APP_DIR/$file" ]; then
        cp "$APP_DIR/$file" "$BACKUP_DIR/" 2>/dev/null || true
        echo "  ✓ 已备份 $file"
    fi
done
echo -e "${GREEN}  备份完成${NC}"
echo ""

echo -e "${YELLOW}步骤2: 安装系统依赖...${NC}"
sudo apt update
sudo apt install -y git curl
echo -e "${GREEN}  依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}步骤3: 检查Node.js环境...${NC}"
if ! command -v node &> /dev/null; then
    echo "  Node.js未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "  ✓ Node.js已安装: $(node -v)"
fi

if ! command -v npm &> /dev/null; then
    echo "  npm未安装，正在安装..."
    sudo apt install -y npm
else
    echo "  ✓ npm已安装: $(npm -v)"
fi

if ! command -v pm2 &> /dev/null; then
    echo "  PM2未安装，正在安装..."
    sudo npm install -g pm2
else
    echo "  ✓ PM2已安装: $(pm2 -v)"
fi
echo -e "${GREEN}  环境检查完成${NC}"
echo ""

echo -e "${YELLOW}步骤4: 克隆最新代码...${NC}"
# 清理临时目录
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

cd "$TEMP_DIR"
git clone "$REPO_URL" .

echo -e "${GREEN}  代码克隆完成${NC}"
echo ""

echo -e "${YELLOW}步骤5: 复制新文件...${NC}"
cd "$APP_DIR"

# 复制新文件
cp "$TEMP_DIR/api-server.js" .
cp "$TEMP_DIR/product-connection.js" .
cp "$TEMP_DIR/order-module.js" .
cp "$TEMP_DIR/package.json" .
cp "$TEMP_DIR/product-connection.html" .
cp "$TEMP_DIR/order-page.html" .

echo -e "${GREEN}  文件复制完成${NC}"
echo ""

# 清理临时目录
rm -rf "$TEMP_DIR"

echo -e "${YELLOW}步骤6: 安装项目依赖...${NC}"
npm install
echo -e "${GREEN}  依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}步骤7: 停止旧服务...${NC}"
if pm2 describe cyd-admin &> /dev/null; then
    pm2 stop cyd-admin
    pm2 delete cyd-admin
    echo "  ✓ 旧服务已停止"
fi
echo ""

echo -e "${YELLOW}步骤8: 启动新服务...${NC}"
pm2 start api-server.js --name cyd-admin
pm2 save
echo -e "${GREEN}  服务启动完成${NC}"
echo ""

echo -e "${YELLOW}步骤9: 配置防火墙...${NC}"
sudo ufw allow 8899/tcp 2>/dev/null || echo "  防火墙配置跳过（可能已配置或未启用）"
echo ""

echo "========================================"
echo -e "${GREEN}  部署完成！${NC}"
echo "========================================"
echo ""
echo "服务状态："
pm2 status
echo ""
echo "访问地址："
echo -e "  ${GREEN}商品管理: http://$(curl -s ifconfig.me):8899/product-connection.html${NC}"
echo -e "  ${GREEN}快速下单: http://$(curl -s ifconfig.me):8899/order-page.html${NC}"
echo ""
echo "查看日志："
echo "  pm2 logs cyd-admin"
echo ""
echo "重启服务："
echo "  pm2 restart cyd-admin"
echo ""
echo "备份位置：$BACKUP_DIR"
echo ""
echo -e "${GREEN}恭喜！充易达系统v2.0已成功部署！${NC}"
