# 08 NoSQL

> 关系型数据库不是银弹。本章介绍工程中常用的 NoSQL 数据库，每种包含核心概念 + 典型场景 + 必须避开的大坑。

---

## 8.1 Redis（KV 存储 + 数据结构服务器）

### 必须掌握

#### 核心数据结构与应用场景

| 数据结构 | 操作 | 典型场景 |
|----------|------|----------|
| **String** | SET / GET / INCR / SETEX | 缓存、计数器、分布式锁 |
| **Hash** | HSET / HGET / HGETALL | 用户信息缓存、购物车 |
| **List** | LPUSH / RPOP / LRANGE | 消息队列（简易）、时间线 |
| **Set** | SADD / SINTER / SUNION | 标签、共同好友、去重 |
| **Sorted Set** | ZADD / ZRANGE / ZRANK | 排行榜、延迟队列（score=时间戳） |
| **Stream** | XADD / XREAD / XGROUP | 可靠消息队列（Redis 5.0+） |
| **Bitmap** | SETBIT / BITCOUNT | 签到统计、用户在线状态 |
| **HyperLogLog** | PFADD / PFCOUNT | UV 统计（误差 0.81%） |
| **Geo** | GEOADD / GEORADIUS | 附近的人、LBS |

#### 缓存三大问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **缓存穿透** | 查不存在的数据 → 每次都穿透到 DB | 布隆过滤器 / 空值缓存（短 TTL） |
| **缓存击穿** | 热点 Key 过期 → 大量请求打到 DB | 互斥锁（SETNX 重建）、永不过期 + 异步更新 |
| **缓存雪崩** | 大批 Key 同时过期 → DB 崩溃 | 过期时间加随机偏移、多级缓存、限流降级 |

#### 分布式锁

```python
# 加锁（原子性）
SET lock_key random_value NX EX 30

# 解锁（Lua 脚本保证原子性，只删自己的锁）
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```

- **必须设置过期时间**（防死锁）
- **解锁必须是自己的锁**（防误删）
- **Redisson**（Java）/ **Redlock** 提供了成熟封装

#### 持久化

| 方式 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **RDB** | 快照，定时 dump 内存 | 恢复快、文件小 | 可能丢失最后几分钟数据 |
| **AOF** | 追加每一条写命令 | 数据更安全 | 文件大、恢复慢 |
| **混合** | Redis 4.0+ RDB + AOF | 兼顾 | — |

### 学后任务

> Redis 综合实战：
> 1. **缓存**：为数据库查询结果加 Redis 缓存
>    - 实现 Cache-Aside 模式（先读缓存 → 未命中 → 读 DB → 写缓存）
>    - 处理：缓存穿透（布隆过滤器）、击穿（互斥锁）、雪崩（随机过期）
> 2. **分布式锁**：
>    - 用 SET NX 实现一个分布式锁工具类（含自动续期 watch dog）
>    - 用 10 个并发线程抢锁，验证互斥性
>    - 模拟锁持有者崩溃 → 验证锁能自动释放
> 3. **排行榜**：
>    - 用 Sorted Set 实现「文章热度排行榜」
>    - 支持：按热度排名、查某文章排名、查 Top N
> 4. **压测对比**：对比有缓存和无缓存的 QPS 差异（JMeter 1000 并发）
>
> 提交：完整代码 + 压测对比数据 + 缓存问题处理方案

---

## 8.2 MongoDB（文档数据库）

### 必须掌握

#### 核心概念

| RDBMS | MongoDB |
|-------|---------|
| Database | Database |
| Table | Collection |
| Row | Document（BSON） |
| Column | Field |
| Primary Key | `_id`（ObjectId 默认） |

#### 适用场景
- Schema 灵活多变（IoT 设备数据、爬虫数据）、嵌套文档多（省去 JOIN）
- 日志存储（JSON 格式写入，按时间分片）
- 内容管理系统（文章、评论的嵌套结构）

#### 必须避开的坑

