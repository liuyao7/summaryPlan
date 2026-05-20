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
1. 具体内容是：

深入 Function Calling 机制：你刚才已经让模型调了 get_weather，但这只是表面。下一步要搞清楚的是——模型内部怎么决定"要不要调工具"？tool_choice: "auto" 的三个值（none / auto / required）各自适用什么场景？如何设计复杂的工具参数（比如嵌套结构、枚举约束）让模型不传错参？

MCP（Model Context Protocol）：目前你的工具是写死在代码里的（weatherDB 硬编码），真实场景工具可能在另一台服务器上、另一个数据库里。MCP 就是解决这个问题的标准协议——让 Agent 能动态发现并连接任意外部工具，不用为每个工具写适配代码。你会搭一个 MCP Server，然后让你的 mini-agent 通过 MCP 去调用它。

工具设计原则：description 该怎么写模型才不容易调错？参数校验谁来做（模型侧 vs 代码侧）？多个工具共存时怎么避免模型选错？

2. 阶段二·第一课：Function Calling 深度解析
一、刚才你的代码跑通了吗？但你只看到了表面
你写了 tools 数组，设了 tool_choice: "auto"，模型调了 get_weather。这个流程跑通了，但我们来看看模型内部到底做了什么决定。

把这行改一下，加个 console.log 就能看到模型返回的原始数据

Read
专业能力/知识体系/Agent/demo/mini-agent.js
L99-113
Thought for 3 seconds
先加一行日志看模型底层返回了什么：

mini-agent.js
+5
Thought for 22 seconds
跑一下这个看看：

bash

插入到终端中

复制
node mini-agent.js
你会看到 finish_reason 和 has_tool_calls 的真实值。这个 finish_reason 才是 Agent 循环的真正信号。

二、finish_reason—— 模型心里的真实想法
你之前的代码用 if (assistantMessage.content) 来判断模型是否要调工具，这个判断是不可靠的。真正可靠的信号是 finish_reason：

finish_reason 值	含义	你的 Agent 应该做什么
"stop"	模型认为对话结束了，不调工具	把 content 返回给用户
"tool_calls"	模型想调工具	执行 tool_calls 中的工具
"length"	Token 超了，被截断了	做上下文压缩或报错
这就是为什么刚才你遇到了 bug：模型返回的 finish_reason 是 "stop" 而不是 "tool_calls"，它根本没想调工具，只是在嘴上说"我帮你查查"。

三、tool_choice—— 你对模型行为的控制权
这是 Function Calling 最重要的参数，它决定了模型的自由度：

JavaScript

插入

复制
// 模式1：完全禁用工具（就是普通聊天）
tool_choice: "none"

// 模式2：让模型自己决定（你当前的设置）
// 优点：灵活，不会在不该调工具时强行调
// 缺点：模型可能偷懒不调工具 → 你刚才遇到的问题
tool_choice: "auto"

// 模式3：强制模型必须调至少一个工具
// 适用场景：你知道用户的请求一定需要工具
// 缺点：纯闲聊也会被强行调工具，结果很奇怪
tool_choice: "required"

// 模式4：强制指定工具（最严格）
// 适用场景：多步骤任务中，你明确知道这一步该用哪个工具
tool_choice: { type: "function", function: { name: "get_weather" } }
实战经验：

"auto" 是最常用的，但前提是你的 System Prompt 写的够强硬。如果模型不听，可以换两个策略：

把 "auto" 改 "required"，但需要额外判断"当前请求是不是一定需要工具"
保持 "auto"，但优化 System Prompt 和工具的 description
四、工具描述（description）怎么写才有效
工具描述不是文档——它是模型选择工具的唯一依据。一个糟糕的工具描述会让模型选错工具或者根本不用：

JavaScript

插入

复制
// ❌ 糟糕的描述
{
  name: "get_weather",
  description: "获取天气信息",  // 太模糊，模型不知道什么时候该用
  parameters: {
    properties: {
      city: { type: "string", description: "城市" }  // 太模糊
    }
  }
}

