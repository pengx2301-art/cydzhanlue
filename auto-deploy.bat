@echo off
chcp 65001 >nul
echo ========================================
echo   充易达系统v2.0 自动部署
echo ========================================
echo.

set ServerIP=81.70.208.147
set Username=ubuntu
set RemoteDir=/app
set TempDir=%TEMP%\cyd_deploy

echo 1. 准备文件...
if not exist "%TempDir%" mkdir "%TempDir%"
copy /Y "c:\Users\60496\WorkBuddy\Claw\api-server.js" "%TempDir%\" >nul
copy /Y "c:\Users\60496\WorkBuddy\Claw\product-connection.js" "%TempDir%\" >nul
copy /Y "c:\Users\60496\WorkBuddy\Claw\order-module.js" "%TempDir%\" >nul
copy /Y "c:\Users\60496\WorkBuddy\Claw\package.json" "%TempDir%\" >nul
copy /Y "c:\Users\60496\WorkBuddy\Claw\product-connection.html" "%TempDir%\" >nul
copy /Y "c:\Users\60496\WorkBuddy\Claw\order-page.html" "%TempDir%\" >nul

echo    文件准备完成
echo.

echo 2. 检查SCP命令...
where scp >nul 2>&1
if %errorlevel% equ 0 (
    echo    找到SCP命令，开始上传...
    echo.

    scp -o StrictHostKeyChecking=no "%TempDir%\api-server.js" %Username%@%ServerIP%:%RemoteDir%/
    scp -o StrictHostKeyChecking=no "%TempDir%\product-connection.js" %Username%@%ServerIP%:%RemoteDir%/
    scp -o StrictHostKeyChecking=no "%TempDir%\order-module.js" %Username%@%ServerIP%:%RemoteDir%/
    scp -o StrictHostKeyChecking=no "%TempDir%\package.json" %Username%@%ServerIP%:%RemoteDir%/
    scp -o StrictHostKeyChecking=no "%TempDir%\product-connection.html" %Username%@%ServerIP%:%RemoteDir%/
    scp -o StrictHostKeyChecking=no "%TempDir%\order-page.html" %Username%@%ServerIP%:%RemoteDir%/

    if %errorlevel% equ 0 (
        echo.
        echo 3. 文件上传成功！
        echo.
        echo 4. 连接服务器完成部署...
        echo.
        echo    请输入密码：Aa462300
        echo.
        ssh -o StrictHostKeyChecking=no %Username%@%ServerIP% "cd %RemoteDir% && npm install && pm2 restart cyd-admin && pm2 save"

        if %errorlevel% equ 0 (
            echo.
            echo ========================================
            echo   部署成功！
            echo ========================================
            echo.
            echo 访问地址：
            echo   - 商品管理: http://%ServerIP%:8899/product-connection.html
            echo   - 快速下单: http://%ServerIP%:8899/order-page.html
            echo.
        ) else (
            echo.
            echo 部署失败，请检查错误信息
        )
    ) else (
        echo.
        echo 上传失败，请检查网络连接或手动上传
        echo.
        echo 手动上传命令：
        echo   scp %TempDir%\* %Username%@%ServerIP%:%RemoteDir%/
    )
) else (
    echo    未找到SCP命令
    echo.
    echo ========================================
    echo   手动部署步骤
    echo ========================================
    echo.
    echo 步骤1：打开Git Bash
    echo.
    echo 步骤2：上传文件（输入密码：Aa462300）
    echo   执行：scp %TempDir%\* %Username%@%ServerIP%:%RemoteDir%/
    echo.
    echo 步骤3：连接服务器完成部署
    echo   执行：ssh %Username%@%ServerIP%
    echo   然后输入：
    echo   cd %RemoteDir%
    echo   npm install
    echo   pm2 restart cyd-admin
    echo.
)

echo.
echo 临时文件目录：%TempDir%
echo.
pause
