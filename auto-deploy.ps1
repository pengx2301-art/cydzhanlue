# 自动部署脚本 - 充易达系统v2.0
# 使用SSH连接到云服务器并部署

# 配置信息
$ServerIP = "81.70.208.147"
$Username = "ubuntu"
$Password = "Aa462300"
$RemoteDir = "/app"
$GitHubRepo = "git@github.com:pengx2301-art/cydzhanlue.git"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  充易达系统v2.0 自动部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 创建临时目录
$TempDir = [System.IO.Path]::GetTempPath() + "cyd_deploy_" + [guid]::NewGuid().ToString("N").Substring(0,8)
Write-Host "1. 创建临时目录: $TempDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# 复制必要文件
Write-Host "2. 复制部署文件..." -ForegroundColor Yellow
Copy-Item "c:/Users/60496/WorkBuddy/Claw/api-server.js" -Destination $TempDir -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/product-connection.js" -Destination $TempDir -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/order-module.js" -Destination $TempDir -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/package.json" -Destination $TempDir -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/product-connection.html" -Destination $TempDir -Force
Copy-Item "c:/Users/60496/WorkBuddy/Claw/order-page.html" -Destination $TempDir -Force

Write-Host "   api-server.js" -ForegroundColor Green
Write-Host "   product-connection.js" -ForegroundColor Green
Write-Host "   order-module.js" -ForegroundColor Green
Write-Host "   package.json" -ForegroundColor Green
Write-Host "   product-connection.html" -ForegroundColor Green
Write-Host "   order-page.html" -ForegroundColor Green

Write-Host ""
Write-Host "3. 准备文件完成！" -ForegroundColor Green
Write-Host "临时目录: $TempDir" -ForegroundColor Gray
Write-Host ""

# 生成SSH部署命令
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  自动部署命令" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "正在尝试自动上传文件..." -ForegroundColor Yellow

# 检查是否有SCP命令
$scpExists = Get-Command scp -ErrorAction SilentlyContinue

if ($scpExists) {
    Write-Host "找到SCP命令，开始上传..." -ForegroundColor Green
    $scptarget = "$($Username)@$($ServerIP):$($RemoteDir)/"
    & scp -o StrictHostKeyChecking=no "$TempDir\api-server.js" $scptarget
    & scp -o StrictHostKeyChecking=no "$TempDir\product-connection.js" $scptarget
    & scp -o StrictHostKeyChecking=no "$TempDir\order-module.js" $scptarget
    & scp -o StrictHostKeyChecking=no "$TempDir\package.json" $scptarget
    & scp -o StrictHostKeyChecking=no "$TempDir\product-connection.html" $scptarget
    & scp -o StrictHostKeyChecking=no "$TempDir\order-page.html" $scptarget
    
    Write-Host ""
    Write-Host "4. 文件上传完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "5. 连接服务器执行部署..." -ForegroundColor Yellow
    Write-Host "请输入密码：$Password" -ForegroundColor Gray
    Write-Host ""
    
    & ssh -o StrictHostKeyChecking=no "$($Username)@$($ServerIP)" @"
cd $RemoteDir
echo "安装依赖..."
npm install
echo "重启服务..."
pm2 restart cyd-admin || pm2 start api-server.js --name cyd-admin
pm2 save
echo "部署完成！"
exit
"@
} else {
    Write-Host "未找到SCP命令，请手动执行以下步骤：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "步骤1：上传文件" -ForegroundColor White
    Write-Host "  打开Git Bash或PowerShell，执行：" -ForegroundColor Cyan
    Write-Host "  scp -r $TempDir\* $($Username)@$($ServerIP):$($RemoteDir)/" -ForegroundColor Green
    Write-Host ""
    Write-Host "步骤2：连接服务器" -ForegroundColor White
    Write-Host "  ssh $($Username)@$($ServerIP)" -ForegroundColor Cyan
    Write-Host "  密码：$Password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "步骤3：执行部署" -ForegroundColor White
    Write-Host "  cd $RemoteDir" -ForegroundColor Cyan
    Write-Host "  npm install" -ForegroundColor Cyan
    Write-Host "  pm2 restart cyd-admin" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
