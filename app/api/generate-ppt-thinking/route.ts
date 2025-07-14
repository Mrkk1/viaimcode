import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { slide, slideIndex, totalSlides, theme, model, provider, previousSlideInfo, modificationContext } = await request.json()

    console.log('思考生成API - 接收到的参数:')
    console.log('- slide.title:', slide.title)
    console.log('- slideIndex:', slideIndex)
    console.log('- model:', model)
    console.log('- provider:', provider)
    console.log('- modificationContext:', modificationContext ? '存在' : '不存在')
    if (modificationContext) {
      console.log('- modificationContext.userRequest:', modificationContext.userRequest)
      console.log('- modificationContext.analysisResult:', modificationContext.analysisResult ? '存在' : '不存在')
      if (modificationContext.analysisResult) {
        console.log('- 修改范围:', modificationContext.analysisResult.intent?.scope)
        console.log('- 修改类型:', modificationContext.analysisResult.intent?.modificationType)
        console.log('- 具体变更要求:', modificationContext.analysisResult.extractedRequirements?.specificChanges)
      }
    }

    if (!slide || !model || !provider) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 主题配置 - 现在仅作为参考，AI会自动选择最合适的风格
    const themeConfig = {
      auto: {
        backgroundColor: 'AI will automatically select based on content',
        primaryColor: 'AI will automatically select based on content',
        secondaryColor: 'AI will automatically select based on content',
        accentColor: 'AI will automatically select based on content',
        cardStyle: 'AI will automatically select based on content'
      },
      modern: {
        backgroundColor: 'bg-gradient-to-br from-blue-50 to-indigo-100',
        primaryColor: 'text-blue-900',
        secondaryColor: 'text-blue-700',
        accentColor: 'bg-blue-600',
        cardStyle: 'bg-white/80 backdrop-blur-sm shadow-xl border border-blue-200/50'
      },
      dark: {
        backgroundColor: 'bg-gradient-to-br from-gray-900 to-black',
        primaryColor: 'text-white',
        secondaryColor: 'text-gray-300',
        accentColor: 'bg-purple-600',
        cardStyle: 'bg-gray-800/80 backdrop-blur-sm shadow-xl border border-gray-700/50'
      },
      corporate: {
        backgroundColor: 'bg-gradient-to-br from-gray-50 to-blue-50',
        primaryColor: 'text-gray-900',
        secondaryColor: 'text-gray-700',
        accentColor: 'bg-gray-800',
        cardStyle: 'bg-white shadow-lg border border-gray-200'
      }
    }

    const currentTheme = themeConfig[theme as keyof typeof themeConfig] || themeConfig.auto

    // 专门用于思考分析的系统提示词
    const systemPrompt = `You are an expert presentation designer specializing in analyzing and planning professional HTML slides. Your role is to conduct comprehensive design analysis before any code generation.

CRITICAL LANGUAGE REQUIREMENT:
- AUTOMATICALLY DETECT the language of the slide content
- If the slide content is in Chinese, respond ENTIRELY in Chinese
- If the slide content is in English, respond ENTIRELY in English  
- If the slide content is in other languages, respond in that same language
- NEVER mix languages - maintain complete consistency throughout your analysis

INTELLIGENT STYLE SELECTION:
- AUTOMATICALLY ANALYZE the slide content and topic to determine the most suitable visual style
- Consider factors like: topic formality, target audience, content type, cultural context
- Choose from: modern/tech (for innovation, technology topics), corporate/professional (for business, formal topics), creative/artistic (for design, creative topics), academic/research (for educational, scientific topics)
- Justify your style choice based on content analysis
- Ensure the chosen style enhances content communication effectiveness

CRITICAL: This is the THINKING PHASE ONLY. You must ONLY provide detailed design analysis without generating any HTML code.

REQUIRED ANALYSIS STRUCTURE (MUST BE EXTREMELY DETAILED):

1. **语言识别与风格选择** (Language Detection & Style Selection)
   - 自动检测幻灯片内容的语言并确认响应语言
   - 基于内容主题、目标受众、文化背景智能选择最合适的视觉风格
   - 分析内容的正式程度、专业性、创新性等特征
   - 确定最佳的设计风格方向（现代科技、商务专业、创意艺术、学术研究等）

2. **需求分析** (Requirements Analysis)
   - 深入分析幻灯片的主题、内容和目标
   - 确定目标受众类型和演示场景
   - 理解该页面在整个演示文稿中的作用和重要性
   - 分析信息传达的核心目标和关键信息

3. **设计策略** (Design Strategy)
   - 基于内容特点和选定风格确定最适合的视觉表达方式
   - 选择信息架构和视觉层次策略
   - 确定核心设计理念（简洁、专业、现代等）
   - 规划用户的视觉阅读路径


SLIDE INFORMATION:
- Title: ${slide.title}
- Content: ${slide.content}
- Key Points: ${slide.keyPoints ? slide.keyPoints.join(', ') : 'None'}
- Slide ${slideIndex + 1} of ${totalSlides}
- Target Dimensions: 1280px × 720px

THEME CONFIGURATION:
- Theme Mode: ${theme} (${theme === 'auto' ? 'AI will intelligently select the most appropriate style based on content analysis' : 'Predefined theme'})
- Background: ${currentTheme.backgroundColor}
- Primary Text: ${currentTheme.primaryColor}
- Secondary Text: ${currentTheme.secondaryColor}
- Accent Color: ${currentTheme.accentColor}
- Card Style: ${currentTheme.cardStyle}

${previousSlideInfo ? `PREVIOUS SLIDE STYLE REFERENCE:
${previousSlideInfo}

