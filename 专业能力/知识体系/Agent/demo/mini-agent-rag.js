// mini-agent-rag.js — 带 RAG 记忆的 Agent
// 依赖：npm install openai @modelcontextprotocol/sdk
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

// ============ 配置 ============
const client = new OpenAI({
  apiKey: 'sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251',
  baseURL: "https://oneapi-comate.baidu-int.com/v1",
});
const MODEL = "DeepSeek-V4-Pro";

// ============ 向量检索（无外部依赖，纯本地） ============
const MEMORY_FILE = "./MEMORY.md";

class SimpleVectorStore {
  // 用一个简单的 API 来获取嵌入向量
  // DeepSeek 不支持 embedding API，我们用一个极简方案：
  // 关键词匹配 + 相关性打分（实际项目换成向量数据库）
  
  constructor() {
    this.documents = []; // { content, keywords }
  }

  // 加载 MEMORY.md 中的每行作为一条文档
  loadFromFile() {
    if (!existsSync(MEMORY_FILE)) return;
    const content = readFileSync(MEMORY_FILE, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    this.documents = lines.map((line) => ({
      content: line,
      keywords: this.extractKeywords(line),
    }));
    console.log(`RAG 已加载 ${this.documents.length} 条记忆`);
  }

  // 简单的关键词提取
  extractKeywords(text) {
    // 提取中文词（2-4字）和英文词
    const cn = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    const en = text.match(/[a-zA-Z]+/g) || [];
    return [...cn, ...en].map((w) => w.toLowerCase());
  }

  // 检索：根据 query 找到最相关的文档
  search(query, topK = 3) {
    const queryKeywords = this.extractKeywords(query);

    // 对每条文档打分
    const scored = this.documents.map((doc) => {
      let score = 0;
      for (const qk of queryKeywords) {
        for (const dk of doc.keywords) {
          if (dk.includes(qk) || qk.includes(dk)) score += 1;
          if (dk === qk) score += 3; // 精确匹配加权
        }
      }
      return { content: doc.content, score };
    });

    // 排序取 topK
    const results = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  // 追加新文档
  addDocument(content) {
    this.documents.push({
      content,
      keywords: this.extractKeywords(content),
    });
    // 同时写回文件
    writeFileSync(MEMORY_FILE, `\n${content}`, { flag: "a" });
  }
}

// ============ MCP ============
async function connectAllMCP(serverConfigs) {
  const connections = [];
  for (const cfg of serverConfigs) {
    const transport = new StdioClientTransport({
      command: "node",
      args: [cfg.file],
    });
    const mcp = new Client({ name: "mini-agent", version: "1.0.0" });
    await mcp.connect(transport);
    connections.push({ name: cfg.name, mcp, transport });
  }
  return connections;
}

async function getAllTools(connections) {
  const allTools = [];
  for (const conn of connections) {
    const result = await conn.mcp.listTools();
    for (const tool of result.tools) {
      allTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      });
    }
  }
  return allTools;
}

async function executeToolViaMCP(connections, name, args) {
  for (const conn of connections) {
    const result = await conn.mcp.listTools();
    if (result.tools.some((t) => t.name === name)) {
      const callResult = await conn.mcp.callTool({ name, arguments: args });
      return callResult.content.map((c) => c.text).join("\n");
    }
  }
  return `错误：没有 MCP 服务提供工具 "${name}"`;
}

// ============ Agent 核心循环（带 RAG） ============
async function agentLoop(userQuestion, connections, vectorStore) {
  const tools = await getAllTools(connections);

  // ★ RAG 检索：只取最相关的记忆
  const relevantMemories = vectorStore.search(userQuestion, 3);
  const memoryContext =
    relevantMemories.length > 0
      ? relevantMemories.map((m) => `- ${m.content}（相关度: ${m.score}）`).join("\n")
      : "（暂无相关记忆）";
  console.log(`RAG 检索到 ${relevantMemories.length} 条相关记忆`);

  const messages = [
    {
      role: "system",
      content: `你是用户的专属助手。

=== 与当前问题相关的历史记忆（RAG检索结果） ===
${memoryContext}
=== 记忆结束 ===

工具规则：查天气 → get_weather，做计算 → calculator。不要猜测或先说"让我查查"。

当用户告诉你关于他自己的新信息时，在回复末尾加上标签：
[MEMORY: 要记住的内容，尽量精简]`,
    },
    { role: "user", content: userQuestion },
  ];

  console.log("用户：", userQuestion);
  console.log("--- Agent 开始循环 ---\n");

  for (let turn = 1; turn <= 10; turn++) {
    console.log(`[第 ${turn} 轮]`);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });
    const choice = response.choices[0];
    const msg = choice.message;
    messages.push(msg);

    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments);
        console.log(`  行动：${fnName}(${JSON.stringify(fnArgs)})`);
        const result = await executeToolViaMCP(connections, fnName, fnArgs);
        console.log(`  观察：${result}`);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      console.log("");
      continue;
    }

    if (msg.content) {
      console.log(`  最终回复：${msg.content}`);

      // 提取并保存新记忆
      const memoryMatch = msg.content.match(/\[MEMORY:\s*(.+?)\]/);
      if (memoryMatch) {
        vectorStore.addDocument(memoryMatch[1]);
        console.log(`记忆已保存：${memoryMatch[1]}`);
      }
      return msg.content;
    }
  }
  return "任务超时";
}

// ============ 运行 ============
const connections = await connectAllMCP([
  { name: "weather", file: "weather-server.js" },
  { name: "calculator", file: "calculator-server.js" },
]);

// ============ 模拟多轮对话，积累多条记忆 ============
const store = new SimpleVectorStore();
store.loadFromFile();

// 先喂几条信息，模拟长期使用积累的记忆
await agentLoop("我叫张三，住在深圳", connections, store);
console.log("\n---\n");
await agentLoop("我喜欢爬山和游泳", connections, store);
console.log("\n---\n");
await agentLoop("我对芒果过敏，绝对不能吃", connections, store);
console.log("\n---\n");
await agentLoop("我一般早上6点起床跑步", connections, store);
console.log("\n==================== 验证 RAG 检索 ====================\n");

// 验证：问一个和运动相关的问题，看是否只检索到相关的记忆
await agentLoop("今天深圳天气适合我早上出门运动吗？", connections, store);

for (const conn of connections) {
  await conn.mcp.close();
}