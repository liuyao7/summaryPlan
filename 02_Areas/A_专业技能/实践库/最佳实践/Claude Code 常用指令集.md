# Claude Code 常用指令集

Claude Code 是一个强大的 AI 编程助手，掌握常用指令可以大幅提升开发效率。

## 基础导航命令

### 代码库导航
- `show me the file structure` - 显示项目文件结构
- `what files are in this directory` - 查看目录内容
- `find files matching pattern` - 按模式搜索文件
- `search for text in code` - 在代码中搜索文本

### 文件搜索
- `find all .test.ts files` - 查找所有测试文件
- `search for "TODO" in codebase` - 搜索待办事项
- `where is ComponentX defined` - 查找组件定义位置
- `show me the API endpoints` - 显示所有 API 端点

### 快速跳转
- `open file.ts` - 打开文件
- `go to line 42` - 跳转到指定行
- `navigate to function definition` - 跳转到函数定义

## 代码操作命令

### 代码编辑
- `refactor this function` - 重构当前函数
- `rename variable "oldName" to "newName"` - 重命名变量
- `extract this code into a function` - 提取代码为函数
- `inline this function` - 内联函数
- `simplify this logic` - 简化逻辑
- `add error handling` - 添加错误处理
- `format this file` - 格式化文件

### 重构
- `convert to async/await` - 转换为 async/await
- `use ES6 features` - 使用 ES6 特性
- `modernize this code` - 现代化代码
- `split into smaller functions` - 拆分为小函数
- `improve readability` - 提升可读性

### 生成代码
- `create a new React component` - 创建新 React 组件
- `add unit tests for this file` - 添加单元测试
- `generate API client` - 生成 API 客户端
- `create a migration` - 创建数据库迁移
- `add TypeScript types` - 添加 TypeScript 类型

## 代码分析命令

### 代码理解
- `explain this code` - 解释代码
- `what does this function do` - 说明函数功能
- `analyze the codebase structure` - 分析代码库结构
- `identify code smells` - 识别代码异味
- `explain the architecture` - 解释架构

### 依赖分析
- `show dependencies` - 显示依赖关系
- `find unused imports` - 查找未使用的导入
- `check for circular dependencies` - 检查循环依赖
- `update dependencies` - 更新依赖

### 性能分析
- `find performance bottlenecks` - 查找性能瓶颈
- `optimize this function` - 优化函数
- `reduce bundle size` - 减小打包体积
- `analyze memory usage` - 分析内存使用

## 调试与测试

### 运行命令
- `run the tests` - 运行测试
- `build the project` - 构建项目
- `start the dev server` - 启动开发服务器
- `deploy to production` - 部署到生产环境

### 调试辅助
- `find the bug` - 查找 Bug
- `explain the error` - 解释错误
- `add debug logs` - 添加调试日志
- `trace the execution flow` - 追踪执行流程

### 测试生成
- `write tests for this component` - 为组件编写测试
- `add edge case tests` - 添加边界测试
- `generate test data` - 生成测试数据
- `check test coverage` - 检查测试覆盖率

## 最佳实践提示

### 高效使用技巧
1. **明确需求**：清晰地描述你想要做什么
2. **提供上下文**：说明相关的文件和背景信息
3. **分步执行**：将复杂任务拆分为小步骤
4. **验证结果**：每次操作后检查是否符合预期
5. **迭代改进**：根据反馈调整指令

### 常用表达方式
- "How do I..." - 如何做...
- "Help me understand..." - 帮我理解...
- "What's the best way to..." - 最好的方式是...
- "Refactor this to be more..." - 重构为更...
- "Generate code for..." - 生成...的代码

### 避免模糊指令
- ❌ "Fix the code"
- ✅ "Fix the bug where the user can't log in when password contains special characters"

- ❌ "Make it better"
- ✅ "Optimize this function to reduce time complexity from O(n²) to O(n log n)"

## 快捷键速查表

### 常用快捷键
| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + K` | 打开 Claude Code |
| `Cmd/Ctrl + Enter` | 发送指令 |
| `Cmd/Ctrl + /` | 快速提问 |
| `Tab` | 接受建议 |
| `Esc` | 取消操作 |

### 模式切换
- **Chat 模式**：对话式交互，适合探索和咨询
- **Edit 模式**：直接编辑代码，适合快速修改
- **Agent 模式**：自主执行任务，适合复杂操作

## 进阶技巧

### Context 管理
- `add this file to context` - 添加文件到上下文
- `remove from context` - 从上下文移除
- `show current context` - 显示当前上下文
- `limit context to...` - 限制上下文范围

### 工作流自动化
- `create a script for...` - 创建自动化脚本
- `set up CI/CD pipeline` - 设置 CI/CD 流水线
- `generate deployment config` - 生成部署配置

### 跨文件操作
- `apply this change to all .ts files` - 应用更改到所有 TS 文件
- `find and replace in multiple files` - 多文件查找替换
- `refactor across the project` - 项目范围重构

---

**提示**：使用自然语言清晰地描述你的需求，Claude Code 会理解并执行相应的操作。多使用具体的技术术语和明确的期望结果，可以获得更准确的响应。