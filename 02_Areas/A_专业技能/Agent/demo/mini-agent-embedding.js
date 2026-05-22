/**
 * mini-agent-embedding.js
 *
 * 演示真正的语义向量检索（Embedding-based RAG）
 *
 * 核心概念：
 * - Embedding：把文本变成高维向量（1536维），语义相近 → 向量相近
 * - 余弦相似度：两个向量夹角越小，语义越接近（值越接近1）
 * - 与关键词匹配的区别："爬山" 和 "运动" 关键词不同，但向量距离很近
 *
 * 文件结构：
 * - vector-store.json：本地持久化向量库（id, text, vector, metadata）
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
const EMBEDDING_MODEL = "text-embedding-3-small";

const chatClient = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
const embeddingClient = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });

const STORE_FILE = path.join(__dirname, "vector-store.json");

// ============================================================
// 向量存储核心实现
// ============================================================

/**
 * 加载本地向量库
 */
function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * 持久化向量库
 */
function saveStore(docs) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(docs, null, 2));
}

/**
 * 获取文本的 Embedding 向量
 * @returns {number[]} 1536 维向量
 */
async function getEmbedding(text) {
  const res = await embeddingClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/**
 * 余弦相似度：计算两个向量的语义距离
 * 值域 [-1, 1]，越接近 1 越相似
 *
 * 公式：cos(θ) = (A·B) / (|A| * |B|)
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 向量库：添加文档
 */
async function addDocument(id, text, metadata = {}) {
  const docs = loadStore();
  // 避免重复
  if (docs.find((d) => d.id === id)) return;

  console.log(`  [Embedding] 生成向量: "${text.slice(0, 30)}..."`);
  const vector = await getEmbedding(text);

  docs.push({ id, text, vector, metadata });
  saveStore(docs);
}

/**
 * 向量库：语义检索 Top-K
 * @param {string} query - 查询文本
 * @param {number} topK - 返回最相关的 K 条
 * @param {number} threshold - 相似度阈值（低于此值不返回）
 */
async function search(query, topK = 3, threshold = 0.3) {
  const docs = loadStore();
  if (docs.length === 0) return [];

  const queryVector = await getEmbedding(query);

  const scored = docs.map((doc) => ({
    ...doc,
    score: cosineSimilarity(queryVector, doc.vector),
  }));

  return scored
    .filter((d) => d.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ============================================================
// Demo 1：验证语义理解（"爬山" vs "运动"）
// ============================================================

async function demo1_semanticUnderstanding() {
  console.log("\n===== Demo1：语义理解验证 =====");
  console.log("问题：关键词不同但语义相近的词，向量距离是否更近？\n");

  // 写入几条测试数据
  await addDocument("sport-1", "用户喜欢爬山，经常周末去山里徒步");
  await addDocument("sport-2", "用户喜欢游泳，每周去游泳馆三次");
  await addDocument("food-1", "用户对花生过敏，吃了会起疹子");
  await addDocument("work-1", "用户是前端工程师，专注 React 开发");
  await addDocument("work-2", "用户在学习 AI Agent 技术");

  // 用 "户外运动" 查询——关键词里没有 "爬山" 或 "游泳"
  console.log('查询："喜欢什么运动"');
  const results1 = await search("用户喜欢什么运动", 3);
  results1.forEach((r) => {
    console.log(`  [${r.score.toFixed(4)}] ${r.text}`);
  });

  // 用 "技术方向" 查询
  console.log('\n查询："技术方向"');
  const results2 = await search("用户的技术方向是什么", 2);
  results2.forEach((r) => {
    console.log(`  [${r.score.toFixed(4)}] ${r.text}`);
  });

  // 用 "健康" 查询
  console.log('\n查询："健康注意事项"');
  const results3 = await search("用户有什么健康问题需要注意", 2);
  results3.forEach((r) => {
    console.log(`  [${r.score.toFixed(4)}] ${r.text}`);
  });
}

// ============================================================
// Demo 2：Embedding-based RAG Agent
// ============================================================

async function demo2_ragAgent() {
  console.log("\n===== Demo2：真正的 RAG Agent =====");

  // 用户画像数据
  const userProfile = [
    { id: "p1", text: "用户叫张三，35岁，住深圳" },
    { id: "p2", text: "张三是产品经理，擅长需求分析和产品规划" },
    { id: "p3", text: "张三喜欢爬山，每周末都会去山里徒步" },
    { id: "p4", text: "张三在学习 AI Agent 开发，目标成为 AI 产品经理" },
    { id: "p5", text: "张三对花生过敏，外出吃饭要特别注意" },
    { id: "p6", text: "张三喜欢看 NBA，最喜欢的球队是湖人" },
  ];

  // 写入向量库
  console.log("写入用户画像到向量库...");
  for (const item of userProfile) {
    await addDocument(item.id, item.text);
  }

  // 模拟对话：用向量检索替代全量注入
  const questions = [
    "这个用户平时有什么爱好？",
    "他的职业背景是什么？",
    "今天要去吃火锅，有什么需要注意的？",
  ];

  for (const question of questions) {
    console.log(`\n用户: ${question}`);

    // 1. 检索相关记忆
    const memories = await search(question, 2, 0.4);
    const context = memories.map((m) => m.text).join("\n");

    console.log(`  [RAG 检索到] ${memories.length} 条相关记忆`);
    memories.forEach((m) => console.log(`    (${m.score.toFixed(3)}) ${m.text}`));

    // 2. 只把相关记忆注入 System Prompt（不是全量数据）
    const response = await chatClient.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `你是用户的个人助手。以下是关于用户的相关背景信息：
---
${context || "暂无相关信息"}
---
基于以上信息回答用户问题，保持简短（1-2句话）。`,
        },
        { role: "user", content: question },
      ],
    });

    console.log(`  助手: ${response.choices[0].message.content}`);
  }
}

