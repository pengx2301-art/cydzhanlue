# SSH密钥配置和自动部署脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  充易达系统v2.0 - SSH配置和部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ServerIP = "81.70.208.147"
$Username = "ubuntu"
$Password = "Aa462300"
$SSHDir = "$env:USERPROFILE\.ssh"
$KeyPath = "$SSHDir\id_ed25519"

# 检查是否已有密钥
if (Test-Path $KeyPath) {
    Write-Host "检测到已有SSH密钥" -ForegroundColor Yellow
    Write-Host "密钥路径: $KeyPath" -ForegroundColor Gray
} else {
    Write-Host "步骤1: 生成SSH密钥..." -ForegroundColor Yellow

    # 创建SSH目录
    if (!(Test-Path $SSHDir)) {
        New-Item -ItemType Directory -Path $SSHDir -Force | Out-Null
    }

    # 生成密钥
    $KeyGenResult = ssh-keygen -t ed25519 -C "$Username@$ServerIP" -f $KeyPath -N ""

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SSH密钥生成成功！" -ForegroundColor Green
    } else {
        Write-Host "  SSH密钥生成失败" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "步骤2: 显示公钥..." -ForegroundColor Yellow
Write-Host "请复制以下公钥：" -ForegroundColor Cyan
Write-Host ""
Get-Content "$KeyPath.pub"
Write-Host ""

Write-Host "步骤3: 配置服务器..." -ForegroundColor Yellow
Write-Host "需要在服务器上执行以下命令：" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 连接服务器：" -ForegroundColor White
Write-Host "   ssh $Username@$ServerIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. 添加公钥到服务器：" -ForegroundColor White
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Yellow
Write-Host "   echo 'PASTE_YOUR_PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Yellow
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host ""
Write-Host "或者使用ssh-copy-id（如果可用）：" -ForegroundColor White
Write-Host "   type $KeyPath.pub | ssh $Username@$ServerIP 'cat >> ~/.ssh/authorized_keys'" -ForegroundColor Yellow
Write-Host ""

Write-Host "步骤4: 测试连接..." -ForegroundColor Yellow
$TestResult = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $Username@$ServerIP "echo 'SSH连接成功'" 2>&1

if ($TestResult -like "*SSH连接成功*") {
    Write-Host "  SSH连接测试成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "步骤5: 开始部署..." -ForegroundColor Yellow

    # 上传文件
    $AppDir = "/app"
    Write-Host "  上传文件到服务器..." -ForegroundColor Gray

    scp -o StrictHostKeyChecking=no `
        "c:/Users/60496/WorkBuddy/Claw/api-server.js" `
        "c:/Users/60496/WorkBuddy/Claw/product-connection.js" `
        "c:/Users/60496/WorkBuddy/Claw/order-module.js" `
        "c:/Users/60496/WorkBuddy/Claw/package.json" `
        "c:/Users/60496/WorkBuddy/Claw/product-connection.html" `
        "c:/Users/60496/WorkBuddy/Claw/order-page.html" `
        "$Username@$ServerIP:$AppDir/"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  文件上传成功！" -ForegroundColor Green

        # 在服务器上执行部署
        Write-Host "  在服务器上执行部署..." -ForegroundColor Gray
        ssh -o StrictHostKeyChecking=no $Username@$ServerIP @"
cd $AppDir

# 安装依赖
npm install

# 重启服务
pm2 restart cyd-admin || pm2 start api-server.js --name cyd-admin

# 保存配置
pm2 save

# 显示状态
pm2 status

echo ""
echo "部署完成！"
"@

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  部署成功！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "访问地址：" -ForegroundColor White
        Write-Host "  商品管理: http://$ServerIP:8899/product-connection.html" -ForegroundColor Cyan
        Write-Host "  快速下单: http://$ServerIP:8899/order-page.html" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "  文件上传失败" -ForegroundColor Red
    }
} else {
    Write-Host "  SSH连接失败" -ForegroundColor Red
    Write-Host "  错误信息: $TestResult" -ForegroundColor Gray
    Write-Host ""
    Write-Host "请先完成SSH密钥配置，然后重新运行此脚本" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
