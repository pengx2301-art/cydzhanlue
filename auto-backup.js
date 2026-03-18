#!/usr/bin/env node
/**
 * 自动备份脚本
 * 用于备份系统文件和数据库
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

// 配置
const config = {
    backupDir: '/root/Claw/backup',
    maxBackups: 7, // 保留7天备份
    mysql: {
        host: 'localhost',
        user: 'root',
        password: 'your_password',
        database: 'claw'
    }
};

// 获取当前时间
function getCurrentTime() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// 创建备份目录
function createBackupDir() {
    const timestamp = getCurrentTime();
    const backupPath = path.join(config.backupDir, timestamp);

    if (!fs.existsSync(config.backupDir)) {
        fs.mkdirSync(config.backupDir, { recursive: true });
    }

    fs.mkdirSync(backupPath, { recursive: true });
    return backupPath;
}

// 备份文件
function backupFiles(backupPath) {
    console.log('备份文件...');

    const files = [
        'api-server.js',
        'admin.js',
        'supplier-manager.js',
        'kasushou-supplier.js',
        'kayixin-supplier.js',
        'kekebang-supplier.js',
        'user/login.html',
        'admin/login.html'
    ];

    files.forEach(file => {
        const source = path.join('/root/Claw', file);
        const dest = path.join(backupPath, file);

        if (fs.existsSync(source)) {
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(source, dest);
            console.log(`✓ ${file}`);
        }
    });
}

// 备份数据库
async function backupDatabase(backupPath) {
    console.log('备份数据库...');

    try {
        const connection = await mysql.createConnection(config.mysql);

        // 备份所有表
        const [tables] = await connection.query('SHOW TABLES');
        const database = config.mysql.database;

        for (const table of tables) {
            const tableName = Object.values(table)[0];
            const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);

            const data = JSON.stringify(rows, null, 2);
            const backupFile = path.join(backupPath, `${tableName}.json`);

            fs.writeFileSync(backupFile, data);
            console.log(`✓ ${tableName}`);
        }

        await connection.end();
    } catch (error) {
        console.error('数据库备份失败:', error.message);
    }
}

// 清理旧备份
function cleanOldBackups() {
    console.log('清理旧备份...');

    if (!fs.existsSync(config.backupDir)) {
        return;
    }

    const backups = fs.readdirSync(config.backupDir)
        .map(name => {
            const backupPath = path.join(config.backupDir, name);
            const stats = fs.statSync(backupPath);
            return { name, time: stats.mtime.getTime(), path: backupPath };
        })
        .sort((a, b) => b.time - a.time);

    // 删除超过保留数量的备份
    if (backups.length > config.maxBackups) {
        const oldBackups = backups.slice(config.maxBackups);
        oldBackups.forEach(backup => {
            fs.rmSync(backup.path, { recursive: true, force: true });
            console.log(`✓ 删除旧备份: ${backup.name}`);
        });
    }
}

// 生成备份报告
function generateBackupReport(backupPath) {
    const report = {
        timestamp: new Date().toISOString(),
        backupPath: backupPath,
        backupSize: 0,
        files: [],
        database: []
    };

    // 计算备份大小
    if (fs.existsSync(backupPath)) {
        const files = getAllFiles(backupPath);
        files.forEach(file => {
            const stats = fs.statSync(file);
            report.backupSize += stats.size;
            const relativePath = path.relative(backupPath, file);
            if (path.extname(file) === '.json') {
                report.database.push(relativePath);
            } else {
                report.files.push(relativePath);
            }
        });
    }

    const reportFile = path.join(backupPath, 'backup-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('备份报告:', reportFile);
    console.log(`备份大小: ${(report.backupSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`备份文件: ${report.files.length} 个`);
    console.log(`数据库表: ${report.database.length} 个`);
}

// 获取所有文件
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}

// 主函数
async function main() {
    console.log('====================================');
    console.log('   开始自动备份');
    console.log('====================================');
    console.log('');

    try {
        // 创建备份目录
        const backupPath = createBackupDir();
        console.log('备份目录:', backupPath);
        console.log('');

        // 备份文件
        backupFiles(backupPath);
        console.log('');

        // 备份数据库
        await backupDatabase(backupPath);
        console.log('');

        // 清理旧备份
        cleanOldBackups();
        console.log('');

        // 生成报告
        generateBackupReport(backupPath);
        console.log('');

        console.log('====================================');
        console.log('   ✅ 备份完成！');
        console.log('====================================');
    } catch (error) {
        console.error('备份失败:', error);
        process.exit(1);
    }
}

// 运行备份
if (require.main === module) {
    main();
}

module.exports = { main, backupFiles, backupDatabase };
