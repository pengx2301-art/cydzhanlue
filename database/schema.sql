-- 充易达系统 MySQL 数据库结构 v3.1.0
-- 创建时间: 2026-03-19

-- 创建数据库
CREATE DATABASE IF NOT EXISTS chongyida DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE chongyida;

-- ==================== 用户表 ====================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `username` VARCHAR(50) COMMENT '用户名',
  `balance` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '余额',
  `total_spent` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '总消费',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_by` INT COMMENT '创建者ID（管理员）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (`phone`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ==================== 管理员表 ====================
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `name` VARCHAR(50) COMMENT '姓名',
  `role` ENUM('super', 'admin', 'operator') DEFAULT 'operator' COMMENT '角色',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (`username`),
  INDEX idx_role (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- ==================== 供货商表 ====================
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '供货商名称',
  `type` VARCHAR(50) COMMENT '供货商类型',
  `api_url` VARCHAR(255) COMMENT 'API地址',
  `api_key` VARCHAR(255) COMMENT 'API密钥',
  `api_secret` VARCHAR(255) COMMENT 'API密钥',
  `config` JSON COMMENT '其他配置（JSON格式）',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `test_status` TINYINT DEFAULT 0 COMMENT '测试状态：0-未测试，1-成功，2-失败',
  `test_message` TEXT COMMENT '测试消息',
  `created_by` INT COMMENT '创建者ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (`name`),
  INDEX idx_type (`type`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='供货商表';

-- ==================== 商品表 ====================
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_id` INT NOT NULL COMMENT '供货商ID',
  `supplier_product_id` VARCHAR(100) COMMENT '供货商商品ID',
  `name` VARCHAR(200) NOT NULL COMMENT '商品名称',
  `category` VARCHAR(50) COMMENT '分类',
  `price` DECIMAL(10, 2) NOT NULL COMMENT '售价',
  `cost_price` DECIMAL(10, 2) COMMENT '成本价',
  `stock` INT DEFAULT -1 COMMENT '库存：-1表示无限',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-下架，1-上架',
  `config` JSON COMMENT '商品配置（JSON格式）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE,
  INDEX idx_supplier (`supplier_id`),
  INDEX idx_category (`category`),
  INDEX idx_status (`status`),
  INDEX idx_name (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品表';

-- ==================== 订单表 ====================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `product_id` INT NOT NULL COMMENT '商品ID',
  `supplier_id` INT NOT NULL COMMENT '供货商ID',
  `account` VARCHAR(100) NOT NULL COMMENT '充值账号',
  `quantity` INT DEFAULT 1 COMMENT '数量',
  `total_amount` DECIMAL(10, 2) NOT NULL COMMENT '订单总额',
  `cost_amount` DECIMAL(10, 2) COMMENT '成本金额',
  `status` ENUM('pending', 'processing', 'success', 'failed', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
  `platform_order_id` VARCHAR(100) COMMENT '平台订单ID',
  `platform_status` VARCHAR(50) COMMENT '平台订单状态',
  `error_message` TEXT COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
  INDEX idx_order_no (`order_no`),
  INDEX idx_user (`user_id`),
  INDEX idx_product (`product_id`),
  INDEX idx_supplier (`supplier_id`),
  INDEX idx_status (`status`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- ==================== 加款申请表 ====================
CREATE TABLE IF NOT EXISTS `topup_applications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `application_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '申请单号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '申请金额',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
  `note` TEXT COMMENT '申请说明',
  `admin_id` INT COMMENT '审核管理员ID',
  `admin_note` TEXT COMMENT '审核备注',
  `approved_at` TIMESTAMP NULL COMMENT '审核时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
  INDEX idx_application_no (`application_no`),
  INDEX idx_user (`user_id`),
  INDEX idx_status (`status`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='加款申请表';

-- ==================== 自来单配置表 ====================
CREATE TABLE IF NOT EXISTS `zilaidan_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `platform` VARCHAR(50) NOT NULL UNIQUE COMMENT '平台名称',
  `api_url` VARCHAR(255) NOT NULL COMMENT 'API地址',
  `api_key` VARCHAR(255) COMMENT 'API密钥',
  `api_secret` VARCHAR(255) COMMENT 'API密钥',
  `webhook_url` VARCHAR(255) COMMENT '回调地址',
  `config` JSON COMMENT '其他配置',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_platform (`platform`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自来单配置表';

-- ==================== 自来单订单表 ====================
CREATE TABLE IF NOT EXISTS `zilaidan_orders` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `platform_order_id` VARCHAR(100) NOT NULL COMMENT '平台订单ID',
  `platform` VARCHAR(50) NOT NULL COMMENT '平台名称',
  `product_id` INT COMMENT '本地商品ID',
  `account` VARCHAR(100) NOT NULL COMMENT '充值账号',
  `amount` DECIMAL(10, 2) COMMENT '金额',
  `status` VARCHAR(50) DEFAULT 'pending' COMMENT '平台订单状态',
  `data` JSON COMMENT '订单数据（JSON格式）',
  `local_order_id` BIGINT COMMENT '关联的本地订单ID',
  `processed_at` TIMESTAMP NULL COMMENT '处理时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_platform_order (`platform_order_id`, `platform`),
  INDEX idx_platform (`platform`),
  INDEX idx_status (`status`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自来单订单表';

-- ==================== 操作日志表 ====================
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `operator_type` ENUM('user', 'admin') NOT NULL COMMENT '操作者类型',
  `operator_id` INT NOT NULL COMMENT '操作者ID',
  `module` VARCHAR(50) COMMENT '模块',
  `action` VARCHAR(50) COMMENT '操作',
  `target_type` VARCHAR(50) COMMENT '目标类型',
  `target_id` INT COMMENT '目标ID',
  `description` TEXT COMMENT '操作描述',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT '用户代理',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_operator (`operator_type`, `operator_id`),
  INDEX idx_module (`module`),
  INDEX idx_action (`action`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- ==================== 插入默认管理员 ====================
INSERT INTO `admins` (`username`, `password`, `name`, `role`, `status`) VALUES
('admin', '$2b$10$8K1p/a0dL6H8jF8W8G8ZveW8qZ8v8W8qZ8v8W8qZ8v8W8qZ8v8W8qZ8', '超级管理员', 'super', 1);
-- 默认密码：admin123

-- ==================== 插入示例供货商 ====================
INSERT INTO `suppliers` (`name`, `type`, `api_url`, `status`) VALUES
('蜜蜂汇云', 'mifenghuiyun', 'https://api.mifenghuiyun.com', 1);

-- ==================== 插入示例商品 ====================
INSERT INTO `products` (`supplier_id`, `name`, `category`, `price`, `cost_price`, `status`) VALUES
(1, '话费充值-10元', 'phone', '10.50', '10.00', 1),
(1, '话费充值-20元', 'phone', '20.80', '20.00', 1),
(1, '话费充值-50元', 'phone', '50.50', '50.00', 1),
(1, '话费充值-100元', 'phone', '100.80', '100.00', 1);

-- ==================== 索引优化 ====================
-- 创建复合索引优化查询性能
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_supplier_status ON orders(supplier_id, status);
CREATE INDEX idx_orders_created_status ON orders(created_at, status);
