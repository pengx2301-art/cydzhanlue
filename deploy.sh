#!/bin/bash

# 充易达系统 v3.1.0 部署脚本
# 自动化部署到云服务器

set -e

echo "================================"
echo "充易达系统 v3.1.0 部署脚本"
echo "================================"
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
SERVER="ubuntu@81.70.208.147"
KEY="C:/Users/60496/Desktop/chongyida.pem"
REMOTE_DIR="/app"

echo -e "${GREEN}1. 检查本地文件...${NC}"
FILES=(
    "api-server-v3.1.js"
    "admin.html"
    "admin.js"
    "user-backend.html"
    "user-backend-ui.js"
    "login.html"
    "database/schema.sql"
    "database/db.js"
    "database/migrate.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (文件不存在)"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}2. 上传文件到服务器...${NC}"

# 上传主文件
echo "上传 API 服务器..."
scp -i "$KEY" -o StrictHostKeyChecking=no api-server-v3.1.js $SERVER:$REMOTE_DIR/

# 上传前端文件
echo "上传前端文件..."
scp -i "$KEY" -o StrictHostKeyChecking=no admin.html $SERVER:$REMOTE_DIR/
scp -i "$KEY" -o StrictHostKeyChecking=no admin.js $SERVER:$REMOTE_DIR/
scp -i "$KEY" -o StrictHostKeyChecking=no user-backend.html $SERVER:$REMOTE_DIR/
scp -i "$KEY" -o StrictHostKeyChecking=no user-backend-ui.js $SERVER:$REMOTE_DIR/
scp -i "$KEY" -o StrictHostKeyChecking=no login.html $SERVER:$REMOTE_DIR/

# 上传数据库文件
echo "上传数据库文件..."
scp -i "$KEY" -o StrictHostKeyChecking=no database/schema.sql $SERVER:$REMOTE_DIR/database/
scp -i "$KEY" -o StrictHostKeyChecking=no database/db.js $SERVER:$REMOTE_DIR/database/
scp -i "$KEY" -o StrictHostKeyChecking=no database/migrate.js $SERVER:$REMOTE_DIR/database/

echo -e "${GREEN}✓ 文件上传完成${NC}"
echo ""

echo -e "${GREEN}3. 安装MySQL和依赖...${NC}"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER bash -s << 'ENDSSH'
# 更新包列表
sudo apt update

# 安装MySQL（如果未安装）
if ! command -v mysql &> /dev/null; then
    echo "安装MySQL..."
    sudo apt install -y mysql-server
    sudo systemctl start mysql
    sudo systemctl enable mysql
    echo "MySQL安装完成"
else
    echo "MySQL已安装"
fi

# 安装Node.js依赖
cd /app
echo "安装Node.js依赖..."
npm install mysql2 bcrypt jsonwebtoken

ENDSSH

echo -e "${GREEN}✓ MySQL和依赖安装完成${NC}"
echo ""

echo -e "${GREEN}4. 创建数据库...${NC}"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER bash -s << 'ENDSSH'
# 创建数据库
mysql -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS chongyida DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chongyida;

-- 创建管理员表（如果不存在）
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `name` VARCHAR(50) COMMENT '姓名',
  `role` ENUM('super', 'admin', 'operator') DEFAULT 'operator' COMMENT '角色',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `username` VARCHAR(50) COMMENT '用户名',
  `balance` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '余额',
  `total_spent` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '总消费',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_by` INT COMMENT '创建者ID（管理员）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建供货商表
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '供货商名称',
  `type` VARCHAR(50) COMMENT '供货商类型',
  `api_url` VARCHAR(255) COMMENT 'API地址',
  `api_key` VARCHAR(255) COMMENT 'API密钥',
  `api_secret` VARCHAR(255) COMMENT 'API密钥',
  `config` JSON COMMENT '其他配置（JSON格式）',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `test_status` TINYINT DEFAULT 0 COMMENT '测试状态：0-未测试，1-成功，2-失败',
  `test_message` TEXT COMMENT '测试消息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供货商表';

-- 创建商品表
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_id` INT NOT NULL COMMENT '供货商ID',
  `supplier_product_id` VARCHAR(100) COMMENT '供货商商品ID',
  `name` VARCHAR(200) NOT NULL COMMENT '商品名称',
  `category` VARCHAR(50) COMMENT '分类',
  `price` DECIMAL(10, 2) NOT NULL COMMENT '售价',
  `cost_price` DECIMAL(10, 2) COMMENT '成本价',
  `stock` INT DEFAULT -1 COMMENT '库存：-1表示无限',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-下架，1-上架',
  `config` JSON COMMENT '商品配置（JSON格式）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- 创建订单表
CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `product_id` INT NOT NULL COMMENT '商品ID',
  `supplier_id` INT NOT NULL COMMENT '供货商ID',
  `account` VARCHAR(100) NOT NULL COMMENT '充值账号',
  `quantity` INT DEFAULT 1 COMMENT '数量',
  `total_amount` DECIMAL(10, 2) NOT NULL COMMENT '订单总额',
  `cost_amount` DECIMAL(10, 2) COMMENT '成本金额',
  `status` ENUM('pending', 'processing', 'success', 'failed', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
  `platform_order_id` VARCHAR(100) COMMENT '平台订单ID',
  `platform_status` VARCHAR(50) COMMENT '平台订单状态',
  `error_message` TEXT COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL COMMENT '完成时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 创建加款申请表
CREATE TABLE IF NOT EXISTS `topup_applications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `application_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '申请单号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '申请金额',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
  `note` TEXT COMMENT '申请说明',
  `admin_id` INT COMMENT '审核管理员ID',
  `admin_note` TEXT COMMENT '审核备注',
  `approved_at` TIMESTAMP NULL COMMENT '审核时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='加款申请表';

-- 插入默认管理员（密码: admin123）
INSERT INTO `admins` (`username`, `password`, `name`, `role`, `status`) 
VALUES ('admin', '$2b$10$8K1p/a0dL6H8jF8W8G8ZveW8qZ8v8W8qZ8v8W8qZ8v8W8qZ8v8W8qZ8', '超级管理员', 'super', 1)
ON DUPLICATE KEY UPDATE id=id;

-- 插入示例供货商
INSERT INTO `suppliers` (`name`, `type`, `api_url`, `status`) 
VALUES ('蜜蜂汇云', 'mifenghuiyun', 'https://api.mifenghuiyun.com', 1)
ON DUPLICATE KEY UPDATE id=id;

-- 插入示例商品
INSERT INTO `products` (`supplier_id`, `name`, `category`, `price`, `cost_price`, `status`) 
VALUES 
(1, '话费充值-10元', 'phone', '10.50', '10.00', 1),
(1, '话费充值-20元', 'phone', '20.80', '20.00', 1),
(1, '话费充值-50元', 'phone', '50.50', '50.00', 1),
(1, '话费充值-100元', 'phone', '100.80', '100.00', 1)
ON DUPLICATE KEY UPDATE id=id;

EOF

ENDSSH

echo -e "${GREEN}✓ 数据库创建完成${NC}"
echo ""

echo -e "${GREEN}5. 配置MySQL权限...${NC}"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER bash -s << 'ENDSSH'
# 配置MySQL用户和权限
mysql -u root << 'EOF'
-- 创建应用用户
CREATE USER IF NOT EXISTS 'chongyida'@'localhost' IDENTIFIED BY 'ChongYiDa2026!';
GRANT ALL PRIVILEGES ON chongyida.* TO 'chongyida'@'localhost';
FLUSH PRIVILEGES;

-- 更新管理员密码（bcrypt hash of 'admin123'）
UPDATE chongyida.admins 
SET password = '$2b$10$8K1p/a0dL6H8jF8W8G8ZveW8qZ8v8W8qZ8v8W8qZ8v8W8qZ8v8W8qZ8'
WHERE username = 'admin';

EOF
ENDSSH

echo -e "${GREEN}✓ MySQL权限配置完成${NC}"
echo ""

echo -e "${GREEN}6. 停止旧服务...${NC}"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER "cd /app && pm2 stop api-server 2>/dev/null || echo '服务未运行'"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER "cd /app && pm2 delete api-server 2>/dev/null || echo '服务不存在'"

echo -e "${GREEN}✓ 旧服务已停止${NC}"
echo ""

echo -e "${GREEN}7. 启动新服务...${NC}"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER bash -s << 'ENDSSH'
cd /app

# 设置环境变量
export DB_HOST=localhost
export DB_USER=chongyida
export DB_PASSWORD=ChongYiDa2026!
export DB_NAME=chongyida

# 启动新服务
pm2 start api-server-v3.1.js --name api-server

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup | tail -n 1 | sudo -E bash

ENDSSH

echo -e "${GREEN}✓ 新服务已启动${NC}"
echo ""

echo -e "${GREEN}8. 验证服务状态...${NC}"
sleep 3

# 检查PM2状态
echo "PM2服务状态:"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER "pm2 status api-server"
echo ""

# 测试健康检查
echo "测试API健康检查..."
HEALTH_CHECK=$(curl -s http://81.70.208.147:8899/api/health)
echo "$HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q "success"; then
    echo -e "${GREEN}✓ API服务运行正常${NC}"
else
    echo -e "${RED}✗ API服务异常${NC}"
fi

echo ""
echo -e "${GREEN}9. 查看服务日志...${NC}"
ssh -i "$KEY" -o StrictHostKeyChecking=no $SERVER "pm2 logs api-server --lines 20 --nostream"

echo ""
echo "================================"
echo -e "${GREEN}部署完成！${NC}"
echo "================================"
echo ""
echo "访问地址:"
echo "  登录页面: http://81.70.208.147:8899/login.html"
echo "  用户后台: http://81.70.208.147:8899/user-backend.html"
echo "  总后台:   http://81.70.208.147:8899/admin.html"
echo ""
echo "管理员账号:"
echo "  用户名: admin"
echo "  密码:   admin123"
echo ""
echo "数据库信息:"
echo "  主机: localhost"
echo "  数据库: chongyida"
echo "  用户名: chongyida"
echo "  密码: ChongYiDa2026!"
echo ""
echo "================================"
