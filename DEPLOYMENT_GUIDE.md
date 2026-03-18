# 🚀 充易达系统 - 云服务器快速部署指南

**服务器信息：**
- 公网 IP: `81.70.208.147`
- 用户名: `ubuntu`
- 密码: `Aa462300`
- 系统: Ubuntu 22.04 LTS

---

## 📋 部署前准备

### 1. 确认项目目录
```
当前目录: c:/Users/60496/WorkBuddy/Claw/
项目路径: c:/Users/60496/WorkBuddy/Claw/WorkBuddy/20260317184320/WorkBuddy/20260315203305/
```

### 2. 确认必要文件
```
✅ server.js
✅ cyd.json
✅ package.json
✅ backup-database.js
✅ backup-scheduler.js
✅ generate-api-docs.js
```

---

## 🎯 部署方式

### 方式 A：自动部署脚本（推荐）

#### Windows PowerShell 脚本
```powershell
# 1. 打开 PowerShell
# 2. 进入项目目录
cd c:/Users/60496/WorkBuddy/Claw

# 3. 执行部署脚本
.\deploy-to-cloud.ps1

# 如果提示无法执行脚本，运行：
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

#### Bash 脚本 (Linux/Mac/Git Bash)
```bash
# 1. 进入项目目录
cd c:/Users/60496/WorkBuddy/Claw

# 2. 添加执行权限
chmod +x deploy-to-cloud.sh

# 3. 执行部署脚本
./deploy-to-cloud.sh
```

---

### 方式 B：手动部署（备用方案）

如果自动脚本遇到问题，可以手动执行以下步骤：

#### 步骤 1: 连接服务器
```bash
ssh ubuntu@81.70.208.147
# 输入密码: Aa462300
```

#### 步骤 2: 更新系统
```bash
sudo apt update
sudo apt upgrade -y
```

#### 步骤 3: 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x
npm --version
```

#### 步骤 4: 安装 PM2
```bash
sudo npm install -g pm2
```

#### 步骤 5: 创建项目目录
```bash
sudo mkdir -p /app
sudo chown ubuntu:ubuntu /app
```

#### 步骤 6: 上传项目文件（在本地执行）
```bash
# 在本地 PowerShell 中执行
cd c:/Users/60496/WorkBuddy/Claw\WorkBuddy\20260317184320\WorkBuddy\20260315203305

# 创建压缩包
Compress-Archive -Path server.js, cyd.json, package.json, backup-database.js, backup-scheduler.js, generate-api-docs.js -DestinationPath ..\..\..\deploy.zip

# 上传到服务器
scp deploy.zip ubuntu@81.70.208.147:/app/

# 清理本地压缩包
Remove-Item deploy.zip
```

#### 步骤 7: 解压和安装依赖（在服务器执行）
```bash
cd /app
unzip deploy.zip
rm deploy.zip

# 安装依赖
npm install
```

#### 步骤 8: 启动服务
```bash
# 使用 PM2 启动
sudo pm2 start server.js --name "cyd-admin" --max-memory-restart 1G -- --max-old-space-size=1536

# 保存配置
sudo pm2 save

# 设置开机自启
sudo pm2 startup ubuntu -u ubuntu --hp /home/ubuntu
```

---

## ✅ 部署后验证

### 1. 健康检查
```bash
# 在浏览器访问
http://81.70.208.147:8899/api/health

# 或使用 curl
curl http://81.70.208.147:8899/api/health
```

**预期响应：**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2026-03-18T...",
  "cache": {
    "hits": 0,
    "misses": 0,
    "hit_rate": "N/A"
  }
}
```

### 2. 版本信息
```bash
http://81.70.208.147:8899/api/version
```

### 3. PM2 状态
```bash
ssh ubuntu@81.70.208.147 "sudo pm2 list"
```

**预期输出：**
```
┌────┬──────────────┬──────────┬──────┬───────┬───────────┬───────────┐
│ id │ name         │ version  │ mode │ status │ cpu       │ memory    │
├────┼──────────────┼──────────┼──────┼───────┼───────────┼───────────┤
│ 0  │ cyd-admin    │ 1.0.0    │ fork │ online │ 0%        │ 150MB     │
└────┴──────────────┴──────────┴──────┴───────┴───────────┴───────────┘
```

---

## 🔧 常用管理命令

### 连接服务器
```bash
ssh ubuntu@81.70.208.147
```

### 查看日志
```bash
# 查看实时日志
ssh ubuntu@81.70.208.147 "sudo pm2 logs"

