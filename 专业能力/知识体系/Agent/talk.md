## 理解 ReAct 范式 手写最简 Agent

1. 最小agent例子里的关键设计点
tool_choice: "auto"：让模型自己判断要不要调工具、调哪个——这就是"自主决策"，Agent 和写死的 Workflow 的本质区别
messages.push(assistantMessage) 和 messages.push({ role: "tool", ... })：每次行动和观察都写进对话记录，这就是 ReAct 循环的物理实现
最多 10 轮循环：防止 Agent 无限调用工具烧钱
工具描述给了"不要猜测"的 System Prompt：告诉模型遇到这类问题必须用工具，避免幻觉

2. 修复
改好了。两个修复：

System Prompt 加强了禁止性语言：明确告诉模型"绝对禁止先说文字再调工具，必须直接调"，用"你在骗用户"这种强情绪语言触发模型的行为约束
判断顺序调换：先检查 tool_calls 再检查 content，防止模型如果同时返回两者时漏掉工具调用
重新跑一下：

bash

插入到终端中

复制
node mini-agent.js
这次应该能看到正确的输出：

text

插入

复制
[第 1 轮]
  思考：需要调 get_weather({"city":"北京"})
  观察：get_weather 返回 {"天气":"小雨","温度":"18°C"}

[第 2 轮]
  最终回复：今天北京是小雨，温度18°C，出门记得带伞！
你遇到的现象（模型口头上说"我帮你查"但不动手）其实揭示了 Agent 开发的一个核心经验：System Prompt 不是"描述"，是"约束"——你得告诉模型"不许做什么"，而不只是"应该做什么"。温和的语气会被当建议，禁止性语言才会被执行。

## 工具调用 + MCP 协议
具体内容是：

深入 Function Calling 机制：你刚才已经让模型调了 get_weather，但这只是表面。下一步要搞清楚的是——模型内部怎么决定"要不要调工具"？tool_choice: "auto" 的三个值（none / auto / required）各自适用什么场景？如何设计复杂的工具参数（比如嵌套结构、枚举约束）让模型不传错参？

MCP（Model Context Protocol）：目前你的工具是写死在代码里的（weatherDB 硬编码），真实场景工具可能在另一台服务器上、另一个数据库里。MCP 就是解决这个问题的标准协议——让 Agent 能动态发现并连接任意外部工具，不用为每个工具写适配代码。你会搭一个 MCP Server，然后让你的 mini-agent 通过 MCP 去调用它。

工具设计原则：description 该怎么写模型才不容易调错？参数校验谁来做（模型侧 vs 代码侧）？多个工具共存时怎么避免模型选错？