// ✅ 好的描述
{
  name: "get_weather",
  description: "查询指定城市当天的实时天气状况，返回天气类型（晴/雨/多云等）和摄氏温度。" +
              "当用户问到'天气''气温''下雨吗''带伞吗'等相关问题时，必须调用此工具。",
  parameters: {
    properties: {
      city: {
        type: "string",
        description: "中文城市名称，如'北京'、'上海'。不传英文或拼音。"
      }
    },
    required: ["city"]
  }
}
三条铁律：

description 要写明什么时候必须用，而不只是"功能是什么"
参数描述要写明格式约束（中文还是英文？大写还是小写？）
用 enum 限制可选值——这是告诉模型边界最快的方式
JavaScript

插入

复制
// 用 enum 限制可选值，模型就不会乱传
"weather_type": {
  type: "string",
  enum: ["sunny", "rainy", "cloudy", "snowy"],
  description: "天气类型"
}
五、演示：一个多步骤任务
现在我们不跑天气了，换一个有代表性的问题，同时把 tool_choice 临时改成 "required" 看效果。

把你脚本最后一行改成：

JavaScript

插入

复制
agentLoop("深圳今天多少度？北京多少度？两个城市的温度加起来一共多少度？");
这个任务需要 Agent：

第1轮：同时查深圳和北京的天气（并行调两个工具）
第2轮：基于温度结果调用 calculator 求和
第3轮：回复最终结果
跑一下看看你的 Agent 能不能完成这个三步接力。这是检验 ReAct 循环是否真正在"多轮工作"。

3. 跑通了！而且输出非常值得分析。几个关键观察：

从这个输出里你能学到什么
1. finish_reason 是第一手信号——现在你看到它的重要性了

轮次	finish_reason	content	tool_calls
第1轮	tool_calls	null	✅ 2个
第2轮	tool_calls	null	✅ 1个
第3轮	stop	有内容	❌
当 finish_reason 是 tool_calls 时，content 就是 null——这就是 OpenAI API 的规范行为：调工具时不产文字，产文字时不调工具。你的循环判断逻辑如果用 finish_reason 会更加稳固。

2. 第1轮并行调了两个工具——模型有"一次性多任务"的能力

第1轮只发了一次 LLM 请求，模型返回了两个 tool_calls：

text

插入

复制
get_weather("深圳")  ← 同时
get_weather("北京")  ← 同时
它是自己判断出这两个查询互不依赖，所以在同一轮里并行执行了。这就是 Agent 的智能性——它不是在机械地串行，而是有任务拆解和依赖分析能力。

3. 模型从 "30°C" 里自己提取了数字 30

注意你的天气数据返回的是字符串 "30°C" 和 "18°C"，模型在第2轮调用 calculator 时传的是 "30+18"。它自己从带单位的字符串里解析出了数字——这就是大模型的核心价值：它能处理非结构化的边界情况，不需要你提前写转换逻辑。

总结：你现在手上有一个能活的 Agent 循环
你刚才亲眼看到了一个 Agent 在 3 轮循环中：

text

插入

复制
用户提问
  → 并行查两个城市天气
  → 拿到温度做加法计算
  → 汇总给用户回复
没有任何人提前写好"先查深圳，再查北京，再算加法"的流程。Agent 自己拆解了任务、判断了依赖、执行了工具、最终回复。这就是 Agent 和传统程序最本质的区别——程序是写死的路径，Agent 是动态决定的路径。

下一步：MCP（Model Context Protocol）
现在你的工具体系有一个问题：

JavaScript

插入

复制
// 你的工具是写死在代码里的
switch (name) {
  case "get_weather": return weatherDB[args.city];
  case "calculator": return eval(args.expression);
}
真实场景：你的 Agent 需要连数据库、调公司内部 API、操作文件系统、发飞书消息——这些工具分布在不同的服务器、不同的语言、不同的协议上。你不可能把所有工具的代码都写死在 Agent 里。

MCP 解决的问题：用一套标准协议，让 Agent 动态发现和连接任意工具，不用为每个工具写适配代码。

4. MCP（Model Context Protocol）
一、先理解问题：为什么需要 MCP
你现在的工具体系：

text

