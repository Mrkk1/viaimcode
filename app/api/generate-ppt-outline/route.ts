import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, provider } = await request.json()

    if (!prompt || !model || !provider) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 构建系统提示词，专门用于生成PPT大纲和统一背景样式
    const systemPrompt = `你是一位专业的演示文稿设计专家和内容策略师。你的任务是分析用户内容并创建全面、专业的PPT大纲和统一背景设计模板。

## 核心要求

### 1. 大纲检测优先级
**关键要求**：首先仔细分析用户输入，检测是否已提供详细的演示大纲
- 查找模式：编号列表、项目符号、幻灯片标题或结构化内容
- **完整大纲**：如用户提供完整大纲结构，100%使用，不修改
- **部分大纲**：如用户提供部分大纲，完全保留并仅添加必要元素
- **具体内容**：如用户提供具体幻灯片标题、内容或要点，完全按原文使用
- **用户内容绝对优先**：永不用生成内容替换或修改用户提供的大纲内容

### 2. 语言检测
- **自动检测**用户输入语言
- 中文输入→全程中文回复（标题、内容、要点、思考过程）
- 英文输入→全程英文回复
- 其他语言→使用相同语言
- **绝不混合语言**

### 3. 输出结构要求
**必须**以详细思考过程开始，包含在 <think></think> 标签中：

1. 语言检测和回复语言确认
2. 用户请求和主题分析
3. **大纲检测分析**：
   - 用户是否提供完整大纲结构
   - 用户是否提供部分大纲内容
   - 用户是否提供具体幻灯片标题或内容
   - 如何将用户大纲内容整合到最终结构中
   - **详细分析**：列出用户提供的确切大纲元素
   - **内容保护计划**：如何100%保护用户提供的内容
   - **结构适配**：如何将用户格式适配到所需JSON结构
   - **缺失元素**：需要添加哪些额外元素（如有）
4. 关键主题识别和逻辑流程
5. 数据可视化机会识别
6. 目标受众考虑
7. 演示结构规划
8. 内容深度和广度决策
9. 幻灯片进展和叙事方法
10. **统一背景设计分析**：
    - 基于内容类型确定最适合的视觉主题
    - 选择匹配主题和受众的色彩方案
    - 设计适用于所有幻灯片的一致布局框架
    - 规划增强内容而不分散注意力的视觉元素

## 现代高端背景设计理念

### 设计哲学
- **极简主义 + 商务美学**：避免过度装饰，注重空间感和呼吸感
- **视觉层次**：精简而富有层次感的设计
- **现代配色**：2025年流行配色方案（渐变蓝、科技紫、商务灰、自然绿等）
- **几何美学**：简洁几何形状和流畅曲线

### 技术要求
- **尺寸标准**：严格1280px × 720px
- **分层设计**：最多5层背景（基础层、几何层、装饰层、内容层、细节层）
- **现代CSS技术**：backdrop-filter毛玻璃效果、现代渐变、精确阴影
- **设计质量**：参考Apple、Google、Microsoft设计语言

### 主题选择
1. **科技商务风** - 深蓝渐变 + 几何线条 + 毛玻璃效果
2. **创意设计风** - 彩色渐变 + 流体形状 + 动态元素
3. **学术专业风** - 简洁白色 + 蓝色点缀 + 网格系统
4. **高端奢华风** - 深色背景 + 金色装饰 + 精致细节
5. **自然清新风** - 绿色渐变 + 有机形状 + 柔和阴影
6. **极简现代风** - 纯色背景 + 单一几何元素 + 大留白

---

## 关键输出格式要求 ⚠️

**严格按照以下格式输出，这是强制要求：**

### 第一部分：思考过程
<think>
[详细的思考分析过程，包含上述10个要点]
</think>

### 第二部分：JSON数据
===JSON_START===
{
  "title": "演示文稿标题",
  "unifiedBackground": {
    "theme": "主题名称",
    "description": "背景设计详细描述",
    "contentAreaClass": "内容区域CSS类名",
    "styleGuide": {
      "primaryColor": "主色调",
      "secondaryColor": "辅助色",
      "accentColor": "强调色",
      "backgroundColor": "背景色",
      "contentTextColor": "内容文字颜色",
      "headingTextColor": "标题文字颜色",
      "contentBackgroundColor": "内容区域背景色",
      "fontFamily": "字体系列",
      "headingFont": "标题字体样式",
      "bodyFont": "正文字体样式",
      "spacing": "间距标准",
      "contrastRatio": "对比度比例"
    }
  },
  "slides": [
    {
      "title": "页面标题",
      "content": "详细内容描述(50-100字)",
      "keyPoints": ["要点1", "要点2", "要点3"]
    }
  ]
  }
  ===JSON_END===

### 第三部分：HTML模板
===HTML_TEMPLATE_START===
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PPT Background Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .slide-container { 
            width: 1280px; 
            height: 720px; 
            position: relative; 
            overflow: hidden; 
        }
        /* 所有复杂CSS样式，包括SVG、渐变、多层背景等 */
    </style>
</head>
<body>
    <div class="slide-container">
        <!-- 多层背景设计 -->
        <div class="bg-layer-1"></div>
        <div class="bg-layer-2"></div>
        <div class="bg-layer-3"></div>
        <!-- 内容区域 -->
        <div class="content-area">
            <!-- 内容将在这里插入 -->
        </div>
    </div>
</body>
  </html>
  ===HTML_TEMPLATE_END===

## 格式说明 📋

1. **必须使用分隔符**：===JSON_START===、===JSON_END===、===HTML_TEMPLATE_START===、===HTML_TEMPLATE_END===
2. **JSON部分**：仅包含简单文本和数组，无复杂HTML或CSS
3. **HTML部分**：包含所有复杂样式和布局代码
4. **完整性**：确保HTML模板完整，所有CSS样式格式正确
5. **SVG编码**：SVG数据URL必须正确编码（%22代替引号，%20代替空格，%23代替#）
6. **层级管理**：Z-index值正确分配，创建清晰层级
7. **有效性**：整个响应必须是有效格式

## 用户大纲处理示例

如用户提供："1. 介绍公司背景 2. 产品优势分析 3. 市场前景展望 4. 总结与建议"

则JSON应包含：
{
  "slides": [
    {
      "title": "介绍公司背景",
      "content": "详细介绍公司的历史、规模、业务范围等背景信息",
      "keyPoints": ["公司历史", "业务范围", "企业规模"]
    },
    {
      "title": "产品优势分析", 
      "content": "深入分析产品的核心优势、技术特点、竞争优势等",
      "keyPoints": ["技术优势", "成本优势", "服务优势"]
    }
    // ... 其他幻灯片
  ]
}

**用户原始大纲结构和内容必须100%保留。**

---

**⚠️ 最终提醒：严格按照上述三部分格式输出，使用正确的分隔符标记，确保JSON和HTML部分完整且格式正确！**`

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        let isEnding = false
        
        const safeEnqueue = (data: string) => {
          if (!isClosed && !isEnding && controller.desiredSize !== null) {
            try {
              controller.enqueue(new TextEncoder().encode(data + '\n'))
            } catch (e) {
              console.error('Controller enqueue error:', e)
              if (!isClosed) {
                isClosed = true
              }
            }
          }
        }

        const safeClose = () => {
          if (!isClosed && !isEnding) {
            try {
              isEnding = true
              controller.close()
              isClosed = true
            } catch (e) {
              console.error('Controller close error:', e)
              isClosed = true
            }
          }
        }

        try {
          let response;
          
          if (provider === 'kimi' || provider === 'deepseek') {
           
              response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
                },
                body: JSON.stringify({
                  model: model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                  ],
                  temperature: 0.4,
                  max_tokens: 6000, // 大幅增加token限制以支持超复杂背景HTML
                  stream: true,
                }),
              })
            }
          else if (provider === 'openai_compatible') {
            response = await fetch(`${process.env.OPENAI_COMPATIBLE_BASE_URL}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_COMPATIBLE_API_KEY}`,
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 8000, // 大幅增加token限制以支持超复杂背景HTML
                stream: true,
              }),
            })
          } else {
            const errorData = JSON.stringify({ 
              type: 'error',
              content: 'Unsupported provider for PPT generation' 
            })
            safeEnqueue(errorData)
            safeClose()
            return
          }

          if (!response.ok) {
            const errorData = JSON.stringify({ 
              type: 'error',
              content: 'Failed to generate outline' 
            })
            safeEnqueue(errorData)
            safeClose()
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            const errorData = JSON.stringify({ 
              type: 'error',
              content: 'Stream could not be read' 
            })
            safeEnqueue(errorData)
            safeClose()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''
          
          try {
            while (true) {
              if (isClosed || isEnding) {
                break
              }
              
              const { done, value } = await reader.read()
              
              if (done) break
              
              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk
              
              // 处理SSE格式的数据
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              
              for (const line of lines) {
                if (isClosed || isEnding) {
                  break
                }
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') continue
                  
                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content
                    
                    if (content) {
                      // 发送流式内容
                      const sseData = JSON.stringify({
                        type: 'content',
                        content: content
                      })
                      safeEnqueue(sseData)
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e)
                    // 继续处理其他行，不要因为一个解析错误就停止
                  }
                }
              }
            }
          } finally {
            try {
              reader.releaseLock()
            } catch (e) {
              console.error('Error releasing reader lock:', e)
            }
          }
          
        } catch (error) {
          console.error('Error in outline generation:', error)
          if (!isClosed && !isEnding) {
            const errorData = JSON.stringify({ 
              type: 'error', 
              content: `大纲生成失败: ${error}` 
            })
            safeEnqueue(errorData)
          }
        } finally {
          safeClose()
        }
      },
      
      cancel() {
        // 处理客户端取消请求
        console.log('Outline stream cancelled by client')
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error generating PPT outline:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 