# 移动端 UI 重构设计文稿

> 范围：`apps/mobile/` 视觉与布局
> 文档版本 v1.1 · 2026-06-07
> 状态：阶段 1–5 已实施，§16 已审阅

---

## 1. 背景与目标

### 1.1 用户反馈
用户对当前移动端 UI 整体不满意，集中在：
- 视觉风格陈旧、不够现代
- 边距没有按屏幕尺寸自适应，平板/桌面下内容被拉伸、比例失调
- 现有 `theme.ts` 颜色系统偏冷淡、缺层次
- 组件（Button / Input / 卡片）样式粗糙，缺乏细节
- 课表/周视图的卡片只展示标题/教师/时间，教师字段实际存在于数据层但渲染时未展示，信息密度低、不直观

### 1.2 设计目标
1. **现代极简风格**：毛玻璃、柔和阴影、清晰信息层级
2. **真正响应式**：手机 / 平板 / 桌面端有合理的内容宽度与边距
3. **课表卡片优化**：展示 4 个核心字段（时间、内容、教室、教师），布局更直观
4. **设计 token 集中化**：颜色 / 间距 / 圆角 / 字号 / 阴影统一在 `theme/`，未来改主题只改一处
5. **技术债务同步清理**：`expandOccurrences` 逻辑从前端 `WeekView.tsx` 抽离到 `src/lib/` 独立模块，消除双重实现
6. **不破坏现有功能**：迁移期间旧组件与新组件可共存，渐进式替换

### 1.3 非目标
- 不改后端 API、不改数据层（`@schedule/shared`、`src/lib/`）
- 不改路由结构（`app/` 文件树保持）
- 不改业务逻辑（`expandOccurrences` 算法逻辑保留，仅抽离模块）
- 不引入国际化（i18n）、暗色模式自动化（保留手切开关的可能但本期不做，token 结构预留暗色键位）

---

## 2. 技术选型

### 2.1 UI 库：Shopify Restyle

| 项 | 详情 |
| --- | --- |
| 包 | `@shopify/restyle` |
| 心智 | 在 `react-native` 之上，提供 `Box` / `Text` / `Stack` 等基础原语，通过 prop 直接消费主题 token |
| 响应式 | 内置 `useResponsiveValue` hook + `breakpoints`，可基于 `useWindowDimensions` 切换值 |
| 主题 | 单一 `createTheme({ colors, spacing, breakpoints, ... })` 对象集中管理 |
| 优势 | 不用学新语法（不像 Tailwind）；不破坏 React Native 心智；主题 + 响应式 + 类型推导一体化 |
| 包体积 | 压缩后约 30KB，对移动端 bundle 影响可接受 |

### 2.2 备选对比

| 方案 | 选 | 否的理由 |
| --- | --- | --- |
| **Restyle** | ✅ | 主题集中、响应式原生、迁移成本低 |
| NativeWind（Tailwind for RN） | ❌ | 类名心智改写多、与现有 StyleSheet 风格不一致 |
| 原生 StyleSheet + 增强 theme.ts | ❌ | 响应式要手写、容易出 bug、token 散落 |

### 2.3 Restyle 已知限制与缓解

| 限制 | 场景 | 缓解 |
| --- | --- | --- |
| `useResponsiveValue` 在 Web 端首次渲染时 `width=0`→默认 fallback 到 `phone` 再跳正确值（SSR hydration mismatch） | 桌面端首屏 layout shift | `Screen` 组件内置 `useState` 默认断点 guard：首帧用 `useWindowDimensions` 但最小断点取 `tablet`；或延迟 1 frame 再渲染内容区；最简方案：Web 端默认用 `desktop` 断点渲染 |
| `createTheme` 类型推导深度上限约 50 个 color token | 频繁增加颜色 token 时可能触发 TS 递归限制 | 当前 token 约 20 个，安全。若后续扩展超过 40 个，用 `as const` + 手动 union type 接管 |
| 与 expo-router `Stack` 的 `presentation: "modal"` 转场可能有动画冲突 | `courses/new`、`courses/[id]` 页面 | 已知 workaround：modal 页面的内容区包一层 `Box` 而非直接用 Restyle 的 `createBox` 作为根节点；或 Restyle 的 GitHub issue #215 提到用 `animated: false` 选项 |
| Android `elevation` 不支持 `shadowRadius` / `shadowOpacity` | 阴影效果在 Android 和 iOS 差异大 | Android 侧用 `elevation` + `shadowColor`（仅 API 28+ 支持完整阴影参数）；API < 28 用 `elevation` 降级为固定深色投影 |
| Safari 中 `backdrop-filter` 需 `-webkit-` 前缀且与 `overflow: hidden` 冲突 | Web 端毛玻璃效果 | 毛玻璃卡片用 `rgba(255,255,255,0.15)` + `border: 1px solid rgba(255,255,255,0.25)` 模拟；仅在确认支持时启用原生 `backdrop-filter` |

---

## 3. 架构总览

