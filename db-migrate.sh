#!/bin/bash

# PostgreSQL数据库迁移脚本
# 使用方法: ./db-migrate.sh

echo "开始执行PostgreSQL数据库迁移..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
  echo "错误: DATABASE_URL环境变量未设置"
  exit 1
fi

# 运行Drizzle迁移
echo "正在使用Node.js执行数据库迁移..."
npx tsx server/migrate.ts

if [ $? -ne 0 ]; then
  echo "错误: 数据库迁移失败"
  exit 1
fi

echo "PostgreSQL数据库迁移完成!"
echo "现在可以使用 npm run dev 启动应用程序了"