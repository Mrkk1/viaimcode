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

    // 丰富的主题配置库 - 提供多样化的设计风格选择
    const themeConfig = {
      // 智能自动选择
      auto: {
        backgroundColor: 'AI will intelligently select the most suitable style',
        primaryColor: 'AI will analyze content and choose optimal colors',
        secondaryColor: 'AI will ensure perfect color harmony',
        accentColor: 'AI will select based on brand and content context',
        cardStyle: 'AI will choose the most effective visual presentation',
        description: '基于内容智能选择最佳风格'
      },
      
      // 商务专业系列
      modern: {
        backgroundColor: 'bg-gradient-to-br from-blue-50 to-indigo-100',
        primaryColor: 'text-blue-900',
        secondaryColor: 'text-blue-700',
        accentColor: 'bg-blue-600',
        cardStyle: 'bg-white/90 backdrop-blur-sm shadow-xl border border-blue-200/50 rounded-xl',
        description: '现代简约，适合科技和创新主题'
      },
      corporate: {
        backgroundColor: 'bg-gradient-to-br from-gray-50 to-slate-100',
        primaryColor: 'text-gray-900',
        secondaryColor: 'text-gray-700',
        accentColor: 'bg-slate-800',
        cardStyle: 'bg-white shadow-lg border border-gray-200 rounded-lg',
        description: '企业商务，正式专业的商业演示'
      },
      executive: {
        backgroundColor: 'bg-gradient-to-br from-slate-100 to-gray-200',
        primaryColor: 'text-slate-900',
        secondaryColor: 'text-slate-700',
        accentColor: 'bg-slate-900',
        cardStyle: 'bg-white/95 shadow-2xl border border-slate-300 rounded-lg',
        description: '高管级别，极简高端商务风格'
      },
      
      // 创意设计系列
      creative: {
        backgroundColor: 'bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100',
        primaryColor: 'text-purple-900',
        secondaryColor: 'text-purple-700',
        accentColor: 'bg-gradient-to-r from-purple-600 to-pink-600',
        cardStyle: 'bg-white/85 backdrop-blur-md shadow-2xl border border-purple-200/60 rounded-2xl',
        description: '创意活泼，适合设计和营销主题'
      },
      artistic: {
        backgroundColor: 'bg-gradient-to-br from-amber-50 via-orange-50 to-red-100',
        primaryColor: 'text-orange-900',
        secondaryColor: 'text-orange-800',
        accentColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        cardStyle: 'bg-white/90 shadow-xl border-2 border-orange-200 rounded-xl',
        description: '艺术风格，适合创作和文化主题'
      },
      vibrant: {
        backgroundColor: 'bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100',
        primaryColor: 'text-cyan-900',
        secondaryColor: 'text-blue-800',
        accentColor: 'bg-gradient-to-r from-cyan-500 to-purple-500',
        cardStyle: 'bg-white/85 backdrop-blur-sm shadow-xl border border-cyan-200/50 rounded-2xl',
        description: '活力四射，适合年轻化和互动主题'
      },
      
      // 深色主题系列
      dark: {
        backgroundColor: 'bg-gradient-to-br from-gray-900 to-black',
        primaryColor: 'text-white',
        secondaryColor: 'text-gray-300',
        accentColor: 'bg-purple-600',
        cardStyle: 'bg-gray-800/90 backdrop-blur-sm shadow-2xl border border-gray-700/50 rounded-xl',
        description: '经典深色，专业且现代'
      },
      cyberpunk: {
        backgroundColor: 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-black',
        primaryColor: 'text-cyan-300',
        secondaryColor: 'text-purple-300',
        accentColor: 'bg-gradient-to-r from-cyan-500 to-purple-500',
        cardStyle: 'bg-gray-900/90 backdrop-blur-md shadow-2xl border border-cyan-500/30 rounded-xl',
        description: '科技未来感，适合技术和创新主题'
      },
      midnight: {
        backgroundColor: 'bg-gradient-to-br from-slate-900 to-blue-900',
        primaryColor: 'text-blue-100',
        secondaryColor: 'text-slate-300',
        accentColor: 'bg-blue-500',
        cardStyle: 'bg-slate-800/90 backdrop-blur-sm shadow-xl border border-blue-500/30 rounded-lg',
        description: '午夜蓝调，优雅深沉'
      },
      
      // 学术教育系列
      academic: {
        backgroundColor: 'bg-gradient-to-br from-green-50 to-teal-100',
        primaryColor: 'text-green-900',
        secondaryColor: 'text-green-800',
        accentColor: 'bg-green-600',
        cardStyle: 'bg-white/95 shadow-lg border border-green-200 rounded-lg',
        description: '学术专业，适合教育和研究主题'
      },
      research: {
        backgroundColor: 'bg-gradient-to-br from-indigo-50 to-blue-100',
        primaryColor: 'text-indigo-900',
        secondaryColor: 'text-indigo-800',
        accentColor: 'bg-indigo-600',
        cardStyle: 'bg-white/90 shadow-lg border border-indigo-200 rounded-lg',
        description: '研究导向，严谨科学风格'
      },
      
      // 特色主题系列
      nature: {
        backgroundColor: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100',
        primaryColor: 'text-green-900',
        secondaryColor: 'text-emerald-800',
        accentColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
        cardStyle: 'bg-white/90 shadow-xl border border-green-200/60 rounded-2xl',
        description: '自然清新，适合环保和健康主题'
      },
      luxury: {
        backgroundColor: 'bg-gradient-to-br from-amber-50 to-yellow-100',
        primaryColor: 'text-amber-900',
        secondaryColor: 'text-yellow-800',
        accentColor: 'bg-gradient-to-r from-amber-600 to-yellow-600',
        cardStyle: 'bg-white/95 shadow-2xl border-2 border-amber-200 rounded-xl',
        description: '奢华金色，适合高端品牌展示'
      },
      minimal: {
        backgroundColor: 'bg-white',
        primaryColor: 'text-gray-900',
        secondaryColor: 'text-gray-600',
        accentColor: 'bg-gray-900',
        cardStyle: 'bg-gray-50 shadow-md border border-gray-200 rounded-lg',
        description: '极简主义，纯净简洁'
      },
      warm: {
        backgroundColor: 'bg-gradient-to-br from-orange-100 to-red-100',
        primaryColor: 'text-red-900',
        secondaryColor: 'text-orange-800',
        accentColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        cardStyle: 'bg-white/90 shadow-xl border border-orange-200 rounded-xl',
        description: '温暖色调，亲和友好'
      },
      cool: {
        backgroundColor: 'bg-gradient-to-br from-blue-100 to-cyan-100',
        primaryColor: 'text-blue-900',
        secondaryColor: 'text-cyan-800',
        accentColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        cardStyle: 'bg-white/90 shadow-xl border border-blue-200 rounded-xl',
        description: '冷色调，冷静专业'
      }
    }

    const currentTheme = themeConfig[theme as keyof typeof themeConfig] || themeConfig.auto

    // 专门用于思考分析的系统提示词 - 重点解决配色和布局问题
    const systemPrompt = `You are an expert presentation designer specializing in analyzing and planning professional HTML slides with PERFECT visual harmony and layout precision.

🎯 CRITICAL DESIGN QUALITY REQUIREMENTS:
- ZERO tolerance for color clashes or visual discord
- PERFECT element alignment and spacing consistency
- PROFESSIONAL color harmony following design principles
- CLEAR visual hierarchy with proper contrast ratios
- RESPONSIVE layout that works across all screen sizes

CRITICAL LANGUAGE REQUIREMENT:
- AUTOMATICALLY DETECT the language of the slide content
- If the slide content is in Chinese, respond ENTIRELY in Chinese
- If the slide content is in English, respond ENTIRELY in English  
- If the slide content is in other languages, respond in that same language
- NEVER mix languages - maintain complete consistency throughout your analysis

🎨 COLOR HARMONY EXPERTISE:
- Apply color theory principles: complementary, analogous, triadic schemes
- Ensure WCAG AA accessibility standards (4.5:1 contrast ratio minimum)
- Use professional color palettes with maximum 3-4 colors total
- Avoid oversaturated or neon colors that cause visual fatigue
- Create subtle gradients with similar hue families only
- Test color combinations for colorblind accessibility

📐 LAYOUT PRECISION STANDARDS:
- Use consistent 8px or 16px grid system for all spacing
- Maintain proper margins: minimum 40px from slide edges
- Ensure visual balance with rule of thirds or golden ratio
- Create clear content hierarchy: title → subtitle → body → details
- Use consistent alignment (left, center, right) throughout
- Maintain proper aspect ratios for all visual elements

INTELLIGENT STYLE SELECTION:
- AUTOMATICALLY ANALYZE the slide content and topic to determine the most suitable visual style from our extensive theme library
- Available theme categories:
  * 商务专业系列: modern, corporate, executive - 适合商业演示和正式场合
  * 创意设计系列: creative, artistic, vibrant - 适合创意展示和营销内容
  * 深色主题系列: dark, cyberpunk, midnight - 适合技术和现代主题
  * 学术教育系列: academic, research - 适合教育和科研内容
  * 特色主题系列: nature, luxury, minimal, warm, cool - 适合特定行业和情感表达
- Consider factors like: topic formality, target audience, content type, cultural context, emotional tone, brand positioning
- For each theme, analyze: color psychology, visual hierarchy, readability, professional appropriateness
- Justify your style choice with specific reasons related to content effectiveness and audience engagement

CRITICAL: This is the THINKING PHASE ONLY. You must ONLY provide detailed design analysis without generating any HTML code.

REQUIRED ANALYSIS STRUCTURE (MUST BE EXTREMELY DETAILED):

1. **语言识别与主题风格智能选择** (Language Detection & Intelligent Theme Selection)
   - 自动检测幻灯片内容的语言并确认响应语言
   - 从15种丰富主题中智能选择最合适的视觉风格：
     * 分析内容性质：商务/创意/技术/学术/特色主题
     * 评估情感色调：正式/活泼/专业/温暖/冷静
     * 考虑目标受众：高管/创意人员/技术团队/学者/大众
     * 分析品牌定位：奢华/简约/现代/传统/创新
   - 提供1个最佳主题选择，并详细说明配色和布局的专业理由

2. **色彩设计分析** (Color Design Analysis)
   - 制定专业配色方案，确保色彩和谐：
     * 主色调选择：基于内容情感和品牌调性
     * 辅助色搭配：确保对比度和可读性
     * 强调色运用：突出重点信息，不超过总面积的10%
     * 背景色处理：保证内容清晰可读，避免干扰
   - 验证配色方案的可访问性和专业性
   - 确保在不同设备和环境下的视觉效果

3. **布局设计规划** (Layout Design Planning)
   - 制定精确的布局策略：
     * 网格系统：使用16px基础网格，确保元素对齐
     * 间距规范：标题间距、段落间距、元素边距的统一标准
     * 视觉层次：通过大小、颜色、位置建立清晰的信息层级
     * 内容分区：合理划分信息区块，避免拥挤和混乱
   - 确保1280×720分辨率下的完美显示效果
   - 考虑不同内容长度的自适应布局

4. **视觉元素设计** (Visual Elements Design)
   - 规划视觉元素的使用：
     * 图标风格：统一的图标系列和尺寸规范
     * 图形元素：装饰性元素的位置和样式
     * 分隔线：统一的线条样式和间距
     * 卡片设计：阴影、圆角、边框的一致性
   - 确保所有元素服务于内容表达，避免过度装饰



SLIDE INFORMATION:
- Title: ${slide.title}
- Content: ${slide.content}
- Key Points: ${slide.keyPoints ? slide.keyPoints.join(', ') : 'None'}
- Slide ${slideIndex + 1} of ${totalSlides}
- Target Dimensions: 1280px × 720px

THEME CONFIGURATION:
- Selected Theme: ${theme} (${currentTheme.description || 'Custom theme'})
- Background: ${currentTheme.backgroundColor}
- Primary Text: ${currentTheme.primaryColor}
- Secondary Text: ${currentTheme.secondaryColor}
- Accent Color: ${currentTheme.accentColor}
- Card Style: ${currentTheme.cardStyle}

AVAILABLE THEME OPTIONS (for reference and intelligent selection):
${Object.entries(themeConfig).map(([key, config]) => 
  `- ${key}: ${config.description || 'Theme option'}`
).join('\n')}

${previousSlideInfo ? `PREVIOUS SLIDE STYLE REFERENCE:
${previousSlideInfo}

请特别注意分析前页的设计特点，确保风格的高度一致性。` : '这是演示文稿的首页或无前页参考，请建立专业的设计基准。'}

🚨 CRITICAL DESIGN REQUIREMENTS:
- 必须提供具体的颜色代码和精确的布局尺寸
- 严格遵循色彩理论，避免任何视觉冲突
- 确保16px网格对齐，所有间距必须是8的倍数
- 提供详细的视觉层次规划，确保信息清晰传达
- 所有设计决策必须有专业理由支撑
- 为后续的HTML生成提供清晰、精确的设计指导
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