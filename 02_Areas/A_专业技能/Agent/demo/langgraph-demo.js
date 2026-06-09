/**
 * langgraph-demo.js
 *
 * LangGraph：把 Agent 循环显式化为可操控的状态图
 *
 * 与 LangChain createAgent() 的关系：
 *   createAgent() ≈ 预制的 StateGraph 模板（方便但有封装）
 *   StateGraph 手动构建 ≈ 完全控制每个节点和路由（灵活）
 *
 * 核心概念：
 *   Node   = 状态转换函数（如：调模型、执行工具、格式化回复）
 *   Edge   = 固定的转移路径（A → B 无条件）
 *   Conditional Edge = 根据状态选择路径（if tool_calls → A else → B）
 *   State  = 在节点间传递的共享数据（TypedDict / Schema）
 *
 * 运行：node langgraph-demo.js
 */

import { StateGraph, START, END, MessagesAnnotation, MemorySaver, Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";

// ============ 配置 ============
const MODEL = "DeepSeek-V4-Pro";
const API_KEY = "sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251";
const BASE_URL = "https://oneapi-comate.baidu-int.com/v1";

const model = new ChatOpenAI({
  model: MODEL,
  apiKey: API_KEY,
  configuration: { baseURL: BASE_URL },
  temperature: 0,
});

// ============ 工具定义 ============
const getWeather = tool(
  ({ city }) => {
    const db = { 北京: "小雨 18°C", 深圳: "晴天 30°C", 上海: "多云 25°C" };
    return db[city] || `未找到城市"${city}"`;
  },
  {
    name: "get_weather",
    description: "查询指定城市天气。当用户问天气时必须调用。",
    schema: z.object({ city: z.string().describe("中文城市名称") }),
  }
);

const toolsByName = { get_weather: getWeather };

// 绑定工具到模型（LangGraph 模式需要在模型层面绑定，而非 Agent 层面）
const modelWithTools = model.bindTools([getWeather]);

// ============ Demo 1：最简图——理解 Node + Edge ============

async function demo1_minimalGraph() {
  console.log("===== Demo1：最简状态图 =====\n");

  // 1. 定义状态结构（MessagesAnnotation 是 LangGraph 内置的消息列表 Schema）
  // 2. 定义节点函数：接收 state，返回状态更新（增量合并）
  const nodeA = (state) => {
    console.log(`  [Node-A] 当前消息数: ${state.messages.length}`);
    return { messages: [{ role: "ai", content: "Node-A 执行完毕" }] };
  };

  const nodeB = (state) => {
    console.log(`  [Node-B] 收到 ${state.messages.length} 条消息`);
    return { messages: [{ role: "ai", content: "Node-B 最终输出" }] };
  };

  // 3. 构建图
  const graph = new StateGraph(MessagesAnnotation)
    .addNode("stepA", nodeA)
    .addNode("stepB", nodeB)
    .addEdge(START, "stepA")       // 入口 → stepA
    .addEdge("stepA", "stepB")     // stepA → stepB
    .addEdge("stepB", END)         // stepB → 出口
    .compile();

  // 4. 执行
  const result = await graph.invoke({
    messages: [{ role: "user", content: "hello" }],
  });

  console.log(`\n  最终消息数: ${result.messages.length}`);
  console.log(
    `  流程: ${result.messages.map((m) => `${m.getType?.() || m.role}:${m.content?.slice(0, 15)}`).join(" → ")}`
  );

  console.log("\n  图解：");
  console.log("  START → [stepA] → [stepB] → END");
  console.log("  这是最简单的一根筋流程，没有分支判断。\n");
}

// ============ Demo 2：ReAct 图——等效于 createAgent ============

async function demo2_reactGraph() {
  console.log("===== Demo2：ReAct 状态图（等效 createAgent）=====\n");

  // 节点1：调用 LLM
  async function callModel(state) {
    console.log("  [LLM节点] 发送消息...");
    const response = await modelWithTools.invoke(state.messages);
    return { messages: [response] };  // 返回增量
  }

  // 节点2：执行工具
  async function executeTools(state) {
    const lastMsg = state.messages[state.messages.length - 1];
    const results = [];

    for (const tc of lastMsg.tool_calls || []) {
      const toolFn = toolsByName[tc.name];
      if (!toolFn) {
        results.push({ role: "tool", tool_call_id: tc.id, content: `未知工具: ${tc.name}` });
        continue;
      }
      console.log(`  [工具节点] 调用 ${tc.name}(${JSON.stringify(tc.args)})`);
      // LangGraph v1 工具调用方式
      const result = await toolFn.invoke(tc.args || tc);
      results.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
    return { messages: results };
  }

  // 路由函数：根据最后一条消息决定下一步
  function shouldContinue(state) {
    const lastMsg = state.messages[state.messages.length - 1];
    if (lastMsg.tool_calls?.length > 0) {
      return "tools";  // 有工具调用 → 去执行
    }
    return END;  // 没有 → 结束
  }

  // 构建图
  const graph = new StateGraph(MessagesAnnotation)
    .addNode("model", callModel)
    .addNode("tools", executeTools)
    .addEdge(START, "model")
    .addConditionalEdges("model", shouldContinue, { tools: "tools", [END]: END })
    .addEdge("tools", "model")  // 工具结果喂回模型
    .compile();

  console.log("  图结构：");
  console.log("  START → [model] ←──┐");
  console.log("            │         │");
  console.log("        shouldContinue │");
  console.log("        ╱         ╲   │");
  console.log("    [tools]      END   │");
  console.log("        └──────────────┘\n");

  // 执行
  const result = await graph.invoke({
    messages: [{ role: "user", content: "北京今天天气怎么样？深圳呢？哪边更热？" }],
  });

  console.log("\n  消息轨迹：");
  for (const msg of result.messages) {
    const type = msg.getType?.() || msg.role;
    if (type === "tool") {
      console.log(`    [tool] ${msg.content?.slice(0, 40)}`);
    } else if (type === "ai" && msg.content) {
      console.log(`    [ai] ${msg.content.slice(0, 60)}...`);
    }
  }

  console.log(`\n  总消息数: ${result.messages.length}`);
}

// ============ Demo 3：条件路由——展示 LangGraph 的真正威力 ============

async function demo3_conditionalRouting() {
  console.log("\n===== Demo3：带路由分支的处理图 =====\n");

  // 场景：根据用户意图路由到不同的处理节点
  // 客服 → 路由到 FAQ | 投诉 → 路由到人工 | 技术问题 → 路由到技术专家

  function classifyIntent(state) {
    const userMsg = state.messages[state.messages.length - 1].content.toLowerCase();
    if (userMsg.includes("投诉") || userMsg.includes("退款")) return "complaint_handler";
    if (userMsg.includes("技术") || userMsg.includes("bug") || userMsg.includes("代码")) return "tech_handler";
    return "faq_handler";
  }

  function faqHandler(state) {
    console.log("  [FAQ节点] 处理常用问题...");
    return {
      messages: [
        { role: "ai", content: "您好！根据常见问题库，您的问题已有标准答案...（FAQ回复）" },
      ],
    };
  }

  function complaintHandler(state) {
    console.log("  [投诉节点] 升级到人工...");
    return {
      messages: [
        { role: "ai", content: "我们非常重视您的反馈，已为您转接人工客服，请稍候..." },
      ],
    };
  }

  function techHandler(state) {
    console.log("  [技术节点] 分配技术专家...");
    return {
      messages: [
        { role: "ai", content: "您的技术问题已分配给相关工程师，我们会尽快回复..." },
      ],
    };
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("classifier", (s) => {
      console.log(`  [分类器] 分析: "${s.messages.at(-1).content.slice(0, 30)}..."`);
      return {}; // classifier 不改状态，只管路由
    })
    .addNode("faq_handler", faqHandler)
    .addNode("complaint_handler", complaintHandler)
    .addNode("tech_handler", techHandler)
    .addEdge(START, "classifier")
    .addConditionalEdges("classifier", classifyIntent, {
      faq_handler: "faq_handler",
      complaint_handler: "complaint_handler",
      tech_handler: "tech_handler",
    })
    .addEdge("faq_handler", END)
    .addEdge("complaint_handler", END)
    .addEdge("tech_handler", END)
    .compile();

  console.log("  图结构：");
  console.log("                ┌── faq_handler ──┐");
  console.log("  START → [classifier] ─── complaint_handler ──→ END");
  console.log("                └── tech_handler ──┘\n");

  const tests = [
    "你们的会员怎么开通？",
    "我要投诉！上周买的会员没生效，给我退款！",
    "你们的 API 有个 bug，我在调用 /v1/chat 时返回 500",
  ];

  for (const input of tests) {
    console.log(`\n  用户: "${input}"`);
    const result = await graph.invoke({ messages: [{ role: "user", content: input }] });
    const reply = result.messages.find((m) => m.getType?.() === "ai");
    console.log(`  回复: ${reply?.content.slice(0, 50)}...`);
  }
}

// ============ Demo 4：对比 createAgent vs 手动 StateGraph ============

async function demo4_createAgentUnderTheHood() {
  console.log("\n===== Demo4：createAgent 底层其实就是 StateGraph =====");
  console.log("  createAgent() 等价于我们 Demo2 里手写的 ReAct 图。");
  console.log("  区别：createAgent 封装好了，你不能改循环结构。");
  console.log("       手动 StateGraph 可以自由定制（加条件分支、人工审核节点等）。\n");

  console.log("  什么时候用手动 StateGraph：");
  console.log("    - 需要在 LLM 调用前后插入自定义逻辑");
  console.log("    - 需要多分支路由（非简单的是否调工具）");
  console.log("    - 需要强制人工审核（Human-in-the-loop）");
  console.log("    - 需要持久化状态后断点续跑");
}

// ============ 运行全部 ============
await demo1_minimalGraph();
await demo2_reactGraph();
await demo3_conditionalRouting();
await demo4_createAgentUnderTheHood();