- **别当关系型数据库用**：大量 JOIN（$lookup）性能差
- **别滥用嵌套文档**：单个文档不能超过 16MB
- **建立索引**：无索引 = 全集合扫描（`COLLSCAN`），性能和 MySQL 全表扫描一样灾难
- **事务**：4.0+ 支持多文档 ACID，但性能不如 MySQL

#### 索引

```javascript
// 单字段索引
db.users.createIndex({ email: 1 })

// 复合索引
db.orders.createIndex({ user_id: 1, created_at: -1 })

// TTL 索引（自动过期清理）
db.sessions.createIndex({ created_at: 1 }, { expireAfterSeconds: 3600 })
```

### 学后任务

> MongoDB 日志系统实战：
> 1. 用 Docker 启动 MongoDB
> 2. 设计一个 API 访问日志的 Collection：
>    - 字段：timestamp, user_id, method, path, status, response_time, request_body, response_body
>    - 选择合适的嵌套/扁平策略
> 3. 写脚本写入 100 万条日志数据
> 4. 实现以下查询并观察执行计划（explain）：
>    - 查询某用户最近 7 天日志
>    - 查询响应时间 > 1 秒的日志（Top 10）
>    - 按小时统计各接口的调用次数（aggregation pipeline）
> 5. 建索引优化以上查询，对比前后的 executionStats
> 6. 设置 TTL 索引：30 天后自动删除
>
> 提交：Collection schema + 查询代码 + explain 对比 + 索引设计说明

---

## 8.3 Elasticsearch（搜索引擎）

### 必须掌握

#### 核心概念

| 概念 | 说明 | 类比 |
|------|------|------|
| Index | 文档集合 | Database |
| Document | JSON 数据 | Row |
| Mapping | 字段类型定义 | Schema |
| Shard | 数据分片 | Partition |
| Replica | 副本 | 从库 |

#### 倒排索引原理

```
文档1: "MySQL 索引 优化"  →  分词 →  [MySQL, 索引, 优化]
文档2: "Redis 缓存 优化"  →  分词 →  [Redis, 缓存, 优化]

倒排索引：
  MySQL  → [文档1]
  索引   → [文档1]
  优化   → [文档1, 文档2]
  Redis  → [文档2]
  缓存   → [文档2]
```

#### 适用场景
- 全文搜索（商品搜索、文章检索）— **核心场景**
- 日志分析（ELK Stack：Elasticsearch + Logstash + Kibana）
- 实时数据分析（Aggregation、指标统计）

#### 与 MySQL 的配合模式
- **MySQL 是 source of truth**（权威数据源）
- **ES 是搜索索引**，通过 CDC（canal / Debezium）同步
- **写路径**：写入 MySQL → binlog → 同步到 ES
- **读路径**：搜索走 ES → 获取 ID 列表 → 查 MySQL 拿完整数据（可跳过，如果 ES 存了全量）

### 学后任务

> Elasticsearch 商品搜索实战：
> 1. 用 Docker 启动 ES + Kibana
> 2. 创建商品索引，Mapping 包含：name（text+ik分词）、description（text）、price（double）、tags（keyword）、created_at（date）
> 3. 写入 10000 条模拟商品数据
> 4. 实现以下搜索：
>    - 关键词搜索（ik 中文分词，highlight 高亮）
>    - 多字段搜索（name^3 + description^1，权重）
>    - 过滤（价格范围、tags 精确匹配）+ 排序
>    - 聚合（按 tags 分组统计数量，价格区间分布）
>    - 分页（from/size vs search_after 深度分页）
> 5. 对比 MySQL LIKE 和 ES 搜索的性能差异
>
> 提交：Mapping + 搜索 DSL + 性能对比数据

---

## 8.4 ClickHouse（列式分析数据库）

### 必须掌握

#### 行存 vs 列存

```
行存（MySQL）：读一行所有列一起读 → OLTP
列存（ClickHouse）：读一列只读那一列的数据 → OLAP
```

