最小agent例子里的关键设计点
tool_choice: "auto"：让模型自己判断要不要调工具、调哪个——这就是"自主决策"，Agent 和写死的 Workflow 的本质区别
messages.push(assistantMessage) 和 messages.push({ role: "tool", ... })：每次行动和观察都写进对话记录，这就是 ReAct 循环的物理实现
最多 10 轮循环：防止 Agent 无限调用工具烧钱
工具描述给了"不要猜测"的 System Prompt：告诉模型遇到这类问题必须用工具，避免幻觉