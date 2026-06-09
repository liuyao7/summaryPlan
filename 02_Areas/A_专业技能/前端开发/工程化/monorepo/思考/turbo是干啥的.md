# Turbo 是干啥的

## 一句话定义

Turbo（Turborepo）是 Vercel 开源的一款**面向 JavaScript/TypeScript  Monorepo 的高性能构建系统**，核心解决 monorepo 下"任务编排 + 增量构建 + 远程缓存"三大痛点。

---

## 它解决了什么痛点？

monorepo 把所有包放在一个仓库里后，会出现新的麻烦：

1. **构建/测试很慢**：改一个包，全量跑一遍所有包的 build / test / lint，几分钟起步
2. **任务依赖乱**：包 A 的 build 依赖包 B 的 build，手动串起来很烦
3. **CI 重复劳动**：同一个 commit，CI 上跑一遍，本地也跑一遍，结果一样但耗时翻倍
4. **缓存靠人**：每个包自己写的脚本，`rm -rf dist` 然后重来，没有统一缓存机制

Turbo 就是来治这些的。

---

## 核心能力

### 1. 任务编排（Task Pipeline）
通过 `turbo.json` 声明任务之间的依赖关系，Turbo 会自动构建一张**任务依赖图（DAG）**，按拓扑顺序执行。

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],        // 依赖的包先 build
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],          // 当前包 build 完再 test
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,                  // dev 不缓存
      "persistent": true               // 长进程
    }
  }
}
```

`^build` 表示"依赖的包"的 build 任务（注意 `^` 前缀），这是 turbo 最精髓的语法。

### 2. 增量构建 + 本地缓存
- Turbo 会记录**每个任务的输入**（文件、环境变量、依赖图）
- 输入没变、输出还在 → 直接跳过，命中缓存
- 第一次跑全量，改了代码再跑，Turbo 只跑"受影响"的包

```bash
# 第一次：全量跑，缓存结果
turbo run build

# 改了 pkg-a 之后：只跑 pkg-a 以及依赖 pkg-a 的下游包
turbo run build
```

### 3. 远程缓存（Remote Cache）
本地缓存只能给自己用，团队协作和 CI 需要**远程缓存**：
- 上传构建产物到 Vercel 远程缓存（或自建 S3 兼容服务）
- 其他成员/CI 拉取复用，**同一份代码只构建一次**

效果：CI 跑一次 build 5 分钟，团队所有人都能秒级拿到结果。

### 4. 并行执行
任务之间无依赖时自动并行，充分利用多核 CPU。

---

## 工作原理（简化版）

```
1. 读取 turbo.json + 扫描各 package.json
2. 解析任务依赖，构建 DAG（有向无环图）
3. 计算每个任务的 hash：
   hash = hash(依赖图 + 文件内容 + 环境变量 + 命令)
4. 查缓存（本地 .turbo/cache → 远程 Vercel Cache）
   - 命中且 outputs 存在 → 跳过
   - 未命中 → 执行命令 → 存缓存
5. 按拓扑顺序 + 并行度执行未命中任务
```

这就是为什么改一个文件，turbo 知道"只跑相关的几个包"。

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `turbo run build` | 执行 build 任务，自动按依赖编排 |
| `turbo run test --filter=pkg-a` | 只跑 pkg-a 及其下游 |
| `turbo run build --force` | 忽略缓存，强制全量 |
| `turbo run lint --parallel` | 并行执行 |
| `turbo run build --dry` | 看 turbo 计划跑什么，不真跑 |
| `turbo run build --summarize` | 跑完生成 summary，UI 页面看耗时分布 |

`--filter` 非常实用，可以按包名、目录、依赖关系过滤。

---

## 与其他 monorepo 工具的对比

| 工具 | 定位 | 特点 |
|------|------|------|
| **Turbo** | 构建编排 + 缓存 | 极简、专注构建，依赖 pnpm/yarn workspaces 做包管理 |
| **Lerna** | 老牌，发布管理 | 偏 npm 发布流程，构建能力弱，2023 年已被 nrwl 收购并归档 |
| **Nx** | 全家桶 | 内置代码生成、依赖图分析、CI 集成，功能多但重 |
| **Rush** | 微软出品 | 面向超大 monorepo，企业级，配置复杂 |
| **pnpm workspace** | 包管理 | 只管依赖安装和软链，不管任务编排，需要搭配 turbo/nx |

实际项目里常见组合：**pnpm + turbo**，pnpm 管依赖，turbo 管任务。

---

## 优缺点

**优点：**
- 配置极简，一个 `turbo.json` 就能跑起来
- 远程缓存是真香，团队/CI 提速明显
- 与 pnpm/yarn/npm workspaces 无缝集成
- 由 Vercel 维护，更新活跃，文档好

**缺点：**
- 不管包管理、代码生成、依赖分析，这些要自己搭配
- 远程缓存默认依赖 Vercel 服务（自托管需要配置）
- 复杂场景（多语言、自定义插件）扩展性不如 Nx
- 任务编排能力有限，复杂的构建链还是要自己写脚本

---

## 适用场景

✅ 适合：
- 纯 JS/TS 栈的 monorepo（React/Vue/Node 工程）
- 团队规模中等，需要提速 CI 和本地开发
- 已经用 pnpm/yarn workspaces，想加一层任务编排

❌ 不太适合：
- 多语言混合（Java + TS + Go）—— 用 Nx/Rush 更合适
- 巨型 monorepo（Google 那种）—— 自己造轮子
- 单包项目 —— 大材小用

---

## 配合之前那篇"全量构建"理解

上一篇说 turbo run check-types / build 很多时候只是**本地辅助工具**，CI 并不全量编译。这其实就是 turbo 增量构建的体现：

- CI 只构建"要部署的目标应用"
- 但本地需要保证"我改的公共类型没把别的包搞挂" → `turbo run check-types`
- turbo 自动算出"哪些包需要被检查"，本地也能几秒跑完

所以 turbo 的价值不在"全量构建"本身，而在"**让全量构建变得便宜**"——按需执行 + 缓存命中，几分钟的事压到几秒。
