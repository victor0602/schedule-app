# 课表系统设计文稿

> 内部使用 · 不超过 100 人 · Web 优先 · 预留全平台扩展
> 文档版本 v0.3 · 2026-06-06

---

## 1. 概述

### 1.1 目标
为内部小团队（≤100 人）提供一个**可独立编辑、可群组共享、动态实时同步**的课表系统。
使用者既可以维护自己的私人课表，也可以被邀请加入一个共享课表，查看或共同编辑他人的课表。

### 1.2 核心特性（一句话版）
- **个人维度**：一个账号 = N 个课表，课表里放课程。
- **协作维度**：把账号拉进一个**群组（Group）**，群组绑定一个**共享课表**。
- **时间维度**：课程按**循环规则**（RRULE）展开，不存具体每次的实例。
- **同步维度**：任何变更通过 **WebSocket 推送**，在线成员即时看到。

### 1.3 范围与非目标
| 范围 | 非目标（本期不做） |
| --- | --- |
| 课表 CRUD、循环、冲突检测 | 排课算法/自动排课 |
| 群组共享、实时同步 | 通知中心、邮件/短信提醒 |
| 简单的导出（iCal、CSV） | 复杂报表、考勤、签到 |
| 账号密码 + 邀请码 | OAuth、SSO、多租户 |

---

## 2. 领域模型

把概念先理清，技术实现才不会乱。

```
User ──┬── owns ──▶ Schedule (private)
       └── member of ──▶ Group ──▶ Schedule (shared)

Schedule ── 1:N ──▶ Course ── 1:1 ──▶ RecurrenceRule
                                          │
                                          ▼
                              CourseOccurrence（运行时展开，不落库）
```

四个核心实体：

| 实体 | 含义 |
| --- | --- |
| **User** | 账号 |
| **Schedule** | 课表。一个用户可拥有多个；课表要么 `private` 要么 `group` |
| **Group** | 群组。`name` + `member[]`，绑定一个 Schedule（群组课表） |
| **Course** | 课程。`title, teacher, location, color, startTime, endTime, recurrenceRule` |

> **关键设计**：课表只存**模板**（一条 Course = 一次循环规则），不存每一周的具体实例。展示时由前端/后端按 RRULE 展开到指定周。
> 这样改动一次循环规则，N 周全部生效，避免数据冗余和同步问题。

---

## 3. 功能需求

### P0（MVP，必须有）✅ 部分完成

1. ✅ 注册 / 登录（账号+密码，bcrypt 哈希，JWT 鉴权）
2. ✅ 创建个人课表，课表增删改查
3. ✅ 添加课程：标题、教师、地点、颜色、周几、开始/结束时间、开始/结束日期
4. ✅ 课程按周循环展示（周视图）
5. ✅ 创建群组，添加成员，群组绑定一个共享课表
6. ✅ 群组成员对共享课表有查看权限
7. ✅ 实时同步：成员 A 修改课程，成员 B 在线立即看到
8. ❌ iCal / CSV 导出——**未实现**

### P1（很快要）🚧 部分完成

- ✅ 角色：群组内 `owner / editor / viewer`
- ❌ 课程冲突检测——**未实现**
- 🚧 单次例外：跳过某一周（`exdates` 后端读写就绪，前端 UI 入口未做）；单独改某一周的时间（未建 `CourseException` 表）
- ❌ 课表快照——**未实现**

### P2（远期）

- ✅ 移动端——**已完成**（Expo React Native + Web 一套代码）
- ❌ 课程提醒（服务端定时任务 + 推送）
- ❌ 公开分享链接（只读）
- ❌ 课表导入（解析图片/Excel）

---

## 4. 技术选型

