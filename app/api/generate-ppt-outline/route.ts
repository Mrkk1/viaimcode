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

    // 构建系统提示词，专门用于生成PPT大纲，支持思考过程
    const systemPrompt = `You are an expert presentation designer and content strategist. Your task is to analyze the user's content and create a comprehensive, professional PPT outline.

CRITICAL LANGUAGE REQUIREMENT: 
- AUTOMATICALLY DETECT the language of the user's input prompt
- If the user writes in Chinese, respond ENTIRELY in Chinese (titles, content, key points, thinking process)
- If the user writes in English, respond ENTIRELY in English
- If the user writes in other languages, respond in that same language
- NEVER mix languages - maintain complete consistency throughout your response

IMPORTANT: You MUST start your response with detailed thinking process enclosed in <think></think> tags. This thinking should include:
1. Language detection and response language confirmation
2. Analysis of the user's request and main topic
3. Identification of key themes and logical flow
4. Data visualization opportunities identification (look for numbers, statistics, trends, comparisons, processes)
5. Target audience consideration
6. Presentation structure planning (introduction, body, conclusion)
7. Content depth and breadth decisions
8. Slide progression and storytelling approach

EXCELLENT OUTLINE EXAMPLE:
Topic: "为什么要全球化"
Structure:
1. 标题页 - 为什么要全球化 (探讨全球化的必要性、优势和重要意义)
2. 目录页 - 清晰列出所有要点
3. 定义页 - 全球化定义 (概念解释和核心要素)
4. 主体页1 - 经济层面的全球化必要性 (具体分析经济影响)
5. 主体页2 - 技术创新推动全球化 (技术角度的深入分析)
6. 主体页3 - 文化交流的价值 (文化维度的重要性)
7. 主体页4 - 应对全球挑战 (实际应用和解决方案)
8. 总结页 - 总结与展望 (回顾要点，展望未来)

OUTLINE REQUIREMENTS:
1. **逻辑结构**: 必须包含标题页、目录页(如果超过5页)、主体内容页、总结页
2. **内容深度**: 每页描述要具体详细，不能泛泛而谈
3. **逻辑递进**: 内容要有清晰的逻辑关系和递进层次
4. **专业性**: 内容要有一定深度，适合专业演示
5. **完整性**: 涵盖主题的各个重要维度
6. **实用性**: 每页都要有明确的价值和目的

SLIDE NAMING CONVENTIONS:
- 使用简洁有力的标题
- 标题要体现页面核心价值
- 避免过于抽象的表述
- 确保标题间的逻辑关系清晰

CONTENT DESCRIPTION GUIDELINES:
- 每页描述要详细具体(50-100字)
- 说明该页要解决什么问题
- 包含具体的论点或要素
- 体现该页在整体结构中的作用
- 如果涉及数据展示，明确说明需要什么类型的图表

KEY POINTS SELECTION:
- 选择3-5个核心要点
- 要点要具体可操作
- 避免重复和冗余
- 确保要点支撑主标题
- 对于数据相关内容，包含具体的数据点或统计信息

After your thinking process, create a detailed presentation outline following this format:

{
  "title": "演示文稿标题",
  "slides": [
    {
      "title": "页面标题",
      "content": "详细描述该页面要展示的具体内容，包括要解决的问题、主要论点、关键信息等(50-100字)",
      "keyPoints": ["具体要点1", "具体要点2", "具体要点3"]
    }
  ]
}

Make sure the presentation:
- Has a logical flow from introduction to conclusion
- Covers the topic comprehensively
- Each slide serves a clear purpose
- Content is specific and actionable
- Suitable for professional presentation`

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let response;
          
          if (provider === 'deepseek') {
            response = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true,
              }),
            })
          }
          else if (provider === 'kimi') {
           
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
                  temperature: 0.7,
                  max_tokens: 2000,
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
                temperature: 0.7,
                max_tokens: 2000,
                stream: true,
              }),
            })
          } else {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              error: 'Unsupported provider for PPT generation' 
            })))
            controller.close()
            return
          }

          if (!response.ok) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              error: 'Failed to generate outline' 
            })))
            controller.close()
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              error: 'Stream could not be read' 
            })))
            controller.close()
            return
          }

          let buffer = ''
          
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            buffer += chunk
            
            // 处理SSE格式的数据
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  
                  if (content) {
                    // 发送流式内容
                    controller.enqueue(new TextEncoder().encode(JSON.stringify({
                      type: 'content',
                      content: content
                    }) + '\n'))
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
          
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            error: 'Internal server error' 
          })))
          controller.close()
        }
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