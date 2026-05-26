/**
 * langchain-agent.js
 *
 * LangChain v1 版 Agent——对比之前手写的 mini-agent-mcp.js
 *
 * v1 核心变化：
 *   createAgent({ model, tools, systemPrompt }) → 一行创建 Agent
 *   agent.invoke({ messages }) → 替代手动 ReAct 循环
 *   底层自动构建 LangGraph 状态图
 *
 * 运行：node langchain-agent.js
 */

import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// ============ 配置 ============
const MODEL = "DeepSeek-V4-Pro";
const API_KEY = "sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251";
const BASE_URL = "https://oneapi-comate.baidu-int.com/v1";

// ============ 1. 模型实例 ============
const model = new ChatOpenAI({
  model: MODEL,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  temperature: 0,
});

// ============ 2. 定义工具 ============
// v1 用 tool() 函数，一行同时定义 schema + 描述 + 实现

const getWeather = tool(
  ({ city }) => {
    const db = {
      北京: { weather: "小雨", temp: 18 },
      上海: { weather: "多云", temp: 25 },
      深圳: { weather: "晴天", temp: 30 },
      杭州: { weather: "阴天", temp: 22 },
    };
    const data = db[city];
    if (!data) return `未找到城市"${city}"的天气数据`;
    return `${city}天气：${data.weather}，温度${data.temp}°C`;
  },
  {
    name: "get_weather",
    description:
      "查询指定城市当天的实时天气。当用户问天气、气温、下雨、带伞等问题时必须调用。",
    schema: z.object({
      city: z.string().describe("中文城市名称，如'北京'"),
    }),
  }
);

const calculate = tool(
  ({ expression }) => {
    if (!/^[\d\s+\-*/().%^]+$/.test(expression)) {
      return `错误：表达式包含非法字符`;
    }
    try {
      return `${expression} = ${eval(expression)}`;
    } catch {
      return `无法计算：${expression}`;
    }
  },
  {
    name: "calculator",
    description: "执行数学计算。当用户要求计算、算数时必须调用。",
    schema: z.object({
      expression: z.string().describe("数学表达式，如 '2+3*4'"),
    }),
  }
);

// ============ 3. 一行创建 Agent ============
// 手写版需要：ReAct 循环 + 消息管理 + 工具路由 = ~80 行
// LangChain v1：一行
const agent = createAgent({
  model,
  tools: [getWeather, calculate],
  systemPrompt: `你是实用助手，严格遵守工具调用规则：
- 查天气 → 必须调 get_weather，绝对禁止凭记忆猜
- 做计算 → 必须调 calculator，绝对禁止心算
- 拿到工具返回的真实结果后才能组织语言回复
- 可以多次调用工具，完成所有子任务后再总结`,
});

// ============ 4. 运行 ============

// Demo 1：单工具
console.log("===== Demo1：单步查天气 =====\n");
const r1 = await agent.invoke({
  messages: [{ role: "user", content: "北京今天天气怎么样？适合户外吗？" }],
});
for (const msg of r1.messages) {
  if (msg.getType() === "ai" && msg.content) {
    console.log("→", msg.content);
  }
}

// Demo 2：多工具复杂任务
console.log("\n===== Demo2：多步任务 =====\n");
const r2 = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "深圳今天多少度？上海多少度？把两个城市的温度加起来一共多少度？综合判断哪边更适合户外运动？",
    },
  ],
});
for (const msg of r2.messages) {
  const type = msg.getType();
  if (type === "tool") {
    console.log(`  [工具] ${msg.name}: ${msg.content}`);
  } else if (type === "ai" && msg.content) {
    console.log("→", msg.content);
  }
}

// ============ 5. 对比 ============
console.log("\n===== 手写版 vs LangChain v1 对比 =====\n");
console.log("手写版需要自己写 (~80行)：");
console.log("  - ReAct 循环 for(turn){...finish_reason判断...}");
console.log("  - 消息数组 push user/assistant/tool");
console.log("  - tool_calls 解析 → JSON.parse → 路由到正确函数");
console.log("  - 最大轮次保护、错误处理");

console.log("\nLangChain v1 自动处理：");
console.log("  - createAgent() → 内置 ReAct 循环 + LangGraph 状态图");
console.log("  - agent.invoke() → 自动多步推理");
console.log("  - tool() → Schema + 描述 + 实现 三位一体");
console.log("  - 返回 r1.messages → 包含所有中间步骤");
console.log("  - 工具调用和解析对开发者完全透明");

console.log("\n核心价值：框架不改变 Agent 的运作原理（还是 ReAct），");
console.log("但它把你从循环维护、消息拼接、工具路由中解放出来，");
console.log("让你专注于定义工具能力和 System Prompt 设计。");