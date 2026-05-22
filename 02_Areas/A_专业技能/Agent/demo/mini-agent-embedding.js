/**
 * mini-agent-embedding.js
 *
 * 演示语义向量检索（Semantic RAG）的核心原理
 *
 * 架构说明：
 * 真实 Embedding 模型（text-embedding-3-small 等）把文本映射到高维向量空间。
 * 本 Demo 用 LLM 生成「语义特征向量」来模拟这个过程：
 *   - 向量维度 = 预定义的语义维度（运动/技术/健康/食物/娱乐等）
 *   - 数值 = LLM 对该文本在该维度上的相关性评分 [0, 1]
 *   - 余弦相似度 = 同样的数学公式
 *
 * 这种方式让你可以「看见」向量里装了什么，真实 Embedding 维度不可解释但数学相同。
 *
 * 运行：node mini-agent-embedding.js
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = "sk-pjVlSzHYooahYksmBe9fF10932E34279891558C3E5497251";
const BASE_URL = "https://oneapi-comate.baidu-int.com/v1";
const MODEL = "DeepSeek-V4-Pro";

const client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });

const STORE_FILE = path.join(__dirname, "vector-store.json");

// ============================================================
// 语义维度定义（这就是我们的"向量空间"）
// 真实 Embedding：1536 个不可解释的维度
// 本 Demo：15 个可读的语义维度
// ============================================================
const SEMANTIC_DIMS = [
  "户外运动",     // 0
  "室内运动",     // 1
  "体育竞技",     // 2
  "技术/编程",    // 3
  "AI/机器学习",  // 4
  "职业/工作",    // 5
  "食物/饮食",    // 6
  "健康/医疗",    // 7
  "过敏/禁忌",    // 8
  "娱乐/爱好",    // 9
  "旅游/地理",    // 10
  "人际关系",     // 11
  "学习/成长",    // 12
  "NBA/篮球",    // 13
  "风险/危险",    // 14
];

// ============================================================
// 核心：生成语义向量
// ============================================================

/**
 * 用 LLM 把一段文本映射成语义特征向量
 * 每个维度的值 = 该文本与该语义维度的相关性 [0.0 - 1.0]
 */
async function getEmbedding(text) {
  const dimsStr = SEMANTIC_DIMS.map((d, i) => `${i}. ${d}`).join(", ");

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `你是一个语义分析器。给定一段文本，为以下 ${SEMANTIC_DIMS.length} 个语义维度打分（0.0 到 1.0）。
维度列表：${dimsStr}
只返回 JSON 数组，包含 ${SEMANTIC_DIMS.length} 个 0.0-1.0 之间的数字，对应每个维度的相关性。
示例输出：[0.9, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0, 0.8, 0.3, 0.0, 0.1, 0.0, 0.0]`,
      },
      { role: "user", content: `文本：${text}` },
    ],
    response_format: { type: "json_object" },
  });

  // 模型可能返回 { "scores": [...] } 或直接是数组
  const raw = response.choices[0].message.content;
  let parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  // 找第一个数组字段
  const arr = Object.values(parsed).find((v) => Array.isArray(v));
  if (arr) return arr;
  // 处理 {"0": 0.1, "1": 0.5, ...} 格式（数字键对象）
  const keys = Object.keys(parsed);
  if (keys.every((k) => !isNaN(Number(k)))) {
    return keys.sort((a, b) => Number(a) - Number(b)).map((k) => parsed[k]);
  }
  throw new Error("无法解析向量: " + raw);
}

/**
 * 余弦相似度：衡量两个向量的语义距离
 * cos(θ) = (A·B) / (|A| * |B|)
 * 值域 [0, 1]，越接近 1 = 语义越相似
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================
// 向量存储（文件持久化）
// ============================================================

function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")); }
  catch { return []; }
}

function saveStore(docs) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(docs, null, 2));
}

async function addDocument(id, text) {
  const docs = loadStore();
  if (docs.find((d) => d.id === id)) return;

  process.stdout.write(`  [向量化] "${text.slice(0, 24)}..." `);
  const vector = await getEmbedding(text);
  
  // 打印高激活维度（让你"看见"向量里装了什么）
  const topDims = vector
    .map((v, i) => ({ dim: SEMANTIC_DIMS[i], score: v }))
    .filter((d) => d.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) => `${d.dim}(${d.score.toFixed(1)})`);
  console.log(`→ 主维度: [${topDims.join(", ")}]`);

  docs.push({ id, text, vector });
  saveStore(docs);
}

/**
 * 语义检索 Top-K
 */
