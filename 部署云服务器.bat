# 云服务器部署脚本
# 服务器: 81.70.208.147
# 端口: 8899

@echo off
chcp 65001 >nul
echo ====================================
echo    云服务器部署脚本 - v3.3.0
echo ====================================
echo.

echo [1/5] 推送代码到GitHub...
git push
if %errorlevel% neq 0 (
    echo ❌ Git推送失败
    pause
    exit /b 1
)
echo ✅ Git推送成功
echo.

echo [2/5] 检查服务器连接...
echo 正在检查服务器 81.70.208.147:22...
ping 81.70.208.147 -n 1 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 服务器连接失败
    pause
    exit /b 1
)
echo ✅ 服务器连接正常
echo.

echo [3/5] 备份服务器文件...
echo 正在备份服务器文件...
ssh root@81.70.208.147 "cd /root/Claw && if [ -d 'backup' ]; then rm -rf backup; fi && mkdir -p backup && cp -r *.html *.js database backup/ 2>/dev/null || echo '部分文件备份'"
if %errorlevel% neq 0 (
    echo ⚠ 备份警告，但继续部署
) else (
    echo ✅ 服务器文件备份成功
)
echo.

echo [4/5] 上传新文件到服务器...
echo 正在上传核心文件...
scp api-server-v3.2.js root@81.70.208.147:/root/Claw/api-server.js
scp admin-v3.2.js root@81.70.208.147:/root/Claw/admin.js
scp user/login.html root@81.70.208.147:/root/Claw/user/login.html
scp admin/login.html root@81.70.208.147:/root/Claw/admin/login.html
scp kasushou-supplier.js root@81.70.208.147:/root/Claw/
scp kayixin-supplier.js root@81.70.208.147:/root/Claw/
scp kekebang-supplier.js root@81.70.208.147:/root/Claw/
scp supplier-manager-v3.js root@81.70.208.147:/root/Claw/supplier-manager.js

if %errorlevel% neq 0 (
    echo ❌ 文件上传失败
    pause
    exit /b 1
)
echo ✅ 文件上传成功
echo.

echo [5/5] 重启API服务器...
echo 正在重启API服务器...
ssh root@81.70.208.147 "cd /root/Claw && pm2 restart api-server || pm2 start api-server.js --name api-server --watch"
if %errorlevel% neq 0 (
    echo ⚠ API服务器启动警告
) else (
    echo ✅ API服务器重启成功
)
echo.

echo ====================================
echo    🎉 部署完成！
echo ====================================
echo.
echo 📊 部署信息:
echo   版本: v3.3.0
echo   服务器: 81.70.208.147
echo   端口: 8899
echo   Git: 已推送到GitHub
echo.
echo 🌐 访问地址:
echo   用户后台: http://81.70.208.147:8899/user/login.html
echo   管理后台: http://81.70.208.147:8899/admin/login.html
echo   API健康: http://81.70.208.147:8899/api/health
echo.
echo ✨ 新增功能:
echo   - 客客帮供货商对接
echo   - 用户/管理员分离登录
echo   - 4个供货商全部支持
echo.
pause