```
┌─────────────────────────────────────────────────────┐
│  app/                  路由层 (expo-router, 不变)   │
│  注：courses/new 和 courses/[id] 当前为              │
│  presentation:"modal"，本节设计兼容 modal 和         │
│  push 两种导航模式。                                 │
├─────────────────────────────────────────────────────┤
│  src/screens/          页面组件 (从 app/ 抽出)      │
│  src/components/       业务组件 (ScreenShell, ...)  │
├─────────────────────────────────────────────────────┤
│  src/ui/               设计系统层 (新增)             │
│   ├ primitives/        Restyle Box/Text/Stack 包装  │
│   ├ Button / Input     基础控件                     │
│   ├ Card / Modal       复合控件                     │
│   └ WeekCard           课表专用                     │
├─────────────────────────────────────────────────────┤
│  src/theme/            主题与响应式 token (重写)     │
│   ├ palette.ts         颜色                         │
│   ├ spacing.ts         间距 / 圆角 / 字号           │
│   ├ breakpoints.ts     断点定义                     │
│   ├ shadow.ts          阴影                         │
│   └ index.ts           主题汇总 + ThemeProvider     │
├─────────────────────────────────────────────────────┤
│  src/lib/              数据层 (api/query/socket     │
│                        不变，本阶段新增 expand-     │
│                        occurrences.ts 独立模块)     │
└─────────────────────────────────────────────────────┘
```

### 3.1 关键决策
- **新增 `src/ui/` 设计系统层**：封装 Restyle，提供项目专用原语。`src/components/` 保留作为业务组件（与 `src/ui/` 区分）
- **路由文件保留**：仅在 `app/.../*.tsx` 中重新导出 `src/screens/` 对应页面，内部不再写 JSX
- **`src/theme.ts` 标记 deprecated**：新代码不再 import；通过 `src/theme/` 替代；旧组件在迁移过程中逐步替换。最终阶段保留兼容导出别名而非直接删除
- **`expandOccurrences` 抽离**：从 `WeekView.tsx` 中提取到 `src/lib/expand-occurrences.ts`，前端 WeekView 和未来可能的服务端展开共用同一函数
- **导航模式兼容**：`courses/new` 和 `courses/[id]` 当前为 `presentation: "modal"`（底部弹出），新 UI 设计需同时兼容 modal 和 push 两种导航模式。新 `Modal` 组件（§5.7）用于表单内对话框（如删除确认），不替代 expo-router 的路由级 modal
- **expo-router `typedRoutes` 兼容**：Restyle 的 `Text`/`Box` 组件包装 `Link` 时不会丢失 `typedRoutes` 类型推导（Restyle 透传泛型 props）；验证点：阶段 5 的 `courses/new.tsx` 迁移后运行 `pnpm typecheck` 确认

---

## 4. 主题与响应式系统

### 4.1 断点

```ts
// src/theme/breakpoints.ts
export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
};
```

| 断点 | 范围 | 内容策略 |
| --- | --- | --- |
| `phone` (0–767) | 手机竖屏 | 全宽、`paddingHorizontal: 'lg'` (16) |
| `tablet` (768–1023) | 平板/小桌面 | 居中、最大宽 720、`paddingHorizontal: 'xl'` (24) |
| `desktop` (≥1024) | 桌面 | 居中、最大宽 880、`paddingHorizontal: 'xxl'` (32) |

### 4.2 颜色（对齐当前 theme.ts + 增补层次）

> 设计稿颜色值已与当前 `src/theme.ts` 对齐，避免迁移阶段新旧组件并存时出现视觉差异。

```ts
// src/theme/palette.ts
export const palette = {
  // 中性（与当前 theme.ts 一致）
  white: '#FFFFFF',
  bg: '#F5F7FB',             // 与当前 theme.ts 完全一致
  bgElevated: '#FFFFFF',
  bgMuted: '#EEF1F6',
  bgCard: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  // 文本（与当前 theme.ts 完全一致）
  text: '#0F172A',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  // 品牌（与当前 theme.ts 完全一致）
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  // 语义
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#0EA5E9',
  // 课程调色板（保留 8 色，与当前 courseColors 一致）
  courseColors: [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981',
    '#3B82F6', '#8B5CF6', '#F43F5E', '#14B8A6',
  ],
};
```

#### 4.2.1 暗色模式 token 预留

虽本期不做暗色模式，但 Restyle `createTheme` 支持内嵌 `dark` 配色。为确保后续切换暗色模式无需破坏性变更，`theme/index.ts` 中预留双模键位结构：

```ts
export const theme = createTheme({
  colors: {
    background: palette.bg,        // 若日后加暗色 → { light: palette.bg, dark: '#1A1A2E' }
    cardBackground: palette.bgCard,
    // ...
  },
  // ...
});
```

后续启用暗色模式时只需将单值替换为 `{ light, dark }` 对象，Restyle 的 `useTheme()` + 系统 `colorScheme` 自动切换。改动量约 30 行。

### 4.3 间距 / 圆角 / 字号

```ts
// src/theme/spacing.ts
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius  = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 } as const;
export const fontSize = {
  xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, hero: 34,
} as const;
export const lineHeight = { tight: 1.2, normal: 1.4, relaxed: 1.6 } as const;
```

### 4.4 阴影（更柔和，添加 blur 数值 + Android 降级策略）

