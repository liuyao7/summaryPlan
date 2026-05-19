// calculator-server.js — MCP 计算服务，独立运行
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "calculator-service",
  version: "1.0.0",
});

server.registerTool(
  "calculator",
  {
    description:
      "执行数学计算。当用户要求做算术、加法、减法、乘法、除法、求百分比、算总和等时，必须调用此工具，不要心算。",
    inputSchema: {
      expression: z
        .string()
        .describe("四则运算表达式，如 '3+5*2'、'(100-30)/2'。支持 + - * / ()"),
    },
  },
  async ({ expression }) => {
    try {
      // 安全校验：只允许数字和运算符
      if (!/^[\d+\-*/().%\s]+$/.test(expression)) {
        return {
          content: [
            { type: "text", text: `表达式包含非法字符：${expression}` },
          ],
        };
      }
      const result = Function(`"use strict"; return (${expression})`)();
      return {
        content: [
          {
            type: "text",
            text: `${expression} = ${result}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `计算失败：${e.message}` }],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("计算器 MCP Server 已启动");