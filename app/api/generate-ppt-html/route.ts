import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { slide, slideIndex, totalSlides, theme, model, provider, previousSlideInfo, thinkingContent, modificationContext } = await request.json()

    // 添加调试日志
    console.log('HTML生成API - 接收到的参数:')
    console.log('- slide:', slide?.title)
    console.log('- slideIndex:', slideIndex)
    console.log('- model:', model)
    console.log('- provider:', provider)
    console.log('- thinkingContent长度:', thinkingContent?.length || 0)
    console.log('- thinkingContent预览:', thinkingContent?.substring(0, 200) || '无')
    console.log('- modificationContext:', modificationContext ? '存在' : '不存在')
    console.log('- isDirectModification:', modificationContext?.isDirectModification || false)
    console.log('- existingHtmlCode:', slide?.existingHtmlCode ? '存在' : '不存在')

    if (!slide || !model || !provider) {
      console.error('HTML生成API - 缺少必需参数')
      return NextResponse.json(
        { error: 'Missing required parameters: slide, model, or provider' },
        { status: 400 }
      )
    }

    // thinkingContent可以为空，但如果存在则记录
    if (thinkingContent) {
      console.log('HTML生成API - 使用思考内容，长度:', thinkingContent.length)
    } else {
      console.log('HTML生成API - 警告：没有思考内容，将使用基础模板')
    }

    // 主题配置 - 现在仅作为参考，AI会自动选择最合适的风格
    const themeConfig = {
      auto: {
        backgroundColor: 'automatically select based on content and thinking analysis',
        primaryColor: 'automatically select based on content and thinking analysis',
        secondaryColor: 'automatically select based on content and thinking analysis',
        accentColor: 'automatically select based on content and thinking analysis',
        cardStyle: 'automatically select based on content and thinking analysis'
      },
    
    }

    const currentTheme = themeConfig[theme as keyof typeof themeConfig] || themeConfig.auto

    // 专门用于HTML代码生成的系统提示词
    const systemPrompt = `You are an expert HTML/CSS developer specializing in creating professional presentation slides using Tailwind CSS. Your role is to generate complete, production-ready HTML code based on detailed design analysis.

CRITICAL LANGUAGE REQUIREMENT:
- AUTOMATICALLY DETECT the language of the slide content
- If the slide content is in Chinese, use Chinese for all text elements in the HTML
- If the slide content is in English, use English for all text elements in the HTML
- If the slide content is in other languages, use that same language for all text elements
- NEVER mix languages in the final HTML output

INTELLIGENT STYLE IMPLEMENTATION:
- AUTOMATICALLY ANALYZE the slide content and thinking analysis to determine the optimal visual style
- Implement color schemes, layouts, and design elements that best match the content theme
- Consider content formality, target audience, and cultural context when choosing visual elements
- Create modern, professional designs that enhance content communication effectiveness
- Avoid generic or template-like designs - make each slide unique and contextually appropriate

CRITICAL: This is the HTML GENERATION PHASE. You must generate ONLY complete HTML code without any additional analysis or explanation.

MANDATORY SIZE REQUIREMENTS (ABSOLUTELY CRITICAL):
- The slide MUST be exactly 1280px wide × 720px high
- Use a fixed container with these exact dimensions
- Add CSS to ensure the slide never exceeds or falls short of these dimensions
- Include overflow:hidden to prevent content from spilling outside the boundaries
- CRITICAL: All content must fit within the visible area - NO content should be cut off or hidden
- Use safe margins: leave 40-60px padding on all sides (effective content area: 1160×600px)
- Ensure all text, images, charts fit completely within the boundaries
- Test content overflow: make sure longest text lines don't exceed container width

REQUIRED CSS STRUCTURE (must be included in your HTML):
- body: margin: 0; padding: 0; width: 1280px; height: 720px; overflow: hidden; box-sizing: border-box;
- .slide-container: width: 1280px; height: 720px; position: relative; overflow: hidden; display: flex; flex-direction: column;
- .content-area: width: 100%; height: 100%; padding: 40px; box-sizing: border-box; display: flex; flex-direction: column;
- .main-content: flex: 1; overflow: hidden; margin-bottom: 20px;
- .slide-footer: height: 40px; display: flex; justify-content: flex-end; align-items: center; padding-right: 20px;

RESPONSIVE FONT CSS CLASSES (add these to <style> section):
- .large-section { font-size: clamp(0.875rem, 1.5vw, 1.125rem); } /* for h-2/3 sections */
- .medium-section { font-size: clamp(0.75rem, 1.3vw, 1rem); } /* for h-1/2 sections */
- .small-section { font-size: clamp(0.625rem, 1.1vw, 0.875rem); } /* for h-1/3 sections */

CRITICAL: Use fixed height sections with responsive font sizing!

TECHNICAL REQUIREMENTS:
1. **完整HTML5文档结构**: 从<!DOCTYPE html>到</html>的完整文档
2. **Tailwind CSS集成**: 使用CDN引入Tailwind CSS
3. **ECharts数据可视化支持**: 
   - 如果内容包含数据、统计、趋势、对比等信息，必须使用ECharts创建相应图表
   - 使用CDN引入ECharts: <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
   - 创建合适的图表类型（柱状图、折线图、饼图、散点图、雷达图等）
   - 确保图表配色与整体设计风格协调
   - 提供合理的示例数据来展示图表效果
4. **精确尺寸**: 严格按照1280px × 720px设计，不允许任何偏差
5. **固定容器**: 使用固定尺寸容器，不使用响应式单位
6. **投影优化**: 优化字体大小和对比度以适应投影环境
7. **专业级质量**: 符合商务演示的专业标准

SLIDE SPECIFICATIONS:
- Title: ${slide.title}
- Content: ${slide.content}
- Key Points: ${slide.keyPoints ? slide.keyPoints.join(', ') : 'None'}
- Slide ${slideIndex + 1} of ${totalSlides}
- Target Dimensions: EXACTLY 1280px × 720px (NO EXCEPTIONS)

THEME CONFIGURATION:
- Theme Mode: ${theme} (${theme === 'auto' ? 'AI will intelligently implement the optimal style based on content analysis and thinking process' : 'Predefined theme'})
- Background: ${currentTheme.backgroundColor}
- Primary Text: ${currentTheme.primaryColor}
- Secondary Text: ${currentTheme.secondaryColor}
- Accent Color: ${currentTheme.accentColor}
- Card Style: ${currentTheme.cardStyle}

${thinkingContent ? `DESIGN ANALYSIS REFERENCE:
Based on the following detailed design analysis, implement the HTML code:

