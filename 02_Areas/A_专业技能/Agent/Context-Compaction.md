# 上下文压缩（Context Compaction）

## 一、问题

Agent 多轮对话的 `messages` 数组每轮都在增长：

```javascript
[
  { role: "system", content: "..." },   // 第1轮
  { role: "user", content: "..." },     // 第1轮
  { role: "assistant", content: "..." },// 第1轮
  { role: "user", content: "..." },     // 第2轮
  { role: "assistant", content: "..." },// 第2轮
  // ... 第 50 轮时 100+ 条消息，Token 爆炸
]
```

后果：
1. **截断**：超过模型上下文窗口（如 128K），早期信息被丢弃
2. **费用**：每轮都重发全部历史，API 费用线性增长
3. **性能**：大上下文推理变慢

解决方案：**不存全量历史，用摘要替代旧消息**。

---

## 二、三种方案

### 方案一：滑动窗口（最简）

只保留最近 N 条消息，旧消息直接丢弃。

```javascript
// 简单粗暴
messages = messages.slice(-N);
```

**优点**：零额外成本，零延迟
**缺点**：丢信息——用户第1轮说的名字在第11轮后消失

### 方案二：自动摘要（推荐）

用 LLM 总结旧消息，保留语义信息。

```
[旧消息] → LLM 摘要 → "用户叫张三，35岁，深圳产品经理，喜欢爬山..."
```

旧消息被移除，摘要嵌入 System Prompt。最近 N 条保持原样。

**优点**：保留关键信息的同时控制 Token
**缺点**：多一次 LLM 调用（摘要本身花费 Token）

### 方案三：分层记忆（进阶）

三种记忆并存：

| 层 | 存储 | 内容 | 时态 |
|---|---|---|---|
| 摘要层 | System Prompt 嵌入 | 用户画像 + 已完成任务 | 累积更新 |
| 窗口层 | 最近 N 条原消息 | 当前对话 | 滑动更新 |
| 工具层 | 只在消息中保留 | 最近工具调用结果 | 临时的 |

---

## 三、实现模板

```javascript
class ContextManager {
  constructor(config = { maxMessages: 12, keepRecent: 6 }) {
    this.messages = [];
    this.summary = "";
    this.config = config;
  }

  // 判断是否需要压缩
  needsCompaction() {
    return this.messages.length > this.config.maxMessages;
  }

  // 构建发送给 LLM 的消息（摘要 + 最近窗口）
  buildMessages(systemPrompt) {
    const fullSystem = this.summary
      ? `${systemPrompt}\n\n【历史摘要】\n${this.summary}`
      : systemPrompt;
    return [
      { role: "system", content: fullSystem },
      ...this.messages.slice(-this.config.keepRecent),
    ];
  }

  // 执行压缩
  async compact() {
    const oldMsgs = this.messages.slice(0, -this.config.keepRecent);
    const recent = this.messages.slice(-this.config.keepRecent);

    const oldText = oldMsgs
      .map(m => `[${m.role}] ${m.content}`)
      .join("\n");

    const resp = await llm.chat([
      {
        role: "system",
        content: "总结以下对话，保留：用户信息、已完成任务、关键决策",
      },
      { role: "user", content: oldText },
    ]);

    this.summary = this.summary
      ? `${this.summary}\n${resp.content}`
      : resp.content;

    this.messages = recent;
  }
}
```

---

## 四、触发策略

按顺序依次检查，满足任一即压缩：

1. **消息数阈值**：`messages.length > maxMessages`
2. **Token 估算阈值**：`estimatedTokens > maxTokens`
3. **轮次阈值**：`turnCount > maxTurns`
4. **空闲触发**：用户长时间无操作时后台压缩

通常组合 1 + 2，兼顾响应性和准确性。

---

## 五、实测数据（本项目 Demo）

```
触发压缩：14 条 → 摘要(153字) + 6 条
Token 估算：1574 → 759（↓ 52%）

第二次压缩：9 条 → 摘要合并 + 4 条
最终传参：5 条（原始 15 条）→ Token 节省 74%
```

摘要质量验证——压缩后 LLM 能正确回答基于早期对话的问题：
```
用户: "我是说我叫张三，你还记得吗？"
助手: "你叫张三。" ✓ （名字在摘要中保留）
```

---

## 六、注意事项

**摘要漂移**：多次压缩后摘要可能失真。对策：保留原始摘要 + 追加新摘要（不覆盖），格式：
```
[早期] 用户信息：张三，深圳...
[最新] 讨论了梧桐山登山路线...
```

**关键信息遗漏**：摘要可能丢掉你认为重要的细节。对策：
- 固定摘要模板（用户信息 / 任务 / 决策 三个分区）
- 对关键消息打标记（`important: true`），压缩时优先保留

**摘要花费 Token**：压缩本身调用 LLM，消耗约 200-500 Token。只在确实超出阈值时触发，不要每轮都压缩。

**EMPTY SUMMARY**：如果新旧消息差异不大（都是聊天），可以降低 maxMessages 更早压缩，或者提升 keepRecent。压缩太频繁还不如多保留几轮原句。