```ts
// src/theme/shadow.ts
import { Platform } from 'react-native';

export const shadow = {
  sm: {
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1, shadowColor: '#0F172A' },  // Android < 28: elevation 仅控制深度
      default: { shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },
  md: {
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3, shadowColor: '#0F172A' },
      default: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    }),
  },
  lg: {
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 6, shadowColor: '#0F172A' },
      default: { shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
    }),
  },
} as const;
```

### 4.5 主题组装 + Provider

```ts
// src/theme/index.ts
import { createTheme } from '@shopify/restyle';
import { palette } from './palette';
import { spacing, radius, fontSize, lineHeight } from './spacing';
import { breakpoints } from './breakpoints';
import { shadow } from './shadow';

export const theme = createTheme({
  colors: {
    background: palette.bg,
    cardBackground: palette.bgCard,
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    primaryLight: palette.primaryLight,
    text: palette.text,
    textMuted: palette.textMuted,
    textInverse: palette.textInverse,
    border: palette.border,
    borderStrong: palette.borderStrong,
    bgMuted: palette.bgMuted,
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    info: palette.info,
    accent: palette.accent,
    white: palette.white,
  },
  spacing,
  borderRadii: radius,
  breakpoints,
  shadow,
  textVariants: {
    hero: { fontSize: fontSize.hero, fontWeight: '800', color: 'text' },
    h1: { fontSize: fontSize.xxl, fontWeight: '800', color: 'text' },
    h2: { fontSize: fontSize.xl, fontWeight: '700', color: 'text' },
    h3: { fontSize: fontSize.lg, fontWeight: '700', color: 'text' },
    body: { fontSize: fontSize.md, color: 'text' },
    bodySmall: { fontSize: fontSize.sm, color: 'textMuted' },
    caption: { fontSize: fontSize.xs, color: 'textMuted' },
    button: { fontSize: fontSize.sm, fontWeight: '700', color: 'textInverse' },
  },
});

export type Theme = typeof theme;
export { palette, spacing, radius, fontSize, lineHeight, shadow, breakpoints };
export { ThemeProvider } from '@shopify/restyle';
```

### 4.6 在根布局挂载

```ts
// app/_layout.tsx (改)
import { ThemeProvider } from '@/theme';
import { theme } from '@/theme';

<ThemeProvider theme={theme}>
  {/* 原有 QueryClientProvider / SafeAreaProvider / ErrorBoundary / AuthGate */}
</ThemeProvider>
```

---

## 5. 设计系统层 (`src/ui/`)

### 5.1 文件结构

```
src/ui/
├── primitives/
│   ├── Screen.tsx       响应式 ScreenShell 替代（含键盘适配）
│   ├── Card.tsx         卡片原语
│   ├── Stack.tsx        快捷 flex 列
│   └── Divider.tsx      分隔线
├── Button.tsx
├── Input.tsx
├── IconButton.tsx       圆按钮（用于周视图导航）
├── Modal.tsx            居中卡片模态（用于表单内对话框，非路由级 modal）
├── EmptyState.tsx       空态
├── RoleChip.tsx         owner/editor/viewer 标签
└── WeekCard.tsx         课表卡片（周视图用）
```

### 5.2 `Screen`（响应式容器 + 键盘适配）

**职责**：替代现有 `ScreenShell`，根据断点设置 `maxWidth` 和 `padding`，提供滚动与非滚动两种模式。兼容 `KeyboardAvoidingView`。

**当前代码重复逻辑清理**：`schedules/index.tsx` 中有一段独立的 `listWidth = width >= 768 ? 768 : undefined` 响应式逻辑，与 ScreenShell 内部功能重复。新增 `Screen` 后，该逻辑移入 Screen 统一处理，页面代码删除重复部分。

```ts
interface ScreenProps {
  scroll?: boolean;           // 默认 true
  keyboardAvoid?: boolean;    // 默认 false，表单页设为 true
  keyboardBehavior?: 'padding' | 'height' | 'position';  // iOS 默认 'padding'
  edges?: ('top' | 'bottom')[];  // 安全区，默认 ['top']
  children: ReactNode;
}
```

**断点行为**：
- `phone`：内容宽 = `100% - 2 * spacing.lg`
- `tablet`：内容宽 = `min(720, 100% - 2 * spacing.xl)`，居中
- `desktop`：内容宽 = `min(880, 100% - 2 * spacing.xxl)`，居中

**Web 端 SSR guard**：首帧渲染时 `useWindowDimensions().width` 可能为 0，导致错误 fallback 到 phone。解法：组件内部 `const [ready, setReady] = useState(false)`，`useEffect(() => setReady(true), [])`；`ready` 为 false 时用 `desktop` 断点作为默认值，避免 layout shift。

**键盘适配**：当 `keyboardAvoid=true` 时，Screen 内部自动包裹 `KeyboardAvoidingView`（`behavior` 在 iOS 默认 `padding`，Android 默认不设置）。

### 5.3 `Button`

**变体**：`primary | secondary | ghost | danger`
**尺寸**：`sm | md | lg`
**旧接口兼容**：保持与当前 `components/Button.tsx` 完全一致的 props 签名：
```ts
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}
```
阶段 2 "薄壳"替换时无需修改任何使用方代码。