#### 核心特性
- **MergeTree 引擎**：核心表引擎，按 ORDER BY 排序，按 PARTITION BY 分区
- **向量化执行**：一批数据一起算，充分利用 CPU 缓存
- **写入特性**：追加为主，不擅长单行 UPDATE/DELETE
- **压缩比**：通常 5~10 倍，查询快 + 省空间

#### 适用场景
- 实时数据分析（用户行为、广告点击、IoT 遥测）
- BI 报表（大宽表聚合查询）
- 日志分析（替代 ELK 中的 ES 存储，压缩率更好）

#### 注意
- ❌ 不适合 OLTP（频繁单行更新/删除）
- ❌ 并发写入需控制批次
- ❌ 默认不保证精确去重（用 ReplacingMergeTree 或 AggregatingMergeTree）

### 学后任务

> ClickHouse 分析实战：
> 1. 用 Docker 启动 ClickHouse
> 2. 建表 `events`（event_time, user_id, event_type, page, duration, ...）
> 3. 用脚本生成 1000 万行事件数据，导入 ClickHouse
> 4. 实现以下分析查询并记录耗时：
>    - 每小时的 PV/UV（uniqExact）
>    - 各页面访问量 Top 10
>    - 用户留存率（次日、7 日）
>    - 漏斗分析（首页→搜索→下单 转化率）
> 5. 同样数据导入 MySQL，对比相同查询的耗时（如果可以执行的话...）
> 6. 测试 ClickHouse 分区策略对查询性能的影响
>
> 提交：建表 SQL + 查询 SQL + 性能对比 + 分区实测分析

---

## 8.5 Neo4j（图数据库）

### 必须掌握

#### 核心概念

| 概念 | 说明 |
|------|------|
| 节点（Node） | 实体，可以有多个标签（Label） |
| 关系（Relationship） | 节点间的有向边，必须有一个类型（Type） |
| 属性（Property） | 节点和关系的 KV 属性 |
| Cypher | 图查询语言（类似 SQL 但面向图） |

#### 适用场景

- **社交关系**：好友推荐（共同好友）、六度关系
- **知识图谱**：实体+关系推理（你已有的 Agent 记忆系统方向）
- **推荐系统**：基于图的协同过滤
- **欺诈检测**：关联交易环检测

#### 为什么不用 MySQL

```
MySQL 查"我的好友的好友"：多层 JOIN 或递归 CTE，深度越大越慢
Neo4j 查同一问题：MATCH (a)-[:FRIEND*2]->(b)，图遍历天然高效
```

### 学后任务

> Neo4j 关系查询实战：
> 1. 用 Docker 启动 Neo4j（含浏览器 UI）
> 2. 导入「水浒传人物关系」数据集或自建数据集（如 100 人 + 300 条关系）
> 3. 实现以下 Cypher 查询：
>    - 查某个人的所有朋友
>    - 查两个人之间的最短路径
>    - 推荐可能认识的人（共同好友 ≥ 2）
>    - 查某个人的 2 度人脉网络（路径深度 ≤ 2）
> 4. 同样的数据用 MySQL 的递归 CTE 实现，对比查询复杂度
> 5. 分析：什么场景下必须用图数据库？什么场景下 MySQL 也能应付？
>
> 提交：Cypher 查询 + 关系图截图 + MySQL vs Neo4j 对比分析

---

## 模块总结任务

> NoSQL 选型决策矩阵：
> 设计一个问答式的 NoSQL 选型指南（可以是流程图或决策树），例如：
> - 需要全文搜索？ → ES
> - 需要高并发缓存/排行榜？ → Redis
> - Schema 灵活且数据嵌套深？ → MongoDB
> - 大宽表聚合分析？ → ClickHouse
> - 复杂关系深度遍历？ → Neo4j
> - 以上都不满足？ → PostgreSQL / MySQL
>
> 为你工作中遇到的 3 个具体场景做技术选型，写清楚：
> - 场景描述
> - 候选方案
> - 选择依据
> - 不选其他方案的原因
>
> 交付：选型决策树 + 3 个真实场景选型分析