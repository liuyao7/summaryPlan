// mini-agent-mcp.js — MCP 版 Agent
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

// ============ 配置 ============
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});
const MODEL = "deepseek-chat";

// ============ MCP 客户端：连接工具服务 ============
async function connectMCP() {
  // 启动 MCP Server 子进程，通过 stdio 通信
  const transport = new StdioClientTransport({
    command: "node",
    args: ["weather-server.js"],
  });

  const mcp = new Client({ name: "mini-agent", version: "1.0.0" });
  await mcp.connect(transport);
  return mcp;
}

// ============ 把 MCP 工具转成 OpenAI Function Calling 格式 ============
async function getToolsDef(mcp) {
  const result = await mcp.listTools();
  return result.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,  // MCP 的 schema 直接兼容 OpenAI 格式
    },
  }));
}

// ============ 通过 MCP 执行工具 ============
async function executeToolViaMCP(mcp, name, args) {
  const result = await mcp.callTool({ name, arguments: args });
  // 提取文本内容
  return result.content
    .map((c) => c.text)
    .join("\n");
}

// ============ Agent 核心循环 ============
async function agentLoop(userQuestion, mcp) {
  const tools = await getToolsDef(mcp);
  console.log("发现工具：", tools.map((t) => t.function.name).join(", "));
  console.log("");

  const messages = [
    {
      role: "system",
      content: `你是一个实用助手。当用户问天气时，必须调用 get_weather 工具查询。
不要凭记忆猜测天气，不要说"让我查一下"然后不调工具——直接调！`,
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

    // 工具调用
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments);
        console.log(`  行动：调 MCP 工具 ${fnName}(${JSON.stringify(fnArgs)})`);

        const result = await executeToolViaMCP(mcp, fnName, fnArgs);
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

// ============ 运行 ============
const mcp = await connectMCP();
await agentLoop("北京和深圳今天分别什么天气？哪个更热？", mcp);
await mcp.close();