${thinkingContent}

IMPORTANT: 
- Follow the design decisions and recommendations from the above analysis precisely
- Pay special attention to the language and style choices made in the thinking process
- Implement the intelligent color scheme and layout decisions from the analysis
- The thinking content contains specific design choices that must be implemented in the HTML code
- Use the language identified in the analysis for all text elements` : `INTELLIGENT DESIGN GUIDANCE:
Since no specific design analysis is provided, create a contextually appropriate slide design that:
- Automatically detects and matches the language of the slide content
- Intelligently selects colors, fonts, and layouts based on the content theme and cultural context
- Creates clear visual hierarchy with appropriate font sizes for the content type
- Implements proper spacing and layout principles that enhance content readability
- Ensures excellent readability for presentation environments
- Follows modern design trends appropriate for the specific topic and audience
- Avoids generic templates - create unique, content-specific designs`}

${previousSlideInfo ? `STYLE CONSISTENCY REQUIREMENTS:
${previousSlideInfo}

Ensure strict consistency with the previous slide's design elements.` : ''}

CONTENT SIMPLICITY REQUIREMENTS (CRITICAL):
1. **内容简洁性原则**:
   - 每页PPT最多包含3-4个核心要点
   - 每个要点用1-2句话表达，避免长段落
   - 使用关键词、短语和数字，提高可读性
   - 优先使用视觉元素（图表、图标、数据）代替大量文字
   - 删除冗余信息，只保留最重要的内容

2. **内容组织策略**:
   - 标题：简洁明了，一句话概括主题
   - 要点：使用项目符号，每项不超过15个字
   - 描述：如需详细说明，控制在20字以内
   - 数据：优先使用图表展示，减少文字说明

