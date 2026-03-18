#!/usr/bin/env node
/**
 * 增强日志系统
 * 提供结构化日志、日志分级、日志轮转等功能
 */

const fs = require('fs');
const path = require('path');
const { format } = require('util');

// 日志级别
const LOG_LEVELS = {
    ERROR: { value: 0, color: '\x1b[31m', label: 'ERROR' },
    WARN: { value: 1, color: '\x1b[33m', label: 'WARN' },
    INFO: { value: 2, color: '\x1b[36m', label: 'INFO' },
    DEBUG: { value: 3, color: '\x1b[32m', label: 'DEBUG' },
    TRACE: { value: 4, color: '\x1b[90m', label: 'TRACE' }
};

class EnhancedLogger {
    constructor(options = {}) {
        this.logDir = options.logDir || path.join(__dirname, 'logs');
        this.logFile = options.logFile || 'app.log';
        this.logLevel = options.logLevel || 'INFO';
        this.maxSize = options.maxSize || 10 * 1024 * 1024; // 默认10MB
        this.maxFiles = options.maxFiles || 5; // 保留5个日志文件
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        this.enableStructured = options.enableStructured || false;

        // 确保日志目录存在
        if (this.enableFile) {
            this.ensureLogDirectory();
        }

        // 日志缓冲区
        this.buffer = [];
        this.bufferSize = options.bufferSize || 100;
        this.flushInterval = options.flushInterval || 5000;

        // 启动定期刷新
        if (this.enableFile) {
            this.startFlushTimer();
        }
    }

    // 确保日志目录存在
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    // 获取日志文件路径
    getLogFilePath() {
        return path.join(this.logDir, this.logFile);
    }

    // 检查日志级别
    shouldLog(level) {
        return LOG_LEVELS[level].value <= LOG_LEVELS[this.logLevel].value;
    }

    // 检查是否需要轮转
    shouldRotate() {
        if (!this.enableFile) return false;

        const filePath = this.getLogFilePath();
        if (!fs.existsSync(filePath)) return false;

        const stats = fs.statSync(filePath);
        return stats.size >= this.maxSize;
    }

    // 日志轮转
    rotate() {
        const filePath = this.getLogFilePath();

        // 删除最旧的日志文件
        const oldestFile = path.join(this.logDir, `${this.logFile}.${this.maxFiles}`);
        if (fs.existsSync(oldestFile)) {
            fs.unlinkSync(oldestFile);
        }

        // 重命名日志文件
        for (let i = this.maxFiles - 1; i >= 1; i--) {
            const oldFile = path.join(this.logDir, `${this.logFile}.${i}`);
            const newFile = path.join(this.logDir, `${this.logFile}.${i + 1}`);

            if (fs.existsSync(oldFile)) {
                fs.renameSync(oldFile, newFile);
            }
        }

        // 重命名当前日志文件
        if (fs.existsSync(filePath)) {
            const rotatedFile = path.join(this.logDir, `${this.logFile}.1`);
            fs.renameSync(filePath, rotatedFile);
        }
    }

    // 格式化日志消息
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logLevel = LOG_LEVELS[level];

        // 基础格式
        let formatted = `[${timestamp}] [${logLevel.label}] ${message}`;

        // 添加元数据
        if (Object.keys(meta).length > 0) {
            if (this.enableStructured) {
                // 结构化格式（JSON）
                const structured = {
                    timestamp,
                    level: logLevel.label,
                    message,
                    ...meta
                };
                formatted += ' ' + JSON.stringify(structured);
            } else {
                // 文本格式
                formatted += ' ' + format('%o', meta);
            }
        }

        return formatted;
    }

    // 写入日志
    write(level, message, meta = {}) {
        // 检查日志级别
        if (!this.shouldLog(level)) {
            return;
        }

        // 格式化消息
        const formatted = this.formatMessage(level, message, meta);

        // 输出到控制台
        if (this.enableConsole) {
            const logLevel = LOG_LEVELS[level];
            const colorized = `${logLevel.color}${formatted}\x1b[0m`;
            console.log(colorized);
        }

        // 添加到缓冲区
        if (this.enableFile) {
            this.buffer.push(formatted);

            // 如果缓冲区满了，立即刷新
            if (this.buffer.length >= this.bufferSize) {
                this.flush();
            }
        }
    }

    // 刷新缓冲区
    flush() {
        if (this.buffer.length === 0) {
            return;
        }

        // 检查是否需要轮转
        if (this.shouldRotate()) {
            this.rotate();
        }

        // 写入文件
        const filePath = this.getLogFilePath();
        const logData = this.buffer.join('\n') + '\n';

        fs.appendFileSync(filePath, logData);

        // 清空缓冲区
        this.buffer = [];
    }

    // 启动定期刷新
    startFlushTimer() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    // 停止日志记录
    destroy() {
        this.flush();

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
    }

    // 便捷方法
    error(message, meta) {
        this.write('ERROR', message, meta);
    }

    warn(message, meta) {
        this.write('WARN', message, meta);
    }

    info(message, meta) {
        this.write('INFO', message, meta);
    }

    debug(message, meta) {
        this.write('DEBUG', message, meta);
    }

    trace(message, meta) {
        this.write('TRACE', message, meta);
    }
}

// 创建日志实例
const logger = new EnhancedLogger({
    logDir: path.join(__dirname, 'logs'),
    logFile: 'app.log',
    logLevel: 'INFO',
    enableConsole: true,
    enableFile: true,
    enableStructured: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    bufferSize: 100,
    flushInterval: 5000
});

// 记录HTTP请求日志
function logRequest(req, res, next) {
    const startTime = Date.now();

    // 监听响应完成
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        };

        if (res.statusCode >= 500) {
            logger.error('HTTP请求错误', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('HTTP请求警告', logData);
        } else {
            logger.info('HTTP请求', logData);
        }
    });

    next();
}

// 记录数据库查询日志
function logQuery(query, params, duration) {
    logger.debug('数据库查询', {
        query: query.substring(0, 100), // 只显示前100个字符
        params: params ? JSON.stringify(params) : undefined,
        duration: `${duration}ms`
    });
}

// 记录错误日志
function logError(error, context = {}) {
    logger.error(error.message, {
        stack: error.stack,
        ...context
    });
}

// 记录业务日志
function logBusiness(action, data) {
    logger.info(`业务操作: ${action}`, data);
}

// 创建子日志记录器
function createChildLogger(name, options = {}) {
    return new EnhancedLogger({
        ...options,
        logFile: `${name}.log`,
        logDir: path.join(__dirname, 'logs', name)
    });
}

// 导出模块
module.exports = {
    EnhancedLogger,
    logger,
    logRequest,
    logQuery,
    logError,
    logBusiness,
    createChildLogger,
    LOG_LEVELS
};
