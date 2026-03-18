# 充易达系统 - 增强版部署脚本 (PowerShell)
# 用于将优化后的文件部署到云服务器

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  充易达系统 - 增强版部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 服务器配置
$Server = "ubuntu@81.70.208.147"
$ServerDir = "/app"
$Password = "Aa462300"

# 本地文件列表
$Files = @(
    "api-server.js",
    "product-connection.js",
    "order-module.js",
    "package.json",
    "product-connection.html",
    "order-page.html",
    "OPTIMIZATION_GUIDE.md",
    "README_OPTIMIZATION.md"
)

# 检查本地文件
Write-Host "🔍 检查本地文件..." -ForegroundColor Yellow
$AllFilesExist = $true

foreach ($File in $Files) {
    if (Test-Path $File) {
        Write-Host "✅ $File" -ForegroundColor Green
    } else {
        Write-Host "❌ $File (不存在)" -ForegroundColor Red
        $AllFilesExist = $false
    }
}

if (-not $AllFilesExist) {
    Write-Host ""
    Write-Host "❌ 部署失败：部分文件不存在" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 创建压缩包..." -ForegroundColor Yellow

# 创建压缩包
$ZipFile = "cyd-enhanced.zip"
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile
}

Compress-Archive -Path $Files -DestinationPath $ZipFile -Force

if (Test-Path $ZipFile) {
    Write-Host "✅ 压缩包创建完成: $ZipFile" -ForegroundColor Green
} else {
    Write-Host "❌ 压缩包创建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📤 上传文件到服务器..." -ForegroundColor Yellow

# 检查是否安装了Plink (PuTTY的命令行工具)
$PlinkExists = Get-Command plink -ErrorAction SilentlyContinue
$ScpExists = Get-Command pscp -ErrorAction SilentlyContinue

if (-not $PlinkExists -or -not $ScpExists) {
    Write-Host "⚠️  未检测到PuTTY工具" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请选择上传方式：" -ForegroundColor Cyan
    Write-Host "1. 使用WinSCP手动上传" -ForegroundColor White
    Write-Host "2. 安装PuTTY后自动上传" -ForegroundColor White
    Write-Host ""
    
    $Choice = Read-Host "请选择 (1/2)"
    
    if ($Choice -eq "1") {
        Write-Host ""
        Write-Host "📝 手动上传步骤：" -ForegroundColor Yellow
        Write-Host "1. 打开WinSCP" -ForegroundColor White
        Write-Host "2. 连接到: 81.70.208.147" -ForegroundColor White
        Write-Host "3. 用户名: ubuntu" -ForegroundColor White
        Write-Host "4. 密码: $Password" -ForegroundColor White
        Write-Host "5. 上传文件: $ZipFile 到 /app/" -ForegroundColor White
        Write-Host ""
        Write-Host "上传完成后，请手动在服务器上执行以下命令：" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "cd /app" -ForegroundColor Gray
        Write-Host "unzip -o cyd-enhanced.zip" -ForegroundColor Gray
        Write-Host "rm cyd-enhanced.zip" -ForegroundColor Gray
        Write-Host "npm install" -ForegroundColor Gray
        Write-Host "pm2 restart cyd-admin || pm2 start api-server.js --name cyd-admin" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "请安装PuTTY工具后重试" -ForegroundColor Red
        Write-Host "下载地址: https://www.chiark.greenend.org.uk/~sgtatham/putty/" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "🚀 使用PuTTY上传..." -ForegroundColor Yellow
    Write-Host ""
    
    # 使用pscp上传文件
    $UploadCommand = "pscp -batch -pw $Password $ZipFile ${Server}:${ServerDir}/"
    Invoke-Expression $UploadCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 文件上传成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 文件上传失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "🔧 在服务器上执行安装命令..." -ForegroundColor Yellow
    Write-Host ""
    
    # 在服务器上执行命令
    $Commands = @(
        "cd $ServerDir",
        "if [ -f api-server.js ]; then mv api-server.js api-server.js.backup; fi",
        "unzip -o cyd-enhanced.zip",
        "rm cyd-enhanced.zip",
        "npm install",
        "pm2 restart cyd-admin || pm2 start api-server.js --name cyd-admin",
        "pm2 save"
    )
    
    $CommandString = $Commands -join " && "
    $ExecuteCommand = "plink -batch -pw $Password $Server `"$CommandString`""
    Invoke-Expression $ExecuteCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 服务器安装成功" -ForegroundColor Green
    } else {
        Write-Host "⚠️  服务器安装可能有问题，请检查" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  部署脚本执行完毕" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 部署后访问：" -ForegroundColor Green
Write-Host "   - 商品对接管理: http://81.70.208.147:8899/product-connection.html" -ForegroundColor White
Write-Host "   - 快速下单: http://81.70.208.147:8899/order-page.html" -ForegroundColor White
Write-Host ""
Write-Host "📊 管理命令：" -ForegroundColor Green
Write-Host "   - 查看日志: ssh $Server 'pm2 logs cyd-admin'" -ForegroundColor Gray
Write-Host "   - 重启服务: ssh $Server 'pm2 restart cyd-admin'" -ForegroundColor Gray
Write-Host "   - 查看状态: ssh $Server 'pm2 list'" -ForegroundColor Gray
Write-Host ""