插入

复制
mini-agent.js
  ├── tools 定义（写死的）
  └── executeTool（写死的）
      ├── get_weather → weatherDB 硬编码
      └── calculator → eval
问题：加一个新工具（比如"发飞书消息"），你要改 Agent 代码。10个工具呢？100个呢？工具在别的服务器上呢？工具是别人团队维护的呢？

MCP 的做法：把工具从 Agent 里拆出去，变成独立服务：

text

插入

复制
改前（紧耦合）：                     改后（MCP 解耦）：
                                   
mini-agent.js                       mini-agent.js（MCP Client）
  ├── 工具A 代码                          │  "你有哪些工具？"
  ├── 工具B 代码                          │  "帮我调用天气工具"
  └── 工具C 代码                          │
                                    ┌─────┴──────────────┐
                                    │     MCP 协议        │
                                    └─────┬──────────────┘
                                    ┌─────┼──────────────┐
                              天气服务   计算服务   飞书服务
                              (独立进程) (独立进程) (独立进程)
Agent 不需要知道工具怎么实现的，只需要知道"有个工具能干什么"。工具提供方独立开发、独立部署、独立升级，Agent 在运行时动态发现。

二、MCP 的通信模型
text

插入

复制
┌──────────────────────┐        JSON-RPC over stdio/HTTP        ┌──────────────────────┐
│   MCP Client (Host)  │ ◄──────────────────────────────────► │   MCP Server          │
│                      │                                       │                      │
│   你的 mini-agent    │   → tools/list   "你有什么工具？"       │   天气查询服务         │
│                      │   ← [get_weather, calculator, ...]    │                      │
│                      │   → tools/call   "帮我查北京天气"       │   文件读写服务         │
│                      │   ← { 天气: "小雨", 温度: "18°C" }     │                      │
│                      │                                       │   飞书消息服务         │
└──────────────────────┘                                       └──────────────────────┘
三个核心操作：

操作	谁发起	干什么
tools/list	Client 问 Server	"你有哪些工具？把名字和参数告诉我"
tools/call	Client 叫 Server	"帮我执行这个工具，参数是这些"
resources/read	Client 读 Server	"给我读一下这个文件/数据"
Agent 在初始化阶段调 tools/list 收集所有可用工具，然后在循环中发现需要工具时调 tools/call。工具发现和工具执行都是运行时的，不需要提前写死。

三、动手：把天气查询做成一个独立的 MCP Server
先装依赖：

bash

插入到终端中

复制
cd demo
npm install @modelcontextprotocol/sdk zod
然后在 demo 目录下新建 weather-server.js：

weather-server.js
+52
Thought for 2 seconds
现在改造 Agent，让它通过 MCP 协议连接天气服务，而不是写死工具代码：

mini-agent-mcp.js
+117
Thought for a few seconds
四、对比：改前 vs 改后
改前（mini-agent.js）：

JavaScript

插入

复制
// 工具、工具实现全部写死在 Agent 里
const tools = [ { name: "get_weather", ... } ];   // ← 写死
async function executeTool(name, args) {           // ← 写死
  switch (name) {
    case "get_weather": return weatherDB[city];     // ← Agent 代码里管天气逻辑
  }
}
改后（mini-agent-mcp.js + weather-server.js）：

JavaScript

插入

复制
// Agent 运行时动态发现工具
const tools = await mcp.listTools();               // ← 动态获取，不写死

// 工具执行也走 MCP，Agent 不知道内部怎么实现
const result = await mcp.callTool(name, args);     // ← 远程调用，不关我事
关键变化：

改前	改后
工具定义	写死在 Agent 代码	Agent 启动时动态拉取
工具实现	在 Agent 里	独立进程 weather-server.js
加新工具	改 Agent 代码 → 重新部署	启动新服务 → Agent 自动发现
工具更新	改 Agent 代码 → 重新部署	只更新那个工具服务
语言	必须和 Agent 同语言	可以用任何语言写工具服务
五、运行
bash

插入到终端中

