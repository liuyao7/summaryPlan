/**
 * mini-agent-context.js
 *
 * 演示上下文压缩（Context Compaction）——解决长对话 Token 爆炸问题
 *
 * 核心问题：Agent 多轮对话中，messages 数组越来越长
 *   - 每轮都要把历史全部发过去 → Token 线性增长
 *   - 超过模型上下文上限 → 截断，丢失早期信息
 *   - 即使不截断 → 费用线性增长
 *
 * 解决方案：
 *   1. 滑动窗口（最简单）——只保留最近 N 条
 *   2. 自动摘要（推荐）——LLM 总结旧消息，保留语义
 *   3. 分层记忆（进阶）——摘要 + 最近窗口 + 工具结果
 *
 * 本 Demo 实现方案 2 + 3：
 *   -  超过阈值 → 自动触发摘要
 *   -  摘要保留在 System Prompt 中
 *   -  最近 6 条消息保持原样
 *   -  工具调用结果保留在摘要中
 *
 * 运行：node mini-agent-context.js
 */

import OpenAI from "openai";
import readline from "readline";

const API_KEY = "sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251";
const BASE_URL = "https://oneapi-comate.baidu-int.com/v1";
const MODEL = "DeepSeek-V4-Pro";

const client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });

// 上下文管理器配置
const CONTEXT_CONFIG = {
  maxMessages: 12,       // 超过此数量触发压缩
  keepRecent: 6,         // 保留最近 N 条消息不解压
  estimatedTokensPerMsg: 100,  // 估算每条消息 Token 数
  maxTokenEstimate: 6000,     // 估算 Token 上限
};

// ============================================================
// 核心：上下文管理器
// ============================================================

class ContextManager {
  constructor(config = CONTEXT_CONFIG) {
    this.config = config;
    this.messages = [];        // 当前消息窗口
    this.summary = "";         // 历史摘要
    this.compressionCount = 0; // 已压缩次数
    this.stats = {
      totalMessages: 0,        // 累计消息数
      compressedMessages: 0,   // 已压缩消息数
      estimatedTokens: 0,      // 估算当前 Token
    };
  }

  /** 添加消息并自动检查是否需要压缩 */
  addMessage(role, content) {
    this.messages.push({ role, content });
    this.stats.totalMessages++;
    this._updateEstimates();
  }

  /** 添加工具调用记录 */
  addToolCall(toolName, args, result) {
    this.messages.push({
      role: "assistant",
      content: `[调用了 ${toolName}(${JSON.stringify(args)})，结果: ${JSON.stringify(result).slice(0, 200)}]`,
    });
    this.stats.totalMessages++;
    this._updateEstimates();
  }

  /** 判断是否需要压缩 */
  needsCompaction() {
    return (
      this.messages.length > this.config.maxMessages ||
      this.stats.estimatedTokens > this.config.maxTokenEstimate
    );
  }

  /** 构建发送给 LLM 的完整消息列表（摘要 + 最近消息） */
  buildMessages(systemPrompt) {
    const result = [];

    // 前置：系统提示 + 历史摘要
    let fullSystem = systemPrompt;
    if (this.summary) {
      fullSystem += `\n\n---\n【对话历史摘要（第 ${this.compressionCount} 次压缩）】\n${this.summary}\n---`;
    }
    result.push({ role: "system", content: fullSystem });

    // 最近消息保持原样
    const recent = this.messages.slice(-this.config.keepRecent);
    for (const msg of recent) {
      // 跳过已经是摘要格式的消息（避免重复嵌入 system prompt）
      if (msg.role === "system") continue;
      result.push(msg);
    }

    return result;
  }