# 查看错误日志
ssh ubuntu@81.70.208.147 "sudo pm2 logs err"

# 查看标准输出日志
ssh ubuntu@81.70.208.147 "sudo pm2 logs out"
```

### 重启服务
```bash
ssh ubuntu@81.70.208.147 "sudo pm2 restart cyd-admin"
```

### 停止服务
```bash
ssh ubuntu@81.70.208.147 "sudo pm2 stop cyd-admin"
```

### 删除服务
```bash
ssh ubuntu@81.70.208.147 "sudo pm2 delete cyd-admin"
```

### 查看详细信息
```bash
ssh ubuntu@81.70.208.147 "sudo pm2 show cyd-admin"
```

---

## 🐛 常见问题

### 问题 1: SSH 连接失败
**症状：** `Connection refused` 或 `Connection timeout`

**解决方案：**
1. 检查服务器是否已开机
2. 确认 IP 地址正确：`81.70.208.147`
3. 检查防火墙是否开放 22 端口
4. 确认用户名和密码正确

### 问题 2: Node.js 安装失败
**症状：** `curl: command not found`

**解决方案：**
```bash
sudo apt update
sudo apt install -y curl
```

### 问题 3: PM2 启动失败
**症状：** `PM2 not found`

**解决方案：**
```bash
sudo npm install -g pm2
# 或者
npm install -g pm2
```

### 问题 4: 端口被占用
**症状：** `EADDRINUSE: address already in use`

**解决方案：**
```bash
# 查找占用端口的进程
sudo lsof -i :8899

# 杀死进程
sudo kill -9 <PID>

# 重新启动 PM2
sudo pm2 restart cyd-admin
```

### 问题 5: 权限不足
**症状：** `Permission denied`

**解决方案：**
```bash
# 使用 sudo
sudo pm2 start server.js

# 或者切换到 root 用户
sudo su -
```

### 问题 6: 内存不足
**症状：** `JavaScript heap out of memory`

**解决方案：**
```bash
# 限制内存使用
node --max-old-space-size=1536 server.js

# 或在 PM2 配置中添加
max_memory_restart: '1G'
```

---

## 🔒 安全建议

### 1. 修改 SSH 端口
```bash
sudo nano /etc/ssh/sshd_config

# 修改 Port 22 为其他端口（如 2222）
Port 2222

# 重启 SSH
sudo systemctl restart sshd
```

### 2. 配置防火墙
```bash
# 安装 UFW
sudo apt install -y ufw

# 允许必要端口
sudo ufw allow 22/tcp
sudo ufw allow 8899/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 3. 配置 Nginx 反向代理（可选）
```bash
# 安装 Nginx
sudo apt install -y nginx

# 配置文件
sudo nano /etc/nginx/sites-available/cyd-admin

# 添加以下内容
server {
    listen 80;
    server_name 81.70.208.147;

    location / {
        proxy_pass http://localhost:8899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 启用配置
sudo ln -s /etc/nginx/sites-available/cyd-admin /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 📊 性能监控

### 查看系统资源
```bash
# CPU 和内存
ssh ubuntu@81.70.208.147 "htop"

# 或使用 top
ssh ubuntu@81.70.208.147 "top"

# 磁盘空间
ssh ubuntu@81.70.208.147 "df -h"

# 内存使用
ssh ubuntu@81.70.208.147 "free -h"
```

### PM2 监控
```bash
ssh ubuntu@81.70.208.147 "sudo pm2 monit"
```

---

## 🎉 部署成功

恭喜！充易达系统已成功部署到云服务器。

**访问地址：**
- 主页: http://81.70.208.147:8899
- 健康检查: http://81.70.208.147:8899/api/health
- 版本信息: http://81.70.208.147:8899/api/version

**下一步：**
- 测试所有功能
- 配置域名（可选）
- 设置 SSL 证书（可选）
- 配置定时备份
- 设置监控告警

---

**部署完成时间：** 2026-03-18
**技术支持：** WorkBuddy AI
