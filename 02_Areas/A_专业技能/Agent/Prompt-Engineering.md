# Prompt Engineering

## 一、什么是 Prompt Engineering

Prompt Engineering 不是"怎么跟 AI 说话"，它是**控制模型行为的工程手段**。本质上是通过设计输入来约束输出——包括格式、内容范围、推理路径、行为边界。

---

## 二、System Prompt 设计原则

System Prompt 是 Agent 的"宪法"，设计好坏直接决定 Agent 的行为质量。

### 核心原则

**用禁止性语言，不用描述性语言**

```
❌ 弱：当用户问天气时，请使用 get_weather 工具查询。
✅ 强：当用户问天气时，你唯一能做的第一件事就是调用 get_weather 工具。
       绝对禁止先说"让我查一下"然后不调工具——直接调！
       你嘴上说"让我查一下"但不去调用函数 = 你在骗用户。
```

**描述"什么时候必须用"，不只是"功能是什么"**

```
❌ 弱：工具 get_weather：获取天气信息
✅ 强：工具 get_weather：查询指定城市当天实时天气。
       当用户问到"天气""气温""下雨吗""带伞吗"等相关问题时，必须调用此工具。
```

**明确输出格式约束**

```
只能返回合法 JSON，不允许有任何 JSON 之外的文字。
不要用 markdown 代码块包裹（不要 ```json）。
不确定的字段填 null，不要省略字段。
```

---

## 三、结构化输出（Structured Output）

让模型返回可靠的 JSON，而不是自然语言。前端 Agent 开发的命脉——字段化数据才能直接渲染 UI。

### 方案一：`response_format: json_object`

最简单的方式，强制模型输出合法 JSON。

```javascript
const response = await client.chat.completions.create({
  model: "deepseek-chat",
  messages: [
    {
      role: "system",
      content: `返回 JSON，格式为：{ "city": string, "temperature": number, "suggestion": string }
               只返回 JSON，不要任何解释文字。`,
    },
    { role: "user", content: "深圳今天30度晴天" },
  ],
  response_format: { type: "json_object" }, // ← 关键
});

const data = JSON.parse(response.choices[0].message.content);
```

**优点**：一行配置  
**缺点**：只保证格式是合法 JSON，不保证字段名和类型符合预期

---

### 方案二：Few-shot Prompting（最通用，不依赖 response_format）

通过给模型看"输入→输出"示例，比文字规则更有效。核心原理：模型会模仿示例格式，举一反三。

```javascript
messages: [
  { role: "system", content: "从用户描述中提取结构化数据，只返回 JSON。" },

  // 示例1
  { role: "user", content: "李四，男，28岁，上海人，软件工程师" },
  { role: "assistant", content: '{"name":"李四","gender":"male","age":28,"city":"上海","profession":"软件工程师"}' },

  // 示例2
  { role: "user", content: "王芳，女，北京，喜欢画画，不知道年龄" },
  { role: "assistant", content: '{"name":"王芳","gender":"female","age":null,"city":"北京","hobbies":["画画"]}' },

  // 真实请求
  { role: "user", content: "张三，住深圳，35岁，产品经理，爱爬山游泳，对花生过敏" },
]
```

**Few-shot 的魔力**：模型会推断出 `allergies` 字段，不需要你明确定义——它从示例模式中学会了"未知字段的处理方式"。

**使用场景**：
- 不支持 `response_format` 的模型
- 字段结构复杂，文字说不清楚时
- 输出风格需要精确控制时

---

### 方案三：Zod Schema 验证（TypeScript / 前端最佳实践）

Zod 同时做两件事：①告诉模型期望的字段结构，②在运行时严格验证输出。

```javascript
import { z } from "zod";

// 1. 定义 Schema
const WeatherSchema = z.object({
  city: z.string(),
  weather: z.enum(["晴天", "多云", "小雨", "大雨", "阴天"]),
  temperature: z.number(),
  risk_level: z.enum(["low", "medium", "high"]),
  suggestions: z.array(z.string()),
});

// 2. 把 Schema 描述喂给模型（结合 response_format）
const response = await client.chat.completions.create({
  model: MODEL,
  messages: [
    {
      role: "system",
      content: `返回 JSON，严格符合以下 Schema：
        city: string
        weather: "晴天" | "多云" | "小雨" | "大雨" | "阴天"
        temperature: number（摄氏度）
        risk_level: "low" | "medium" | "high"
        suggestions: string[]`,
    },
    { role: "user", content: "北京小雨18度" },
  ],
  response_format: { type: "json_object" },
});

// 3. Zod 验证：字段类型不对 → 运行时立即报错，不带 bug 进 UI
try {
  const validated = WeatherSchema.parse(JSON.parse(response.choices[0].message.content));
  // validated.temperature 是 number 类型，有完整 TS 类型推断
} catch (e) {
  if (e instanceof z.ZodError) {
    e.errors.forEach(err => console.log(`${err.path}: ${err.message}`));
  }
}
```

**核心价值**：定义一次 Schema = 得到三样东西：
1. 给模型的输出约束描述
2. 运行时的类型校验
3. TypeScript 全程类型提示（下游代码零 `any`）

---

## 四、三种方案对比

| 方案 | 格式保证 | 字段保证 | 通用性 | 适用场景 |
|------|:--:|:--:|:--:|------|
| `response_format` | ✅ | ❌ | 需模型支持 | 快速验证，字段结构简单 |
| Few-shot Prompting | 依赖示例 | 依赖示例 | ✅ 所有模型 | 复杂格式、不支持参数的模型 |
| Zod Schema | ✅ | ✅ 运行时 | 需模型支持 | **TS 前端项目首选** |

**实战建议**：`response_format` + Zod 联用，二者互补——`response_format` 保证格式，Zod 保证内容。

---

## 五、工具描述（Tool Description）的三铁律

工具的 `description` 是模型决定"要不要调、该调哪个"的唯一依据：

1. **写明触发时机**，不只是功能描述
   ```
   ❌ "获取天气信息"
   ✅ "查询指定城市当天实时天气。当用户问到'天气''气温''下雨吗''带伞吗'时必须调用。"
   ```

2. **写明参数格式约束**
   ```
   ❌ city: "城市"
   ✅ city: "中文城市名称，如'北京'，不传英文或拼音"
   ```

3. **用 `enum` 限制可选值**，不让模型乱传
   ```javascript
   weather_type: {
     type: "string",
     enum: ["sunny", "rainy", "cloudy"],
   }
   ```

---

## 六、`finish_reason`——判断模型行为的可靠信号

比 `if (content)` 更可靠的判断方式：

| `finish_reason` | 含义 | Agent 该做什么 |
|---|---|---|
| `"stop"` | 正常结束，不调工具 | 返回 `content` 给用户 |
| `"tool_calls"` | 要调工具 | 执行 `tool_calls` |
| `"length"` | Token 被截断 | 做上下文压缩或报错 |

**判断顺序**：先判断 `tool_calls`，再判断 `content`，两者同时存在时 `tool_calls` 优先。

---

## 七、`tool_choice`——控制模型的工具使用自由度

| 值 | 含义 | 适用场景 |
|---|---|---|
| `"none"` | 禁用所有工具 | 纯对话，不需要工具 |
| `"auto"` | 模型自己决定 | 默认，需配合强 System Prompt |
| `"required"` | 强制必须调工具 | 确定需要工具的步骤 |
| `{ type: "function", function: { name: "xxx" } }` | 强制调指定工具 | 多步骤流程中确定某步 |