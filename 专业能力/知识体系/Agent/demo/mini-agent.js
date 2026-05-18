// mini-agent.js
// 使用前：npm install openai（是的，DeepSeek API 兼容 OpenAI SDK 格式）

import OpenAI from "openai";

// ============ 配置 ============
const client = new OpenAI({
  apiKey: 'sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251', // 从 https://platform.deepseek.com 获取
//   apiKey: process.env.DEEPSEEK_API_KEY, // 从 https://platform.deepseek.com 获取
  baseURL: "https://oneapi-comate.baidu-int.com/v1",
});

const MODEL = "DeepSeek-V4-Pro";

// ============ 工具定义 ============
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "查询指定城市的实时天气",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "城市名，如北京" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculator",
      description: "执行数学计算，输入四则运算表达式",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "例如 3+5*2" },
        },
        required: ["expression"],
      },
    },
  },
];

// ============ 工具实现 ============
async function executeTool(name, args) {
  switch (name) {
    case "get_weather": {
      // 模拟天气数据（实际场景接真实天气 API）
      const weatherDB = {
        "北京": { 天气: "小雨", 温度: "18°C" },
        "上海": { 天气: "多云", 温度: "25°C" },
        "深圳": { 天气: "晴天", 温度: "30°C" },
      };
      const city = args.city || "北京";
      return weatherDB[city] || { 天气: "未知", 温度: "未知" };
    }
    case "calculator": {
      // 注意：eval 仅用于演示，生产环境用 math.js 等安全库
      try {
        return { result: eval(args.expression) };
      } catch (e) {
        return { error: "计算失败：" + e.message };
      }
    }
    default:
      return { error: `未知工具: ${name}` };
  }
}

// ============ Agent 核心循环 ============
async function agentLoop(userQuestion) {
  // 对话记录（工作记忆）
  const messages = [
    {
      role: "system",
      content: `你是一个实用助手。调用工具的规则（违反将导致错误）：

规则1：当用户要求查天气时，你唯一能做的第一件事就是调用 get_weather 工具。
       绝对禁止先说"让我查一下""好的我帮你看看"等文字，必须直接调用工具！
       你嘴上说"让我查一下"但不去调用函数 = 你没查 = 你在骗用户。

规则2：当用户要求做数学计算时，必须调用 calculator 工具，不要心算。

规则3：只有当你已经拿到工具返回的结果后，才可以用中文回复用户。

记住：看到天气问题 → 立刻调 get_weather。看到计算问题 → 立刻调 calculator。不要废话。`,
    },
    { role: "user", content: userQuestion },
  ];

  console.log("用户：", userQuestion);
  console.log("--- Agent 开始循环 ---\n");

  for (let turn = 1; turn <= 10; turn++) {
    console.log(`[第 ${turn} 轮]`);

    // ① 思考：调用 LLM
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto", // 让模型自己决定要不要调工具
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // 将助手的消息加入对话记录
    messages.push(assistantMessage);

    // 先检查是否要调工具，再检查纯文本
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments);

        console.log(`  思考：需要调 ${fnName}(${JSON.stringify(fnArgs)})`);

        // ③ 观察：执行工具
        const result = await executeTool(fnName, fnArgs);
        console.log(`  观察：${fnName} 返回 ${JSON.stringify(result)}`);

        // 把工具结果追加入对话记录
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      console.log(""); // 空行分隔
      // ④ 回到循环开头
      continue;
    }

    // 模型没有调工具，直接回复文本 → 任务完成
    if (assistantMessage.content) {
      console.log(`  思考：直接回复，不调工具`);
      console.log(`  最终回复：${assistantMessage.content}`);
      return assistantMessage.content;
    }
  }

  return "抱歉，任务处理超时。";
}

// ============ 运行 ============
// agentLoop("今天北京天气怎么样？下雨我就带伞，天晴我就去爬山");
// agentLoop("你好，讲个笑话");
agentLoop("北京的温度加上上海的湿度数值，总和是多少？");