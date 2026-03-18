#!/bin/bash

# 充易达系统 - 增强版部署脚本
# 用于将优化后的文件部署到云服务器

echo "========================================"
echo "  充易达系统 - 增强版部署脚本"
echo "========================================"
echo ""

# 服务器配置
SERVER="ubuntu@81.70.208.147"
SERVER_DIR="/app"
PASSWORD="Aa462300"

echo "📦 开始部署..."
echo ""

# 检查本地文件是否存在
echo "🔍 检查本地文件..."
files=(
    "api-server.js"
    "product-connection.js"
    "order-module.js"
    "package.json"
    "product-connection.html"
    "order-page.html"
    "OPTIMIZATION_GUIDE.md"
    "README_OPTIMIZATION.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (不存在)"
        exit 1
    fi
done

echo ""
echo "📤 上传文件到服务器..."

# 创建临时压缩包
echo "📦 创建压缩包..."
zip -r cyd-enhanced.zip \
    api-server.js \
    product-connection.js \
    order-module.js \
    package.json \
    product-connection.html \
    order-page.html \
    OPTIMIZATION_GUIDE.md \
    README_OPTIMIZATION.md

echo "✅ 压缩包创建完成"
echo ""

# 上传文件（需要手动输入密码）
echo "🚀 上传文件到服务器..."
echo "⚠️  请在提示时输入服务器密码: $PASSWORD"
echo ""

scp cyd-enhanced.zip $SERVER:$SERVER_DIR/

if [ $? -eq 0 ]; then
    echo "✅ 文件上传成功"
else
    echo "❌ 文件上传失败"
    exit 1
fi

echo ""
echo "🔧 在服务器上解压和安装..."
echo ""
echo "请在服务器上执行以下命令："
echo ""
echo "# 连接服务器"
echo "ssh $SERVER"
echo ""
echo "# 进入项目目录"
echo "cd $SERVER_DIR"
echo ""
echo "# 备份旧版本"
echo "mv api-server.js api-server.js.backup 2>/dev/null || true"
echo ""
echo "# 解压新文件"
echo "unzip -o cyd-enhanced.zip"
echo ""
echo "# 删除压缩包"
echo "rm cyd-enhanced.zip"
echo ""
echo "# 安装依赖"
echo "npm install"
echo ""
echo "# 重启服务"
echo "pm2 restart cyd-admin || pm2 start api-server.js --name cyd-admin"
echo ""
echo "# 查看日志"
echo "pm2 logs cyd-admin"
echo ""
echo ""
echo "✅ 部署准备完成！"
echo ""
echo "📝 部署后访问："
echo "   - 商品对接管理: http://81.70.208.147:8899/product-connection.html"
echo "   - 快速下单: http://81.70.208.147:8899/order-page.html"
echo ""
echo "========================================"
echo "  部署脚本执行完毕"
echo "========================================"
