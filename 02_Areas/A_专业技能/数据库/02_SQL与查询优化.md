# 02 SQL与查询优化

---

## 2.1 SQL 核心语法

### 必须掌握

#### DDL（数据定义）
- `CREATE TABLE` / `ALTER TABLE` / `DROP TABLE` / `TRUNCATE`
- 重点：ALTER 修改列类型时的锁表行为（MySQL Online DDL 原理）

#### DML（数据操作）
- `INSERT` / `UPDATE` / `DELETE` — 注意 WHERE 条件的作用范围
- `INSERT INTO ... SELECT` — 批量迁移数据
- `UPSERT`（`INSERT ... ON DUPLICATE KEY UPDATE` / PostgreSQL `ON CONFLICT DO UPDATE`）

#### DQL（数据查询）
- **JOIN 类型**：INNER / LEFT / RIGHT / FULL / CROSS（笛卡尔积）
- **子查询**：标量子查询、行子查询、EXISTS / NOT EXISTS（vs IN 的性能差异）
- **聚合函数**：COUNT / SUM / AVG / MAX / MIN + GROUP BY
- **HAVING vs WHERE**：HAVING 用于聚合后过滤，WHERE 用于聚合前过滤
- **窗口函数**：ROW_NUMBER() / RANK() / DENSE_RANK() / LAG() / LEAD() — 必须能手写
- **CTE（公用表表达式）**：`WITH ... AS` 写法，递归 CTE 处理树形数据

#### DCL（数据控制）
- `GRANT` / `REVOKE` — 权限授予与回收

### 学后任务

> 准备一张 orders 表（含字段：id, user_id, amount, status, created_at），写 10 道 SQL：
> 1. 查询每个用户的累计消费金额（按金额降序排列，取前 10 名）
> 2. 找出连续 3 天都有下单的用户（窗口函数解法）
> 3. 查询某用户所有订单及其"下一笔订单的时间间隔"（LEAD 窗口函数）
> 4. 用 CTE 递归查询组织架构树（模拟：员工表有 id + parent_id）
> 5. 使用 LEFT JOIN 找出没有任何订单的用户
> 6. 用 EXISTS 改写第 5 题，对比执行计划是否有差异
> 7. GROUP BY ... HAVING：找出订单数超过 5 笔的用户
> 8. UPSERT：模拟每日汇总表，数据存在则更新，不存在则插入
> 9. 用 INSERT INTO ... SELECT 把订单数据按月归档到 history_orders 表
> 10. 写 GRANT 语句：只给 dev_user 赋予 orders 表的 SELECT 和 INSERT 权限
>
> 每道题保留 SQL 和执行结果截图。

---

## 2.2 执行计划分析

### 必须掌握

- **EXPLAIN** 输出字段的含义：

| 字段 | 含义 |
|------|------|
| type | 访问类型：ALL（全表扫描）< index < range < ref < eq_ref < const < system |
| key | 实际使用的索引 |
| rows | 预估扫描行数 |
| Extra | Using index（覆盖索引）/ Using filesort（额外排序）/ Using temporary（临时表） |
| filtered | WHERE 过滤后的行数百分比 |

- **EXPLAIN ANALYZE**（MySQL 8.0.18+）：显示实际执行时间和行数
- **慢查询配置**：`slow_query_log` / `long_query_time` / `log_queries_not_using_indexes`

### 学后任务

> 实战分析：
> 1. 创建一张 100 万行的测试表（可写脚本批量生成）
> 2. 分别对以下查询执行 EXPLAIN，记录 type、key、rows、Extra：
>    - 无索引的 WHERE 条件查询
>    - 有普通索引的等值查询
>    - 联合索引的范围查询
>    - 覆盖索引查询 vs 回表查询
>    - LIKE '%xxx%' 模糊查询（对比前后缀索引差异）
>    - ORDER BY 非索引列的查询（观察 filesort）
>    - GROUP BY 非索引列的查询（观察 temporary）
> 3. 整理成一份「执行计划速查笔记」，每个 case 标注 type 的优/劣判断

---

## 2.3 索引设计与优化

### 必须掌握

