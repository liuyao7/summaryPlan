// weather-server.js — MCP 天气服务，独立运行
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 模拟天气数据库（真实场景这里连 API）
const weatherDB = {
  "北京": { 天气: "小雨", 温度: "18°C", 湿度: "80%" },
  "上海": { 天气: "多云", 温度: "25°C", 湿度: "60%" },
  "深圳": { 天气: "晴天", 温度: "30°C", 湿度: "50%" },
  "杭州": { 天气: "阴天", 温度: "22°C", 湿度: "70%" },
  "成都": { 天气: "阵雨", 温度: "20°C", 湿度: "85%" },
};

// 创建 MCP Server
const server = new McpServer({
  name: "weather-service",
  version: "1.0.0",
});

// 注册工具：查询天气
server.registerTool(
  "get_weather",
  {
    description:
      "查询指定城市当天的实时天气。当用户问天气、气温、下雨、带伞等问题时必须调用。",
    inputSchema: {
      city: z.string().describe("中文城市名称，如'北京'"),
    },
  },
  async ({ city }) => {
    const data = weatherDB[city];
    if (!data) {
      return {
        content: [{ type: "text", text: `未找到城市"${city}"的天气数据` }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `${city}天气：${data.天气}，温度${data.温度}，湿度${data.湿度}`,
        },
      ],
    };
  }
);

// 启动 Server（通过 stdio 与 Client 通信）
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("天气 MCP Server 已启动");