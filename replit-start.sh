#!/bin/bash

echo "正在准备OTA策略优化系统..."

# 确保上传目录存在
mkdir -p uploads
echo "已创建上传目录"

# 安装依赖
echo "正在安装依赖..."
npm install
echo "依赖安装完成"

# 启动MySQL服务
echo "正在启动MySQL服务..."
# 在Replit环境中，MySQL服务通常已经运行
# 如果需要手动启动，可以取消下面的注释
# mysqld_safe &
# sleep 5

# 设置MySQL环境变量
export MYSQL_HOST="localhost"
export MYSQL_PORT="3306"
export MYSQL_USER="root"
export MYSQL_PASSWORD=""
export MYSQL_DATABASE="otainsight"
export DATABASE_URL="mysql://root:@localhost:3306/otainsight"

# 创建数据库
echo "正在初始化数据库..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS otainsight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行数据库迁移
echo "正在执行数据库迁移..."
npx tsx server/migrate-mysql.ts

# 启动应用
echo "正在启动应用..."
npm run dev 