**新行为**：
- 加载中：原有 ActivityIndicator 保留
- 圆角统一为 `radius.md` (12)
- 字号随 size 变：`sm=14, md=15, lg=16`
- 内边距：`sm={padV:6, padH:12}, md={padV:10, padH:16}, lg={padV:14, padH:20}`
- 按下态：背景色加深 8%，缩放 0.98

### 5.4 `Input`

- 背景 `bgMuted`，聚焦时边框变 `primary`
- 错误态：边框 + 文字变 `danger`，背景 `#FEF2F2`
- 支持左右 icon slot
- 字号 16（避免 iOS 聚焦时缩放）
- 与当前 `components/Input.tsx` 接口兼容（`label?: string; error?: string;` + `TextInputProps`）

### 5.5 `Card`

- 默认：`bgCard` 背景、`radius.lg` (16)、`shadow.sm`
- 可选 `padded`（默认 true）、`bordered`、`elevated`（sm/md/lg）

### 5.6 `WeekCard`（周视图课程卡片，新）

**使用场景**：周视图中每天列里的事件块。课程事件专用。

**背景**：当前 `WeekView.tsx` 的事件块已展示标题 + 时间 + 地点，教师字段存在于 `CourseOccurrence` 数据中但渲染时未展示。新卡片补齐教师字段。

**内容**（仅 4 个字段，顺序按视觉权重）：
```
┌────────────────────────┐
│  08:00 – 09:30        │  ← 上方：时间，semibold 13
│                        │
│  高等数学             │  ← 中部：课程名，semibold 14
│                        │
│  📍 教学楼 301         │  ← 下方：教室 + 教师
│  👤 张教授             │
└────────────────────────┘
```

**视觉**：
- 背景：课程 `color` 字段（默认 8 色调色板）
- 卡片左边一条 3px 白色半透明边，作为视觉锚
- 圆角 `radius.md` (12)
- 阴影 `shadow.sm`
- 文字白色，标题 14、时间 12、其他 11
- 高度 < 32px 时只显示时间 + 课程名（其它截断）

**事件块高度自适应**：
- 高度 ≥ 56px：显示全部 4 字段
- 高度 32–55px：显示时间 + 课程名
- 高度 < 32px：仅显示时间

### 5.7 `Modal`（表单内对话框）

- 用于表单内的轻量对话框（如删除确认、操作菜单），**不是** expo-router 的路由级 modal
- `courses/new` 和 `courses/[id]` 当前为 `presentation: "modal"` 的 expo-router Stack 导航，保持 router 管理
- 居中卡片式
- 背景遮罩 50% 黑色
- 圆角 `radius.xl` (20)
- 进入/退出动画 200ms
- 在 `phone` 下从底部弹起，`tablet/desktop` 下居中、最大宽 480

### 5.8 `EmptyState`

- 大图标 + 主标题 + 副标题 + 主操作按钮
- 用于空课表/空群组等

---

## 6. 页面级改进

### 6.1 列表项设计统一

所有列表（课表 / 群组 / 成员 / 课程）统一为：
```
┌──────────────────────────────────────┐
│ 🔵 课程名        [状态chip]   ›  │
│    教师 · 教室 · 时间                │
└──────────────────────────────────────┘
```

**规则**：
- 左侧 4px 颜色条（来自 `course.color` 或 `group.color`）
- 标题一行 + 副标题一行
- 右侧是状态/操作（chip 或 chevron）
- 整张卡 `Card` 样式

### 6.2 `schedules/index.tsx`

- 顶部保留"我的课表"标题
- "+" 浮动按钮（右下）创建课表
- 列表：每个 schedule 一张卡，显示名称、类型 chip、最后修改时间、所属群组（如果有）
- 顶部水平 chip 行："全部 / 私人 / 群组"
- 空态：使用 `EmptyState`
- **重复逻辑清理**：当前页面中 `const listWidth = width >= 768 ? 768 : undefined` 逻辑移入 `Screen` 组件统一处理，页面层删除

### 6.3 `schedules/[id].tsx`

- 顶部：返回按钮 + 课表名（可点击重命名）+ 操作菜单（重命名 / 删除）
- 主区域：`WeekView`（重写后，使用 §5.6 的 `WeekCard`，数据来源于 §7.5 的 `expandOccurrences` 独立模块）
- 底部："+ 添加课程"主按钮

### 6.4 `courses/new.tsx` & `courses/[id].tsx`（modal 兼容）

当前这两页路由已设为 `presentation: "modal"`。新 UI 兼容两种模式：

- **modal 模式**（当前）：顶部使用关闭/取消按钮 + 标题，不使用返回箭头
- **push 模式**（可选）：顶部使用返回按钮 + 标题

表单内容结构：
- 顶部：标题栏
- 表单：分组卡片
  - 基本信息：课程名（必填）、教师、教室
  - 时间：开始时间、结束时间（时间选择器）
  - 重复：周几多选、起止日期
  - 颜色：8 色色板
- 底部：保存（primary）/ 取消（ghost）/ 删除（danger，仅编辑页）

