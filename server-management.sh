#!/bin/bash
# ====================================
#   服务器管理脚本
#   包含所有优化功能
# ====================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="/root/Claw"

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查PM2状态
check_pm2_status() {
    log_info "检查PM2状态..."
    pm2 status
}

# 查看日志
view_logs() {
    log_info "查看API服务器日志..."
    pm2 logs api-server --lines 50 --nostream
}

# 查看资源使用
monitor_resources() {
    log_info "查看资源使用..."
    pm2 monit
}

# 重启服务
restart_service() {
    log_info "重启API服务器..."
    pm2 restart api-server
    log_info "服务已重启"
}

# 停止服务
stop_service() {
    log_info "停止API服务器..."
    pm2 stop api-server
    log_info "服务已停止"
}

# 启动服务
start_service() {
    log_info "启动API服务器..."
    cd $PROJECT_DIR
    pm2 start api-server.js --name api-server --watch
    log_info "服务已启动"
}

# 运行自动备份
run_backup() {
    log_info "运行自动备份..."
    cd $PROJECT_DIR
    node auto-backup.js
}

# 启动监控
start_monitor() {
    log_info "启动监控告警系统..."
    cd $PROJECT_DIR
    nohup node monitor-alert.js > monitor.log 2>&1 &
    log_info "监控已启动"
}

# 停止监控
stop_monitor() {
    log_info "停止监控告警系统..."
    pkill -f monitor-alert.js
    log_info "监控已停止"
}

# 清理日志
clean_logs() {
    log_info "清理旧日志..."
    cd $PROJECT_DIR
    find logs -name "*.log.*" -mtime +7 -delete
    log_info "旧日志已清理"
}

# 查看磁盘使用
check_disk() {
    log_info "查看磁盘使用情况..."
    df -h
}

# 查看内存使用
check_memory() {
    log_info "查看内存使用情况..."
    free -h
}

# 查看端口占用
check_ports() {
    log_info "查看端口占用情况..."
    netstat -tlnp | grep -E ':(8899|22|3306)'
}

# 系统更新
update_system() {
    log_info "更新系统包..."
    apt-get update && apt-get upgrade -y
    log_info "系统已更新"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    cd $PROJECT_DIR
    npm install
    log_info "依赖已安装"
}

# 数据库备份
backup_database() {
    log_info "备份数据库..."
    BACKUP_DIR="$PROJECT_DIR/backup/database"
    mkdir -p $BACKUP_DIR

    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    mysqldump -u root -p'your_password' claw > "$BACKUP_DIR/claw_$TIMESTAMP.sql"

    log_info "数据库已备份到: $BACKUP_DIR/claw_$TIMESTAMP.sql"
}

# 数据库恢复
restore_database() {
    if [ -z "$1" ]; then
        log_error "请指定备份文件路径"
        exit 1
    fi

    log_info "恢复数据库: $1"
    mysql -u root -p'your_password' claw < "$1"
    log_info "数据库已恢复"
}

# 查看慢查询
show_slow_queries() {
    log_info "查看慢查询日志..."
    if [ -f "/var/log/mysql/mysql-slow.log" ]; then
        tail -50 /var/log/mysql/mysql-slow.log
    else
        log_warn "慢查询日志不存在"
    fi
}

# 优化数据库
optimize_database() {
    log_info "优化数据库..."
    mysql -u root -p'your_password' claw -e "OPTIMIZE TABLE users, orders, suppliers, products, agents, finance;"
    log_info "数据库已优化"
}

# 性能测试
performance_test() {
    log_info "运行性能测试..."
    cd $PROJECT_DIR

    # 测试API响应时间
    echo "测试API响应时间..."
    for i in {1..10}; do
        START=$(date +%s%N)
        curl -s http://localhost:8899/api/health > /dev/null
        END=$(date +%s%N)
        DURATION=$(( ($END - $START) / 1000000 ))
        echo "请求 $i: ${DURATION}ms"
    done

    # 查看资源使用
    echo ""
    log_info "查看资源使用..."
    pm2 show api-server
}