按"小而稳、零运维、可演进"原则选型。

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 前端 | **Expo SDK 52 (React Native + Web) + expo-router** | 一套代码覆盖 iOS/Android/Web；typedRoutes 编译期路由安全 |
| UI | **React Native StyleSheet + 自建组件**（Button、Input、WeekView 等） | 统一的主题 token（colors/spacing/radius/shadow）、跨平台一致的视觉 |
| 状态/数据 | **TanStack Query + Zustand** | Query 管服务器态，Zustand 管 UI 态，比 Redux 轻 |
| 实时 | **Socket.io-client** | 自动重连、房间（room）机制天然适配群组 |
| 后端 | **NestJS + TypeScript** | 模块化清晰（Auth / Schedule / Course / Group / Realtime 各模块），后期拆微服务方便；TS 与前端同语言 |
| ORM | **Prisma** | 类型安全、迁移简单 |
| 数据库 | **SQLite (开发) → PostgreSQL (生产)** | 100 人 SQLite 毫无压力；Prisma schema 几乎不用改就能切 PG |
| 实时服务 | **Socket.io (服务端)** | 房间 = `schedule:{id}`，成员订阅对应房间 |
| 部署 | **Docker Compose**（nginx + node + sqlite volume） | 一台 1C2G 服务器足够 |
| 时间规则 | **rrule.js** | iCalendar RFC 5545 标准实现，导出 iCal 也用它 |

> **不选** Next.js：内部小项目不需要 SSR，Expo Web 的 Metro 打包即开即用。
> **不选** GraphQL：REST + WebSocket 完全够，避免过度设计。

---

## 5. 系统架构

```
┌─────────────────────────────────────────────────┐
│          Mobile App (Expo + React Native)        │
│  expo-router + TanStack Query + Socket.io        │
│         ┌─────────────┐  ┌──────────────┐       │
│         │  iOS / Android │  │  Web (Metro)  │    │
│         └─────────────┘  └──────────────┘       │
└──────────────┬──────────────────┬────────────────┘
               │ HTTPS (REST)     │ WSS
               ▼                  ▼
┌─────────────────────────────────────────────────┐
│                  NestJS App                      │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐  │
│  │ Auth   │ │Schedule  │ │ Group  │ │Realtime│  │
│  │Module  │ │ Module   │ │ Module │ │Gateway │  │
│  └───┬────┘ └────┬─────┘ └────┬───┘ └────┬───┘  │
│      └───────────┴─────┬──────┴──────────┘       │
│                  Prisma ORM                      │
└─────────────────────┬───────────────────────────┘
                      ▼
                 SQLite / Postgres
```

单体应用，所有模块在一个进程内。Socket.io Gateway 与 HTTP API 同端口（NestJS 的 `@WebSocketGateway`）。100 人并发毫无压力。

---

## 6. 数据模型（Prisma Schema 草案）

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  createdAt    DateTime @default(now())

  ownedSchedules Schedule[]      @relation("ScheduleOwner")
  memberships    GroupMember[]
}