与 Restyle + Stack modal 的动画兼容性在阶段 1 先行验证（见 §2.3）。

### 6.5 `groups/index.tsx`

- 顶部："群组" 标题
- 双按钮行：创建群组（primary）/ 加入群组（secondary）
- 列表：群组卡显示名称、成员数、角色 chip、邀请码
- 空态

### 6.6 `groups/[id].tsx`

- 顶部：群组名 + 操作（退出）
- 邀请码卡片：突出显示、可复制
- 成员列表：头像首字母 + 姓名 + 角色 chip
- 共享课表入口（点击跳到 `schedules/[id]`）

### 6.7 `settings.tsx`

- 顶部：用户资料卡（头像 + 姓名 + 邮箱）
- 列表：API URL、关于、退出登录
- 整体居中（手机 `Screen` 默认行为）

### 6.8 `(auth)/login.tsx` & `register.tsx`

- 简化 hero：渐变背景 + 居中 logo + 标题
- 表单卡：居中、最大宽 440
- 链接底部对齐

---

## 7. 课表/周视图改进（专项）

### 7.1 布局

```
┌────────────────────────────────────────────────────────────┐
│  ‹   2026 · 06/01 ~ 06/07  · 第 22 周          ›        │  ← 顶部
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│      │  一  │  二  │  三  │  四  │  五  │  六  │  日  │  ← 星期头
│      │ 06/01│ 06/02│ 06/03│ 06/04│ 06/05│ 06/06│ 06/07│
├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 08:00│      │      │      │      │      │      │      │
│ 09:00│ ╔═══╗│      │      │      │      │      │      │
│ 10:00│ ║高║│      │ ╔═══╗│      │      │      │      │
│ 11:00│ ║等║│      │ ║数║│      │      │      │      │
│ 12:00│ ╚═══╝│      │ ║据║│      │      │      │      │
│  ...                                                            │
└────────────────────────────────────────────────────────────┘
```

### 7.2 卡片规则

参见 §5.6。

### 7.3 交互

- 点击卡片：进入 `courses/[id]`
- 空白处点击：可触发"快速创建课程"对话框（按当前点击位置预填时间）
- 长按卡片：弹出操作菜单（编辑/删除/标为跳过本次）
- 横向滚动：手机端在窄屏下整张表可横滑；平板/桌面自适应不滚
- 头部"今天"按钮：跳回当前周
- "周次"点击：弹出日期选择器

### 7.4 视觉规则

- 当前时间：浅色横线 + 顶部圆点
- 今天：列背景 `#F0F4FF` 微弱高亮
- 非工作日（周末）：列背景 `#FAFBFC`
- 网格线：每整点 1px `border` 40% 不透明度

### 7.5 `expandOccurrences` 抽离（技术债务同步清理）

当前 `expandOccurrences` 函数内联在 `WeekView.tsx` 中，且后端 `OccurrenceService` 有一份独立实现。本次 UI 重构不重写算法逻辑，但将其从组件中抽离：

```ts
// 新增：src/lib/expand-occurrences.ts
// 内容：当前 WeekView.tsx 的 expandOccurrences + toLocalDate + formatDt 三个函数
// 导出：expandOccurrences(courses, fromDate, toDate) => CourseOccurrence[]
```

`WeekView.tsx` 重写后 import 此模块。后续可考虑将该模块提升到 `@schedule/shared` 供后端复用，消除双重实现。

---

## 8. 响应式策略（统一规则）

### 8.1 容器宽度

| 断点 | 内容宽 | 边距 |
| --- | --- | --- |
| phone (< 768) | 100% | 16 |
| tablet (768–1023) | 720 | 24 |
| desktop (≥ 1024) | 880 | 32 |

### 8.2 字体随宽度缩放

```ts
// 标题在 desktop 下稍大
const titleFontSize = useResponsiveValue({ phone: 22, tablet: 26, desktop: 28 });
```

### 8.3 周视图横滑策略

- phone 端：固定 7 列等宽、整体宽度 = `100%`；列内容自动换行
- tablet/desktop：等比例放大，每列内容更宽

### 8.4 平台条件策略

Restyle 基于 react-native 原语构建，三端（iOS / Android / Web）默认一致工作。以下场景需要平台分支：

| 场景 | 策略 |
| --- | --- |
| 阴影 | 见 §4.4，Android 用 `elevation` 降级，iOS/Web 用完整 shadow 参数 |
| 毛玻璃（`backdrop-filter`） | Web 端在 Safari 需 `-webkit-` 前缀；若不可用，降级为 `rgba(255,255,255,0.15)` + 半透明边框 |
| Modal 弹出方向 | phone：底部弹出；tablet/desktop：居中弹出。同一组件内按断点切换 |
| 字体 | 三端均使用系统字体；Web 端 `fontFamily` 可设 `-apple-system, system-ui, sans-serif` fallback |
| 键盘适配 | iOS：`KeyboardAvoidingView behavior="padding"`；Android：默认不设置（Android 自动处理）；Web：无需处理 |

---

## 9. 迁移策略

