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