#### 索引类型
- **B+Tree 索引**（默认）：支持 > < = BETWEEN LIKE '前缀%'
- **Hash 索引**：只支持 = 和 <>，不支持范围
- **全文索引（FULLTEXT）**：LIKE 的替代，中文需配合分词器（ngram / jieba）
- **空间索引（SPATIAL / R-Tree）**：地理位置查询

#### 核心原则

| 原则 | 说明 |
|------|------|
| **最左前缀原则** | 联合索引 (a, b, c)，查询条件必须从 a 开始才能用到索引 |
| **覆盖索引** | 查询的所有列都在索引中 → 不回表，Extra 显示 Using index |
| **索引下推（ICP）** | 存储引擎层先过滤，减少回表次数（MySQL 5.6+） |
| **避免索引失效** | 函数包裹列、隐式类型转换、OR 条件、否定条件（!= / NOT IN） |
| **区分度** | `COUNT(DISTINCT col) / COUNT(*)`，太低不适合建索引（如性别字段） |

#### 索引设计方法论
- 根据 SQL 频率定索引（先看慢查询日志）
- 联合索引列顺序 = 等值条件在前 + 范围条件在后 + 排序/分组列最后
- 索引并非越多越好：写入性能损耗、存储空间占用

### 学后任务

> 优化实战：
> 1. 设计一张电商订单表（10+ 字段），写入 10 万条测试数据
> 2. 列举该表常见的 5 种查询场景（按用户查、按时间范围查、按状态+时间查、按金额排序、统计每日订单量）
> 3. 为每个查询场景设计最优索引，解释为什么这么建
> 4. 对每个场景执行 EXPLAIN，验证索引是否生效
> 5. 总结：这 5 个场景最少需要几个索引？有没有可以复用的联合索引？
> 6. 基准测试：对比加索引前后的查询耗时（5 次取平均）

---

## 2.4 慢查询分析与调优

### 必须掌握

- **找到慢 SQL**：慢查询日志、performance_schema、`SHOW PROCESSLIST`、pt-query-digest
- **常见慢查询原因与对策**：

| 问题 | 原因 | 对策 |
|------|------|------|
| 全表扫描 | 没索引 / 索引失效 | 加索引，改写 SQL 避免函数包裹 |
| 回表过多 | 索引不含查询列 | 覆盖索引 / 调整 SELECT 列 |
| filesort | ORDER BY 不匹配索引顺序 | 调整索引列顺序让排序也用上 |
| 临时表 | GROUP BY + JOIN 导致 | 尽量让 GROUP BY 字段有索引 |
| 大分页 | `LIMIT 100000, 20` | 游标分页（基于主键）/ 延迟关联 |
| 锁等待 | 大事务 / DDL | 拆分事务，pt-online-schema-change |
| N+1 查询 | 循环查库 | JOIN 一次查完 / IN 批量查 |

- **大分页优化公式**：
  ```sql
  -- 不好：OFFSET 越大越慢
  SELECT * FROM orders ORDER BY id LIMIT 100000, 20;

  -- 好：基于上次的主键覆盖索引定位
  SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
  ```

### 学后任务

> 慢查询调优实操：
> 1. 准备一张 500 万行的订单表（脚本生成或使用公开数据集）
> 2. 故意写出 5 条性能很差的 SQL（全表扫描、索引失效、大分页、filesort、temporary）
> 3. 用 EXPLAIN 定位问题 + 给出优化方案，优化后再次 EXPLAIN 验证
> 4. 对比优化前后的执行时间，量化提升幅度
> 5. 写一份「SQL 优化案例集」，每条包含：原 SQL → 问题分析 → 优化后 SQL → 性能对比

---

## 模块总结任务

> 搭建一个简单的日志分析系统：
> - 使用 MySQL 建一张 access_log 表（至少 100 万行模拟数据）
> - 实现以下查询并确保每个查询的 EXPLAIN type 不低于 range：
>   1. 按时间范围统计各接口的调用次数
>   2. 查询某个用户最近 7 天的访问记录（分页）
>   3. 找出 Top 10 响应时间最长的接口
>   4. 按小时粒度统计 QPS
> - 为每个查询写出索引方案和执行计划截图
> - 最终交付：SQL 文件 + 索引设计方案文档 + EXPLAIN 截图