### 9.1 阶段 1：基础设施（不动现有 UI）
1. 安装 `@shopify/restyle`
2. 创建 `src/theme/` 目录与文件（palette.ts / spacing.ts / breakpoints.ts / shadow.ts / index.ts）
3. 在 `_layout.tsx` 挂 `ThemeProvider`
4. 创建 `src/ui/primitives/` 几个原语
5. **验证 Restyle + expo-router Stack modal 动画兼容性**（`courses/new` 和 `courses/[id]` 页）

**验证**：`pnpm typecheck` 通过；现有页面无破坏；modal 转场无卡顿。

### 9.2 阶段 2：基础控件
1. 实现 `src/ui/Button`、`Input`、`Card`
2. 在 `src/components/Button.tsx` 中改为"薄壳"，内部用 `src/ui/Button`
3. 同样处理 `Input.tsx`
4. **关键约束**：`src/ui/Button` 和 `Input` 的 props 接口必须与当前 `components/Button`、`components/Input` 完全一致，确保所有使用方无需修改
5. 其他页面继续用旧的 `components/Button`（薄壳），行为不变

**验证**：单元测试现有按钮行为（见 §12.1）；视觉对比新旧按钮在 3 个断点下无差异。

### 9.3 阶段 3：响应式容器
1. 实现 `src/ui/primitives/Screen`（含键盘适配 + Web SSR guard）
2. 将 `ScreenShell` 改为薄壳，内部用 `src/ui/primitives/Screen`
3. 在 `schedules/index.tsx` 等页面删除重复的 `listWidth` 响应式逻辑
4. 在 Web 端验证 SSR layout shift 问题（见 §2.3）

**验证**：手机/平板/桌面各看一遍；Web 端首屏无 layout shift。

### 9.4 阶段 4：周视图重写 + 数据层重构
1. 将 `expandOccurrences` + `toLocalDate` + `formatDt` 从 `WeekView.tsx` 抽离到 `src/lib/expand-occurrences.ts`
2. 实现 `src/ui/WeekCard`
3. 重写 `src/components/WeekView.tsx`，使用新 `WeekCard` + import 新的 `expandOccurrences` 模块
4. 教师字段（`occ.teacher`）加入渲染——使用当前已存在于数据层的 `CourseOccurrence.teacher`

**验证**：用真实数据测一周展开、跨天事件、当前时间线；对比新旧 WeekView 事件块中教师字段出现。

### 9.5 阶段 5：页面整体替换
1. 逐个页面替换：先 settings（最简单）→ schedules/index → courses/new → courses/[id] → groups/index → groups/[id] → 登录/注册
2. 每替换一个，跑一次冒烟测试
3. 验证 `typedRoutes` 类型推导未丢失

**验证**：每个页面在 3 个断点下截图对比；`pnpm typecheck` 通过。

### 9.6 阶段 6：收尾
1. `src/theme.ts` 改为兼容壳：
   ```ts
   // src/theme.ts (兼容壳)
   export { colors, courseColors, spacing, radius, shadow, fontSize, gradients } from './theme/palette';
   // 标记 @deprecated —— 建议迁移到 '@/theme'
   ```
   保留至少一个版本周期，确保过渡平滑。
2. `src/components/Button.tsx` / `Input.tsx` / `ScreenShell.tsx`：如无外部引用，标记 deprecated 或直接删除（取决于实际引用数）
3. 更新 `docs/design.md` 第 4 节技术选型 + 第 13 节目录结构

---

## 10. 数据流与状态机

**不变**：
- 数据层（api / auth-store / query-client / socket）零修改
- `expandOccurrences` 算法保留（仅抽离模块，不修改逻辑）
- 路由 `app/` 文件树保留
- 所有 React Query key 保留

**变化**：
- 所有 JSX 内部从 `StyleSheet.create` 改为 `Box` / `Text` / `Stack` / 自定义 ui 组件
- `theme.ts` 的 import 改为 `src/theme/`
- `expandOccurrences` import 从 `WeekView.tsx` 内部变为从 `src/lib/expand-occurrences`

---

## 11. 错误处理与边界情况

| 情况 | 处理 |
| --- | --- |
| 主题加载失败 | 静默回退到 Restyle 默认主题；不阻塞渲染 |
| 字体未加载 | 用系统字体渲染（Restyle 默认） |
| 超长课程名 | `numberOfLines={1}` + ellipsize |
| 多事件堆叠 | 课程开始时间相同时，并排（最多 3 列）；更多则折叠成 `+N` |
| 横屏 | 桌面断点生效 |
| 平板横屏 | 桌面断点生效 |
| Web 端 | Restyle 在 web 端工作正常；注意 §2.3 的已知限制 |
| iOS 键盘遮挡 | `Screen` 的 `keyboardAvoid` prop 启用在表单页 |
| Android 阴影差异 | 用 `elevation` 降级（见 §4.4） |

---

## 12. 测试与验证

### 12.1 单元测试（新增）
- `src/ui/Button.test.tsx`：4 种变体、2 种尺寸、loading/disabled 状态
- `src/ui/Input.test.tsx`：label / error / focus 状态
- `src/ui/WeekCard.test.tsx`：4 字段渲染、高度自适应、点击回调
- `src/ui/Screen.test.tsx`：3 个断点下的宽度和 padding，keyboardAvoid 模式
- `src/lib/expand-occurrences.test.ts`：周展开正确性、exdates 过滤、跨天事件

