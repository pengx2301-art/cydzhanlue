@echo off
setlocal enabledelayedexpansion

echo 开始清理桌面部署临时文件...
echo.

:: 要删除的文件列表
set "files[0]=check-dashboard.bat"
set "files[1]=check-port.bat"
set "files[2]=check-port.sh"
set "files[3]=create-login-v2.bat"
set "files[4]=create-login-v3.bat"
set "files[5]=create-login.bat"
set "files[6]=deploy-auto.ps1"
set "files[7]=deploy-commands.sh"
set "files[8]=deploy-final.bat"
set "files[9]=deploy-final.zip"
set "files[10]=deploy-ssh-key.sh"
set "files[11]=deploy.bat"
set "files[12]=deploy.zip"
set "files[13]=deploy2.zip"
set "files[14]=error-log.txt"
set "files[15]=get-error-v2.bat"
set "files[16]=get-error.bat"
set "files[17]=get-logs.js"
set "files[18]=list-files.bat"
set "files[19]=list-zip.bat"
set "files[20]=ls-dashboard.bat"
set "files[21]=move-dashboard.bat"
set "files[22]=open-firewall.bat"
set "files[23]=test-health.bat"
set "files[24]=upload-dashboard.bat"
set "files[25]=WorkBuddy.zip"

set /a count=0
set /a success=0
set /a failed=0

:loop
if defined files[%count%] (
    set "filename=!files[%count%]!"
    set "filepath=C:\Users\60496\Desktop\!filename!"
    
    echo 删除: !filename!
    del "!filepath!" 2>nul
    
    if exist "!filepath!" (
        echo   [失败] 文件仍然存在
        set /a failed+=1
    ) else (
        echo   [成功] 已删除
        set /a success+=1
    )
    echo.
    
    set /a count+=1
    goto loop
)

echo ========================================
echo 清理完成！
echo 成功删除: %success% 个文件
echo 删除失败: %failed% 个文件
echo ========================================
pause
