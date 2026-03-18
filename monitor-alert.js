#!/usr/bin/env node
/**
 * 监控告警脚本
 * 监控API服务器状态、性能和错误
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
    api: {
        host: 'localhost',
        port: 8899,
        endpoint: '/api/health'
    },
    pm2: {
        appName: 'api-server'
    },
    alert: {
        enabled: true, // 是否启用飞书通知
        webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/your_webhook_url' // 飞书webhook
    },
    check: {
        interval: 60000, // 检查间隔（毫秒）
        timeout: 5000, // 请求超时（毫秒）
        memoryThreshold: 500, // 内存阈值（MB）
        cpuThreshold: 80 // CPU阈值（%）
    }
};

// 日志文件
const logFile = path.join(__dirname, 'monitor.log');

// 写入日志
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    fs.appendFileSync(logFile, logMessage);
    console.log(logMessage.trim());
}

// 检查API健康状态
function checkAPIHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: config.api.host,
            port: config.api.port,
            path: config.api.endpoint,
            method: 'GET',
            timeout: config.check.timeout
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const health = JSON.parse(data);
                        if (health.status === 'ok') {
                            resolve({ status: 'healthy', data: health });
                        } else {
                            resolve({ status: 'unhealthy', data: health });
                        }
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve({ status: 'error', statusCode: res.statusCode, data });
                }
            });
        });

        req.on('error', (error) => {
            resolve({ status: 'error', error: error.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'timeout' });
        });

        req.end();
    });
}

// 检查PM2状态
function checkPM2Status() {
    return new Promise((resolve, reject) => {
        try {
            const { execSync } = require('child_process');
            const status = execSync('pm2 jlist').toString();
            const processes = JSON.parse(status);

            const apiProcess = processes.find(p => p.name === config.pm2.appName);

            if (!apiProcess) {
                resolve({ status: 'not_found' });
            } else if (apiProcess.pm2_env.status === 'online') {
                resolve({
                    status: 'running',
                    memory: apiProcess.monit.memory,
                    cpu: apiProcess.monit.cpu
                });
            } else {
                resolve({
                    status: 'stopped',
                    state: apiProcess.pm2_env.status
                });
            }
        } catch (error) {
            resolve({ status: 'error', error: error.message });
        }
    });
}

// 发送飞书告警
function sendFeishuAlert(title, message) {
    if (!config.alert.enabled) {
        log('飞书通知未启用', 'WARN');
        return;
    }

    const data = {
        msg_type: 'interactive',
        card: {
            config: {
                wide_screen_mode: true
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: `🚨 ${title}`
                },
                template: 'red'
            },
            elements: [
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: message
                    }
                },
                {
                    tag: 'action',
                    actions: [
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '查看日志'
                            },
                            type: 'primary',
                            url: 'http://81.70.208.147:8899/logs'
                        }
                    ]
                }
            ]
        }
    };

    const options = {
        hostname: 'open.feishu.cn',
        port: 443,
        path: '/open-apis/bot/v2/hook/your_webhook_url',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        res.on('end', () => {
            log('飞书告警发送成功');
        });
    });

    req.on('error', (error) => {
        log('飞书告警发送失败: ' + error.message, 'ERROR');
    });

    req.write(JSON.stringify(data));
    req.end();
}

// 性能监控
async function monitorPerformance() {
    const pm2Status = await checkPM2Status();

    if (pm2Status.status === 'running') {
        const memoryMB = pm2Status.memory / 1024 / 1024;
        const cpuPercent = pm2Status.cpu;

        // 检查内存
        if (memoryMB > config.check.memoryThreshold) {
            const message = `API服务器内存使用过高\n` +
                          `当前内存: ${memoryMB.toFixed(2)} MB\n` +
                          `阈值: ${config.check.memoryThreshold} MB`;
            log(message, 'WARN');
            sendFeishuAlert('内存告警', message);
        }

        // 检查CPU
        if (cpuPercent > config.check.cpuThreshold) {
            const message = `API服务器CPU使用过高\n` +
                          `当前CPU: ${cpuPercent.toFixed(2)}%\n` +
                          `阈值: ${config.check.cpuThreshold}%`;
            log(message, 'WARN');
            sendFeishuAlert('CPU告警', message);
        }

        log(`性能正常 - 内存: ${memoryMB.toFixed(2)} MB, CPU: ${cpuPercent.toFixed(2)}%`);
    }
}

// 主监控循环
async function monitor() {
    log('开始监控...');

    // 检查API健康状态
    const apiHealth = await checkAPIHealth();

    if (apiHealth.status === 'healthy') {
        log('API服务器状态正常');
    } else {
        const message = `API服务器状态异常\n` +
                      `状态: ${apiHealth.status}\n` +
                      `数据: ${JSON.stringify(apiHealth.data || apiHealth.error)}`;
        log(message, 'ERROR');
        sendFeishuAlert('API告警', message);

        // 尝试重启
        try {
            const { execSync } = require('child_process');
            execSync('pm2 restart api-server');
            log('API服务器已重启', 'INFO');
        } catch (error) {
            log('重启失败: ' + error.message, 'ERROR');
        }
    }

    // 监控性能
    await monitorPerformance();
}

// 启动监控
function startMonitoring() {
    log('====================================');
    log('   监控告警系统启动');
    log('====================================');
    log('');

    // 立即执行一次
    monitor();

    // 定期检查
    setInterval(() => {
        monitor();
    }, config.check.interval);
}

// 如果直接运行
if (require.main === module) {
    startMonitoring();
}

module.exports = {
    monitor,
    checkAPIHealth,
    checkPM2Status,
    sendFeishuAlert
};