model Schedule {
  id        String   @id @default(cuid())
  name      String
  type      String   // "private" | "group"
  ownerId   String
  owner     User     @relation("ScheduleOwner", fields: [ownerId], references: [id])
  group     Group?

  courses   Course[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  version   Int      @default(0)  // 乐观锁
}

model Group {
  id          String        @id @default(cuid())
  name        String
  scheduleId  String        @unique
  schedule    Schedule      @relation(fields: [scheduleId], references: [id])
  members     GroupMember[]
  inviteCode  String        @unique @default(cuid())  // 邀请码

  createdAt   DateTime      @default(now())
}

model GroupMember {
  id       String @id @default(cuid())
  groupId  String
  userId   String
  role     String // "owner" | "editor" | "viewer"
  joinedAt DateTime @default(now())

  group    Group @relation(fields: [groupId], references: [id])
  user     User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model Course {
  id          String   @id @default(cuid())
  scheduleId  String
  schedule    Schedule @relation(fields: [scheduleId], references: [id])

  title       String
  teacher     String?
  location    String?
  color       String   @default("#3b82f6")
  note        String?

  startTime   String   // "HH:mm"，一天内的时间
  endTime     String
  rrule       String   // iCalendar RRULE 字符串
  dtstart     DateTime // 循环开始日期
  exdates     String   @default("[]") // 排除的日期，JSON 数组

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 6.1 循环规则示例（rrule.js）
- "每周一 9:00-10:00，从 6 月 1 日到 8 月 31 日"
  `rrule: "FREQ=WEEKLY;BYDAY=MO"` + `dtstart: 2026-06-01` + 前端只展示 ≤ `2026-08-31`
- "单双周" → `FREQ=WEEKLY;INTERVAL=2`
- "周二和周四" → `FREQ=WEEKLY;BYDAY=TU,TH`

> 循环规则用**字符串**存，可读、可调试、可直接 export 成 `.ics` 文件。**不要**自己设计循环规则 DSL，标准 iCalendar 已经被坑过无数次了。

### 6.2 例外处理
- 跳过某一周：往 `exdates` 数组里加日期，前端展开时过滤。
- 修改某一周的具体时间：建一条 `CourseException { courseId, originalDate, newStartTime, newEndTime }`，P1 再加。

---

## 7. API 设计

RESTful + WebSocket 事件。统一前缀 `/api/v1`。

### 7.1 REST
```
POST   /auth/register
POST   /auth/login

GET    /schedules                  我的所有课表
POST   /schedules                  创建
GET    /schedules/:id              详情（含 courses）
PATCH  /schedules/:id
DELETE /schedules/:id

GET    /schedules/:id/courses      列出课程
POST   /schedules/:id/courses      加课
PATCH  /courses/:id
DELETE /courses/:id

GET    /groups                     我加入的群组
POST   /groups                     创建群组
POST   /groups/join                通过 inviteCode 加入
POST   /groups/:id/members         群主加成员
DELETE /groups/:id/members/:userId

GET    /schedules/:id/occurrences?from=2026-06-01&to=2026-06-07
                                    展开某周的所有课程实例（前端懒加载用）
```

### 7.2 WebSocket 事件（Socket.io）
连接时携带 JWT 鉴权。

| 事件 | 方向 | Payload | 说明 |
| --- | --- | --- | --- |
| `subscribe` | C→S | `{ scheduleId }` | 客户端订阅某课表的房间 |
| `unsubscribe` | C→S | `{ scheduleId }` | 退订 |
| `course.created` | S→C | `{ scheduleId, course }` | 服务端在写库后广播 |
| `course.updated` | S→C | `{ scheduleId, course }` | |
| `course.deleted` | S→C | `{ scheduleId, courseId }` | |
| `schedule.updated` | S→C | `{ schedule }` | 课表元信息变更 |

> 房间命名 `schedule:{id}`。后端在 REST 写入成功后，调用 `gateway.broadcastToSchedule(id, event, data)`。

---

## 8. 关键流程

### 8.1 创建并分享课表
```
1. 用户 A 创建 Group "高三一班" + 绑定新 Schedule
2. 拿到 inviteCode
3. 用户 B 用 inviteCode 加入
4. 用户 A 编辑课程 → 写库 → 广播 → B 实时看到
```

### 8.2 实时同步流程
```
A 点击"保存课程"
   │
   ▼
PATCH /courses/:id (HTTP)
   │
   ▼
Service: 更新 DB，version+1
   │
   ▼
Service: realtimeGateway.emit('course.updated', { scheduleId, course })
   │
   ▼
Socket.io 广播到 schedule:{id} 房间
   │
   ▼
B 的前端 Query 收到事件 → invalidate query → 重新拉 /occurrences
   │
   ▼
B 看到新课程
```

> **不要**只靠 WebSocket 推增量数据。推"事件"，让客户端重新拉，是**最终一致**最稳的写法。WebSocket 掉线/重连也不会丢一致性。

### 8.3 冲突检测
对当前用户的所有 `Schedule` 展开后排序，扫描是否有 `[t1,t2) ∩ [t3,t4) ≠ ∅`。前端做（提示用），后端做（强约束，写入时检查）。

---

## 9. 权限模型

| 操作 | 课表 owner | Group owner | Group editor | Group viewer |
| --- | --- | --- | --- | --- |
| 读课表 | ✅ | ✅ | ✅ | ✅ |
| 改课表名 | ✅ | ✅ | ❌ | ❌ |
| 增/改/删课程 | ✅ | ✅ | ✅ | ❌ |
| 加/移除成员 | ✅（owner） | ✅ | ❌ | ❌ |
| 解散群组 | ✅ | ✅ | ❌ | ❌ |

后端用 **Guards**（NestJS 的 `CanActivate`）+ **Decorators** 实现，例：
```ts
@UseGuards(JwtGuard, ScheduleRoleGuard('editor'))
@Patch('courses/:id')
updateCourse() { ... }
```

---

## 10. 实时同步的细节

- **心跳**：客户端每 25s 发 `ping`，超时断开。
- **重连**：Socket.io 自动，指数退避。
- **离线补偿**：重连成功后，前端用 `updatedAt > lastSyncAt` 的方式拉增量。
- **多人同时编辑**：用乐观锁 `version` 字段，并提示"已被他人修改，是否覆盖"。
- **群组成员上下线**：P1 再做。

---

## 11. 安全

- 密码 bcrypt（cost=12）
- JWT，Access Token 15min + Refresh Token 7d
- HTTPS（部署时 nginx 终止）
- WebSocket 鉴权：`socket.handshake.auth.token`
- CORS 白名单
- 邀请码足够长（cuid）且一次性可重置
- 防注入：Prisma 参数化
- 限流：`@nestjs/throttler`，登录接口 5 次/分钟

---

## 12. 部署

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    volumes: ["./data:/app/data"]  # sqlite 文件
  nginx:
    image: nginx
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/conf.d/default.conf", "./certs:/etc/nginx/certs"]
```

- 1C2G 云服务器足够
- 备份：`sqlite3 data.db ".backup data-$(date +%F).db"` 每日 cron
- CI：GitHub Actions，build + test + 推镜像

---

## 13. 目录结构

```yaml
schedule-app/
├── apps/
│   ├── mobile/                 # Expo (React Native + Web) 客户端
│   │   ├── app/
│   │   │   ├── (auth)/         # 认证路由组：login.tsx, register.tsx
│   │   │   ├── (app)/          # 主功能路由组
│   │   │   │   ├── schedules/  # 课表列表、详情
│   │   │   │   ├── courses/    # 新建课程、课程详情
│   │   │   │   ├── groups/     # 群组列表、详情
│   │   │   │   └── settings.tsx
│   │   │   ├── _layout.tsx     # 根布局（QueryClient + AuthGate + SafeArea）
│   │   │   └── index.tsx       # 重定向到登录
│   │   ├── src/
│   │   │   ├── components/     # Button, Input, WeekView, ScreenShell
│   │   │   ├── lib/            # api.ts(axios), auth-store.ts(zustand), socket.ts, query-client.ts
│   │   │   └── theme.ts        # 设计 token（colors/spacing/radius/shadow/fontSize）
│   │   ├── metro.config.js     # monorepo 包解析
│   │   └── app.json            # Expo config
│   └── api/                    # NestJS 后端
│       ├── src/
│       │   ├── auth/
│       │   ├── schedule/
│       │   ├── course/
│       │   ├── group/
│       │   ├── realtime/       # Socket.io Gateway
│       │   ├── common/         # ScheduleRoleGuard / CourseRoleGuard
│       │   ├── prisma/
│       │   └── main.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
├── packages/
│   └── shared/                 # @schedule/shared：类型与常量
│       └── src/
│           ├── types/          # domain.ts, dto.ts, socket.ts
│           ├── constants.ts
│           └── index.ts
├── docs/design.md
├── pnpm-workspace.yaml
└── package.json
```

> 用 **pnpm workspace** 管理 monorepo，`@schedule/shared` 通过 tsconfig paths 直接引用源码，无需构建。

---

## 14. MVP 路线图

| 周 | 任务 |
| --- | --- |
| 1 | 脚手架、Prisma schema、Auth |
| 2 | Schedule + Course CRUD、周视图 |
| 3 | Group + 邀请、共享课表 |
| 4 | Socket.io 实时同步 |
| 5 | 冲突检测、导出 iCal/CSV |
| 6 | Docker 部署、内测、文档 |

总共 6 周，单人全栈可以搞定。

---

## 15. 后续扩展（写给未来的你）

- **全平台** ✅ 已完成。当前 Expo 项目（`apps/mobile/`）一套代码同时覆盖 iOS / Android / Web；TanStack Query、Zustand、Socket.io-client 在三端工作一致；与后端 WebSocket Gateway 完全复用。
- **Web UI 独立特化**：目前 Web 端复用 Native 组件，某些交互（右键菜单、hover 状态、响应式布局）可进一步优化。可对 Web 平台条件注入 `Platform.OS === 'web'` 的特化版本。
- **多校 SaaS**：加 `Tenant` 实体，所有查询带 `tenantId`，用 Postgres Row-Level Security。
- **排课算法**：把 RRULE 改成"约束满足问题"，用 OptaPlanner 之类的求解器。
- **日历订阅**：每个 Schedule 暴露 `.ics` URL，用 rrule.js 反向生成 iCal。

---

## 16. 关键决策记录（ADR 摘要）

| 决策 | 备选 | 选择 | 理由 |
| --- | --- | --- | --- |
| 循环规则存法 | 自定义 DSL / RRULE / 实例表 | **RRULE** | 工业标准，可导出 iCal |
| 实时同步模型 | 推完整数据 / 推事件 | **推事件** | 弱网、掉线友好 |
| 状态管理 | Redux / Zustand | **Zustand** | 体量小、SPA 够用 |
| 共享单位 | 共享课程 / 共享课表 | **共享课表** | 与"群组"语义对齐，权限简单 |
| 部署 | K8s / Docker Compose | **Compose** | 100 人不需要 K8s |
| 实时协议 | SSE / WebSocket | **WebSocket (Socket.io)** | 双向、易用、生态好 |
| 前端技术栈 | Vite SPA / Expo | **Expo** | 实现阶段发现 Web/Native 共享代码的需求足够通用，Expo + expo-router 覆盖面更好，单套代码跑三端 |

---

## 17. 当前实现审查与改进建议

> 审查日期 2026-06-06。基于 `apps/api`、`apps/mobile`、`packages/shared` 的实际代码，对照成熟产品的质量基线逐项列出。标记 `(实锤)` 表示代码中可定位到行级证据。

### 17.1 即时缺陷——影响功能正确性

这些问题是上线前必须修掉的，否则在生产中会稳定复现。

| ID | 缺陷 | 位置 | 修复方向 |
| --- | --- | --- | --- |
| B1 | `generateInviteCode()` 用 `Math.random()` 生成邀请码——非密码学安全，可预测碰撞 | `apps/api/src/group/group.service.ts:151-156` | 切 `crypto.randomBytes(6).toString('hex')`；`Math.random()` 的 36 进制 12 位大约 62 bit 熵但 PRNG 种子只有约 53 bit，可暴力枚举 |
| B2 | `ScheduleController.remove` 传 `undefined as any` 当 userId 进 Service | `apps/api/src/schedule/schedule.controller.ts:80` | Controller 从 `@Req() req` 取 `userId` 传入；当前直接硬编码 `undefined` |
| B3 | `ScheduleService.listForUser` 对同一个 schedule 返回重复条目：当用户既是该课表的 owner 又是其 group 的 member 时，owned 和 shared 两个数组里有同一个 schedule | `apps/api/src/schedule/schedule.service.ts:17-28` | 对 owned 结果集按 id 去重，或用 `where: { id: { notIn: ownedIds } }` 过滤第二次查询 |
| B4 | `expandOccurrences` 逻辑在后端 `OccurrenceService` 和前端 `WeekView.tsx` 各有一份独立实现；后端 `formatDt` 用 UTC，前端用 local time，导致跨时区展开时发生边界偏移 | 后端 `apps/api/src/schedule/occurrence.service.ts:67-74`，前端 `apps/mobile/src/components/WeekView.tsx:77-82` | 统一用 `rrule.js` 对 `dtstart` 的本地时间语义（`RRule` 构造函数默认使用 `dtstart` 的本地时间）；两端都禁用 UTC 转换；或前端完全调 `/occurrences` 取代本地展开 |
| B5 | 移动端 `schedules/index.tsx` 在 `onPress` 回调里注册 `socket.on(COURSE_CREATED|UPDATED|DELETED, invalidate)`，进入页面前 socket 可能已变化、离开页面时从不 off——监听器泄漏，同一个 schedule 进入多次后重复触发 invalidate | `apps/mobile/app/(app)/schedules/index.tsx:91-108` | 把注册逻辑移到 `schedules/[id].tsx` 的 `useEffect`（已有类似逻辑但 cleanup 不可靠），确保 return 中 `.off()` |
| B6 | `AuthService.refresh` 签发新 token pair 后只删除被使用的 refreshToken 记录，流程上没有检查是否已存在同一用户的多个 active refresh token（假设其他 token 若被窃取仍有效） | `apps/api/src/auth/auth.service.ts:49-57` | 增加 `deleteMany({ where: { userId } })` 在签发前把该用户所有旧 refresh token 全部清掉；配合设备标识更安全 |
| B7 | `ScheduleService.update` do `version: { increment: 1 }` 但 **从不检查 version**——任何并发写的后一次都会静默覆盖前一次；乐观锁字段形同虚设 | `apps/api/src/schedule/schedule.service.ts:76-82` | 在 update 时使用 `where: { id, version }`，若 `count` 为 0 返回 409 Conflict，由前端决定是否覆盖 |
| B8 | `GroupService.addMember` 只检查 actor 是否为 owner，不校验 `memberUserId` 是否实际存在；可把任意不存在的 userId 写入 GroupMember 表 | `apps/api/src/group/group.service.ts:96-116` | `addMember` 入口处先 `findUnique({ where: { id: memberUserId } })`，不存在时抛 404 |
| B9 | `GroupService.listMembers` 用 `include: { user: { select: { id, email, displayName } } }`（实际代码写法） ——但早期版本可能泄露 passwordHash（当前安全，但缺少回归测试保证） | `apps/api/src/group/group.service.ts:142-149` | 加集成测试确保 `passwordHash` 不在返回中；考虑建 `UserPublicData` 类型别名 |

### 17.2 质量债务——不影响功能但会持续拖慢开发

| ID | 债务 | 影响 | 建议 |
| --- | --- | --- | --- |
| D1 | `RealtimeService.userIdToSocketIds` 维护了 userId→socketId 的 Map，但没有任何代码读取它——死代码 | 维护成本、误导阅读 | 删掉整个 Map 逻辑；或改用它为 emitToUser 提供能力（P1 需要） |
| D2 | 后端没有 `GET /groups/:id` 端点——前端 `groups/[id].tsx` 只能拉全量 groups 再 filter | 列表变大时浪费带宽 | 加 `GET /groups/:id` Controller，返回单群组详情（含 member count） |
| D3 | 设计文档第 4 节、第 13 节写的是 "React + Vite"，实际生产代码是 **Expo + expo-router**（移动端根本没有 Vite 项目） | 文档与实际代码脱节 | 同步更新 docs/design.md 的第 4 节前端选型、第 13 节目录结构，使其反映 `apps/mobile/` 的真实布局 |
| D4 | `exdates` 存为 JSON 字符串，CourseService 的 `toDto` 每次读都 `JSON.parse`，但写操作直接把 string[] JSON.stringify——没有对 JSON 格式做 schema 验证 | JSON 损坏时静默失败 | 在 Service 层对 `exdates` 做 `z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))` 校验（Zod）；或迁移到 SQLite 的 JSON 扩展列（若切 Postgres 用 `Json` 类型） |
| D5 | `CourseService.update` 不递增父 Schedule 的 `version`——design doc 说 version 用于"用户感知冲突"，但课程变更算是 schedule 的变更 | 客户端用 version 判断课表是否变过时遗漏课程操作 | 在 Course create/update/delete 后调 `prisma.schedule.update({ where: { id: scheduleId }, data: { version: { increment: 1 } } })` |
| D6 | `Course.note` 字段在 schema、共享类型、DTO 中都有定义，但移动端 UI 完全不录入/展示 note | 字段存在却没有覆盖，占空间且迷惑 | 要么在 `courses/new.tsx` 和 `courses/[id].tsx` 里加上 note 输入框；要么从 schema 里删掉 note 字段并生成新 migration |
| D7 | `POST /auth/me` 用了 HTTP POST 而不是 GET——语义偏差，且 POST 容易在浏览器中被重发（虽然无副作用，但不符合惯例） | 无语义问题但对齐 API 规范 | 改为 `GET /auth/me`；当前 JwtAuthGuard 正确注入 `req.userId`，改动仅需改 decorator |
| D8 | `@schedule/shared` 包没有 `build` 步骤——两端都通过 `tsconfig.json` 的 `paths` 直接引用源码 | 符合 monorepo 惯例但 JSON/cuid 等库需要 source 侧处理 | 可保留现状；如果未来把 shared 发布为 npm 包则需加 tsc/tsup 构建 |

### 17.3 安全加固

项目中已有基本安全措施（bcrypt cost 12、JWT、Prisma 参数化查询）。以下为成熟产品的增量加固项：

| ID | 项 | 当前状态 | 建议 |
| --- | --- | --- | --- |
| S1 | CORS | `NestFactory.create(AppModule, { cors: true })` 允许任意 origin | 改为 `cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:8081'], credentials: true }` |
| S2 | JWT 密钥生产保护 | 硬编码 fallback 值 `"dev-access-secret"` 和 `"dev-refresh-secret"` 分布在 4 个文件中 | 统一在 `ConfigModule` 中校验启动时 `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET` 必须不为空且不等于 dev 默认值（生产环境抛 fatal error）；移除非 env 的 fallback 字符串 |
| S3 | 密码策略 | `MinLength(6)`，无复杂度要求 | 增加正则校验（至少一个字母 + 一个数字），注册和修改密码时用 `Matches(/^(?=.*[A-Za-z])(?=.*\d)/)` |
| S4 | 限流 | 设计文档第 11 节写了 `@nestjs/throttler`，实际 `package.json` 未安装 | 安装 `@nestjs/throttler`，对 `/auth/login` 和 `/auth/register` 设 `ttl: 60000, limit: 5` |
| S5 | Refresh token 轮换 | 旧 refresh token 删除后签发新 token，但流程中无设备标识——若同一用户的 token A 被窃取，攻击者用 token A 刷新会得到新对，合法用户的 token B 也随之不可用（因为旧 token 全部清掉） | 短期：加入 `X-Device-Id` 头，按 `(userId, deviceId)` 管理 refresh token；长期：引入 expiring-while-rotating 的 refresh token family 模式 |
| S6 | 邀请码爆破 | 12 位字母数字，使用非安全随机 | 改用 `crypto.randomUUID()` 或 `crypto.randomBytes`（见 B1）；加入限流 `POST /groups/join` 3 次/分钟 |
| S7 | 敏感信息日志 | 无 | 确保 Prisma query logging 不输出 `passwordHash`；生产关闭 `debug` 日志级别 |

### 17.4 功能补齐——当前实现 vs 设计承诺的差距

| 承诺（来自第 3 节 P0/P1/设计） | 实际状态 | 补充时间 |
| --- | --- | --- |
| 冲突检测（P1） | 未实现；Schedule 展开与时间段扫描代码均不存在 | P1 优先级 |
| 单次例外——在 UI 里跳过某一周（P1） | `exdates` 后端读写已就绪，前端无任何 UI 或操作入口 | 1-2 天 |
| 单次例外——在 UI 里改某一周的特定时间（P1） | `CourseException` 表未建，前后端均 0 行代码 | 待定 |
| iCal/CSV 导出（P0） | 未实现；导出入口不存在 | 2-3 天（后端生成 + 前端下载） |
| 课表快照（P1） | 未实现 | 待定 |
| 课程提醒 / 推送（P2） | 未实现 | 远期 |
| 公开分享链接（P2） | 未实现 | 远期 |
| 单元测试 | 项目 0 个 test 文件 | 需补充 |

### 17.5 运维与可观测性

| ID | 缺失项 | 影响 | 建议 |
| --- | --- | --- | --- |
| O1 | 健康检查端点 | 无法做负载均衡或 K8s liveness probe | 在 `AppModule` 加 `GET /api/v1/health` 返回 `{ ok: true, db: 'connected' }` |
| O2 | 优雅关闭 | 仅 `onModuleDestroy` 断开 Prisma；Socket.io 没有 drain、HTTP 没有 `server.closeIdleConnections` | 在 `main.ts` 里 `process.on('SIGTERM', async () => { await app.close(); process.exit(0); })` |
| O3 | 结构化日志 | 全用 NestJS 内置 `Logger`，日志格式不可控 | 引入 `pino` 或 `winston`；在 dev 用 `pino-pretty`，生产输出 JSON 行 |
| O4 | 数据库备份 | 设计文档第 12 节提了 cron 备份，代码仓库中无脚本 | 在仓库根加 `scripts/backup.sh`，利用 `sqlite3 .backup` 配合 `rclone` 或本地保留最近 7 天 |
| O5 | API 版本管理 | 前缀硬编码 `/api/v1`，无版本协商 | 可接受；若未来有不兼容变更，新增 `/api/v2` 前缀，shared 包导出版本常量 |
| O6 | 移动端错误边界 | React Native 未捕获的 JS 异常会直接白屏/崩溃 | 在 `_layout.tsx` 外层加一个 `ErrorBoundary` 组件（react-native 的 `ErrorUtils` + 自定义 fallback 页面） |
| O7 | 前端测试 ID | 已有 `testID` 属性分散在组件中（`new-schedule`、`create-schedule` 等）——但使用不一致 | 整理一份 testID 清单文档；用 Detox 或 Maestro 在 CI 中跑冒烟测试 |
| O8 | Docker 镜像构建 | 设计文档画了 compose，仓库无 `Dockerfile` | 写一个多阶段 `Dockerfile`（Stage 1: pnpm build，Stage 2: node + dist），并附 `docker-compose.yml` |

### 17.6 改进优先级矩阵

按"影响面 × 修复成本"排序建议实施顺序：

```
优先级 1（本周）：B1, B2, B3, B4, B5, B6, B7, S2, O1
优先级 2（两周内）：B8, B9, D1, D2, D3, S1, S3, S4, O2, O3, O6
优先级 3（一月内）：D4, D5, D6, D7, S5, S6, S7, O4, O7, O8
持续：功能补齐（iCal 导出 / exdates UI / 冲突检测）+ 单元测试
```

> **2026-06-06 已完成修复 (v0.3)：**
> - ✅ **优先级 1 全部完成**：B1~B7（缺陷）、S2（JWT 密钥安全加固）、O1（健康检查端点）
> - ✅ **优先级 2 已完成**：B8、B9、D1（死代码清理）、D2（`GET /groups/:id`）、D3（设计文档同步）、S1（CORS 白名单）、S3（密码复杂度校验）、S4（Throttler 限流）、O2（优雅关闭 SIGTERM）、O6（移动端 ErrorBoundary）
> - ⏳ **优先级 2 待完成**：O3（结构化日志）
> - ⏳ **优先级 3 待排期**：D4~D7、S5~S7、O4、O7、O8

### 17.7 设计文稿同步（已更新）

> 以下各项已在 v0.2 中同步完成：

- **第 4 节"技术选型"**：已改为实际使用的 Expo SDK 52 + expo-router + React Native StyleSheet
- **第 13 节"目录结构"**：已改为 `apps/mobile/` 真实文件布局
- **第 15 节"后续扩展"**：已标注"全平台"为已完成