async function search(query, topK = 3, threshold = 0.3) {
  const docs = loadStore();
  if (docs.length === 0) return [];

  const queryVector = await getEmbedding(query);
  return docs
    .map((doc) => ({ ...doc, score: cosineSimilarity(queryVector, doc.vector) }))
    .filter((d) => d.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ============================================================
// Demo 1：核心验证——"爬山" vs "运动"
// ============================================================

async function demo1_semanticUnderstanding() {
  console.log("\n===== Demo1：语义理解验证 =====");
  console.log('关键词 "运动爱好" 能否匹配到 "爬山" 和 "游泳"？\n');

  await addDocument("sport-1", "用户喜欢爬山，经常周末去山里徒步");
  await addDocument("sport-2", "用户喜欢游泳，每周去游泳馆三次");
  await addDocument("food-1",  "用户对花生过敏，吃了会起疹子");
  await addDocument("work-1",  "用户是前端工程师，专注 React 开发");
  await addDocument("work-2",  "用户在学习 AI Agent 技术");

  console.log('\n查询："用户有什么运动爱好？"');
  const results = await search("用户有什么运动爱好", 3);
  results.forEach((r) => console.log(`  [${r.score.toFixed(3)}] ${r.text}`));

  console.log('\n查询："用户有什么健康注意事项？"');
  const results2 = await search("用户有什么健康注意事项", 2);
  results2.forEach((r) => console.log(`  [${r.score.toFixed(3)}] ${r.text}`));
}

// ============================================================
// Demo 2：关键词 vs 向量检索对比实验
// ============================================================

async function demo2_comparison() {
  console.log("\n===== Demo2：关键词 vs 向量检索对比 =====");

  const query = "他平时有什么体育运动类的爱好？";
  console.log(`查询: "${query}"\n`);

  // 关键词匹配
  const docs = loadStore();
  const texts = docs.filter(d => ["sport-1","sport-2","food-1","work-1"].includes(d.id)).map(d => d.text);
  
  function keywordSearch(q, docs) {
    const kws = q.split(/[？，。\s]+/).filter((w) => w.length > 1);
    return docs.filter(doc => kws.some(kw => doc.includes(kw)));
  }

  const kwResults = keywordSearch(query, texts);
  console.log("关键词匹配：");
  if (kwResults.length === 0) {
    console.log('  (无结果) ← "体育运动" 不在任何文档中！');
  } else {
    kwResults.forEach((r) => console.log(`  ✓ ${r}`));
  }

  console.log("\n向量检索：");
  const vecResults = await search(query, 2, 0.3);
  vecResults.forEach((r) => console.log(`  [${r.score.toFixed(3)}] ${r.text}`));
  
  console.log('\n结论：关键词找不到"爬山"/"游泳"（语义相同但词不同）');
  console.log('       向量检索通过"户外运动"维度正确命中。');
}

// ============================================================
// Demo 3：带向量检索的 RAG Agent
// ============================================================

async function demo3_ragAgent() {
  console.log("\n===== Demo3：RAG Agent（向量检索版）=====");

  // 补充更多用户画像
  await addDocument("p1", "用户叫张三，35岁，住深圳");
  await addDocument("p2", "张三是产品经理，擅长需求分析和产品规划");
  await addDocument("p3", "张三在学习 AI Agent 开发，目标成为 AI 产品经理");
  await addDocument("p4", "张三喜欢看 NBA，最喜欢的球队是湖人");

  const questions = [
    "这个人的职业背景是什么？",
    "今天去吃花生酱饼干，有什么要注意的？",
    "周末适合什么活动？",
  ];

  for (const q of questions) {
    console.log(`\n用户: ${q}`);

    const memories = await search(q, 2, 0.35);
    const context = memories.map((m) => m.text).join("\n");
    console.log(`  [RAG] 检索到 ${memories.length} 条: ${memories.map(m => `(${m.score.toFixed(2)})`).join(" ")}`);

    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `你是用户助手。相关背景：\n${context || "无"}\n简短回答（1-2句）。`,
        },
        { role: "user", content: q },
      ],
    });
    console.log(`  助手: ${resp.choices[0].message.content}`);
  }
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  if (fs.existsSync(STORE_FILE)) fs.unlinkSync(STORE_FILE);

  await demo1_semanticUnderstanding();
  await demo2_comparison();
  await demo3_ragAgent();
}

main().catch(console.error);
