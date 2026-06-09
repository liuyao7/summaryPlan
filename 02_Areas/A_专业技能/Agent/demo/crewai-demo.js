/**
 * crewai-demo.js
 *
 * CrewAI 概念演示：多 Agent 角色分工协作
 *
 * CrewAI 是 Python 框架，本 Demo 用 LangGraph 实现等效模式，
 * 理解多 Agent 协作核心概念的同时掌握 TypeScript 实现。
 *
 * CrewAI 核心三元素：
 *   Agent  = role + goal + backstory + tools
 *   Task   = description + expected_output + agent
 *   Crew   = agents + tasks + process（sequential / hierarchical）
 *
 * 运行：node crewai-demo.js
 */

import { StateGraph, START, END, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";

const MODEL = "DeepSeek-V4-Pro";
const API_KEY = "sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251";
const BASE_URL = "https://oneapi-comate.baidu-int.com/v1";

function makeModel(temp = 0.3) {
  return new ChatOpenAI({
    model: MODEL,
    apiKey: API_KEY,
    configuration: { baseURL: BASE_URL },
    temperature: temp,
  });
}

// ============ 工具 ============
const searchTool = tool(
  ({ query }) => `搜索结果（模拟）：关于"${query}"的3篇相关文章，涉及LLM多模态、Agent协作、MCP协议标准化...`,
  {
    name: "web_search",
    description: "搜索互联网获取最新信息",
    schema: z.object({ query: z.string() }),
  }
);

// ============ Demo：Sequential 流水线 ============

async function demo_sequential() {
  console.log("===== CrewAI Sequential 模式 =====\n");
  console.log("  研究员 → 写手 → 审核员  依次执行\n");

  // --- Agent 1: 研究员（带搜索工具）---
  const researcherModel = makeModel().bindTools([searchTool]);

  async function researchPhase(state) {
    console.log("  [研究员 Agent] 搜索信息...");
    const userMsg = state.messages.find((m) => m.getType?.() === "human")?.content;

    // Step 1: 调 LLM（触发搜索）
    const resp1 = await researcherModel.invoke([
      { role: "system", content: "你是技术研究员。使用 web_search 收集信息，整理成结构化摘要。" },
      { role: "user", content: userMsg },
    ]);

    let researchOutput = "";
    if (resp1.tool_calls?.length) {
      for (const tc of resp1.tool_calls) {
        const result = await searchTool.invoke(tc.args);
        // Step 2: 把搜索结果喂给 LLM 得到最终摘要
        const resp2 = await researcherModel.invoke([
          { role: "system", content: "你是技术研究员。基于搜索结果写出研究摘要。" },
          { role: "user", content: `${userMsg}` },
          { role: "assistant", content: "", tool_calls: resp1.tool_calls },
          { role: "tool", tool_call_id: tc.id, content: result },
        ]);
        researchOutput = resp2.content;
      }
    } else {
      researchOutput = resp1.content;
    }

    console.log(`  研究产出: ${researchOutput.slice(0, 80)}...\n`);
    return {
      messages: [
        {
          role: "ai",
          content: `[研究员产出]\n${researchOutput}`,
        },
      ],
    };
  }

  // --- Agent 2: 写手（纯 LLM，无工具）---
  const writerModel = makeModel();

  async function writePhase(state) {
    console.log("  [写手 Agent] 撰写文档...");
    const researchResult = state.messages
      .filter((m) => m.getType?.() === "ai")
      .map((m) => m.content)
      .join("\n");

    const resp = await writerModel.invoke([
      { role: "system", content: "你是技术文档写手。基于研究结果撰写 Markdown 文档，结构清晰、中文输出。" },
      { role: "user", content: `研究结果：${researchResult}\n\n请撰写的正式文档。` },
    ]);

    console.log(`  写作产出: ${resp.content.slice(0, 80)}...\n`);
    return {
      messages: [
        {
          role: "ai",
          content: `[写手产出]\n${resp.content}`,
        },
      ],
    };
  }

  // --- Agent 3: 审核员（纯 LLM，无工具）---
  const reviewerModel = makeModel(0.1);

  async function reviewPhase(state) {
    console.log("  [审核员 Agent] 审核文档...");
    const draft = state.messages.find((m) => m.content?.includes("[写手产出]"))?.content || "";

    const resp = await reviewerModel.invoke([
      {
        role: "system",
        content: `你是严格的技术文档审核员。审查以下文档，检查事实准确性、逻辑完整性、可读性。
输出格式：
- 评分（1-10）：X分
- 优点：（列出2-3条）
- 改进建议：（列出2-3条）`,
      },
      { role: "user", content: draft },
    ]);

    console.log(`  审核结果: ${resp.content.slice(0, 80)}...\n`);
    return {
      messages: [
        {
          role: "ai",
          content: `[审核员产出]\n${resp.content}`,
        },
      ],
    };
  }

  // 构建流水线
  const graph = new StateGraph(MessagesAnnotation)
    .addNode("researcher", researchPhase)
    .addNode("writer", writePhase)
    .addNode("reviewer", reviewPhase)
    .addEdge(START, "researcher")
    .addEdge("researcher", "writer")
    .addEdge("writer", "reviewer")
    .addEdge("reviewer", END)
    .compile();

  const result = await graph.invoke({
    messages: [{ role: "user", content: "请研究 AI Agent 在2026年的发展趋势，并撰写报告" }],
  });

  console.log("  流水线完成！");
  console.log(`  ${result.messages.length} 条消息（包含所有 Agent 的产出）\n`);
}

// ============ 概念映射：CrewAI ↔ LangGraph ============

function conceptMapping() {
  console.log("===== CrewAI 概念 ↔ LangGraph 实现 =====\n");

  console.log("CrewAI (Python) 的声明式 API：");
  console.log(`  researcher = Agent(
    role="研究员",
    goal="收集最新信息",
    backstory="资深技术研究员",
    tools=[SearchTool()]
  )
  writer = Agent(role="写手", goal="撰写清晰文档")
  reviewer = Agent(role="审核员", goal="审查质量")

  task1 = Task(description="调研主题", agent=researcher)
  task2 = Task(description="撰写报告", agent=writer)
  task3 = Task(description="审核报告", agent=reviewer)

  crew = Crew(
    agents=[researcher, writer, reviewer],
    tasks=[task1, task2, task3],
    process=Process.sequential
  )
  result = crew.kickoff()`);

  console.log("\n等效的 LangGraph (TypeScript)：");
  console.log(`  // Agent = ChatOpenAI + System Prompt + bindTools
  const researcherModel = makeModel().bindTools([searchTool]);

  // Task = StateGraph 的 Node
  async function researchPhase(state) { ... }
  async function writePhase(state) { ... }
  async function reviewPhase(state) { ... }

  // Crew = StateGraph 的 Edge 连接
  const graph = new StateGraph(MessagesAnnotation)
    .addNode("researcher", researchPhase)
    .addNode("writer", writePhase)
    .addNode("reviewer", reviewPhase)
    .addEdge(START, "researcher")
    .addEdge("researcher", "writer")
    .addEdge("writer", "reviewer")
    .addEdge("reviewer", END)
    .compile();

  result = await graph.invoke({...});`);

  console.log("\n┌─────────────────┬──────────────────────────┐");
  console.log("│ CrewAI 概念      │ LangGraph 实现            │");
  console.log("├─────────────────┼──────────────────────────┤");
  console.log("│ Agent(role=...) │ ChatOpenAI + SystemPrompt │");
  console.log("│ Agent(tools=)   │ model.bindTools([...])    │");
  console.log("│ Task            │ StateGraph Node           │");
  console.log("│ Crew(sequential)│ addEdge() 串联            │");
  console.log("│ Task(output=)   │ Node 向 messages 写结果    │");
  console.log("│ manager_agent   │ addConditionalEdges       │");
  console.log("└─────────────────┴──────────────────────────┘");

  console.log("\n选择建议：");
  console.log("  CrewAI：Python 生态、快速原型、声明式 API 简洁");
  console.log("  LangGraph：TS 全栈、需要深度定制流程、可视化状态图");
  console.log("  学习多 Agent 概念 → 理解其中一个即可，概念互通");
}

// ============ 运行 ============
await demo_sequential();
conceptMapping();