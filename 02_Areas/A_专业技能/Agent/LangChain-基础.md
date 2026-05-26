# LangChain.js：从手写 Agent 到框架

## 一、LangChain 解决了什么

之前我们手写的 Agent 模式是：

```javascript
// 手写版核心 (~80 行 boilerplate)
for (let turn = 1; turn <= 10; turn++) {
  const response = await client.chat.completions.create({ model, messages, tools });
  const msg = response.choices[0].message;
  messages.push(msg);
  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
    continue;
  }
  if (msg.content) return msg.content;
}
```

LangChain 把这段循环封装了，让你只关注**定义工具**和**System Prompt**：

```javascript
// LangChain v1 等效 (~15 行)
const agent = createAgent({ model, tools, systemPrompt });
const result = await agent.invoke({
  messages: [{ role: "user", content: "深圳几度？" }],
});
// result.messages 包含完整对话链
```

**框架不改变 Agent 原理（还是 ReAct），它消除的是重复 boilerplate。**

---

## 二、v1 核心 API

### createAgent()

```javascript
import { createAgent } from "langchain";

const agent = createAgent({
  model,          // ChatOpenAI / ChatAnthropic 等
  tools,          // tool() 定义的数组
  systemPrompt,   // 可选，System Prompt 字符串
});

// 返回 ReactAgent 实例，方法包括：
agent.invoke({ messages })              // 同步调用，返回完整结果
agent.stream({ messages })              // 流式输出
agent.streamEvents({ messages })        // 事件级流式（可区分思考/工具/回复）
agent.getGraphAsync()                   // 获取底层 LangGraph 图（可视化）
agent.getState() / agent.updateState()  // 状态管理
```

### tool()

```javascript
import { tool } from "langchain";
import { z } from "zod";

const myTool = tool(
  // 第一个参数：实现函数
  ({ param1, param2 }) => { return `结果: ${param1}`; },
  // 第二个参数：元数据配置
  {
    name: "tool_name",
    description: "工具描述——LLM 决定是否调用的唯一依据",
    schema: z.object({
      param1: z.string().describe("参数说明"),
      param2: z.number().optional(),
    }),
  }
);
```

`tool()` 同时做了三件事（手写版需要分开做）：
1. Zod Schema → LLM 的 `function.parameters`（JSON Schema 格式）
2. 描述文本 → LLM 的 `function.description`
3. 回调函数 → 工具被调用时的实际执行逻辑

### invoke() 返回值

```javascript
const result = await agent.invoke({
  messages: [{ role: "user", content: "..." }],
});

// result.messages 是完整消息链，遍历可看每一步
for (const msg of result.messages) {
  const type = msg.getType();  // "human" | "ai" | "tool"
  if (type === "tool") {
    console.log(`[工具] ${msg.name}: ${msg.content}`);
  } else if (type === "ai" && msg.content) {
    console.log(`→ ${msg.content}`);
  }
}
```

---

## 三、完整示例：天气 + 计算 Agent

```javascript
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "DeepSeek-V4-Pro",
  apiKey: "...",
  configuration: { baseURL: "https://..." },  // 自定义 endpoint
  temperature: 0,
});

const getWeather = tool(
  ({ city }) => {
    const db = { 北京: "小雨 18°C", 深圳: "晴天 30°C" };
    return db[city] || "未找到";
  },
  {
    name: "get_weather",
    description: "查询指定城市天气。当用户问天气时必须调用。",
    schema: z.object({ city: z.string().describe("中文城市名称") }),
  }
);

const calculate = tool(
  ({ expression }) => {
    if (!/^[\d\s+\-*/().]+$/.test(expression)) return "表达式非法";
    return `${expression} = ${eval(expression)}`;
  },
  {
    name: "calculator",
    description: "执行数学计算。当用户要求计算时必须调用。",
    schema: z.object({ expression: z.string().describe("数学表达式") }),
  }
);

const agent = createAgent({
  model,
  tools: [getWeather, calculate],
  systemPrompt: "你是实用助手。查天气必须调工具，禁止凭记忆猜。",
});

const result = await agent.invoke({
  messages: [
    { role: "user", content: "深圳和北京各多少度？加起来多少？" },
  ],
});
// Agent 自动：get_weather(深圳) → get_weather(北京) → calculator(30+18) → 综合回复
```

---

## 四、手写版 vs LangChain 对比

| 维度 | 手写版 | LangChain v1 |
|------|--------|-------------|
| 核心代码量 | ~80 行 ReAct 循环 | ~15 行 createAgent + invoke |
| 消息管理 | 手动 push user/assistant/tool | 框架自动维护 |
| 工具路由 | 手动 JSON.parse → 判断 name → 找函数 | tool() 定义时绑定 |
| 错误处理 | 手写 try-catch + 超时 | 框架内置 retry + 限制 |
| 流式输出 | 需要自己实现 SSE 循环 | agent.stream() 一行 |
| 可视化 / 调试 | console.log 逐行打印 | getGraphAsync() 生成 Mermaid 图 |
| 学习价值 | 理解 Agent 底层原理 ✅ | 快速生产 ✅ |
| 灵活性 | 完全自由，任何定制 | 受框架约束，需要学 API |

**建议**：先用框架提高效率，遇到框架不支持的场景时（因为理解底层原理）能自己手写回退。

---

## 五、什么时候该/不该用 LangChain

**该用**：
- 工具多、逻辑复杂、需要稳定执行的场景
- 需要流式输出 + 中间状态可观测的产品
- 团队协作，代码需要可维护性
- 需要集成 LangSmith 做 LLMOps 追踪

**不该用**：
- 单工具、简单对话（框架反而增加复杂度）
- 工具逻辑非常定制化、框架 API 限制你
- 追求极致 Token 优化（框架有一定开销）
- 学习阶段理解底层原理时（手写更好）

---

## 六、下一步：LangGraph

LangChain v1 的 `createAgent` 底层就是 LangGraph。LangGraph 让你直接操控 Agent 的状态图：

```javascript
// 概念示意：Agent 内部的状态流转
START → model_node → [判断] → tool_node → model_node → ... → END
```

掌握了工具和 Agent 之后，下一步学 LangGraph 的核心价值是：
- 自定义 Agent 内部的状态流转（加条件分支、加人工审核节点）
- 多 Agent 协作的状态管理
- 持久化状态支持（断点续跑、人机交互）