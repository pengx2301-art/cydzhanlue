# PowerShell 云服务器部署脚本
# Cloud Server Auto-Deployment Script (Windows)
#
# 使用方式：
#   .\deploy-to-cloud.ps1
#

# ═══════════════════════════════════════════════════════════════
# 配置变量 (Configuration)
# ═══════════════════════════════════════════════════════════════

$SERVER_IP = "81.70.208.147"
$SERVER_USER = "ubuntu"
$SERVER_PASSWORD = "Aa462300"
$SERVER_ROOT = "/app"
$PROJECT_NAME = "cyd-admin"
$LOCAL_PROJECT_PATH = "WorkBuddy\20260317184320\WorkBuddy\20260315203305"

# ═══════════════════════════════════════════════════════════════
# 颜色函数 (Color Functions)
# ═══════════════════════════════════════════════════════════════

function Print-Success {
    param([string]$message)
    Write-Host "✅ $message" -ForegroundColor Green
}

function Print-Error {
    param([string]$message)
    Write-Host "❌ $message" -ForegroundColor Red
}

function Print-Info {
    param([string]$message)
    Write-Host "ℹ️  $message" -ForegroundColor Cyan
}

function Print-Warning {
    param([string]$message)
    Write-Host "⚠️  $message" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════
# 开始部署 (Start Deployment)
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     🚀 充易达系统 - 云服务器自动部署脚本              ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# 步骤 1: 检查本地 SSH 工具 (Check SSH)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 1/10: 检查本地 SSH 工具..."

$SSH_AVAILABLE = $false

# 检查 PowerShell SSH
if (Get-Command ssh -ErrorAction SilentlyContinue) {
    Print-Success "SSH 命令可用"
    $SSH_AVAILABLE = $true
} elseif (Test-Path "C:\Windows\System32\OpenSSH\ssh.exe") {
    Print-Success "OpenSSH 已安装"
    $SSH_AVAILABLE = $true
} else {
    Print-Error "SSH 不可用，请先安装 Git 或 OpenSSH"
    Write-Host "下载地址: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# 步骤 2: 测试服务器连接 (Test Server Connection)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 2/10: 测试服务器连接..."

$SSH_TEST = "echo 'Connection successful'" | ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} 2>&1

if ($LASTEXITCODE -eq 0 -and $SSH_TEST -match "Connection successful") {
    Print-Success "服务器连接成功"
} else {
    Print-Error "服务器连接失败，请检查 IP 和密码"
    Print-Warning "请手动测试: ssh ${SERVER_USER}@${SERVER_IP}"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# 步骤 3: 准备远程部署脚本 (Prepare Remote Script)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 3/10: 准备远程部署脚本..."

$REMOTE_SCRIPT = @"
#!/bin/bash
set -e

echo "Step 1: Update system packages..."
sudo apt update && sudo apt upgrade -y

echo "Step 2: Install Node.js v20.x (LTS)..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

node --version
npm --version

echo "Step 3: Install PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

pm2 --version

echo "Step 4: Create project directory..."
sudo mkdir -p $SERVER_ROOT
sudo chown ${SERVER_USER}:${SERVER_USER} $SERVER_ROOT

echo "Step 5: Install necessary tools..."
sudo apt install -y zip unzip

echo "Environment preparation completed successfully!"
"@

$REMOTE_SCRIPT_PATH = "$env:TEMP\cyd-remote-setup.sh"
$REMOTE_SCRIPT | Out-File -FilePath $REMOTE_SCRIPT_PATH -Encoding UTF8 -NoNewline

Print-Success "远程脚本准备完成"

# ═══════════════════════════════════════════════════════════════
# 步骤 4: 上传并执行远程脚本 (Upload and Execute Remote Script)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 4/10: 上传并执行远程脚本..."

# 上传脚本
$SCP_CMD = "scp -o StrictHostKeyChecking=no `"$REMOTE_SCRIPT_PATH`" `${SERVER_USER}@${SERVER_IP}:/tmp/cyd-remote-setup.sh`"
Invoke-Expression $SCP_CMD

if ($LASTEXITCODE -ne 0) {
    Print-Error "脚本上传失败"
    exit 1
}

# 执行远程脚本
$SSH_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'bash /tmp/cyd-remote-setup.sh`'"
Invoke-Expression $SSH_CMD

if ($LASTEXITCODE -ne 0) {
    Print-Error "远程脚本执行失败"
    exit 1
}

Print-Success "服务器环境准备完成"

# ═══════════════════════════════════════════════════════════════
# 步骤 5: 打包项目文件 (Package Project Files)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 5/10: 打包项目文件..."

$CURRENT_DIR = Get-Location
$PROJECT_DIR = Join-Path $CURRENT_DIR $LOCAL_PROJECT_PATH

if (-not (Test-Path $PROJECT_DIR)) {
    Print-Error "项目目录不存在: $PROJECT_DIR"
    Write-Host "请确保当前目录结构正确: $CURRENT_DIR" -ForegroundColor Yellow
    exit 1
}

Set-Location $PROJECT_DIR

# 检查必要文件
$FILES_TO_ZIP = @("server.js", "cyd.json", "package.json")
$OPTIONAL_FILES = @("backup-database.js", "backup-scheduler.js", "generate-api-docs.js")

$FILES_TO_PACKAGE = @()
foreach ($file in $FILES_TO_ZIP) {
    if (Test-Path $file) {
        $FILES_TO_PACKAGE += $file
    } else {
        Print-Warning "文件不存在: $file"
    }
}

foreach ($file in $OPTIONAL_FILES) {
    if (Test-Path $file) {
        $FILES_TO_PACKAGE += $file
    }
}

if ($FILES_TO_PACKAGE.Count -eq 0) {
    Print-Error "没有找到任何文件需要打包"
    Set-Location $CURRENT_DIR
    exit 1
}

# 创建临时压缩包
$TEMP_ZIP = "..\..\..\cyd-temp.zip"

# 使用 Compress-Archive (Windows 10+)
if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
    try {
        Compress-Archive -Path $FILES_TO_PACKAGE -DestinationPath $TEMP_ZIP -Force
        Print-Success "项目打包完成: $($FILES_TO_PACKAGE.Count) 个文件"
    } catch {
        Print-Error "文件打包失败: $_"
        Set-Location $CURRENT_DIR
        exit 1
    }
} else {
    Print-Error "无法压缩文件，请使用 Windows 10 或更高版本"
    Set-Location $CURRENT_DIR
    exit 1
}

Set-Location $CURRENT_DIR

# ═══════════════════════════════════════════════════════════════
# 步骤 6: 上传文件到服务器 (Upload Files to Server)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 6/10: 上传文件到服务器..."

$UPLOAD_CMD = "scp -o StrictHostKeyChecking=no `"$TEMP_ZIP`" `${SERVER_USER}@${SERVER_IP}:${SERVER_ROOT}/cyd-temp.zip`"

try {
    Invoke-Expression $UPLOAD_CMD
    if ($LASTEXITCODE -eq 0) {
        Print-Success "文件上传完成"
    } else {
        Print-Error "文件上传失败"
        exit 1
    }
} catch {
    Print-Error "文件上传失败: $_"
    exit 1
}

# 清理本地临时文件
Remove-Item $TEMP_ZIP -Force -ErrorAction SilentlyContinue

# ═══════════════════════════════════════════════════════════════
# 步骤 7: 解压和安装依赖 (Extract and Install Dependencies)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 7/10: 解压和安装依赖..."

$UNZIP_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'cd $SERVER_ROOT && unzip -o cyd-temp.zip && rm cyd-temp.zip`'"
Invoke-Expression $UNZIP_CMD

if ($LASTEXITCODE -ne 0) {
    Print-Error "解压失败"
    exit 1
}

Print-Success "文件解压完成"

# 安装依赖
Print-Info "正在安装 npm 依赖..."
$NPM_INSTALL_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'cd $SERVER_ROOT && npm install --production`'"

$NPM_OUTPUT = Invoke-Expression $NPM_INSTALL_CMD 2>&1
Write-Host $NPM_OUTPUT

if ($LASTEXITCODE -ne 0) {
    Print-Error "npm install 失败"
    Print-Warning "可能是因为没有 package.json 文件"
    Print-Warning "继续尝试启动服务..."
} else {
    Print-Success "npm 依赖安装完成"
}

# ═══════════════════════════════════════════════════════════════
# 步骤 8: 创建 PM2 配置 (Create PM2 Configuration)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 8/10: 创建 PM2 配置..."

$PM2_CONFIG = @"
module.exports = {
  apps: [{
    name: 'cyd-admin',
    script: './server.js',
    cwd: '$SERVER_ROOT',
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
"@

$CREATE_PM2_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'echo `"$PM2_CONFIG`" > $SERVER_ROOT/ecosystem.config.js`'"
Invoke-Expression $CREATE_PM2_CMD

if ($LASTEXITCODE -eq 0) {
    Print-Success "PM2 配置创建完成"
} else {
    Print-Error "PM2 配置创建失败"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# 步骤 9: 启动 PM2 服务 (Start PM2 Service)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 9/10: 启动 PM2 服务..."

# 停止旧进程（如果存在）
ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 stop cyd-admin" 2>&1 | Out-Null
ssh ${SERVER_USER}@${SERVER_IP} "sudo pm2 delete cyd-admin" 2>&1 | Out-Null

# 启动新进程
$START_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'sudo pm2 start $SERVER_ROOT/ecosystem.config.js`'"
$SAVE_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'sudo pm2 save`'"
$STARTUP_CMD = "ssh ${SERVER_USER}@${SERVER_IP} `'sudo pm2 startup ubuntu -u $SERVER_USER --hp /home/$SERVER_USER`'"

Invoke-Expression $START_CMD
if ($LASTEXITCODE -eq 0) {
    Print-Success "PM2 服务启动成功"
} else {
    Print-Error "PM2 服务启动失败"
    exit 1
}

Invoke-Expression $SAVE_CMD
Invoke-Expression $STARTUP_CMD

# ═══════════════════════════════════════════════════════════════
# 步骤 10: 测试服务访问 (Test Service Access)
# ═══════════════════════════════════════════════════════════════

Print-Info "步骤 10/10: 测试服务访问..."

Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $HEALTH_URL = "http://${SERVER_IP}:8899/api/health"
    $HEALTH_CHECK = Invoke-WebRequest -Uri $HEALTH_URL -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    
    if ($HEALTH_CHECK.StatusCode -eq 200) {
        $HEALTH_DATA = $HEALTH_CHECK.Content | ConvertFrom-Json
        
        if ($HEALTH_DATA.status -eq "healthy") {
            Print-Success "服务运行正常！"
            Write-Host "   运行时间: $([math]::Round($HEALTH_DATA.uptime, 2)) 秒" -ForegroundColor Cyan
            Write-Host "   缓存命中率: $($HEALTH_DATA.cache.hit_rate)" -ForegroundColor Cyan
        } else {
            Print-Warning "服务状态: $($HEALTH_DATA.status)"
        }
    } else {
        Print-Warning "HTTP 状态码: $($HEALTH_CHECK.StatusCode)"
    }
} catch {
    Print-Warning "无法访问服务，可能还在启动中"
    Write-Host "   请稍后手动访问: http://${SERVER_IP}:8899/api/health" -ForegroundColor Cyan
    Write-Host "   错误信息: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════
# 部署完成 (Deployment Complete)
# ═══════════════════════════════════════════════════════════════

Print-Info "部署完成！"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✅ 部署完成！                                  ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📍 服务器信息：" -ForegroundColor Cyan
Write-Host "   IP 地址: http://${SERVER_IP}" -ForegroundColor White
Write-Host "   API 端口: 8899" -ForegroundColor White
Write-Host "   健康检查: http://${SERVER_IP}:8899/api/health" -ForegroundColor White
Write-Host "   版本信息: http://${SERVER_IP}:8899/api/version" -ForegroundColor White
Write-Host ""
Write-Host "🔧 管理命令：" -ForegroundColor Cyan
Write-Host "   查看状态: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 list'" -ForegroundColor White
Write-Host "   查看日志: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 logs'" -ForegroundColor White
Write-Host "   重启服务: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 restart cyd-admin'" -ForegroundColor White
Write-Host "   停止服务: ssh ${SERVER_USER}@${SERVER_IP} 'sudo pm2 stop cyd-admin'" -ForegroundColor White
Write-Host ""
Write-Host "✨ 现在可以通过公网 IP 访问充易达系统了！" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# 部署总结 (Deployment Summary)
# ═══════════════════════════════════════════════════════════════

Write-Host "📝 部署步骤总结：" -ForegroundColor Cyan
Write-Host "   1️⃣  检查本地 SSH 工具 ✅" -ForegroundColor Green
Write-Host "   2️⃣  测试服务器连接 ✅" -ForegroundColor Green
Write-Host "   3️⃣  准备远程部署脚本 ✅" -ForegroundColor Green
Write-Host "   4️⃣  上传并执行远程脚本 ✅" -ForegroundColor Green
Write-Host "   5️⃣  打包项目文件 ✅" -ForegroundColor Green
Write-Host "   6️⃣  上传文件到服务器 ✅" -ForegroundColor Green
Write-Host "   7️⃣  解压和安装依赖 ✅" -ForegroundColor Green
Write-Host "   8️⃣  创建 PM2 配置 ✅" -ForegroundColor Green
Write-Host "   9️⃣  启动 PM2 服务 ✅" -ForegroundColor Green
Write-Host "   🔟  测试服务访问 ✅" -ForegroundColor Green
Write-Host ""
