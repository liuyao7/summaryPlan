// structured-output.js — 结构化输出三种方案
// 演示如何让 Agent 返回可靠的 JSON 而不是自然语言
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({
  apiKey: 'sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251',
  baseURL: "https://oneapi-comate.baidu-int.com/v1",
});
const MODEL = "DeepSeek-V4-Pro";

// ============================================================
// 方案一：response_format（最简单，只保证返回合法 JSON）
// ============================================================
async function demo1_responseFormat() {
  console.log("\n===== 方案一：response_format =====");

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是天气助手。用 JSON 返回结果，格式为：
{
  "city": "城市名",
  "weather": "天气状况",
  "temperature_celsius": 数字,
  "suggestion": "一句建议",
  "suitable_for_outdoor": true或false
}
只返回 JSON，不要任何解释文字。`,
      },
      {
        role: "user",
        content: "深圳今天晴天30度，我想去爬山，合适吗？",
      },
    ],
    response_format: { type: "json_object" }, // ← 关键：强制 JSON 模式
  });

  const raw = response.choices[0].message.content;
  console.log("原始输出：", raw);

  // 直接 JSON.parse，安全
  const data = JSON.parse(raw);
  console.log("解析后：", data);
  console.log("提取字段 → 城市:", data.city, "| 适合户外:", data.suitable_for_outdoor);
}

// ============================================================
// 方案二：Prompt 约束（不依赖 response_format，最通用）
// 适用于：不支持 response_format 的模型，或 Few-shot 场景
// ============================================================
async function demo2_promptConstraint() {
  console.log("\n===== 方案二：Prompt 约束 + Few-shot =====");

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是一个信息提取助手。从用户描述中提取结构化数据。
严格规则：
1. 只能返回合法 JSON，不允许有任何 JSON 之外的文字
2. 不确定的字段填 null
3. 不要用 markdown 代码块包裹（不要 \`\`\`json）`,
      },
      // Few-shot 示例：给模型看两个例子，它会模仿
      {
        role: "user",
        content: "帮我把下面信息结构化：李四，男，28岁，上海人，软件工程师",
      },
      {
        role: "assistant",
        content: '{"name":"李四","gender":"male","age":28,"city":"上海","profession":"软件工程师"}',
      },
      {
        role: "user",
        content: "帮我把下面信息结构化：王芳，女，北京，喜欢画画，不知道年龄",
      },
      {
        role: "assistant",
        content: '{"name":"王芳","gender":"female","age":null,"city":"北京","profession":null,"hobbies":["画画"]}',
      },
      // 真实请求
      {
        role: "user",
        content: "帮我把下面信息结构化：张三，住深圳，35岁，产品经理，爱爬山游泳，对花生过敏",
      },
    ],
  });

  const raw = response.choices[0].message.content;
  console.log("原始输出：", raw);

  try {
    const data = JSON.parse(raw);
    console.log("解析后：", data);
    console.log("提取过敏信息 →", data.allergies ?? data.health_notes ?? "字段名由模型决定");
  } catch (e) {
    console.log("解析失败！需要更强的 Prompt 约束");
  }
}

// ============================================================
// 方案三：Zod Schema 验证（TypeScript 前端最佳实践）
// 确保字段类型完全符合预期，否则抛错让你知道
// ============================================================

// 先定义你期望的数据结构
const WeatherReportSchema = z.object({
  city: z.string().describe("城市名"),
  weather: z.enum(["晴天", "多云", "小雨", "大雨", "阴天", "阵雨"]).describe("天气状况"),
  temperature: z.number().describe("温度，摄氏度数字"),
  humidity_percent: z.number().min(0).max(100).describe("湿度百分比"),
  suggestions: z.array(z.string()).describe("给用户的建议列表"),
  suitable_activities: z.array(z.string()).describe("适合的户外活动"),
  risk_level: z.enum(["low", "medium", "high"]).describe("户外活动风险等级"),
});

// TypeScript 会自动推断类型：typeof WeatherReportSchema._type
// 等价于写了一个 interface，但同时有运行时验证

async function demo3_zodSchema() {
  console.log("\n===== 方案三：Zod Schema 验证 =====");

  // 把 Schema 的结构描述给模型
  const schemaDescription = `
{
  "city": string,
  "weather": "晴天" | "多云" | "小雨" | "大雨" | "阴天" | "阵雨",
  "temperature": number（摄氏度）,
  "humidity_percent": number（0-100）,
  "suggestions": string[]（给用户的建议列表）,
  "suitable_activities": string[]（适合的户外活动）,
  "risk_level": "low" | "medium" | "high"
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是天气分析助手。严格按照以下 JSON Schema 返回结果，不允许有任何额外文字：
${schemaDescription}`,
      },
      {
        role: "user",
        content: "分析北京今天的情况：小雨，18°C，湿度80%，我想去爬香山",
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0].message.content;
  console.log("原始输出：", raw);

  // Zod 验证：如果字段类型不对会直接告诉你哪里错了
  try {
    const parsed = JSON.parse(raw);
    const validated = WeatherReportSchema.parse(parsed); // ← 严格验证
    console.log("Zod 验证通过！数据：", validated);
    // 现在 validated.temperature 是 number 类型，validated.weather 只能是枚举值
    // TypeScript 会提供完整的类型提示
    console.log(`风险等级：${validated.risk_level} | 建议数量：${validated.suggestions.length}条`);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log("Zod 验证失败，字段不符合预期：");
      e.errors.forEach((err) => console.log(`  - ${err.path.join(".")}: ${err.message}`));
    }
  }
}

// ============================================================
// 实战场景：Agent + 结构化输出联动
// 天气工具返回 JSON → Agent 做分析 → 前端直接渲染
// ============================================================
async function demo4_agentWithStructuredOutput() {
  console.log("\n===== 实战：Agent + 结构化输出联动 =====");

  // 模拟天气工具返回的原始数据
  const weatherData = { city: "深圳", weather: "晴天", temperature: 30, humidity: 50 };

  // Agent 分析并输出结构化建议
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是一个户外活动顾问。根据天气数据，输出活动建议。
只能返回 JSON，格式：
{
  "overall_assessment": "总体评价（一句话）",
  "score": 评分1-10,
  "pros": ["优点1", "优点2"],
  "cons": ["缺点1"],
  "recommended_time": "推荐出行时段",
  "must_bring": ["必带物品1", "必带物品2"],
  "user_activities_match": { "活动名": true/false }
}`,
      },
      {
        role: "user",
        content: `天气数据：${JSON.stringify(weatherData)}
用户喜好：爬山、游泳
请分析是否适合今天出行。`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content);
  console.log("\n结构化分析结果：");
  console.log(`  总体评价：${result.overall_assessment}`);
  console.log(`  评分：${result.score}/10`);
  console.log(`  必带物品：${result.must_bring?.join("、")}`);
  console.log(`  活动匹配：`, result.user_activities_match);
  console.log("\n→ 前端现在可以直接用这些字段渲染 UI，不用解析自然语言！");
}

// 按顺序运行四个 Demo
await demo1_responseFormat();
await demo2_promptConstraint();
await demo3_zodSchema();
await demo4_agentWithStructuredOutput();