**框架**：Jest + `@testing-library/react-native`

### 12.2 expo-router 集成测试（新增）
- 端到端流程：schedules 列表 → 点击进入 detail → WeekView 渲染课程事件 → 点击事件卡片 → 进入 course/[id] 编辑页 → 修改并保存 → 返回后 WeekView 数据被 invalidate 并重新拉取
- 验证 `useLocalSearchParams` 参数正确传递

### 12.3 视觉验证
- 在 3 个尺寸下截图：iPhone SE (375), iPad (768), Desktop (1280)
- 截图存入 `apps/mobile/__screenshots__/`
- 用 `react-native-snapshot-test` 或手动回归
- **Before/After 对比**：每个页面保留迁移前截图作为基线，迁移后截图对照

### 12.4 冒烟测试
- 注册 → 登录 → 创建课表 → 添加课程 → 查看周视图（验证教师字段出现）→ 加入群组 → 退出登录
- 在 Web 端重复上述流程（验证 Safari backdrop-filter 降级）
- 全部跑通 + 无视觉回归

### 12.5 类型检查
- `pnpm --filter mobile typecheck` 必须 0 错误
- 特别验证 `typedRoutes` 类型推导未丢失

### 12.6 性能
- 周视图 200 课程实例下，首屏 < 200ms（Android 中端机）
- `ScrollView` 内卡片使用 `React.memo`

---

## 13. 风险与权衡

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Restyle 在 web 端偶尔有 CSS 兼容问题 | 桌面端样式可能偏差 | 阶段 3 在 web 端跑通再继续；§2.3 列出具体限制与缓解 |
| `useResponsiveValue` 首帧 width=0 | Web 端 layout shift | Screen 内置 SSR guard（默认 desktop 断点） |
| Restyle + expo-router Stack modal 动画冲突 | `courses/new` 转场卡顿 | 阶段 1 先行验证；已知 workaround：modal 内容区用 `Box` 包裹 |
| 引入新依赖增加 bundle 体积 | 移动端首屏包略大 | Restyle 压缩后约 30KB，可接受 |
| 迁移期间新旧组件混用 | 可能不一致 | 阶段性切换，单页面 1 次切换完；颜色值对齐当前 theme.ts |
| 课表卡片内容截断 | 信息丢失 | 短高度只截断元信息（教室/教师），标题和时间始终显示 |
| 现有 `theme.ts` 改写影响其它引用方 | 编译错误 | 阶段 6 保留兼容导出壳，不直接删除 |
| Restyle + expo-router Stack 动画破坏 typedRoutes | 类型推导丢失 | 阶段 5 的 `pnpm typecheck` 专项验证 |
| Safari `backdrop-filter` 不兼容 | Web 端毛玻璃失效 | 降级方案：`rgba` 半透明背景 + 半透明边框 |
| Android 阴影效果不一致 | iOS 和 Android 视觉差异 | `Platform.select` + `elevation` 降级（见 §4.4） |

---

## 14. 不在本期范围（明确）

- 暗色模式自动切换（color scheme 监听）—— token 结构已预留
- 国际化 / 多语言
- 主题切换器（用户自选主题）
- 动画/微交互（仅保留必要转场）
- 视觉无障碍（a11y）全量审查（保留 `accessibilityLabel` 即可）
- 设计 token 可视化工具（Storybook 之类）
- Web 端桌面布局特化（先用断点方案，后续迭代）

---

## 15. 验收标准

1. 三个断点下截图视觉一致、合理
2. 现有所有 P0/P1 功能无回归，包括 modal 导航模式下的课程编辑页
3. `pnpm typecheck` 通过，`typedRoutes` 类型推导未丢失
4. 单元测试覆盖率 `src/ui/` ≥ 80%，`src/lib/expand-occurrences.ts` 有专项测试
5. 课表卡片精确展示 4 字段（时间/内容/教室/教师）
6. 旧 `theme.ts` 标记 `@deprecated` 并保留兼容导出壳
7. `expandOccurrences` 已从 `WeekView.tsx` 抽离为独立模块
8. 文档（`docs/design.md`）已更新技术选型和目录结构
9. Web 端 Safari 下毛玻璃效果有降级显示（非白屏/错乱）
10. Android 端阴影效果可用（elevation 降级）

---

## 16. 实施审阅记录

> 审阅日期 2026-06-07。基于 `apps/mobile/src/` 的实际代码对照设计稿逐项检查。

### 16.1 已完成项（阶段 1–5）

