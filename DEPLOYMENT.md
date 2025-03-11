
# 酒店OTA活动管理系统部署指南

本文档提供了将酒店OTA活动管理系统部署到企业服务器的详细指南。

## 系统概述

本系统是一个面向酒店连锁经理的OTA平台促销活动管理工具，专门优化促销策略以最大化酒店收益。核心功能包括：

- **基于四个核心参数权重的AI策略优化**：
  - 关注远期预定（长期预订）：优先考虑长期预订周期效益
  - 关注成本最小（成本效率）：优先考虑推广成本和投入产出比
  - 关注展示最优（展示优化）：优先考虑在OTA平台的曝光度和展示效果
  - 关注当日OCC（入住率）：优先考虑短期内提高当前入住率
- **用户角色管理**：区分管理员和普通用户权限
- **OTA平台整合**：集中管理来自多个在线旅行平台的促销活动
- **策略模板**：保存常用策略配置以便快速应用

## 系统要求

- Node.js 18+ 
- npm 或 yarn
- PostgreSQL 数据库（或其他兼容的数据库）
- 企业级Web服务器（如Nginx, Apache等）

## 构建与部署步骤

### 1. 克隆代码库

```bash
git clone [您的企业代码仓库地址]
cd [项目目录]
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

创建一个`.env`文件，包含必要的环境变量：

```
# 数据库配置
DATABASE_URL=postgres://username:password@localhost:5432/database_name

# 应用配置
NODE_ENV=production
PORT=5000

# 安全配置
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_secure_session_secret

# DeepSeek API配置（如适用）
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 4. 构建前端资源

```bash
npm run build
```

这将生成优化的静态资源，存储在`dist`目录中。

### 5. 配置数据库

确保数据库已创建并运行，然后初始化数据库结构：

```bash
npm run db:push
```

### 6. 启动应用程序

#### 开发环境测试

```bash
npm run dev
```

#### 生产环境

```bash
npm run start
```

### 7. 配置Web服务器

#### Nginx配置示例

创建一个新的Nginx配置文件：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 静态资源处理（可选，如果前端直接由Node.js服务）
    location /assets {
        alias /path/to/your/project/dist/assets;
        expires 30d;
    }
}
```

### 8. 使用PM2进行进程管理（推荐）

安装PM2：

```bash
npm install -g pm2
```

创建PM2配置文件`ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: "ota-manager",
    script: "./dist/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    }
  }]
};
```

启动应用：

```bash
pm2 start ecosystem.config.js
```

设置开机自启：

```bash
pm2 startup
pm2 save
```

### 9. 设置HTTPS（强烈推荐）

获取SSL证书（可使用Let's Encrypt）并更新Nginx配置以支持HTTPS。

### 10. 部署后检查

- 访问您的网站确认应用正常运行
- 检查日志文件确认没有错误
- 测试关键功能如登录、活动管理等

## 更新部署

当需要更新应用时，执行以下步骤：

```bash
# 1. 拉取最新代码
git pull

# 2. 安装可能的新依赖
npm install

# 3. 重新构建前端
npm run build

# 4. 应用数据库更新（如有）
npm run db:push

# 5. 重启应用
pm2 restart ota-manager
```

## 故障排除

如遇到部署问题，请检查：

1. 日志文件（`pm2 logs`）
2. 数据库连接配置
3. 防火墙设置
4. 文件权限
5. Node.js和npm版本

## 联系支持

如需技术支持，请联系您的IT部门或系统管理员。

---

*最后更新: 2025年3月11日*
