import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { slide, slideIndex, totalSlides, theme, model, provider, previousSlideInfo, modificationContext, unifiedBackground } = await request.json()

    console.log('思考生成API - 接收到的参数:')
    console.log('- slide.title:', slide.title)
    console.log('- slideIndex:', slideIndex)
    console.log('- model:', model)
    console.log('- provider:', provider)
    console.log('- unifiedBackground:', unifiedBackground ? '存在' : '不存在')
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

    // 专门用于内容布局分析的系统提示词 - 不再包含风格选择
    const systemPrompt = `You are an expert presentation content strategist specializing in analyzing and planning the optimal content layout and organization for professional HTML slides.

CRITICAL LANGUAGE REQUIREMENT:
- AUTOMATICALLY DETECT the language of the slide content
- If the slide content is in Chinese, respond ENTIRELY in Chinese
- If the slide content is in English, respond ENTIRELY in English  
- If the slide content is in other languages, respond in that same language
- NEVER mix languages - maintain complete consistency throughout your analysis

🎯 CONTENT LAYOUT EXPERTISE:
Your role is to analyze the slide content and plan the optimal layout and organization strategy. The visual style and background have already been determined, so focus entirely on:

1. **Content Structure Analysis**: How to organize the information for maximum impact
2. **Layout Planning**: Where to place different content elements within the unified background
3. **Information Hierarchy**: How to prioritize and present key information
4. **Content Flow**: How readers should navigate through the slide content
5. **Space Utilization**: How to effectively use the available content area
6. **Readability Optimization**: How to ensure content is clear and accessible

CRITICAL: This is the CONTENT PLANNING PHASE ONLY. You must ONLY provide detailed content layout analysis without any background styling decisions.

REQUIRED ANALYSIS STRUCTURE (MUST BE EXTREMELY DETAILED):

1. **内容分析与语言确认** (Content Analysis & Language Confirmation)
   - 自动检测幻灯片内容的语言并确认响应语言
   - 分析内容的性质：信息型/说服型/教学型/展示型
   - 确定内容的复杂程度和信息密度
   - 识别关键信息点和支撑细节

2. **信息层次规划** (Information Hierarchy Planning)
   - 确定主要信息（标题、核心观点）
   - 识别次要信息（支撑要点、详细说明）
   - 规划辅助信息（数据、引用、补充说明）
   - 建立清晰的视觉层次结构

3. **内容区域布局设计** (Content Area Layout Design)
   - 基于统一背景的内容区域进行布局规划
   - 确定标题区域的位置和大小
   - 规划主要内容区域的分配
   - 设计要点列表的展示方式
   - 安排图表、图片等视觉元素的位置

4. **空间利用优化** (Space Utilization Optimization)
   - 分析1280×720px中内容区域的有效空间
   - 规划合理的边距和间距
   - 确保内容不会过于拥挤或过于稀疏
   - 平衡文字和空白区域的比例

5. **可读性与可访问性** (Readability & Accessibility)
   - 确定合适的字体大小和行间距
   - 规划文本块的最佳宽度
   - 确保在投影环境下的可读性
   - 考虑不同阅读习惯的用户需求

6. **数据可视化规划** (Data Visualization Planning)
   - 识别是否需要图表、图形或其他视觉元素
   - 确定图表类型和最佳尺寸
   - 规划图表与文字内容的协调布局
   - 确保数据展示的清晰性和准确性

SLIDE INFORMATION:
- Title: ${slide.title}
- Content: ${slide.content}
- Key Points: ${slide.keyPoints ? slide.keyPoints.join(', ') : 'None'}
- Slide ${slideIndex + 1} of ${totalSlides}
- Target Dimensions: 1280px × 720px

${unifiedBackground ? `UNIFIED BACKGROUND CONTEXT:
- Theme: ${unifiedBackground.theme}
- Description: ${unifiedBackground.description}
- Content Area Class: ${unifiedBackground.contentAreaClass}
- Style Guide: ${JSON.stringify(unifiedBackground.styleGuide, null, 2)}

**重要**: 背景样式已经统一确定，请专注于在这个统一背景框架内规划内容的最佳布局和组织方式。` : ''}

${previousSlideInfo ? `PREVIOUS SLIDE CONTEXT:
${previousSlideInfo}

请分析前页的内容布局特点，确保内容组织的连贯性。` : '这是演示文稿的首页或无前页参考，请建立清晰的内容布局基准。'}

🚨 CRITICAL CONTENT PLANNING REQUIREMENTS:
- 专注于内容的逻辑组织和视觉呈现
- 不涉及背景颜色、主题风格等已确定的设计元素
- 提供具体的布局建议和空间分配方案
- 确保内容在统一背景中的最佳展示效果
- 所有规划必须服务于内容的清晰传达
- 为后续的HTML生成提供详细的内容布局指导

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

**⚠️ 在内容布局分析中，请务必重点关注和响应上述修改需求！**` : ''}

请开始详细的内容布局分析：`

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
          
          const userPrompt = `请为以下幻灯片进行详细的内容布局分析和规划：

**幻灯片信息:**
- 标题: ${slide.title}
- 内容描述: ${slide.content}
- 关键要点: ${slide.keyPoints ? slide.keyPoints.join(', ') : '无'}
- 页码: 第${slideIndex + 1}页，共${totalSlides}页

**布局要求:**
- 目标尺寸: 1280px × 720px (16:9标准演示比例)
- 适用场景: 专业商务演示、会议投影
- 内容组织: 清晰、逻辑性强、易于理解

${unifiedBackground ? `**统一背景信息:**
- 主题: ${unifiedBackground.theme}
- 描述: ${unifiedBackground.description}
- 内容区域类名: ${unifiedBackground.contentAreaClass}
- 样式指南: ${JSON.stringify(unifiedBackground.styleGuide, null, 2)}

**重要**: 背景样式已经统一确定，请专注于在这个统一背景框架内规划内容的最佳布局和组织方式。` : ''}

**特别注意:**
- 这是内容布局分析阶段，只需要分析内容组织和布局，不要生成任何HTML代码
- 专注于内容的逻辑结构和空间分配，不涉及颜色、主题等视觉风格

${previousSlideInfo ? `**前页内容布局参考:**
${previousSlideInfo}

请分析前页的内容布局特点，确保内容组织的连贯性。` : ''}

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

**⚠️ 在内容布局分析中，请务必重点关注和响应上述修改需求！**` : ''}

请开始详细的内容布局分析：`
          
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
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.5,
                max_tokens: 3000, // 增加token限制以确保完整的思考内容
                stream: true,
              }),
            })
          }
          else if (provider === 'openai_compatible') {
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
              if (isClosed || isEnding) {
                break
              }
              
              const { done, value } = await reader.read()
              
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk
              
              // 处理完整的SSE行
              const lines = buffer.split('\n')
              buffer = lines.pop() || '' // 保留最后一个不完整的行

              for (const line of lines) {
                if (isClosed || isEnding) {
                  break
                }
                
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
            try {
              reader.releaseLock()
            } catch (e) {
              console.error('Error releasing reader lock:', e)
            }
          }

        } catch (error) {
          console.error('Error in thinking generation:', error)
          if (!isClosed && !isEnding) {
            const errorData = JSON.stringify({ 
              type: 'error', 
              content: `思考分析失败: ${error}` 
            })
            safeEnqueue(errorData)
          }
        } finally {
          safeClose()
        }
      },
      
      cancel() {
        // 处理客户端取消请求
        console.log('Stream cancelled by client')
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