HTML STRUCTURE REQUIREMENTS:
1. **文档头部**:
   - 完整的DOCTYPE和meta标签
   - Tailwind CSS CDN引入
   - 自定义样式定义（必须包含固定1280x720尺寸和flexbox布局）
   - 页面标题设置

2. **主体结构（CRITICAL - 使用flexbox防止遮挡）**:
   - body: 1280x720px，overflow:hidden
   - .slide-container: 1280x720px，display:flex，flex-direction:column
   - .content-area: width:100%，height:100%，padding:40px，display:flex，flex-direction:column
   - .main-content: flex:1，overflow:hidden，margin-bottom:20px
   - .slide-footer: height:40px，固定在底部

3. **内容组织（简洁性优先）**:
   - 标题区域：使用text-3xl，高度约80px，使用mb-4而不是mb-6
   - 主内容区：可用高度约560px（720-80标题-40页脚-40边距）
   - CRITICAL: 内容简洁性原则：
     * 每页最多3-4个要点，避免信息过载
     * 每个要点控制在1句话内，突出核心信息
     * 使用关键词和短语，避免长段落
     * 优先使用图表、图标等视觉元素代替文字
   - 多区域布局：使用精确的高度分配，如h-2/3和h-1/3
   - 文本内容：使用text-sm或text-base，行高适中
   - 图表容器：最大高度300px，确保在分配空间内

4. **数据可视化集成（尺寸控制）**:
   - 图表容器：width:500px max，height:300px max
   - ECharts grid配置：适当的left、right、top、bottom边距
   - 字体大小：图表内文字使用较小字号（fontSize:10-12）
   - 确保图表完全在容器内显示

5. **页面元素（固定位置）**:
   - 页码指示器：使用.slide-footer固定在底部40px高度区域
   - 避免使用absolute定位可能被内容遮挡的元素
   - 静态视觉元素（禁用所有动画）

6. **样式优化（响应式字体策略）**:
   - 区块大小：使用固定的高度分配（h-2/3, h-1/3等）保持布局稳定
   - 响应式字体：根据区块大小和内容量自动调整字体大小
   - 字体大小策略：
     * 大区块（h-2/3）：标题text-2xl，副标题text-lg，正文text-base
     * 中等区块（h-1/2）：标题text-xl，副标题text-base，正文text-sm
     * 小区块（h-1/3）：标题text-lg，副标题text-sm，正文text-xs
   - 内容适配：使用overflow-hidden和适当的line-height确保文字在区块内完整显示
   - 间距控制：padding和gap根据区块大小调整（大区块p-6，小区块p-3）

ECHARTS INTEGRATION GUIDE (when data visualization is needed):
1. **CDN引入**: Use script tag to include ECharts CDN
2. **图表容器**: Create div element with id and fixed dimensions
3. **初始化代码**: Use window.onload to initialize chart with echarts.init()
4. **图表配置**: Configure title, tooltip, xAxis, yAxis, and series data
5. **图表类型选择**:
   - 柱状图: type: 'bar'
   - 折线图: type: 'line'  
   - 饼图: type: 'pie'
   - 散点图: type: 'scatter'
   - 雷达图: type: 'radar'
6. **静态配置**: Disable all animations by setting animation: false in chart options

LAYOUT TEMPLATE (MUST FOLLOW THIS STRUCTURE):
HTML structure must include:
- body: 1280x720px with overflow:hidden
- .slide-container: full size with flex column layout  
- .content-area: full size with 40px padding and flex column
- .main-content: flex:1 for auto-sizing with margin-bottom:20px
- .slide-footer: fixed 40px height for page numbers

CRITICAL: Multi-section layout strategy:
- For 2 vertical sections: use h-2/3 and h-1/3 classes (FIXED HEIGHTS)
- For 3 vertical sections: use h-1/2, h-1/4, h-1/4 classes (FIXED HEIGHTS)
- Use gap-4 instead of margin-top for vertical spacing
- Each section should have overflow:hidden to prevent spillover
- RESPONSIVE TEXT SIZING based on section height:
  * Large sections (h-2/3): title=text-2xl, subtitle=text-lg, body=text-base
  * Medium sections (h-1/2): title=text-xl, subtitle=text-base, body=text-sm  
  * Small sections (h-1/3): title=text-lg, subtitle=text-sm, body=text-xs
