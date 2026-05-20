// mini-agent-mcp.js — MCP 版 Agent（支持多服务同时接入）
import OpenAI from "openai/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ============ 配置 ============
const client = new OpenAI({
  apiKey: 'sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251',
  baseURL: "https://oneapi-comate.baidu-int.com/v1",
});
const MODEL = "DeepSeek-V4-Pro";

// ============ MCP 客户端：同时连接多个服务 ============
async function connectAllMCP(serverConfigs) {
  const connections = [];

  for (const cfg of serverConfigs) {
    const transport = new StdioClientTransport({
      command: "node",
      args: [cfg.file],
    });
    const mcp = new Client({
      name: `mini-agent-${cfg.name}`,
      version: "1.0.0",
    });
    await mcp.connect(transport);
    connections.push({ name: cfg.name, mcp, transport });
    console.log(`MCP 已连接：${cfg.name}（${cfg.file}）`);
  }

  return connections;
}

// ============ 聚合所有 MCP 服务的工具列表 ============
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

// ============ 找到拥有该工具的 MCP 服务并执行 ============
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

// ============ Agent 核心循环 ============
async function agentLoop(userQuestion, connections) {
  const tools = await getAllTools(connections);
  console.log(
    "发现工具：",
    tools.map((t) => t.function.name).join(", ")
  );
  console.log("");

  const messages = [
    {
      role: "system",
      content: `你是一个实用助手。

工具规则（违反将导致错误）：
- 查天气 → 必须调用 get_weather，绝对禁止凭记忆猜或先说"让我查查"
- 做计算 → 必须调用 calculator，绝对禁止心算
- 只有拿到工具返回的真实结果后，才能组织语言回复用户`,
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
    console.log(`  finish_reason: ${choice.finish_reason}`);

    messages.push(msg);

    // 工具调用 — 自动路由到正确的 MCP 服务
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments);
        console.log(`  行动：MCP 调用 ${fnName}(${JSON.stringify(fnArgs)})`);

        const result = await executeToolViaMCP(connections, fnName, fnArgs);
        console.log(`  观察：${fnName} 返回 → ${result}`);

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      console.log("");
      continue;
    }

    // 纯文本回复
    if (msg.content) {
      console.log(`  最终回复：${msg.content}`);
      return msg.content;
    }
  }

  return "任务超时";
}

// ============ 运行：同时接入天气服务 + 计算服务 ============
const connections = await connectAllMCP([
  { name: "weather", file: "weather-server.js" },
  { name: "calculator", file: "calculator-server.js" },
]);

await agentLoop(
  "深圳今天多少度？北京多少度？把两个城市的温度加起来一共多少度？哪个更热？",
  connections
);

for (const conn of connections) {
  await conn.mcp.close();
}
console.log("所有 MCP 连接已关闭");