# LangGraph + CrewAI：状态图与多 Agent 协作

## 一、LangGraph 是什么

LangGraph 是一个**状态图执行引擎**——你把 Agent 的推理循环显式地建模为节点和边的图。

LangChain 的 `createAgent()` 底层就是 LangGraph。你可以选择直接用 `createAgent()`（方便），也可以手动构建 StateGraph（灵活）。

### 核心概念

```
Node    = 状态转换函数（调 LLM / 执行工具 / 格式化输出）
Edge    = 无条件转移（A → B）
ConditionalEdge = 有条件的转移（A → if X then B else C）
State   = 节点间传递的数据（消息列表 + 自定义字段）
```

### 最简图

```javascript
import { StateGraph, START, END, MessagesAnnotation } from "@langchain/langgraph";

const graph = new StateGraph(MessagesAnnotation)
  .addNode("stepA", (state) => {
    return { messages: [{ role: "ai", content: "处理中..." }] };
  })
  .addNode("stepB", (state) => {
    return { messages: [{ role: "ai", content: "完成" }] };
  })
  .addEdge(START, "stepA")
  .addEdge("stepA", "stepB")
  .addEdge("stepB", END)
  .compile();

await graph.invoke({ messages: [{ role: "user", content: "hello" }] });
```

### ReAct 图（等效于 createAgent）

```javascript
// LLM 节点：调用模型
async function callModel(state) {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
}

// 工具节点：执行工具调用
async function executeTools(state) {
  const lastMsg = state.messages.at(-1);
  const results = [];
  for (const tc of lastMsg.tool_calls || []) {
    const result = await toolMap[tc.name].invoke(tc.args);
    results.push({ role: "tool", tool_call_id: tc.id, content: result });
  }
  return { messages: results };
}

// 路由判断
function shouldContinue(state) {
  return state.messages.at(-1).tool_calls?.length ? "tools" : END;
}

// 图结构：START → model ⇄ tools → END
const graph = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addNode("tools", executeTools)
  .addEdge(START, "model")
  .addConditionalEdges("model", shouldContinue, { tools: "tools", [END]: END })
  .addEdge("tools", "model")
  .compile();
```

这是 Agent 的骨架图。实际运行轨迹：
```
START → [model] → tool_calls → [tools] → [model] → stop → END
```

### 条件路由——LangGraph 的真正威力

`createAgent` 只有简单的"有没有工具调用"二选一。手动 StateGraph 可以做任意复杂的分支：

```javascript
// 根据用户意图路由到不同处理节点
function classifyIntent(state) {
  const msg = state.messages.at(-1).content;
  if (msg.includes("投诉")) return "complaint";
  if (msg.includes("技术") || msg.includes("bug")) return "tech";
  return "faq";
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("classifier", (s) => ({}))
  .addNode("faq", handleFAQ)
  .addNode("complaint", handleComplaint)
  .addNode("tech", handleTech)
  .addEdge(START, "classifier")
  .addConditionalEdges("classifier", classifyIntent, {
    faq: "faq", complaint: "complaint", tech: "tech",
  })
  .addEdge("faq", END)
  .addEdge("complaint", END)
  .addEdge("tech", END);
```

---

## 二、createAgent vs 手动 StateGraph

| 场景 | 用什么 |
|------|--------|
| 标准 ReAct Agent | `createAgent()` |
| 需要在 LLM 前后插入自定义逻辑 | 手动 StateGraph |
| 多分支路由（非简单的 tool/no-tool） | 手动 StateGraph |
| 需要 Human-in-the-loop（暂停等人工审批） | 手动 StateGraph + MemorySaver |
| 需要多 Agent 串/并联 | 手动 StateGraph |
| 需要持久化状态、断点续跑 | 手动 StateGraph + Checkpointer |

**核心原则**：先从 `createAgent` 开始，遇到它覆盖不了的场景再下到手动 StateGraph。

---

## 三、CrewAI：多 Agent 协作框架

CrewAI 是 Python 生态中最流行的多 Agent 框架，核心思想：**给每个 Agent 赋予角色、目标和背景故事，它们协作完成任务**。

### 核心三元素

```python
# 1. Agent：角色 + 目标 + 背景 + 工具
researcher = Agent(
    role="研究员",
    goal="收集和分析最新信息",
    backstory="资深技术研究员，擅长信息整合",
    tools=[SearchTool()]
)

writer = Agent(
    role="技术写手",
    goal="撰写清晰易懂的技术文档",
    backstory="5年技术写作经验"
)

# 2. Task：分配给 Agent 的具体任务
task1 = Task(description="调研AI Agent趋势", expected_output="研究摘要", agent=researcher)
task2 = Task(description="撰写技术报告", expected_output="Markdown文档", agent=writer)

# 3. Crew：编排 Agents 的执行
crew = Crew(
    agents=[researcher, writer],
    tasks=[task1, task2],
    process=Process.sequential  # 顺序执行
)
result = crew.kickoff()
```

### 两种执行模式

**Sequential（顺序）**：A 的产出 → B 的输入 → C 的输出
```
研究员 → 写手 → 审核员
```
适用于流水线任务（调研 → 写作 → 审核）。

**Hierarchical（层级）**：Manager Agent 接收任务，分配给 Worker Agents
```
           Manager
          ╱    ╲
    研究员      写手
```
适用于需要动态决策的复杂任务。

---

## 四、CrewAI 概念 ↔ LangGraph 实现

CrewAI 是 Python only，但概念在 TypeScript 中可以用 LangGraph 等效实现：

| CrewAI (Python) | LangGraph (TypeScript) |
|---|---|
| `Agent(role=..., tools=...)` | `ChatOpenAI` + System Prompt + `bindTools()` |
| `Task(description=..., agent=...)` | `StateGraph` 的一个 Node 函数 |
| `Crew(process=sequential)` | `addEdge()` 顺序连接 |
| `Task(expected_output=...)` | Node 向 `state.messages` 写入产出 |
| `Process.hierarchical` + `manager_agent` | `addConditionalEdges` + 分类路由 |

**选择建议**：
- Python 生态 + 快速原型 → CrewAI（声明式 API，开箱即用）
- TypeScript 全栈 + 深度定制 → LangGraph（底层控制力强）
- 学习多 Agent 概念 → 理解其中一个即可，概念完全互通

---

## 五、学习路径总结

```
createAgent()         → 最快的开发体验，适合 80% 的场景
       ↓
手动 StateGraph       → 需要定制流程时深入
       ↓
多 Agent 状态图       → 实现 CrewAI 的 Sequential/Hierarchical 模式
       ↓
+ MemorySaver         → Human-in-the-loop、断点续跑
```