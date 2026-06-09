# pnpm 和 Turborepo 是怎么实现 monorepo 的

> 上一篇《架构详解》厘清了 Monorepo 是"思想"不是"框架"，那真正落地时，pnpm 和 Turborepo 这两个工具是怎么把"思想"变成"工程"的？这篇把它们的职责讲清楚。

## 一句话分工

**pnpm 管"物"（包和依赖），Turbo 管"事"（任务和构建），二者职责互补，叠加起来才是一个完整的 monorepo 工程体系。**

```
┌──────────────────────────────────────┐
│           pnpm：管"物"               │
│  ┌────────────────────────────────┐  │
│  │ 仓库布局 (workspaces)          │  │
│  │ 依赖安装 (store + 硬链接)      │  │
│  │ 跨包引用 (workspace: 协议)    │  │
│  │ 幻影依赖防护 (非平铺结构)      │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
                  ↓ 提供基础设施
┌──────────────────────────────────────┐
│         Turborepo：管"事"            │
│  ┌────────────────────────────────┐  │
│  │ 任务编排 (pipeline + DAG)      │  │
│  │ 增量构建 (hash + 缓存)         │  │
│  │ 远程缓存 (团队/CI 共享)        │  │
│  │ 任务并行与过滤                 │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
                  ↓
        完整的 monorepo 工程
```

---

## pnpm 是怎么支撑 monorepo 的？

### 1. pnpm workspaces（基础）
在根 `package.json` 声明：
```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "pnpm -r run build"
  }
}
```
加上 `pnpm-workspace.yaml`：
```yaml
packages:
  - "packages/*"
  - "apps/*"
```
这告诉 pnpm：哪些目录是子包。

### 2. workspace 协议（跨包引用）
子包之间互相引用时用 `workspace:*`：
```json
// packages/ui/package.json
{
  "name": "@my/ui",
  "dependencies": {
    "@my/utils": "workspace:*"
  }
}
```
pnpm 把它软链到 `node_modules/@my/utils`，指向本地源码，**改了立即生效，不用发包**。

### 3. 内容寻址存储（节省磁盘）
pnpm 把所有下载过的包存到 `~/.pnpm-store/`：
- 同一个包的不同版本**只下载一次**
- 各项目通过**硬链接（hard link）**引用，几乎不占空间
- 一台机器上 10 个 monorepo 项目，公用一套包

### 4. 非平铺 node_modules（解决幻影依赖）
传统 npm 把所有依赖平铺到 `node_modules`，导致**没在 package.json 声明的包也能 require 进来**（幻影依赖，升级时莫名挂掉）。

pnpm 的结构是：
```
node_modules/
├── .pnpm/                       # 中心存储（硬链接）
│   └── react@18.2.0/
│       └── node_modules/
│           └── react/           # 实际文件
├── react -> .pnpm/react@18.2.0/node_modules/react   # 软链
```
每个包**只能看到自己声明过的依赖**，从根上杜绝了幻影依赖。

### 5. 过滤执行
```bash
pnpm -r run build              # 所有子包都跑
pnpm --filter @my/ui run build # 只跑 ui 包
pnpm --filter ...@my/ui run build  # 跑 ui 及其依赖它的下游包
```

---

## Turborepo 是怎么支撑 monorepo 的？

### 1. 任务管道（pipeline）
在 `turbo.json` 声明任务和依赖：
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```
- `^build`：依赖的包先 build
- 不带 `^`：当前包自己的 build
- Turbo 自动构建 DAG，按拓扑顺序执行

### 2. 缓存机制（核心）
Turbo 给每个任务算一个 hash：
```
hash = hash(包内文件 + 环境变量 + 依赖图 + 命令)
```
- hash 没变 → 直接跳过
- 改了文件 → hash 变 → 重新执行并存缓存

本地缓存在 `node_modules/.cache/turbo`，远程缓存可以挂 Vercel 或自建 S3。

### 3. 过滤和并行
```bash
turbo run build --filter=@my/ui...   # ui 及下游
turbo run build --force              # 强制全量
turbo run lint --parallel            # 无依赖任务并行
```

### 4. 智能识别"哪些包要跑"
不改代码跑 `turbo run build`：几秒搞定（命中缓存）
改了 `@my/utils` 再跑：只重跑 utils + 依赖 utils 的包
这就是为什么本地用 turbo 跑"全量检查"也很快。

---

## 类比

pnpm 像**仓库管理员**：
- 包从哪进货（registry 拉取）
- 放哪个货架（store）
- 怎么搬（硬链接 + 软链）
- 谁可以拿（依赖可见性）

Turborepo 像**车间主任**：
- 工序怎么排（pipeline）
- 哪些件要重做（cache 失效）
- 多条产线怎么并行（并行执行）
- 别人做完的能不能借来用（远程缓存）

---

## 实际项目里通常的组合

```json
// 根 package.json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "packageManager": "pnpm@9.0.0"
}
```

`pnpm install` 装依赖，`turbo run` 跑任务，**二者不冲突也不重叠**。这也是为什么前面《turbo 是干啥的》里说"实际项目里常见组合是 pnpm + turbo"。

---

## 串联阅读

- 上游：《架构详解》—— Monorepo 的概念与背景
- 平级：《turbo 是干啥的》—— Turbo 的核心能力详解
- 平级：《monorepo 全量构建的作用》—— turbo 在本地开发中的实际用法