- ADAPTIVE PADDING: Large sections p-6, Medium sections p-4, Small sections p-3

EXAMPLE MULTI-SECTION STRUCTURE:
main-content should use: flex flex-col gap-4
Section 1 (2/3 height): h-2/3 flex gap-4 for horizontal layout
Section 2 (1/3 height): h-1/3 overflow-hidden for bottom content
This ensures all content fits within allocated vertical space

CRITICAL OUTPUT REQUIREMENT:
- Generate ONLY the complete HTML code following the above template structure
- Start with <!DOCTYPE html> and end with </html>
- No explanations, comments, or additional text
- DO NOT wrap the output in code blocks (no '''html or ''' markers)
- DO NOT include any markdown formatting or code block syntax
- Output raw HTML code directly without any wrapper syntax
- MUST use the flexbox layout structure and height allocation shown above
- Body and containers MUST be exactly 1280x720px
- Use .main-content with flex flex-col gap-4 for vertical sections
- Use explicit height classes (h-2/3, h-1/3, etc.) for each major section
- Use .slide-footer for page numbers (fixed 40px height)
- If content involves data, MUST include ECharts visualization within size limits
- DO NOT use margin-top, use gap spacing instead
- Use RESPONSIVE font sizes based on section height (see above sizing strategy)
- Use ADAPTIVE padding based on section size (p-6 for large, p-4 for medium, p-3 for small)
- CRITICAL: Each section must have FIXED height allocation - no overflow
- CRITICAL: Font sizes must adapt to the available space within each fixed-height section
- CRITICAL: Content must be EXTREMELY CONCISE - maximum 3-4 key points per slide
- CRITICAL: Each text element should be brief and impactful - avoid verbose descriptions

DIRECT MODIFICATION MODE (when existingHtmlCode is provided):
- PRESERVE the overall layout and structure of the existing HTML
- ONLY modify the specific elements mentioned in the modification requirements
- Keep the same color scheme, font styles, and visual design unless specifically requested to change
- Maintain the same container structure and CSS classes
- Focus on targeted changes rather than complete redesign
- If modifying text content, preserve the formatting and styling of surrounding elements
- If modifying specific elements (like selected text), only change that element while keeping everything else intact`

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
          
          const userPrompt = `${modificationContext?.isDirectModification ? '基于现有HTML代码进行修改' : '基于以下设计分析，生成完整的HTML代码'}：

**幻灯片信息:**
- 标题: ${slide.title}
- 内容: ${slide.content}
- 关键要点: ${slide.keyPoints ? slide.keyPoints.join(', ') : '无'}
- 页码: 第${slideIndex + 1}页，共${totalSlides}页

${modificationContext?.isDirectModification && slide.existingHtmlCode ? `**🔄 现有HTML代码（需要修改）:**
\`\`\`html
${slide.existingHtmlCode}
\`\`\`

**📝 修改要求:**
${slide.modificationRequirements ? `
- 用户输入: ${slide.modificationRequirements.userInput}
- 具体修改: ${slide.modificationRequirements.specificChanges?.join(', ') || '无'}
- 选中元素: ${slide.modificationRequirements.selectedElement || '无'}
- 分析结果: ${JSON.stringify(slide.modificationRequirements.analysisResult?.intent || {}, null, 2)}

${slide.modificationRequirements.selectedElementInfo ? `**🎯 选中元素的详细信息:**
- 元素标签: ${slide.modificationRequirements.selectedElementInfo.tagName}
- DOM路径: ${slide.modificationRequirements.selectedElementInfo.domPath}
- CSS选择器: ${slide.modificationRequirements.selectedElementInfo.cssSelector}
- XPath: ${slide.modificationRequirements.selectedElementInfo.xpath}
- 原始文本: "${slide.modificationRequirements.selectedElementInfo.originalText}"
- 原始HTML: \`${slide.modificationRequirements.selectedElementInfo.originalHTML}\`
- 元素属性: ${JSON.stringify(slide.modificationRequirements.selectedElementInfo.attributes, null, 2)}

**🔧 精确修改指令:**
- 请在现有HTML代码中精确定位到上述选中的元素
- 只修改这个特定元素的内容，保持其他所有元素完全不变
- 保持该元素的标签名、CSS类名、样式属性等结构信息
- 如果是文本修改，只更改文本内容；如果是样式修改，只更改相应的样式属性
- 确保修改后的元素在整体布局中保持和谐一致` : ''}

**⚠️ 重要说明:**
- 请基于上述现有HTML代码进行修改
- 只修改用户要求的部分，保持其他部分不变
- 保持原有的布局结构、颜色方案和设计风格
- 确保修改后的代码仍然符合1280x720px的尺寸要求
` : '无具体修改要求'}` : ''}