| 项 | 文件 | 状态 |
| --- | --- | --- |
| theme/ 五文件 | `src/theme/palette.ts` `spacing.ts` `breakpoints.ts` `shadow.ts` `index.ts` | 完全符合 §4 设计 |
| 旧 theme.ts 兼容壳 | `src/theme.ts` | 一行 re-export，标记 @deprecated |
| ThemeProvider 挂载 | `app/_layout.tsx` | 包裹 SafeAreaProvider，位置正确 |
| @shopify/restyle 安装 | `package.json` → v2.4.5 | 正确 |
| Screen 原语 | `src/ui/primitives/Screen.tsx` | SSR guard + keyboardAvoid + 三断点响应 |
| Card 原语 | `src/ui/primitives/Card.tsx` | elevated/bordered/padded 三态 |
| Stack 原语 | `src/ui/primitives/Stack.tsx` | flexDirection + gap |
| Divider 原语 | `src/ui/primitives/Divider.tsx` | 正确 |
| Button 新组件 | `src/ui/Button.tsx` | props 签名完全向后兼容 |
| EmptyState | `src/ui/EmptyState.tsx` | icon/title/subtitle/action 四态 |
| WeekCard | `src/ui/WeekCard.tsx` | 4 字段 + 高度自适应（56/32px） |
| Button 薄壳 | `src/components/Button.tsx` | 一行 re-export |
| ScreenShell 薄壳 | `src/components/ScreenShell.tsx` | 一行 re-export |
| expandOccurrences 抽离 | `src/lib/expand-occurrences.ts` | 逻辑原样，导出 toLocalDate |
| WeekView 重写 | `src/components/WeekView.tsx` | 消费 WeekCard + 独立模块 + 窄屏横滑 |
| 7 个 Screen 文件 | `src/screens/` | SchedulesList / ScheduleDetail / CourseForm / GroupsList / GroupDetail / Login / Register / Settings |
| 8 个路由文件 | `app/(app)/**/*.tsx` `app/(auth)/**/*.tsx` | 全部转为一行 re-export |
| gradients 清理 | 全项目 | 已从 palette 移除，零残留引用 |

### 16.2 待完成（审阅发现的问题）

| ID | 问题 | 位置 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| R1 | **SettingsScreen 未使用 Restyle 原语** | `src/screens/SettingsScreen.tsx` | 视觉一致性断裂：全页使用 react-native `View`/`Text` + 内联硬编码颜色，其他 7 个 screen 均已迁移 | 用 `Box`/`Text`/`Card` 重写，消费 theme tokens |
| R2 | **`src/ui/Input.tsx` 未创建** | 设计稿 §5.4 | 各 screen 仍 import 旧 `components/Input`，未享受聚焦态 primary 边框 / 错误态背景 / icon slot | 创建新 Input，参照 Button 薄壳模式：`components/Input` → re-export `ui/Input` |
| R3 | **`IconButton` 未创建** | 设计稿 §5.1 | WeekView 导航箭头、ScheduleDetail 操作按钮均为内联 `Pressable` + 硬编码样式 | 封装 `src/ui/IconButton.tsx`：圆形按钮、三种尺寸、primary/ghost 变体 |
| R4 | **`RoleChip` 未创建** | 设计稿 §5.1 | `GroupDetailScreen` 成员角色 chip 用内联 `Box` 拼装，样式分散 | 封装 `src/ui/RoleChip.tsx`：owner/editor/viewer 三色 + pill 圆角 |
| R5 | **`Modal` 组件未创建** | 设计稿 §5.7 | 所有 Modal 直接使用 react-native `<Modal>`，不符合居中式卡片 + phone 底部弹出的设计 | 封装 `src/ui/Modal.tsx`：居中卡片、遮罩 50%、断点自适应弹出方向 |

> R2–R5 不阻塞当前功能，旧组件或原生 Modal 可用。优先修复 R1（SettingsScreen 迁移）、R2（Input），R3–R5 下一迭代批量补上。

---

## 17. 关键决策记录

| 决策 | 备选 | 选择 | 理由 |
| --- | --- | --- | --- |
| UI 抽象层 | NativeWind / Restyle / 自写 | **Restyle** | 主题集中 + 响应式原生 + RN 心智不变 |
| 课表布局 | 列表 / 网格 / 混合 | **周时间网格（优化卡片）** | 与用户原始诉求一致 |
| 视觉风格 | 极简 / Material / 多彩 | **现代极简** | 与 brainstorming 中用户选择一致 |
| 色彩主题 | 重新选 / 保留 | **保留（对齐当前值）** | 颜色值对齐当前 `theme.ts`，避免迁移期视觉差异 |
| 课表卡片字段 | 全部 / 4 字段 | **4 字段（补齐教师）** | 教师字段数据层已存在，仅渲染层补齐 |
| 响应式策略 | 纯响应式 / 平台分支 | **断点 + 响应式值 + 平台分支** | 维护成本低，覆盖三端差异 |
| 迁移方式 | 大爆炸 / 渐进 | **渐进（6 阶段）** | 风险可控，每阶段可验证 |
| 旧文件删除 | 直接删除 / 保留兼容壳 | **保留兼容壳** | 避免第三方引用编译错误 |
| 键盘适配 | ScreenShell 内嵌 / 页面各自处理 | **Screen 统一封装** | 减少重复代码 |
| expandOccurrences | 保留在 WeekView / 抽离 | **抽离独立模块** | 消除前后端双重实现 |
| Modal 模式兼容 | 仅 push / 仅 modal | **同时兼容** | 当前 `courses/new` 为 modal 模式，保持兼容 |
| 暗色模式 token | 本期预留 / 后续重构 | **本期预留键位** | Restyle 原生支持，不增加成本 |