  /**
   * 执行压缩：用 LLM 总结旧消息
   * 保留最近 N 条，旧消息 → 摘要
   */
  async compact() {
    const keepCount = this.config.keepRecent;
    if (this.messages.length <= keepCount) return; // 不需要压缩

    const oldMessages = this.messages.slice(0, this.messages.length - keepCount);
    const recentMessages = this.messages.slice(-keepCount);

    // 把旧消息序列化为文本
    const oldText = oldMessages
      .map((m) => `[${m.role}] ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n");

    console.log(`\n  ⚡ 触发压缩：${this.messages.length} 条 → 摘要 + ${keepCount} 条`);

    // LLM 总结
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `你是对话摘要器。提取关键信息，保留所有重要事实、用户偏好、任务结论。
输出格式：
- 用户信息：姓名、偏好等
- 已完成任务：任务 → 结果
- 待处理事项：未完成的任务
- 关键决策：重要选择和原因
用中文，尽量简短。`,
        },
        { role: "user", content: `总结以下对话：\n${oldText}` },
      ],
    });

    const newSummary = response.choices[0].message.content;

    // 合并到已有摘要
    if (this.summary) {
      this.summary = `[早期] ${this.summary}\n\n[最新] ${newSummary}`;
    } else {
      this.summary = newSummary;
    }

    // 替换消息列表 = 最近 N 条
    this.messages = recentMessages;
    this.compressionCount++;
    this.stats.compressedMessages += oldMessages.length;
    this._updateEstimates();

    console.log(`  ✅ 压缩完成。摘要长度: ${newSummary.length} 字符 | 保留: ${recentMessages.length} 条`);
    return newSummary;
  }

  /** 更新 Token 估算 */
_updateEstimates() {
    let total = (this.summary || "").length * 0.5;
    for (const msg of this.messages) {
      total += this.config.estimatedTokensPerMsg || 100;
      if (typeof msg.content === "string") {
        total += (msg.content || "").length * 0.5;
      }
    }
    this.stats.estimatedTokens = Math.round(total) || 0;
  }

  /** 打印状态 */
  status() {
    console.log(
      `[Context] 消息: ${this.messages.length}条 | 估算Token: ${this.stats.estimatedTokens} |` +
        ` 累计: ${this.stats.totalMessages}条 | 已压缩: ${this.stats.compressedMessages}条 |` +
        ` 压缩次数: ${this.compressionCount}`
    );
  }
}

// ============================================================
// Demo 1：滑动窗口 vs 摘要对比
// ============================================================

async function demo1_windowVsSummary() {
  console.log("===== Demo1：滑动窗口 vs 摘要压缩 =====\n");

  const ctx = new ContextManager();

  // 模拟长对话
  ctx.addMessage("user", "我叫张三，今年35岁，住在深圳");
  ctx.addMessage("assistant", "你好张三！记住你是35岁的深圳居民。");
  ctx.addMessage("user", "我是一名产品经理，最近在学 AI Agent");
  ctx.addMessage("assistant", "产品经理学 Agent，很有前景的方向。");
  ctx.addMessage("user", "我喜欢爬山和游泳，周末经常户外运动");
  ctx.addMessage("assistant", "户外运动很好，深圳有很多山可以爬。");

  // 模拟几次工具调用后的消息
  ctx.addToolCall("get_weather", { city: "深圳" }, { temp: 30, weather: "晴" });
  ctx.addMessage("user", "这么热，爬山要注意什么？");
  ctx.addMessage("assistant", "30度爬山要带足水，做好防晒。");
  ctx.addMessage("user", "帮我也查查明天天气");
  ctx.addToolCall("get_weather", { city: "深圳", date: "明天" }, { temp: 28, weather: "阴" });
  ctx.addMessage("assistant", "明天28度阴天，比今天适合户外。");
  ctx.addMessage("user", "那明天去梧桐山吧，路线怎么选？");
  ctx.addMessage("assistant", "梧桐山有3条路线：泰山涧(2h)、凌云道(1.5h)、碧桐道(3h)。");

  ctx.status();

  // 执行压缩
  console.log("\n--- 执行压缩 ---");
  await ctx.compact();

  ctx.status();
  console.log("\n压缩后传入 LLM 的消息结构：");
  console.log(JSON.stringify(ctx.buildMessages("你是用户的个人助手"), null, 2));
}

// ============================================================
// Demo 2：交互式对话 + 自动压缩
// ============================================================

async function demo2_interactive() {
  console.log("\n===== Demo2：交互式对话 + 自动压缩 =====");
  console.log("模拟多轮对话，消息数超过阈值时自动触发压缩\n");

  const ctx = new ContextManager({
    maxMessages: 8,
    keepRecent: 4,
    maxTokenEstimate: 3000,
  });

  const SYSTEM_PROMPT = `你是用户助手。记住用户告诉你的信息，用中文简短回复。

可用的工具意图：
- 查天气：用户会明确说"天气"或"weather"
- 计算：用户给出数学表达式时
（本 Demo 中模拟工具结果，不实际调用）

你的回复要自然，每次回复后说一句"当前是第 X 句话"。`;

  // 模拟的对话流程
  const turns = [
    { role: "user", content: "你好！我想了解下深圳今天的天气" },
    {
      role: "assistant",
      content: "让我查一下。深圳今天晴天，30度。注意防晒。当前是第 2 句话。",
      tool: { name: "get_weather", args: { city: "深圳" }, result: { temp: 30, weather: "晴" } },
    },
    { role: "user", content: "嗯，我是产品经理，最近在研究 AI Agent，有什么建议吗？" },
    {
      role: "assistant",
      content: "作为产品经理，建议从 Function Calling 入手理解 Agent 能力边界。当前是第 4 句话。",
    },
    { role: "user", content: "对了，我喜欢户外运动，爬山游泳都行" },
    {
      role: "assistant",
      content: "记住了！深圳户外资源丰富，梧桐山、大南山都不错。当前是第 6 句话。",
    },
    { role: "user", content: "帮我算一下 128 * 37 等于多少" },
    {
      role: "assistant",
      content: "128 × 37 = 4736。当前是第 8 句话。",
      tool: { name: "calculator", args: { expr: "128*37" }, result: 4736 },
    },
    { role: "user", content: "谢谢。我想规划一个周末登山行程" },
    {
      role: "assistant",
      content: "好的！结合你之前提到的信息，你是产品经理、喜欢户外。推荐梧桐山泰山涧路线，约2小时，风景好。当前是第 10 句话。",
    },
    { role: "user", content: "需要带哪些装备？" },
    {
      role: "assistant",
      content: "之前提到深圳30度晴天，建议带：2L水、防晒霜、遮阳帽、登山鞋。当前是第 12 句话。",
    },
    { role: "user", content: "我是说我叫张三，你还记得吗？" },
  ];

  for (const turn of turns) {
    if (turn.role === "user") {
      ctx.addMessage("user", turn.content);
    } else {
      if (turn.tool) {
        ctx.addToolCall(turn.tool.name, turn.tool.args, turn.tool.result);
      }
      ctx.addMessage("assistant", turn.content);
    }

    ctx.status();

    // 每一轮后检查是否需要压缩
    if (ctx.needsCompaction()) {
      await ctx.compact();
    }
  }

  // 最终用压缩后的上下文回答最后一个问题
  console.log("\n--- 使用压缩后的上下文回答 ---");
  const finalMsg = ctx.buildMessages(SYSTEM_PROMPT);
  console.log(`最终传给 LLM 的消息数: ${finalMsg.length}\n`);

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: finalMsg,
  });

  console.log(`助手: ${response.choices[0].message.content}`);
  console.log(`\n原始消息数: ${ctx.stats.totalMessages} | 压缩后传参: ${finalMsg.length} 条`);
  console.log(`Token 节省率: ${((1 - ctx.stats.estimatedTokens / (ctx.stats.totalMessages * 150)) * 100).toFixed(0)}%`);
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  await demo1_windowVsSummary();
  await demo2_interactive();
}

main().catch(console.error);