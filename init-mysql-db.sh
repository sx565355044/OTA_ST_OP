#!/bin/bash

# 初始化MySQL数据库
# 使用方法: ./init-mysql-db.sh

echo "开始初始化MySQL数据库..."

# 读取.env文件中的配置
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "已加载.env文件中的配置"
else
  echo ".env文件不存在，将使用默认配置"
  MYSQL_HOST=localhost
  MYSQL_PORT=3306
  MYSQL_USER=root
  MYSQL_PASSWORD=""
  MYSQL_DATABASE=otainsight
fi

# 检查MySQL客户端是否可用
if ! command -v mysql &> /dev/null; then
  echo "错误: 找不到mysql命令，请确保已安装MySQL客户端"
  exit 1
fi

# 创建数据库
echo "正在创建数据库 $MYSQL_DATABASE..."

# 构建MySQL命令的连接参数
MYSQL_CONN="-h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER"
if [ -n "$MYSQL_PASSWORD" ]; then
  MYSQL_CONN="$MYSQL_CONN -p$MYSQL_PASSWORD"
fi

# 创建数据库（如果不存在）
mysql $MYSQL_CONN -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -ne 0 ]; then
  echo "错误: 创建数据库失败"
  exit 1
fi

echo "数据库 $MYSQL_DATABASE 创建成功"

# 运行Drizzle迁移
echo "正在使用Node.js执行数据库迁移..."
node -r tsx/register server/migrate-mysql.ts

if [ $? -ne 0 ]; then
  echo "错误: 数据库迁移失败"
  exit 1
fi

echo "MySQL数据库初始化完成!"
echo "现在可以使用 npm run dev 启动应用程序了"