${!modificationContext?.isDirectModification ? `${thinkingContent ? `**🎯 设计分析结果（重要 - 必须遵循）:**

**📋 实现要求:**
请严格按照上述设计分析中的所有决策来实现HTML代码。分析中提到的颜色、布局、字体、装饰元素等所有设计选择都必须在代码中体现。` : `**🎯 设计要求（无具体分析）:**
由于没有提供具体的设计分析，请创建一个专业、现代的幻灯片设计，要求：
- 有效使用指定的主题色彩
- 创建清晰的视觉层次和适当的字体大小
- 实现恰当的间距和布局原则
- 确保在演示环境中的优秀可读性
- 遵循现代商务演示的设计趋势`}` : ''}

**技术要求:**
- 生成完整的HTML5文档（从<!DOCTYPE html>到</html>）
- 使用Tailwind CSS CDN实现所有样式
- 严格按照1280px × 720px尺寸设计
- 确保投影环境下的可读性
- 包含页码指示器和必要的装饰元素
- 不使用任何CSS动画、过渡效果或JavaScript动画
- **关键要求**：所有内容必须在1280×720px边界内完整显示，不能有任何溢出或被截断

**布局约束:**
- 使用安全边距：四周至少保留40-60px的padding
- 内容区域控制在1160×600px以内
- 图表尺寸不超过500×350px
- 确保最长的文本行不会超出容器宽度

**重要提醒:**
- 只生成HTML代码，不要包含任何解释或分析
- 代码必须完整、可直接运行
- 使用静态设计元素，避免任何动态效果
- 测试内容是否完全在可视区域内


**内容简洁性原则**:
- 每页PPT最多包含3-4个核心要点
- 每个要点用1-2句话表达，避免长段落
- 使用关键词、短语和数字，提高可读性
- 优先使用视觉元素（图表、图标、数据）代替大量文字
- 删除冗余信息，只保留最精简的内容

**内容组织策略**:
- 标题：简洁明了，一句话概括主题
- 要点：使用项目符号，每项不超过10个字
- 描述：如需详细说明，控制在15字以内
- 数据：优先使用图表展示，减少文字说明
${thinkingContent ? '- 严格遵循设计分析中的所有决策和尺寸约束' : '- 创建专业美观的静态设计，确保内容完整显示'}

${previousSlideInfo ? `**风格一致性要求:**
${previousSlideInfo}

请确保与前页设计的严格一致性。` : ''}

请生成完整的HTML代码：

**重要输出格式要求：**
- 直接输出HTML代码，不要使用任何代码块标记
- 不要包含 \`\`\`html 或 \`\`\` 这样的markdown格式
- 从 <!DOCTYPE html> 开始，到 </html> 结束
- 不要添加任何解释文字或注释
- 确保输出的是纯HTML代码，可以直接在浏览器中渲染`
          
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
                temperature: 0.3, // 降低温度以获得更一致的代码输出
                max_tokens: 6000, // 增加token限制以确保完整的HTML生成
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
                temperature: 0.3, // 降低温度以获得更一致的代码输出
                max_tokens: 6000, // 增加token限制以确保完整的HTML生成
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
          console.error('Error in HTML generation:', error)
          const errorData = JSON.stringify({ 
            type: 'error', 
            content: `HTML生成失败: ${error}` 
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
    console.error('Error in PPT HTML generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 