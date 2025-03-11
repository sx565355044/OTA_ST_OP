# OTA Platform Strategy Optimization System (OTA平台促销策略优化系统)

这是一个专为酒店管理者设计的智能OTA（在线旅行社）平台促销策略优化系统。该系统利用参数化权重和AI驱动的分析，帮助酒店经理优化在各大OTA平台上的促销活动参与策略，提高收益和入住率。

## 目录

- [系统概述](#系统概述)
- [技术架构](#技术架构)
- [核心功能](#核心功能)
- [数据模型](#数据模型)
- [实现原理](#实现原理)
- [部署指南](#部署指南)
- [开发指南](#开发指南)

## 系统概述

该系统是一个全栈Web应用程序，专为酒店连锁管理者设计，用于优化在OTA平台（如携程、美团、飞猪等）上的促销活动参与策略。系统通过智能参数化权重（0-10分制）和AI分析，为用户提供最优的促销策略建议，以平衡短期收益和长期声誉。

### 主要功能亮点：

- **多平台OTA账户集中管理**：集中管理各大OTA平台的账户信息
- **实时活动监控与分析**：自动抓取和分析各平台最新促销活动
- **参数化策略权重系统**：通过关键参数调整优化策略生成
- **AI驱动的策略生成**：利用DeepSeek AI生成智能促销推荐
- **灵活的数据存储方案**：支持内存存储和PostgreSQL数据库

## 技术架构

### 前端技术栈

- **React.js**：用于构建用户界面的JavaScript库
- **TypeScript**：类型安全的JavaScript超集
- **TanStack Query (React Query)**：用于数据获取、缓存和状态管理
- **Shadcn UI + Tailwind CSS**：用于构建美观、响应式的用户界面
- **React Hook Form**：处理表单验证和提交
- **Zod**：用于数据验证
- **Wouter**：轻量级路由解决方案

### 后端技术栈

- **Express.js**：Node.js Web应用框架
- **TypeScript**：类型安全的JavaScript超集
- **Drizzle ORM**：类型安全的ORM，用于数据库操作
- **Passport.js**：认证中间件
- **Bcrypt**：密码哈希处理
- **PostgreSQL / 内存存储**：数据持久化

### 开发工具与库

- **Vite**：现代前端构建工具
- **ESBuild**：快速JavaScript打包工具
- **Node.js**：JavaScript运行环境
- **DeepSeek API**：用于AI驱动的策略生成

### 系统架构图

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  React 前端      │ ←──→ │  Express 后端   │ ←──→ │ 存储层           │
│  (客户端)        │      │  (服务器)        │      │ (内存/PostgreSQL)│
│                 │      │                 │      │                 │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                                  ↓
                         ┌─────────────────┐
                         │                 │
                         │  外部服务        │
                         │  - DeepSeek AI  │
                         │  - OTA 平台      │
                         │                 │
                         └─────────────────┘
```

## 核心功能

### 1. 用户认证与权限管理

- **认证系统**：基于Passport.js实现的本地认证
- **角色管理**：支持管理员和经理两种角色
- **安全会话**：使用express-session管理用户会话
- **密码加密**：使用bcrypt进行密码哈希和验证

#### 用户登录流程

1. **访问登录页面**：
   - 导航至系统的`/auth`页面
   - 系统默认内置三个测试账户：
     * 用户名：`admin`，密码：`admin123`，角色：管理员
     * 用户名：`总经理`，密码：`admin`，角色：经理
     * 用户名：`snorkeler`，密码：`admin`，角色：经理

2. **提交登录信息**：
   - 在登录表单中输入用户名和密码
   - 点击"登录"按钮提交信息
   - 系统验证凭据并创建用户会话

3. **自动跳转**：
   - 登录成功后自动跳转到系统主页面
   - 导航菜单将显示根据用户角色的可用功能

### 2. OTA账户管理

- **多平台支持**：支持携程、美团、飞猪等主流OTA平台
- **账户状态监控**：实时监控各账户连接状态
- **安全凭证存储**：密码加密存储确保安全

### 3. 促销活动管理

- **活动发现**：自动抓取各平台最新促销活动
- **活动分析**：分析活动时效性、折扣力度、佣金率等
- **参与状态跟踪**：追踪各活动的参与状态和进展

#### 获取OTA活动列表流程

1. **配置OTA账户**：
   - 登录系统后，首先进入"账户管理"页面
   - 点击"添加新账户"按钮，输入OTA平台的账户信息：
     * 平台名称（如"携程旅行"、"美团酒店"、"飞猪旅行"等）
     * 账户URL（平台的商户后台地址）
     * 用户名和密码（用于登录OTA平台的凭据）
     * 账户类型（"企业账户"或"商家账户"）
   - 提交表单后系统将加密存储账户信息

2. **抓取活动数据**：
   - 在"活动管理"页面，点击"刷新活动"按钮
   - 系统将使用已配置的OTA账户信息登录各平台
   - 自动抓取各平台当前可用的促销活动数据
   - 抓取的活动数据包括：名称、描述、开始和结束日期、折扣、佣金率、房型等信息

3. **查看活动列表**：
   - 抓取完成后，系统将在"活动管理"页面显示所有可用活动
   - 可通过平台名称、状态（进行中、待开始、已结束、未决定）等筛选活动
   - 点击活动可查看详细信息

#### 参与OTA活动流程

1. **评估活动价值**：
   - 在活动列表中选择感兴趣的活动
   - 点击"查看详情"按钮了解活动的完整信息
   - 系统显示该活动的所有相关信息，如折扣力度、佣金率、适用房型等

2. **生成策略建议**：
   - 点击"生成策略建议"按钮
   - 系统基于当前的参数权重设置分析该活动
   - AI引擎生成参与该活动的优势与劣势分析，以及建议的参与策略

3. **参与活动**：
   - 在活动详情页面，点击"参与活动"按钮
   - 确认参与后，活动状态将更新为"已参与"
   - 系统记录参与时间和负责人信息

4. **管理参与状态**：
   - 随时可在"活动管理"页面查看已参与活动的列表
   - 如需退出活动，点击"退出活动"按钮
   - 活动退出后，状态将更新为"未参与"，策略状态更新为"未决定"

> **注意**：活动参与功能会实际修改您在OTA平台上的促销参与状态。请确保在操作前已了解活动规则及对业务的影响。

### 4. 策略生成与优化

- **参数化权重系统**：调整以下关键参数（0-10分制）
  - 关注远期预定 (长期预订偏好)
  - 关注成本最小 (佣金率优化)
  - 关注展示最优 (平台展示效果)
  - 关注当日OCC (当日入住率)
  - 平衡长短期收益 (整体收益平衡)

#### 策略权重配置流程

1. **访问参数设置**：
   - 登录系统后，导航至"设置"页面的"策略参数"选项卡
   - 系统显示当前的五大核心参数及其权重值（0-10分制）

2. **调整参数权重**：
   - 根据酒店的业务优先级，调整各参数的权重值
   - 远期预定权重：增加此值以优先考虑未来日期的预订
   - 成本最小权重：增加此值以优先选择佣金较低的活动
   - 展示最优权重：增加此值以优先考虑平台展示效果更好的活动
   - 当日OCC权重：增加此值以优先提升当日入住率
   - 长短期平衡权重：增加此值以平衡即时收益与长期声誉

3. **保存设置**：
   - 点击"保存参数"按钮保存新的权重设置
   - 系统将记录更新时间和负责人信息
   - 所有后续生成的策略建议都将基于新的权重设置

- **AI驱动策略**：通过DeepSeek API生成优化策略
  - 分析历史数据和当前活动
  - 考虑用户设置的参数权重
  - 生成符合酒店特定需求的策略建议

### 5. 数据可视化与分析

- **仪表板**：展示关键业务指标和数据
- **活动分析**：分析各活动的表现和影响
- **策略评估**：评估已实施策略的成效

## 数据模型

系统使用Drizzle ORM进行数据建模和关系管理，核心数据模型包括：

### 用户(User)

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default('user'),
  hotel: text("hotel"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### OTA账户(OtaAccount)

```typescript
export const otaAccounts = pgTable("ota_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  url: text("url").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  accountType: text("account_type").notNull(),
  status: text("status").default("未连接"),
  lastUpdated: timestamp("last_updated"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 促销活动(Activity)

```typescript
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  platformId: integer("platform_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  discount: text("discount").notNull(),
  commissionRate: text("commission_rate").notNull(),
  roomTypes: text("room_types").array(),
  minimumStay: integer("minimum_stay"),
  maxBookingWindow: integer("max_booking_window"),
  status: text("status").notNull(),
  tag: text("tag"),
  participationStatus: text("participation_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 策略(Strategy)

```typescript
export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  advantages: text("advantages").array(),
  disadvantages: text("disadvantages").array(),
  recommendation: text("recommendation"),
  isRecommended: boolean("is_recommended"),
  pointsScore: numeric("points_score"),
  appliedAt: timestamp("applied_at"),
  appliedBy: text("applied_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 策略参数(StrategyParameter)

```typescript
export const strategyParameters = pgTable("strategy_parameters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  paramKey: text("param_key").notNull().unique(),
  value: numeric("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## 实现原理

### 存储机制

系统采用灵活的存储策略，支持两种模式：

1. **内存存储(MemStorage)**：
   - 适用于开发和测试环境
   - 数据存储在应用内存中，应用重启后重置
   - 实现了IStorage接口的所有方法
   - 包含默认测试数据

2. **PostgreSQL存储(PostgresStorage)**：
   - 适用于生产环境
   - 使用Drizzle ORM进行类型安全的数据库操作
   - 支持事务和关系查询
   - 通过环境变量切换

存储接口(IStorage)统一了两种实现，确保代码在不同环境中的一致性：

```typescript
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  // ... 其他方法
}
```

### 认证流程

系统使用Passport.js实现基于会话的认证，流程如下：

1. **用户登录**：
   - 客户端发送用户名和密码
   - 服务器验证凭据并创建会话
   - 会话ID通过cookie返回客户端

2. **会话维护**：
   - 客户端请求携带包含会话ID的cookie
   - 服务器验证会话有效性
   - 从会话中恢复用户状态

3. **用户注销**：
   - 销毁服务器端会话
   - 清除客户端cookie

### 策略生成流程

AI策略生成过程：

1. **数据收集**：
   - 收集用户的OTA活动数据
   - 获取用户设置的参数权重

2. **构建提示**：
   - 将数据转换为AI可理解的格式
   - 构建符合DeepSeek API要求的提示

3. **API调用**：
   - 使用DeepSeek API生成策略建议
   - 处理API响应和错误

4. **解析结果**：
   - 将AI响应解析为结构化数据
   - 保存生成的策略建议

5. **结果呈现**：
   - 向用户展示策略建议和分析

## 部署指南

### 环境要求

- Node.js v16+
- PostgreSQL 14+ (生产环境)
- DeepSeek API密钥 (用于AI功能)

### 环境变量

```
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
USE_POSTGRES=true  # 使用PostgreSQL，false则使用内存存储

# 会话配置
SESSION_SECRET=your_secret_key

# 认证配置
ALLOW_ANY_PASSWORD=false  # 开发模式下可设为true

# 外部服务
DEEPSEEK_API_KEY=your_api_key  # 用于AI功能
```

### 部署步骤

1. **克隆仓库**：
   ```bash
   git clone <repository-url>  # 或打开由JMok提供的zip文件
   cd ota-strategy-system
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **配置环境变量**：
   创建`.env`文件并设置必要的环境变量

4. **启动应用**：
   ```bash
   npm run dev  # 开发模式
   npm start    # 生产模式
   ```

## 开发指南

### 项目结构

```
/
├── client/               # 前端React应用
│   ├── src/
│   │   ├── components/   # UI组件
│   │   ├── contexts/     # React上下文
│   │   ├── hooks/        # 自定义钩子
│   │   ├── lib/          # 工具函数
│   │   ├── pages/        # 页面组件
│   │   └── App.tsx       # 应用入口
│
├── server/               # 后端Express应用
│   ├── services/         # 业务服务
│   ├── utils/            # 工具函数
│   ├── auth.ts           # 认证逻辑
│   ├── db.ts             # 数据库连接
│   ├── index.ts          # 服务器入口
│   ├── routes.ts         # API路由
│   ├── storage.ts        # 存储接口和实现
│   └── vite.ts           # Vite配置
│
├── shared/               # 前后端共享代码
│   └── schema.ts         # 数据模型定义
│
├── .env                  # 环境变量
└── package.json          # 项目配置
```

### 扩展功能指南

1. **添加新的OTA平台**：
   - 在OtaAccount模型中添加新字段
   - 实现平台特定的数据抓取逻辑

2. **自定义策略参数**：
   - 在strategyParameters表中添加新参数
   - 修改AI提示生成逻辑

3. **添加新角色**：
   - 扩展User模型中的role字段
   - 实现相应的权限检查逻辑

---

## 维护与支持

系统设计支持长期维护和扩展，主要考虑以下几点：

1. **模块化架构**：各组件高内聚低耦合，易于维护和扩展
2. **类型安全**：使用TypeScript和Zod确保代码的健壮性
3. **统一接口**：通过接口抽象确保实现的一致性
4. **详细日志**：系统各环节记录详细日志，便于问题排查

## 免责声明

本系统仅用于酒店OTA策略优化，不保证策略的绝对准确性。用户在实施任何策略前应结合自身业务情况进行判断。

## 技术人员联系

如有技术问题，请联系J MOK。

---

*©2025 OTA Strategy Optimization System. All Rights Reserved.*