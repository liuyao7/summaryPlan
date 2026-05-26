/**
 * langchain-agent.js
 *
 * 用 LangChain.js 重写天气 + 计算 Agent，对比之前手写的 mini-agent-mcp.js
 *
 * 核心感受：框架消除了什么 boilerplate？
 *   手写版：130行（ReAct循环 + 工具路由 + 消息管理）
 *   LangChain：~60行（定义工具 → 创建Agent → 一句invoke）
 *
 * 运行：node langchain-agent.js
 */

import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// ============ 配置 ============
const MODEL = "DeepSeek-V4-Pro";
const API_KEY = "sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251";
const BASE_URL = "https://oneapi-comate.baidu-int.com/v1";

// ============ 1. LLM 实例 ============
// LangChain 的 ChatOpenAI 封装了 API 调用、Token 统计、重试等
const llm = new ChatOpenAI({
  model: MODEL,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  temperature: 0, // Agent 场景建议设为 0，保证确定性
});

// ============ 2. 定义工具 ============
// 对比手写版：手写时你在 System Prompt 里用文字描述工具，
// LangChain 用 DynamicStructuredTool + Zod Schema 同时定义描述和类型

const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description:
    "查询指定城市当天的实时天气。当用户问天气、气温、下雨、带伞等问题时必须调用。",
  schema: z.object({
    city: z.string().describe("中文城市名称，如'北京'"),
  }),
  func: async ({ city }) => {
    // 模拟天气数据（原来这是 weather-server.js 的内容）
    const db = {
      北京: { 天气: "小雨", 温度: "18°C" },
      上海: { 天气: "多云", 温度: "25°C" },
      深圳: { 天气: "晴天", 温度: "30°C" },
    };
    const data = db[city];
    if (!data) return `未找到城市"${city}"的天气数据`;
    return `${city}天气：${data.天气}，温度${data.温度}`;
  },
});

const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算。当用户要求计算、算数时必须调用。",
  schema: z.object({
    expression: z.string().describe("数学表达式，如 '2+3*4'"),
  }),
  func: async ({ expression }) => {
    // 安全检查
    if (!/^[\d\s+\-*/().%^]+$/.test(expression)) {
      return "错误：表达式包含非法字符，仅允许数字和基本运算符";
    }
    try {
      const result = eval(expression);
      return `${expression} = ${result}`;
    } catch {
      return `无法计算：${expression}`;
    }
  },
});

const tools = [weatherTool, calculatorTool];

// ============ 3. System Prompt ============
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是实用助手，严格遵守工具调用规则。
- 查天气 → 必须调 get_weather，绝对禁止凭记忆猜
- 做计算 → 必须调 calculator，绝对禁止心算
- 拿到真实结果后才能组织语言回复

你可以多次调用工具，完成所有任务后再总结回复。`,
  ],
  ["placeholder", "{chat_history}"],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

// ============ 4. 创建 Agent + Executor ============
const agent = await createToolCallingAgent({ llm, tools, prompt });

const executor = new AgentExecutor({
  agent,
  tools,
  // 配置选项（对比手写版需要自己实现这些）
  maxIterations: 10,          // 最大循环次数（手写版 for turn <= 10）
  verbose: true,              // 开启可观测（手写版 console.log 逐行打）
  returnIntermediateSteps: true, // 返回中间步骤（手写版需要自己存）
});

// ============ 5. 运行 ============

// Demo 1：单工具调用
console.log('\n===== Demo1：查天气 =====\n');
const result1 = await executor.invoke({
  input: "北京今天天气怎么样？适合户外运动吗？",
});
console.log("\n→ 最终结果:", result1.output);
console.log("→ 使用了工具:", result1.intermediateSteps.map(s => s.action.tool).join(", "));

// Demo 2：多工具并行（手写版需要两轮循环，LangChain Agent 自动处理）
console.log('\n===== Demo2：多步骤任务 =====\n');
const result2 = await executor.invoke({
  input: "深圳今天多少度？上海多少度？把两个城市的温度加起来是多少度？",
});
console.log("\n→ 最终结果:", result2.output);
console.log("→ 使用了工具:", result2.intermediateSteps.map(s => s.action.tool).join(", "));
console.log("→ 中间步骤数:", result2.intermediateSteps.length);

// ============ 6. 对比总结 ============
console.log("\n===== 手写版 vs LangChain 对比 =====\n");

console.log("手写版需要自己实现：");
console.log("  - ReAct 循环 (for + finish_reason 判断)");
console.log("  - 消息数组管理 (push user/assistant/tool)");
console.log("  - tool_calls 解析  → executeToolViaMCP 路由");
console.log("  - 最大轮次保护");
console.log("  - JSON.parse(tc.function.arguments)");

console.log("\nLangChain 自动处理：");
console.log("  - AgentExecutor.invoke() → 内置 ReAct 循环");
console.log("  - ChatPromptTemplate → 消息自动拼接");
console.log("  - DynamicStructuredTool → Schema + 描述一体");
console.log("  - executor.invoke() → 自动路由到对应工具函数");
console.log("  - maxIterations + verbose + returnIntermediateSteps");