@echo off
chcp 65001 >nul
echo === 持续推送脚本 ===
echo 每30秒重试一次，最多100次
echo 按 Ctrl+C 可随时停止
echo.
node push-continuous.js
pause
