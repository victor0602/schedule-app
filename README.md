# Schedule App

课表系统 · Web / iOS / Android 全平台

## 架构

```
schedule-app/
├── apps/
│   ├── api/          NestJS 后端 + Prisma + Socket.io
│   └── mobile/       Expo (React Native + Web) 客户端
├── packages/
│   └── shared/       共享类型与常量
└── docs/design.md    设计文稿
```

技术栈：**NestJS 10 · Prisma 6 · SQLite · Socket.io 4 · Expo SDK 52 · expo-router · TanStack Query · Zustand · rrule.js**

## 快速开始

需要 **Node 20+**（注意：Node 25/22.6+ 因 type stripping 限制，需用 Node 20.x）。

### 1. 安装依赖
```bash
pnpm install
```

### 2. 初始化数据库
```bash
pnpm prisma:generate    # 生成 Prisma client
pnpm prisma:migrate     # 应用 migrations（首次会自动创建 dev.db）
```

### 3. 启动后端（端口 3000）
```bash
pnpm dev:api
```

### 4. 启动前端（Web 端，端口 8081）
```bash
pnpm dev:mobile:web
```
浏览器打开 http://localhost:8081

### 5. iOS Simulator（需要 macOS + Xcode）
```bash
pnpm dev:mobile:ios
```

### 6. Android Emulator
```bash
pnpm dev:mobile:android
```

## 功能清单

- 账号注册/登录（JWT）
- 创建/删除/重命名课表
- 添加课程：标题、教师、地点、颜色、起止时间、开始日期、按周循环
- 周视图展示
- 创建群组（自动生成邀请码）/ 通过邀请码加入
- 群组绑定共享课表，多人可查看/编辑
- 实时同步：成员修改课程，在线成员立即看到

## API 速查

| Method | Path | 用途 |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | 注册 |
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/refresh` | 刷新 token |
| POST | `/api/v1/auth/me` | 当前用户 |
| GET/POST | `/api/v1/schedules` | 课表列表/创建 |
| GET/PATCH/DELETE | `/api/v1/schedules/:id` | 课表详情/更新/删除 |
| GET | `/api/v1/schedules/:id/occurrences?from=&to=` | 展开某周 |
| GET/POST | `/api/v1/schedules/:id/courses` | 课程的增查 |
| PATCH/DELETE | `/api/v1/courses/:courseId` | 更新/删除 |
| GET/POST | `/api/v1/groups` | 群组 |
| POST | `/api/v1/groups/join` | 通过邀请码加入 |

WebSocket 事件：`subscribe` / `unsubscribe` / `course.created` / `course.updated` / `course.deleted` / `schedule.updated`

## 数据持久化

开发环境用 SQLite（`apps/api/dev.db`）。生产可切 Postgres：
- 改 `prisma/schema.prisma` 的 `datasource db`
- 改 `apps/api/.env` 的 `DATABASE_URL`

## 已知限制（待补）

- [ ] 单次循环例外（跳过某周、改某周时间）— 当前用 exdates 数组实现但 UI 未做
- [ ] 课程冲突检测
- [ ] iCal/CSV 导出
- [ ] 深链接（暂时移除了 `expo-linking` 插件避免 Node ESM 兼容问题，后续用 linking 的稳定版开启）
- [ ] 课程提醒
- [ ] 公开分享链接
- [ ] 单元测试

## 调试

- API 日志：直接看 `pnpm dev:api` 输出
- Mobile 日志：浏览器 console（Web 端）/ Metro terminal
- DB 可视化：`pnpm --filter @schedule/api prisma:studio`
