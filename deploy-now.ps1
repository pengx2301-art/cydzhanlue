# 充易达系统v2.0 自动部署脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  充易达系统v2.0 自动部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$ServerIP = "81.70.208.147"
$Username = "ubuntu"
$RemoteDir = "/app"

# 创建临时目录
$TempDir = "$env:TEMP\cyd_deploy"
Write-Host "1. 准备文件..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# 复制文件
Copy-Item "c:/Users/60496/WorkBuddy/Claw/api-server.js" -Destination "$TempDir\" -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/product-connection.js" -Destination "$TempDir\" -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/order-module.js" -Destination "$TempDir\" -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/package.json" -Destination "$TempDir\" -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/product-connection.html" -Destination "$TempDir\" -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/order-page.html" -Destination "$TempDir\" -Force

Write-Host "   文件准备完成" -ForegroundColor Green

# 生成部署命令
Write-Host "2. 生成部署命令..." -ForegroundColor Yellow

$DeployScript = @"
#!/bin/bash
# 自动在服务器上执行的部署脚本

cd $RemoteDir

echo "备份旧文件..."
[ -f api-server.js ] && cp api-server.js api-server.js.backup
[ -f product-connection.js ] && cp product-connection.js product-connection.js.backup

echo "上传新文件..."
(从本地上传的文件会覆盖这里)

echo "安装依赖..."
npm install

echo "重启服务..."
pm2 restart cyd-admin || pm2 start api-server.js --name cyd-admin
pm2 save

echo "部署完成！"
echo "访问地址："
echo "  - 商品管理: http://$ServerIP:8899/product-connection.html"
echo "  - 快速下单: http://$ServerIP:8899/order-page.html"
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  部署说明" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "由于Windows系统的限制，请按以下步骤手动执行部署：" -ForegroundColor Yellow
Write-Host ""
Write-Host "步骤1：打开Git Bash（推荐）或PowerShell" -ForegroundColor White
Write-Host ""
Write-Host "步骤2：上传文件到服务器（输入密码：Aa462300）" -ForegroundColor White
Write-Host "执行以下命令：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  scp $TempDir\* $Username@$ServerIP:$RemoteDir/" -ForegroundColor Green
Write-Host ""
Write-Host "步骤3：连接服务器并完成部署" -ForegroundColor White
Write-Host "执行以下命令：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ssh $Username@$ServerIP" -ForegroundColor Green
Write-Host "  cd $RemoteDir" -ForegroundColor Green
Write-Host "  npm install" -ForegroundColor Green
Write-Host "  pm2 restart cyd-admin" -ForegroundColor Green
Write-Host "  pm2 save" -ForegroundColor Green
Write-Host ""
Write-Host "或者一次性执行（复制粘贴）：" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ssh $Username@$ServerIP 'cd $RemoteDir && npm install && pm2 restart cyd-admin && pm2 save'" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署后访问：" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  商品管理: http://$ServerIP:8899/product-connection.html" -ForegroundColor Green
Write-Host "  快速下单: http://$ServerIP:8899/order-page.html" -ForegroundColor Green
Write-Host ""

# 保存说明到文件
$DeployGuide = @"
# 充易达系统v2.0 部署指南

## 快速部署（3步完成）

### 步骤1：上传文件
在Git Bash或PowerShell中执行：
```
scp $TempDir\* $Username@$ServerIP:$RemoteDir/
```
密码：Aa462300

### 步骤2：安装依赖
连接服务器：
```
ssh $Username@$ServerIP
cd $RemoteDir
npm install
```

### 步骤3：重启服务
```
pm2 restart cyd-admin
pm2 save
```

## 一键部署命令
```
ssh $Username@$ServerIP 'cd $RemoteDir && npm install && pm2 restart cyd-admin && pm2 save'
```

## 访问地址
- 商品管理: http://$ServerIP:8899/product-connection.html
- 快速下单: http://$ServerIP:8899/order-page.html

## 已部署文件
- api-server.js - API服务器
- product-connection.js - 商品对接模块
- order-module.js - 下单模块
- package.json - 项目配置
- product-connection.html - 商品管理页面
- order-page.html - 下单页面
"@

$DeployGuide | Out-File -FilePath "$TempDir\DEPLOY_GUIDE.txt" -Encoding UTF8
Write-Host "详细指南已保存到: $TempDir\DEPLOY_GUIDE.txt" -ForegroundColor Gray
