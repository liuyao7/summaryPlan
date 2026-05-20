// mini-agent-memory.js — 带持久记忆的 Agent
import OpenAI from "openai/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

// ============ 配置 ============
const client = new OpenAI({
  apiKey: 'sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251',
  baseURL: "https://oneapi-comate.baidu-int.com/v1",
});
const MODEL = "DeepSeek-V4-Pro";

// ============ 记忆系统 ============
const MEMORY_FILE = "./MEMORY.md";

// 读历史记忆
function loadMemory() {
  if (!existsSync(MEMORY_FILE)) return "";
  const content = readFileSync(MEMORY_FILE, "utf-8").trim();
  console.log(`已加载记忆（${content.length} 字符）`);
  return content;
}

// 追加新记忆
function saveMemory(newFacts) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const entry = `\n- [${timestamp}] ${newFacts}`;
  writeFileSync(MEMORY_FILE, entry, { flag: "a" }); // 追加模式
  console.log(`记忆已保存：${newFacts}`);
}

// ============ MCP 连接 ============
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

// ============ Agent 核心循环（带记忆） ============
async function agentLoop(userQuestion, connections) {
  const tools = await getAllTools(connections);

  // ★ 关键：把历史记忆注入 System Prompt
  const memory = loadMemory();

  const messages = [
    {
      role: "system",
      content: `你是用户的专属助手。

=== 用户的历史信息（持久记忆） ===
${memory || "（暂无历史记忆）"}
=== 记忆结束 ===

当用户告诉你关于他自己的新信息时（名字、偏好、计划等），在你回复的末尾加上标签：
[MEMORY: 要记住的内容]

例如用户说"我住在北京"，你回复"好的，我记住了。[MEMORY: 用户住在北京]"`,
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
        console.log(`  行动：MCP 调用 ${fnName}(${JSON.stringify(fnArgs)})`);
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

      // ★ 提取记忆标签并持久化
      const memoryMatch = msg.content.match(/\[MEMORY:\s*(.+?)\]/);
      if (memoryMatch) {
        saveMemory(memoryMatch[1]);
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

// 第1次对话：告诉 Agent 个人信息
await agentLoop("我叫张三，住在深圳，喜欢爬山。记住这些。", connections);
console.log("\n==================== 新会话 ====================\n");

// 第2次对话：验证 Agent 是否记得
await agentLoop("我住在哪个城市？那个城市今天天气怎么样？适合我喜欢的活动吗？", connections);

for (const conn of connections) {
  await conn.mcp.close();
}