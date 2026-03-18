#!/usr/bin/env node
/**
 * 性能优化模块
 * 提供各种性能优化功能
 */

const http = require('http');

// 缓存管理器
class CacheManager {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;
        this.ttl = options.ttl || 60000; // 默认1分钟
    }

    set(key, value, ttl = this.ttl) {
        // 如果缓存已满，删除最旧的项
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { value, expiresAt });
    }

    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        // 检查是否过期
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

// 连接池管理
class ConnectionPool {
    constructor(createConnection, options = {}) {
        this.createConnection = createConnection;
        this.maxConnections = options.maxConnections || 10;
        this.minConnections = options.minConnections || 2;
        this.pool = [];
        this.waitingQueue = [];
    }

    async getConnection() {
        // 如果有空闲连接，直接返回
        if (this.pool.length > 0) {
            return this.pool.pop();
        }

        // 如果未达到最大连接数，创建新连接
        if (this.pool.length < this.maxConnections) {
            return this.createConnection();
        }

        // 等待连接释放
        return new Promise((resolve, reject) => {
            this.waitingQueue.push({ resolve, reject });
        });
    }

    releaseConnection(connection) {
        // 如果有等待的请求，直接使用
        if (this.waitingQueue.length > 0) {
            const { resolve } = this.waitingQueue.shift();
            resolve(connection);
        } else {
            // 否则放回池中
            this.pool.push(connection);
        }
    }

    async closeAll() {
        const connections = [...this.pool, ...this.waitingQueue];
        this.pool = [];
        this.waitingQueue = [];

        for (const connection of connections) {
            try {
                if (connection && connection.end) {
                    await connection.end();
                }
            } catch (error) {
                console.error('关闭连接失败:', error);
            }
        }
    }
}

// 请求限流器
class RateLimiter {
    constructor(options = {}) {
        this.maxRequests = options.maxRequests || 100;
        this.windowMs = options.windowMs || 60000; // 默认1分钟
        this.requests = new Map();
    }

    middleware() {
        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();

            // 获取或初始化请求记录
            let record = this.requests.get(ip);

            if (!record || now > record.expiresAt) {
                record = {
                    count: 0,
                    expiresAt: now + this.windowMs
                };
                this.requests.set(ip, record);
            }

            // 检查请求次数
            if (record.count >= this.maxRequests) {
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: '请求过于频繁，请稍后再试'
                });
            }

            record.count++;
            next();
        };
    }

    reset(ip) {
        this.requests.delete(ip);
    }

    clear() {
        this.requests.clear();
    }
}

// 响应压缩
function compressionMiddleware() {
    return (req, res, next) => {
        let send = res.send;

        res.send = function (data) {
            // 检查客户端是否支持压缩
            const acceptEncoding = req.headers['accept-encoding'] || '';
            const supportsGzip = acceptEncoding.includes('gzip');

            if (supportsGzip && typeof data === 'string' && data.length > 1024) {
                const zlib = require('zlib');
                const compressed = zlib.gzipSync(data);

                res.setHeader('Content-Encoding', 'gzip');
                res.setHeader('Content-Length', compressed.length);
                send.call(this, compressed);
            } else {
                send.call(this, data);
            }
        };

        next();
    };
}

// 静态资源缓存
function staticCacheMiddleware(maxAge = 86400000) { // 默认1天
    return (req, res, next) => {
        // 只缓存GET请求
        if (req.method !== 'GET') {
            return next();
        }

        // 设置缓存头
        res.setHeader('Cache-Control', `public, max-age=${maxAge / 1000}`);
        res.setHeader('Expires', new Date(Date.now() + maxAge).toUTCString());

        next();
    };
}

// 数据库查询优化
const QueryOptimizer = {
    // 分页查询
    paginate(query, page = 1, pageSize = 20) {
        const offset = (page - 1) * pageSize;
        return `${query} LIMIT ${pageSize} OFFSET ${offset}`;
    },

    // 只查询需要的字段
    selectFields(fields) {
        return fields.join(', ');
    },

    // 使用索引提示
    useIndex(indexName) {
        return `USE INDEX (${indexName})`;
    },

    // 批量插入
    batchInsert(table, data) {
        if (data.length === 0) return '';

        const keys = Object.keys(data[0]);
        const placeholders = data.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
        const values = data.flatMap(item => keys.map(key => item[key]));

        return {
            sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders}`,
            values
        };
    }
};

// 性能监控
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }

    startTimer(label) {
        this.metrics.set(label, {
            startTime: process.hrtime(),
            endTime: null
        });
    }

    endTimer(label) {
        const metric = this.metrics.get(label);

        if (!metric) {
            return null;
        }

        metric.endTime = process.hrtime(metric.startTime);
        const duration = (metric.endTime[0] * 1000) + (metric.endTime[1] / 1000000); // 转换为毫秒

        return duration;
    }

    measure(label, fn) {
        this.startTimer(label);

        try {
            const result = fn();
            const duration = this.endTimer(label);

            console.log(`[性能监控] ${label}: ${duration.toFixed(2)}ms`);

            return result;
        } catch (error) {
            this.endTimer(label);
            throw error;
        }
    }

    async measureAsync(label, fn) {
        this.startTimer(label);

        try {
            const result = await fn();
            const duration = this.endTimer(label);

            console.log(`[性能监控] ${label}: ${duration.toFixed(2)}ms`);

            return result;
        } catch (error) {
            this.endTimer(label);
            throw error;
        }
    }

    getMetrics() {
        const metrics = {};

        for (const [label, metric] of this.metrics.entries()) {
            if (metric.endTime) {
                metrics[label] = {
                    duration: (metric.endTime[0] * 1000) + (metric.endTime[1] / 1000000)
                };
            }
        }

        return metrics;
    }

    clear() {
        this.metrics.clear();
    }
}

// 日志优化
class LogOptimizer {
    constructor(options = {}) {
        this.buffer = [];
        this.maxBufferSize = options.maxBufferSize || 100;
        this.flushInterval = options.flushInterval || 5000;
        this.logFile = options.logFile || 'app.log';

        // 定期刷新日志
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    log(message, level = 'INFO') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };

        this.buffer.push(logEntry);

        // 如果缓冲区满了，立即刷新
        if (this.buffer.length >= this.maxBufferSize) {
            this.flush();
        }
    }

    flush() {
        if (this.buffer.length === 0) {
            return;
        }

        const fs = require('fs');
        const logData = this.buffer.map(entry => {
            return `[${entry.timestamp}] [${entry.level}] ${entry.message}`;
        }).join('\n');

        fs.appendFileSync(this.logFile, logData + '\n');
        this.buffer = [];
    }

    destroy() {
        this.flush();
        clearInterval(this.flushTimer);
    }
}

// 导出模块
module.exports = {
    CacheManager,
    ConnectionPool,
    RateLimiter,
    compressionMiddleware,
    staticCacheMiddleware,
    QueryOptimizer,
    PerformanceMonitor,
    LogOptimizer
};
