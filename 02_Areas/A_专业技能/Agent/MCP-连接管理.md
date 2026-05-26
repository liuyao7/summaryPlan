# MCP 连接管理：从 Demo 到生产

## 一、Demo 模式：长连接 + stdio

`connectAllMCP` 是 Agent 的多服务连接入口，一次性建立所有连接，会话期间复用。

### 流程图

```
connectAllMCP([
  { name: "weather",    file: "weather-server.js" },
  { name: "calculator", file: "calculator-server.js" },
])

     │
     ├─ foreach cfg ──────────────────────────────┐
     │                                              ▼
     │   ① 开子进程 + 建通信通道
     │   new StdioClientTransport({
     │     command: "node",
     │     args: [cfg.file]       // "node weather-server.js"
     │   })
     │   等价于 spawn 一个 Node.js 子进程，
     │   stdin/stdout 被 MCP 库接管用于 JSON-RPC 通信
     │
     │   ② 创建 MCP 客户端
     │   new Client({ name: `mini-agent-${cfg.name}`, version: "1.0.0" })
     │   Client 知道怎么发标准的 tools/list、tools/call 请求
     │
     │   ③ 握手连接
     │   await mcp.connect(transport)
     │   触发 MCP initialize 握手 → Server 响应能力声明 → 双方就绪
     │
     │   ④ 存入连接池
     │   connections.push({ name: cfg.name, mcp, transport })
     │
     └── 全部连完后 return connections
```

### 进程拓扑

```
Agent 进程 (mini-agent-mcp.js)
  │
  ├─ stdio 管道 → 子进程 weather-server.js    (~30MB 内存)
  ├─ stdio 管道 → 子进程 calculator-server.js  (~30MB 内存)
  └─ stdio 管道 → 子进程 database-server.js    (~50MB 内存，如有)
```

每个子进程都是一个独立 Node.js 运行时，通过 stdin/stdout 与父进程交换 JSON-RPC 消息。

### 生命周期

```
Agent 启动 ──┐
              ├─ 触发 connectAllMCP()     → 全部连接建立
              ├─ agentLoop() × N         → 每轮复用已有连接
              ├─ agentLoop() × N         → mcp.callTool() 直接调
              └─ Agent 退出 → mcp.close() → 子进程终止
```

结论：**连接 = Agent 进程生命周期。只在启动时建一次，退出时统一释放。**

---

## 二、生产环境的连接策略

Demo 模式适合学习，但上生产要面对不同约束。

### 策略一：长连接（Demo 默认）

```
时机：Agent 启动时建，退出时断
开销：每个子进程 ~30-50MB 内存 + 文件描述符
适用：工具少（<5个）、Agent 常驻、并发低
```

**问题**：如果 10 个 Agent 实例各连 5 个 MCP 服务 → 10×5 = 50 个子进程，近 2GB 内存。

### 策略二：惰性连接（Lazy）

不用一次性全连，用到哪个工具才连哪个服务：

```javascript
const pool = new Map();

async function getOrConnect(name, config) {
  if (pool.has(name)) {
    const conn = pool.get(name);
    if (await conn.isAlive()) return conn;
  }
  const conn = await connectOne(config);
  pool.set(name, conn);
  return conn;
}

// 首次调 get_weather → 才启动 weather-server.js 子进程
// 后续复用
```

```
时机：首次调用某工具时建立
开销：按需启动，闲置服务不占资源
适用：工具多但单次会话只用少数几个
```

### 策略三：HTTP/SSE Transport（生产标配）

不建子进程。MCP Server 独立部署为常驻微服务，Agent 通过 HTTP 协议调用：

```
Agent 实例1 ─┐
Agent 实例2 ─┤  ──HTTP POST /tools/call──►  weather-service.internal:8080
Agent 实例3 ─┘                             （K8s Deployment × 3 副本）
```

```javascript
// 客户端侧（Agent）
const transport = new SSEClientTransport(
  new URL("https://weather.internal:8080/sse")
);
```

```
时机：每次工具调用是一次独立 HTTP 请求
开销：无子进程管理，服务端常驻
适用：高并发、多 Agent 实例、微服务架构
```

**与 stdio 的关键区别**：

| | stdio Transport | HTTP/SSE Transport |
|---|---|---|
| 通信方式 | 子进程 stdin/stdout | HTTP 请求/响应 |
| 进程管理 | Agent 负责 spawn/kill | 独立部署，K8s 管理 |
| 连接生命周期 | ⩥ Agent 进程 | 每次请求独立 |
| 多实例共享 | 否（每个 Agent 独享子进程） | 是（所有 Agent 共享服务） |
| 冷启动 | 子进程启动 ~200ms | 无（服务常驻） |
| 故障隔离 | 子进程 crash 影响单个 Agent | 服务 crash 可自动切换副本 |

### 策略四：连接池（Pool）

HTTP 模式下仍有连接池概念，但管理的是 TCP 连接复用而非进程：

```javascript
// 保持 N 个 HTTP 连接预热，避免每次 TCP 握手
const pool = {
  maxConnections: 10,
  keepAlive: true,
  idleTimeout: 30_000,  // 30秒无请求则回收
};
```

---

## 三、策略选择决策树

```
工具少 + 单 Agent + 嵌入式场景
  → stdio 长连接（Demo 默认）

工具多 + 不同会话用不同工具
  → stdio 惰性连接

多 Agent 实例 + 高并发 + 微服务架构
  → HTTP/SSE Transport + 独立部署

所有生产场景：
  → 加健康检查 + 自动重连 + 超时熔断
```

---

## 四、补充：MCP Server 侧的加载策略

以上是 Client（Agent）侧的连接策略。Server 侧也有优化空间：

**Eager Loading**（Demo 默认）：
```javascript
// weather-server.js 启动时就把所有工具注册好
server.registerTool("get_weather", {...}, handler);
server.registerTool("get_forecast", {...}, handler);
await server.connect(transport); // 就绪
```

**Lazy / Dynamic Loading**（大规模场景）：
```javascript
// 收到 tools/list 时才动态发现工具（如从数据库读取）
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await db.query("SELECT * FROM tool_registry WHERE active = true");
  return { tools: tools.map(toToolSchema) };
});
```

---

## 五、容错

无论哪种策略，生产环境必须加：

```javascript
// 1. 健康检查
async function healthCheck(conn) {
  try {
    await conn.mcp.ping();
    return true;
  } catch {
    return false;
  }
}

// 2. 自动重连（指数退避）
async function withRetry(conn, fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(1000 * Math.pow(2, i)); // 1s, 2s, 4s
    }
  }
}

// 3. 熔断：连续失败 N 次 → 标记不可用 → 降级或报错
```