复制
# 确保 package.json 有 "type": "module"，否则把 import 改 require
node mini-agent-mcp.js
注意：mini-agent-mcp.js 当前配置的是 DeepSeek 官方 API。你之前改成了百度内部代理，需要同步改回你的实际环境。

核心看两个地方：

tools/list 返回了什么——Agent 不写死工具列表了
tools/call 执行了什么——Agent 不写死工具实现了
六、你现在理解了的 MCP 核心认知
MCP 是 Agent 的"USB 接口"：不管工具是什么语言写的、跑在哪台机器上，通过 MCP 协议一刀切接入。Agent 只需要知道"协议"，不需要知道"实现"。

工具发现是运行时的：Agent 启动时调 tools/list 才知道自己有哪些武器可用，不需要提前硬编码。

MCP + Function Calling 是天然搭配：

MCP 负责 "工具有哪些、怎么调用"（基础设施层）
Function Calling 负责 "模型什么时候该调工具"（推理层）
两者各司其职，通过 tools 数组衔接
现在你看 OpenClaw / Hermes 的源码会轻松很多：它们底层都在用 MCP 连接工具，只是各自的编排层（Agent Loop、Memory、Cron）不一样。

跑完之后告诉我要不要加第二个 MCP 服务（比如把 calculator 也独立出来），我们就完成阶段二了。

4. 第一步：创建计算器 MCP 服务
calculator-server.js
+51
Thought for 2 seconds
第二步：改造 Agent 支持多 MCP 服务同时接入
mini-agent-mcp.js
Thought for a few seconds
Read
专业能力/知识体系/Agent/demo/mini-agent-mcp.js
L1-117
Thought for 6 seconds
mini-agent-mcp.js
+77
-43
Thought for 3 seconds
完成。运行方式不变：

bash

插入到终端中

复制
node mini-agent-mcp.js
改了什么——关键架构变化
原来（单服务）：

text

插入

复制
mini-agent-mcp ──MCP──→ weather-server（1个工具）
现在（多服务）：

text

插入

复制
                    ┌──MCP──→ weather-server    （get_weather）
mini-agent-mcp ────┤
                    └──MCP──→ calculator-server  （calculator）
三个核心函数的变化：

函数	原来	现在
connectMCP	连 1 个服务	connectAllMCP 连 N 个服务，存到数组
getToolsDef	从 1 个服务拉工具	getAllTools 遍历所有服务，聚合工具列表
executeToolViaMCP	直接调唯一的服务	遍历找"哪个服务有这个工具"，找到后调用
Agent 循环本身一行没改——这就是架构分层的力量。

你会看到的输出
text

插入

复制
MCP 已连接：weather（weather-server.js）
MCP 已连接：calculator（calculator-server.js）
发现工具：get_weather, calculator

用户：深圳今天多少度？北京多少度？把两个城市的温度加起来一共多少度？哪个更热？
--- Agent 开始循环 ---

[第 1 轮]
  finish_reason: tool_calls
  行动：MCP 调用 get_weather({"city":"深圳"})
  观察：get_weather 返回 → 深圳天气：晴天，温度30°C，湿度50%
  行动：MCP 调用 get_weather({"city":"北京"})
  观察：get_weather 返回 → 北京天气：小雨，温度18°C，湿度80%

[第 2 轮]
  finish_reason: tool_calls
  行动：MCP 调用 calculator({"expression":"30+18"})
  观察：calculator 返回 → 30+18 = 48

[第 3 轮]
  finish_reason: stop
  最终回复：深圳30°C，北京18°C，加起来48°C。深圳更热。
观察点：Agent 在第1轮时不知道 calculator 来自哪个服务——它只管说"我要用 calculator"，然后 executeToolViaMCP 自动找到了 calculator-server。对 Agent 循环来说，两个服务和二十个服务没有区别。

阶段二总结
你现在掌握了：

Function Calling 底层：finish_reason 是真正的信号，tool_choice 控制模型自由度，工具描述决定模型会不会选对工具
MCP 协议：Agent 通过统一协议动态发现和调用工具，工具实现独立部署、独立语言、独立维护
多服务架构：Agent 可以同时接入多个 MCP 服务，循环代码不需要任何改动