// ============================================================
// Demo 3：对比实验——关键词 vs 向量检索
// ============================================================

async function demo3_comparison() {
  console.log("\n===== Demo3：关键词匹配 vs 向量检索对比 =====");

  const docs = [
    "用户喜欢爬山，经常去山里徒步",
    "用户喜欢游泳，每周去游泳馆",
    "用户对花生过敏",
    "用户是前端工程师",
  ];

  const query = "这个人有什么体育运动爱好？";

  console.log(`查询: "${query}"\n`);

  // 关键词匹配
  function keywordSearch(query, docs) {
    const keywords = query.split(/[，。？\s]+/).filter((w) => w.length > 1);
    return docs
      .map((doc) => {
        const hits = keywords.filter((kw) => doc.includes(kw)).length;
        return { doc, score: hits };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  const kwResults = keywordSearch(query, docs);
  console.log("关键词匹配结果：");
  if (kwResults.length === 0) {
    console.log("  (无匹配) → 找不到任何结果！");
  } else {
    kwResults.forEach((r) => console.log(`  [命中${r.score}] ${r.doc}`));
  }

  // 向量检索
  // 先把这几条数据写入
  for (let i = 0; i < docs.length; i++) {
    await addDocument(`cmp-${i}`, docs[i]);
  }
  const vecResults = await search(query, 3, 0.3);
  console.log("\n向量检索结果：");
  vecResults.forEach((r) => console.log(`  [${r.score.toFixed(4)}] ${r.text}`));

  console.log("\n结论：关键词找不到「爬山」和「游泳」，向量检索通过语义正确命中。");
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  // 每次运行前清空向量库，保证演示数据干净
  if (fs.existsSync(STORE_FILE)) fs.unlinkSync(STORE_FILE);

  await demo1_semanticUnderstanding();
  await demo2_ragAgent();
  await demo3_comparison();
}

main().catch(console.error);
