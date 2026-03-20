# 修复SSH密钥权限并测试连接
$keyPath = "C:\Users\60496\Desktop\chongyida.pem"

Write-Host "修复SSH密钥权限..." -ForegroundColor Cyan

# 删除继承权限
icacls $keyPath /inheritance:r
# 只给当前用户读取权限
icacls $keyPath /grant:r "${env:USERNAME}:(R)"

Write-Host "权限修复完成" -ForegroundColor Green

# 测试SSH连接
Write-Host "测试SSH连接..." -ForegroundColor Cyan
ssh -i $keyPath -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@81.70.208.147 "echo 连接成功 && hostname"
