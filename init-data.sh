#!/bin/bash

# 初始化MySQL数据库
# 在Windows环境下使用bash或直接执行命令
if [ -f "init-mysql-db.sh" ]; then
  # 如果在bash环境中
  bash ./init-mysql-db.sh
else
  # 直接执行命令
  echo "初始化MySQL数据库..."
  # 创建数据库
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS otainsight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  echo "数据库创建成功"
fi

# 初始化基础数据
echo "初始化基础数据..."
npx tsx server/migrate-mysql.ts
