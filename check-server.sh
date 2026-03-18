#!/bin/bash

# 连接云服务器并查看项目文件
echo "正在连接云服务器..."

# 使用expect来自动输入密码
expect <<'EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no ubuntu@81.70.208.147
expect "password:"
send "Aa462300\r"
expect "$"
send "ls -la /app/\r"
expect "$"
send "cd /app && cat server.js | head -100\r"
expect "$"
send "exit\r"
expect eof
EOF
