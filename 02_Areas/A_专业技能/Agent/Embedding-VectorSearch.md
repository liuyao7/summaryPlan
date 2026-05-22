# Embedding 与向量检索

## 一、什么是 Embedding

Embedding（向量化）是把文本映射到高维向量空间的过程。

```
"用户喜欢爬山" → [0.9, 0.0, 0.0, 0.0, ..., 0.8, 0.0, ...]  （1536维）
"用户喜欢游泳" → [0.0, 0.9, 0.0, 0.0, ..., 0.8, 0.0, ...]  （1536维）
"用户对花生过敏" → [0.0, 0.0, 0.0, 0.0, ..., 0.0, 1.0, ...]
```

核心性质：**语义相近的文本，向量在空间中距离更近**。

---

## 二、与关键词匹配的根本区别

| 特性 | 关键词匹配 | 向量检索 |
|------|-----------|---------|
| 查询 "体育运动爱好" | 找不到"爬山"（词不同） | 正确命中"爬山""游泳" |
| 查询 "健康注意事项" | 找不到"花生过敏"（词不同） | 正确命中 |
| 同义词 | ❌ 必须词相同 | ✅ 语义相同即可 |
| 上下位关系 | ❌ "运动" ≠ "爬山" | ✅ "爬山" 属于 "运动"，向量相近 |
| 多语言 | ❌ 精确匹配 | ✅ 跨语言语义匹配 |

**实测数据（本项目 Demo 结果）**：
```
查询："他平时有什么体育运动类的爱好？"
关键词：(无结果) ← "体育运动" 不在任何文档中！
向量：[0.691] 用户喜欢爬山，经常周末去山里徒步
     [0.583] 用户喜欢游泳，每周去游泳馆三次
```

---

## 三、余弦相似度

衡量两个向量语义距离的数学工具。

```javascript
// cos(θ) = (A·B) / (|A| * |B|)
// 值域 [0, 1]，越接近 1 = 语义越相似
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

为什么用余弦而不是欧氏距离？余弦度量**方向角**，对向量长度不敏感——短句和长句表达同一语义时，方向相同但模长不同，余弦相似度依然准确。

---

## 四、RAG（检索增强生成）架构

RAG 解决的问题：LLM 上下文有限，不能把所有知识都塞进 System Prompt。

```
写入阶段（Indexing）：
  文本 → Embedding API → 向量 → 向量库（文件/Chroma/Qdrant）

检索阶段（Retrieval）：
  用户问题 → Embedding API → 查询向量
  查询向量 → 余弦相似度 → Top-K 相关文档

生成阶段（Generation）：
  Top-K 文档 → System Prompt + 用户问题 → LLM → 回答
```

### RAG vs 全量注入对比

| 方案 | Token 消耗 | 准确性 | 适用场景 |
|------|-----------|-------|---------|
| 全量注入（MEMORY.md） | O(n)，线性增长 | 高（模型看全部） | < 50 条记录 |
| RAG 检索（Top-K） | O(k)，常数 | 取决于检索质量 | 大规模知识库 |

---

## 五、向量存储的本质

向量库的最小数据结构：

```javascript
// 每条记录 = { id, text, vector, metadata }
{
  id: "sport-1",
  text: "用户喜欢爬山，经常周末去山里徒步",
  vector: [0.9, 0.0, 0.1, 0.0, ...],  // 1536维 float[]
  metadata: { created_at: "2026-05-22", tags: ["hobby"] }
}
```

**真实向量数据库**（Chroma、Qdrant、Pinecone、Weaviate）在这个基础上额外提供：
- 高效近似最近邻（ANN）算法（HNSW、IVF等）——百万级向量毫秒检索
- 元数据过滤（先按 tag 过滤，再做向量检索）
- 持久化和集群

本地小规模（< 10K 条）：文件 + 遍历余弦相似度足够。

---

## 六、Embedding 模型选型

| 模型 | 维度 | 特点 |
|------|------|------|
| `text-embedding-3-small` | 1536 | OpenAI，性价比高，推荐 |
| `text-embedding-3-large` | 3072 | OpenAI，效果最好，贵 |
| `text-embedding-ada-002` | 1536 | OpenAI 旧版，已被 v3 supersede |
| `nomic-embed-text` | 768 | 开源，Ollama 本地运行，免费 |
| `bge-large-zh-v1.5` | 1024 | 中文最佳开源模型（BAAI） |

**选择原则**：
- 云端调用 → `text-embedding-3-small`（质量/成本最优）
- 本地/隐私 → `nomic-embed-text`（via Ollama）
- 中文场景 → `bge-large-zh-v1.5`

---

## 七、本 Demo 的特殊实现

`mini-agent-embedding.js` 使用 **LLM 生成可解释语义向量**，而非真实 Embedding 模型：

```javascript
// 15 个可读语义维度（真实模型是 1536 个不可解释维度）
const SEMANTIC_DIMS = ["户外运动", "室内运动", "技术/编程", "健康/医疗", "过敏/禁忌", ...];

// 让 LLM 为每个维度打分 [0, 1]
// 结果："爬山" → [0.9, 0.0, 0.0, ...] = 主要激活"户外运动"维度
```

**意义**：让你能「看见」向量里装了什么。真实 Embedding 数学完全相同，只是维度不可读。

---

## 八、RAG Agent 实现模板

```javascript
// 1. 写入阶段：每条知识都向量化
async function addDocument(id, text) {
  const vector = await getEmbedding(text);  // 调 Embedding API
  store.push({ id, text, vector });
  saveStore(store);
}

// 2. 检索阶段：查询语义最近的 K 条
async function search(query, topK = 3) {
  const queryVec = await getEmbedding(query);
  return store
    .map(doc => ({ ...doc, score: cosineSimilarity(queryVec, doc.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// 3. 生成阶段：只把相关记忆注入 Prompt
async function ragChat(userMessage) {
  const memories = await search(userMessage, 3);
  const context = memories.map(m => m.text).join("\n");
  
  return llm.chat([
    { role: "system", content: `相关背景：\n${context}` },
    { role: "user", content: userMessage },
  ]);
}
```