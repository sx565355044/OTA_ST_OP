#!/bin/bash
echo "开始初始化数据库数据..."
npx tsx server/migrate.ts
echo "数据库初始化完成"
