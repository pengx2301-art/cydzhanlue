# SSH 连接测试脚本
# 测试与云服务器的连接

$SERVER_IP = "81.70.208.147"
$SERVER_USER = "ubuntu"

Write-Host "🔍 测试 SSH 连接..." -ForegroundColor Cyan
Write-Host ""

# 测试命令
$SSH_CMD = "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} `'echo \"Connection successful\"`'"

Write-Host "执行命令: ssh ${SERVER_USER}@${SERVER_IP}" -ForegroundColor Yellow
Write-Host ""

try {
    $RESULT = Invoke-Expression $SSH_CMD 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $RESULT -match "Connection successful") {
        Write-Host "✅ SSH 连接成功！" -ForegroundColor Green
        Write-Host ""
        
        # 测试 Node.js 是否安装
        Write-Host "🔍 检查 Node.js 版本..." -ForegroundColor Cyan
        $NODE_VERSION = ssh ${SERVER_USER}@${SERVER_IP} "node --version 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Node.js 已安装: $NODE_VERSION" -ForegroundColor Green
        } else {
            Write-Host "❌ Node.js 未安装" -ForegroundColor Red
        }
        
        # 测试 PM2 是否安装
        Write-Host ""
        Write-Host "🔍 检查 PM2 版本..." -ForegroundColor Cyan
        $PM2_VERSION = ssh ${SERVER_USER}@${SERVER_IP} "pm2 --version 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PM2 已安装: v$PM2_VERSION" -ForegroundColor Green
        } else {
            Write-Host "❌ PM2 未安装" -ForegroundColor Red
        }
        
        # 检查项目目录
        Write-Host ""
        Write-Host "🔍 检查项目目录..." -ForegroundColor Cyan
        $CHECK_DIR = ssh ${SERVER_USER}@${SERVER_IP} "ls -la /app 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ /app 目录存在" -ForegroundColor Green
            Write-Host $CHECK_DIR
        } else {
            Write-Host "❌ /app 目录不存在" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ SSH 连接失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "请检查:" -ForegroundColor Yellow
        Write-Host "  1. 服务器 IP 是否正确: $SERVER_IP" -ForegroundColor White
        Write-Host "  2. 用户名是否正确: $SERVER_USER" -ForegroundColor White
        Write-Host "  3. 服务器是否开机" -ForegroundColor White
        Write-Host "  4. SSH 服务是否运行" -ForegroundColor White
    }
} catch {
    Write-Host "❌ 连接出错: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动测试: ssh ${SERVER_USER}@${SERVER_IP}" -ForegroundColor Yellow
}

Write-Host ""
