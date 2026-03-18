@echo off
chcp 65001 >nul
title 飞书报告自动推送
color 0A

echo.
echo ════════════════════════════════════════════════════════
echo   飞书报告自动推送脚本
echo ════════════════════════════════════════════════════════
echo.
echo 此脚本将每 30 秒尝试发送工作报告到飞书
echo 直到发送成功或您手动停止
echo.
echo 使用方法:
echo   1. 双击此脚本启动
echo   2. 脚本将在后台运行
echo   3. 如果发送成功,会显示 "发送成功!"
echo   4. 按 Ctrl+C 可停止脚本
echo.
echo ════════════════════════════════════════════════════════
echo.
echo 按任意键开始,或直接关闭窗口取消...
pause >nul

echo.
echo [正在启动...]
echo.

node auto-feishu-report.js continuous

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 脚本运行失败!
    echo.
    pause
)