请特别注意分析前页的设计特点，确保风格的高度一致性。` : '这是演示文稿的首页或无前页参考，请建立专业的设计基准。'}

IMPORTANT: 
- 只进行设计分析，不生成任何HTML代码
- 分析必须详细、具体、可执行
- 每个维度都要有明确的设计决策和理由
- 为后续的HTML生成提供清晰的设计指导
- 所有设计方案必须是静态的，不包含动画或过渡效果
`

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        
        const safeEnqueue = (data: string) => {
          if (!isClosed) {
            try {
              controller.enqueue(new TextEncoder().encode(data + '\n'))
            } catch (e) {
              console.error('Controller enqueue error:', e)
              isClosed = true
            }
          }
        }

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close()
              isClosed = true
            } catch (e) {
              console.error('Controller close error:', e)
            }
          }
        }

        try {
          let response;
          
          const userPrompt = `请为以下幻灯片进行详细的设计分析和规划：

**幻灯片信息:**
- 标题: ${slide.title}
- 内容描述: ${slide.content}
- 关键要点: ${slide.keyPoints ? slide.keyPoints.join(', ') : '无'}
- 页码: 第${slideIndex + 1}页，共${totalSlides}页

**设计要求:**
- 目标尺寸: 1280px × 720px (16:9标准演示比例)
- 适用场景: 专业商务演示、会议投影
- 设计风格: 现代、专业、国际化
- 主题: ${theme}


**特别注意:**
- 这是设计思考阶段，只需要分析和规划，不要生成任何HTML代码
- 所有设计元素必须是静态的，不使用CSS动画、过渡效果或JavaScript动画

${previousSlideInfo ? `**前页风格参考:**
${previousSlideInfo}

请特别分析如何保持与前页的设计一致性。` : ''}

${modificationContext ? `**🔥 重要：用户修改需求 🔥**
用户的具体修改要求：${modificationContext.userRequest}

**智能分析结果：**
- 修改范围：${modificationContext.analysisResult?.intent?.scope || '未知'}
- 修改类型：${modificationContext.analysisResult?.intent?.modificationType || '未知'}
- 置信度：${modificationContext.analysisResult?.intent?.confidence ? Math.round(modificationContext.analysisResult.intent.confidence * 100) + '%' : '未知'}
- 目标页面：${modificationContext.analysisResult?.intent?.targetPages?.map((p: number) => `第${p + 1}页`).join(', ') || '未知'}

**具体变更要求：**
${modificationContext.analysisResult?.extractedRequirements?.specificChanges?.map((change: string) => `• ${change}`).join('\n') || '无'}

**建议的执行方式：**
${modificationContext.analysisResult?.suggestedAction?.description || '无'}

**⚠️ 在设计思考中，请务必重点关注和响应上述修改需求！**` : ''}

请开始详细的设计分析：`
          
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
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.5,
                max_tokens: 3000, // 增加token限制以确保完整的思考内容
                stream: true,
              }),
            })
          } else if (provider === 'openai_compatible') {
            const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL || 'https://api.openai.com/v1'
            response = await fetch(`${baseURL}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_COMPATIBLE_API_KEY}`,
              },
              body: JSON.stringify({
                model: model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 3000, // 增加token限制以确保完整的思考内容
                stream: true,
              }),
            })
          } else {
            throw new Error(`Unsupported provider: ${provider}`)
          }

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('Failed to get response reader')
          }

          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk
              
              // 处理完整的SSE行
              const lines = buffer.split('\n')
              buffer = lines.pop() || '' // 保留最后一个不完整的行

              for (const line of lines) {
                if (line.trim() === '') continue
                
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()
                  
                  if (data === '[DONE]') {
                    continue
                  }

                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices?.[0]?.delta?.content || ''
                    
                    if (content) {
                      const sseData = JSON.stringify({ type: 'content', content })
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
            reader.releaseLock()
          }

        } catch (error) {
          console.error('Error in thinking generation:', error)
          const errorData = JSON.stringify({ 
            type: 'error', 
            content: `思考分析失败: ${error}` 
          })
          safeEnqueue(errorData)
        } finally {
          safeClose()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Error in PPT thinking generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 