import { LLMProvider } from './providers/config';

// 联网搜索工具定义
export const WEB_SEARCH_TOOL = {
  type: "builtin_function" as const,
  function: {
    name: "$web_search",
  },
};

// 通用搜索结果接口
export interface SearchResult {
  success: boolean;
  content?: string;
  error?: string;
  tokensUsed?: number;
}

// 搜索工具实现函数
export function searchImpl(args: Record<string, any>): Record<string, any> {
  /**
   * 在使用 Kimi API 提供的 $web_search 工具时，只需要原封不动返回 args 即可，
   * 不需要额外的处理逻辑。
   * 
   * 如果想使用其他模型并保留联网搜索功能，可以在这里修改实现（例如调用搜索引擎和获取网页内容等），
   * 函数签名不变，这样可以最大程度保证兼容性。
   */
  console.log('searchImpl被调用，参数:', args);
  const result = args;
  console.log('searchImpl返回结果:', result);
  return result;
}

// 检查是否支持联网搜索
export function supportsWebSearch(provider: string): boolean {
  // 目前只有 Kimi 和 DeepSeek 支持内置的联网搜索
  return provider === 'kimi' || provider === 'deepseek';
}

// 处理工具调用响应
export function handleToolCallResponse(
  toolCall: any,
  toolCallName: string
): { role: string; tool_call_id: string; name: string; content: string } {
  let toolResult: any;
  
  if (toolCallName === "$web_search") {
    toolResult = searchImpl(JSON.parse(toolCall.function.arguments));
  } else {
    toolResult = { error: `未知的工具: ${toolCallName}` };
  }

  return {
    role: "tool",
    tool_call_id: toolCall.id,
    name: toolCallName,
    content: JSON.stringify(toolResult),
  };
}

// 提取搜索内容使用的Token数量
export function extractSearchTokens(toolCallArgs: Record<string, any>): number {
  return toolCallArgs?.usage?.total_tokens || 0;
}

// 为不同的PPT生成阶段构建搜索提示词
export function buildSearchPrompt(
  stage: 'outline' | 'thinking' | 'slide' | 'html',
  originalPrompt: string,
  enableWebSearch: boolean
): string {
  if (!enableWebSearch) {
    return originalPrompt;
  }

  const searchInstructions = {
    outline: `
在生成PPT大纲之前，请先搜索相关的最新信息和数据，以确保内容的准确性和时效性。
特别关注：
- 最新的行业趋势和数据
- 权威机构的报告和统计
- 最新的政策法规变化
- 技术发展的最新动态

搜索完成后，基于搜索结果生成PPT大纲。`,

    thinking: `
在进行内容布局分析时，请先基于具体的幻灯片主题和内容进行精准的联网搜索，获取最新、最准确的信息。

搜索策略：
1. 首先识别幻灯片的核心主题和关键概念
2. 针对主题搜索最新的数据、趋势和发展动态
3. 查找权威来源的统计数据和研究报告
4. 搜索相关的最佳实践案例和成功经验
5. 获取专家观点和行业分析

搜索完成后，基于搜索到的最新信息进行内容布局规划，确保内容的准确性、时效性和权威性。`,

    slide: `
在生成幻灯片内容时，请先搜索最新的相关信息，确保内容的准确性和权威性。
重点搜索：
- 最新的数据和统计
- 权威来源的信息
- 实际案例和应用
- 专家观点和分析

基于搜索结果生成具体的幻灯片内容。`,

    html: `
在生成HTML代码时，请先搜索相关的最新信息和最佳实践，确保生成的内容准确且符合最新标准。
需要搜索：
- 最新的数据和信息
- 权威来源的内容
- 设计最佳实践
- 技术实现标准

基于搜索结果生成HTML代码。`
  };

  return `${searchInstructions[stage]}

原始需求：${originalPrompt}`;
}

// 为消息添加联网搜索工具
export function addWebSearchTool(messages: any[], enableWebSearch: boolean) {
  if (!enableWebSearch) {
    return messages;
  }

  // 在系统消息中添加联网搜索说明
  const systemMessage = messages.find(msg => msg.role === 'system');
  if (systemMessage) {
    systemMessage.content += `

联网搜索功能已启用。当需要最新信息时，请主动使用联网搜索功能获取准确和最新的数据。
搜索策略：
1. 优先搜索权威机构和官方来源的信息
2. 关注最新的数据、趋势和发展动态
3. 验证信息的准确性和时效性
4. 整合多个来源的信息以确保全面性

请根据内容需要主动进行联网搜索，确保生成的PPT内容准确、最新且具有权威性。`;
  }

  return messages;
} 