# 安全检查
security_check() {
    log_info "运行安全检查..."

    # 检查开放端口
    echo "开放端口:"
    netstat -tlnp | grep LISTEN

    # 检查失败登录
    echo ""
    echo "失败登录尝试:"
    lastb | head -20

    # 检查系统更新
    echo ""
    echo "待更新包:"
    apt list --upgradable 2>/dev/null | head -10
}

# 系统信息
system_info() {
    log_info "系统信息..."
    echo ""
    echo "操作系统:"
    cat /etc/os-release | grep PRETTY_NAME

    echo ""
    echo "内核版本:"
    uname -r

    echo ""
    echo "CPU信息:"
    lscpu | grep "Model name"

    echo ""
    echo "内存信息:"
    free -h

    echo ""
    echo "磁盘信息:"
    df -h
}

# 清理缓存
clear_cache() {
    log_info "清理系统缓存..."
    sync
    echo 3 > /proc/sys/vm/drop_caches
    log_info "缓存已清理"
}

# 设置定时任务
setup_cron() {
    log_info "设置定时任务..."

    # 每天凌晨2点备份
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_DIR && node auto-backup.js") | crontab -

    # 每小时清理日志
    (crontab -l 2>/dev/null; echo "0 * * * * cd $PROJECT_DIR && bash server-management.sh clean_logs") | crontab -

    # 每天凌晨3点优化数据库
    (crontab -l 2>/dev/null; echo "0 3 * * * cd $PROJECT_DIR && bash server-management.sh optimize_database") | crontab -

    log_info "定时任务已设置"
}

# 查看定时任务
view_cron() {
    log_info "查看定时任务..."
    crontab -l
}

# 帮助信息
show_help() {
    echo "===================================="
    echo "   服务器管理脚本"
    echo "===================================="
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  status          查看PM2状态"
    echo "  logs            查看日志"
    echo "  monitor         查看资源使用"
    echo "  restart         重启服务"
    echo "  stop            停止服务"
    echo "  start           启动服务"
    echo "  backup          运行自动备份"
    echo "  monitor-start   启动监控"
    echo "  monitor-stop    停止监控"
    echo "  clean-logs      清理日志"
    echo "  disk            查看磁盘使用"
    echo "  memory          查看内存使用"
    echo "  ports           查看端口占用"
    echo "  update          更新系统"
    echo "  install         安装依赖"
    echo "  db-backup       备份数据库"
    echo "  db-restore      恢复数据库"
    echo "  db-slow         查看慢查询"
    echo "  db-optimize     优化数据库"
    echo "  perf-test       性能测试"
    echo "  security        安全检查"
    echo "  info            系统信息"
    echo "  clear-cache     清理缓存"
    echo "  cron-setup      设置定时任务"
    echo "  cron-view       查看定时任务"
    echo "  help            显示帮助信息"
    echo ""
}

# 主函数
main() {
    case "$1" in
        status)
            check_pm2_status
            ;;
        logs)
            view_logs
            ;;
        monitor)
            monitor_resources
            ;;
        restart)
            restart_service
            ;;
        stop)
            stop_service
            ;;
        start)
            start_service
            ;;
        backup)
            run_backup
            ;;
        monitor-start)
            start_monitor
            ;;
        monitor-stop)
            stop_monitor
            ;;
        clean-logs)
            clean_logs
            ;;
        disk)
            check_disk
            ;;
        memory)
            check_memory
            ;;
        ports)
            check_ports
            ;;
        update)
            update_system
            ;;
        install)
            install_dependencies
            ;;
        db-backup)
            backup_database
            ;;
        db-restore)
            restore_database "$2"
            ;;
        db-slow)
            show_slow_queries
            ;;
        db-optimize)
            optimize_database
            ;;
        perf-test)
            performance_test
            ;;
        security)
            security_check
            ;;
        info)
            system_info
            ;;
        clear-cache)
            clear_cache
            ;;
        cron-setup)
            setup_cron
            ;;
        cron-view)
            view_cron
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
