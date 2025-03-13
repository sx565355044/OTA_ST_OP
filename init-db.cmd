@echo off
echo 初始化MySQL数据库...

REM 检查MySQL命令是否可用
where mysql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo 错误: MySQL命令不可用，请确保MySQL已安装并添加到PATH中
  exit /b 1
)

REM 从.env文件读取配置
set MYSQL_USER=root
set MYSQL_PASSWORD=
set MYSQL_DATABASE=otainsight
set MYSQL_HOST=localhost

REM 如果.env文件存在，尝试读取配置
if exist .env (
  for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="MYSQL_USER" set MYSQL_USER=%%b
    if "%%a"=="MYSQL_PASSWORD" set MYSQL_PASSWORD=%%b
    if "%%a"=="MYSQL_DATABASE" set MYSQL_DATABASE=%%b
    if "%%a"=="MYSQL_HOST" set MYSQL_HOST=%%b
  )
)

REM 创建数据库
echo 创建数据库 %MYSQL_DATABASE%...
if "%MYSQL_PASSWORD%"=="" (
  mysql -h%MYSQL_HOST% -u%MYSQL_USER% -e "CREATE DATABASE IF NOT EXISTS %MYSQL_DATABASE% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
) else (
  mysql -h%MYSQL_HOST% -u%MYSQL_USER% -p%MYSQL_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %MYSQL_DATABASE% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
)

if %ERRORLEVEL% NEQ 0 (
  echo 错误: 创建数据库失败
  exit /b 1
)

echo 数据库 %MYSQL_DATABASE% 创建成功

REM 运行数据库迁移
echo 执行数据库迁移...
npx tsx server/migrate-mysql.ts

if %ERRORLEVEL% NEQ 0 (
  echo 错误: 数据库迁移失败
  exit /b 1
)

echo 数据库初始化完成!
echo 现在可以使用 npm run dev 启动应用程序了 