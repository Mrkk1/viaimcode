import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { slide, slideIndex, totalSlides, theme, model, provider, previousSlideInfo, thinkingContent, modificationContext, unifiedBackground } = await request.json()

    // 添加调试日志
    console.log('HTML生成API - 接收到的参数:')
    console.log('- slide:', slide?.title)
    console.log('- slideIndex:', slideIndex)
    console.log('- model:', model)
    console.log('- provider:', provider)
    console.log('- thinkingContent长度:', thinkingContent?.length || 0)
    console.log('- thinkingContent预览:', thinkingContent?.substring(0, 200) || '无')
    console.log('- unifiedBackground:', unifiedBackground ? '存在' : '不存在')
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

    // 专门用于HTML代码生成的系统提示词 - 基于统一背景模板
    const systemPrompt = `You are an expert HTML/CSS developer specializing in creating professional presentation slide content using a unified background template and Tailwind CSS.

CRITICAL LANGUAGE REQUIREMENT:
- AUTOMATICALLY DETECT the language of the slide content
- If the slide content is in Chinese, use Chinese for all text elements in the HTML
- If the slide content is in English, use English for all text elements in the HTML
- If the slide content is in other languages, use that same language for all text elements
- NEVER mix languages in the final HTML output

UNIFIED BACKGROUND APPROACH WITH Z-AXIS LAYERS:
- The visual style and background have been PRE-DETERMINED with MULTIPLE Z-AXIS LAYERS
- The background consists of 5+ visual layers with different z-index values
- Your role is to generate ONLY the content that goes into the designated content area (z-index: 10)
- DO NOT modify the background layers, colors, or overall page structure
- Focus entirely on organizing and presenting the slide content within the provided framework
- Use the provided style guide for consistent text styling and spacing
- Ensure content works harmoniously with the multi-layered background design

UNDERSTANDING Z-AXIS BACKGROUND STRUCTURE:
The unified background template includes multiple layers:
- Layer 1 (z-index: 1): Main background gradient
- Layer 2 (z-index: 2): Large geometric decorations (::before pseudo-elements)
- Layer 3 (z-index: 3): SVG pattern grids
- Layer 4 (z-index: 4): Medium decorative elements
- Layer 5 (z-index: 5): Small light effects and accents
- Content Layer (z-index: 10): YOUR CONTENT GOES HERE
- Page Number Layer (z-index: 15): Page indicators

CRITICAL: This is the HTML GENERATION PHASE. You must generate ONLY complete HTML code without any additional analysis or explanation.

MANDATORY SIZE REQUIREMENTS (ABSOLUTELY CRITICAL):
- The slide MUST be exactly 1280px wide × 720px high
- Content must fit within the designated content area of the unified background
- Add CSS to ensure the slide never exceeds or falls short of these dimensions
- Include overflow:hidden to prevent content from spilling outside the boundaries
- CRITICAL: All content must fit within the visible area - NO content should be cut off or hidden
- Use the spacing standards defined in the unified background's style guide
- Respect the Z-axis hierarchy - content must stay within z-index: 10 layer

TECHNICAL REQUIREMENTS:
1. **统一背景集成**: 使用提供的统一背景HTML模板作为基础
2. **Z轴层次遵循**: 确保内容在正确的Z轴层次（z-index: 10）
3. **内容区域填充**: 将具体内容插入到指定的内容区域类名中
4. **样式一致性**: 严格遵循统一背景的样式指南
5. **层次兼容性**: 确保内容与多层背景和谐共存
6. **ECharts数据可视化支持**: 
   - 如果内容包含数据、统计、趋势、对比等信息，必须使用ECharts创建相应图表
   - 使用CDN引入ECharts: <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
   - 创建合适的图表类型（柱状图、折线图、饼图、散点图、雷达图等）
   - 确保图表配色与统一背景的样式指南协调
   - 图表容器必须设置正确的z-index值（不超过10）
   - 提供合理的示例数据来展示图表效果
7. **精确尺寸**: 严格按照1280px × 720px设计，不允许任何偏差
8. **投影优化**: 优化字体大小和对比度以适应投影环境
9. **专业级质量**: 符合商务演示的专业标准

SLIDE SPECIFICATIONS:
- Title: ${slide.title}
- Content: ${slide.content}
- Key Points: ${slide.keyPoints ? slide.keyPoints.join(', ') : 'None'}
- Slide ${slideIndex + 1} of ${totalSlides}
- Target Dimensions: EXACTLY 1280px × 720px (NO EXCEPTIONS)

${unifiedBackground ? `UNIFIED BACKGROUND TEMPLATE WITH Z-AXIS LAYERS:
The following unified background template has been provided with multiple visual layers. You must use this as the base and insert your content into the designated content area:

**Background Theme**: ${unifiedBackground.theme}
**Design Description**: ${unifiedBackground.description}
**Content Area Class**: ${unifiedBackground.contentAreaClass}

**Style Guide to Follow**:
${JSON.stringify(unifiedBackground.styleGuide, null, 2)}

**Background HTML Template (Multi-Layer)**:
${unifiedBackground.htmlTemplate}

CRITICAL Z-AXIS INSTRUCTIONS:
1. Take the above HTML template as your starting point (contains 5+ background layers)
2. Locate the element with class "${unifiedBackground.contentAreaClass}" (z-index: 10)
3. Insert your slide-specific content ONLY into that designated content area
4. Follow the style guide for all text elements, spacing, and visual hierarchy
5. DO NOT modify any background layers, decorative elements, or z-index values
6. Ensure the page number (${slideIndex + 1}/${totalSlides}) is properly displayed
7. All content must work harmoniously with the multi-layered background design
8. Content should complement, not compete with, the background layers
9. Use appropriate transparency and spacing to blend with the layered design` : `FALLBACK MODE (No Unified Background):
Since no unified background is provided, create a professional slide design that:
- Automatically detects and matches the language of the slide content
- Uses appropriate colors, fonts, and layouts based on the content theme
- Creates clear visual hierarchy with proper font sizes
- Implements proper spacing and layout principles
- Ensures excellent readability for presentation environments
- Follows modern design trends appropriate for the topic and audience
- Includes multiple background layers for visual depth`}

${thinkingContent ? `CONTENT LAYOUT GUIDANCE:
Based on the following detailed content layout analysis, implement the HTML code:

${thinkingContent}

IMPORTANT: 
- Follow the content organization and layout decisions from the above analysis precisely
- Pay special attention to the space utilization and information hierarchy recommendations
- Implement the content structure and flow as planned in the analysis
- Use the layout strategy and readability optimizations from the thinking content
- Ensure content integrates well with the multi-layered background design` : `CONTENT ORGANIZATION GUIDANCE:
Since no specific content layout analysis is provided, organize the content effectively:
- Create clear visual hierarchy with appropriate heading sizes
- Use proper spacing between content sections
- Implement logical content flow that guides the reader
- Ensure excellent readability and professional presentation
- Balance text and visual elements appropriately
- Consider the multi-layered background when positioning content`}

${previousSlideInfo ? `STYLE CONSISTENCY REQUIREMENTS:
${previousSlideInfo}

Ensure strict consistency with the previous slide's content organization and presentation style while respecting the unified background layers.` : ''}

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

3. **Z轴层次适配与对比度优化**:
   - 确保内容不与背景装饰层冲突
   - 使用适当的透明度和间距
   - 内容应该"浮"在背景层之上
   - **CRITICAL对比度要求**：
     * 严格使用样式指南中的contentTextColor和headingTextColor
     * 如果背景较浅，使用深色文字（深蓝、深灰、黑色）
     * 如果背景较深，使用浅色文字（白色、浅灰）
     * 必要时使用contentBackgroundColor为内容区域添加半透明背景
     * 确保对比度比例达到WCAG AA标准（≥4.5:1）
   - 保持内容的清晰度和可读性
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
HTML IMPLEMENTATION APPROACH:
${unifiedBackground ? `
1. **基于多层背景**:
   - 使用提供的多层背景HTML模板作为完整的页面结构
   - 在指定的内容区域（${unifiedBackground.contentAreaClass}，z-index: 10）中插入具体内容
   - 严格遵循样式指南中定义的颜色、字体、间距标准
   - 确保内容与多层背景设计完美融合而不冲突

2. **内容插入策略**:
   - 保持所有背景层的结构和样式完全不变
   - 只修改内容区域内的HTML内容
   - 使用样式指南中定义的CSS类名和样式属性
   - 确保页码和其他固定元素正确显示
   - 内容应该与背景层形成和谐的视觉关系
` : `
1. **完整页面创建**:
   - 创建完整的HTML5文档结构
   - 包含Tailwind CSS CDN引入
   - 设计具有多层次的专业背景和布局
   - 确保1280x720px固定尺寸
   - 实现Z轴层次感
`}

ECHARTS INTEGRATION GUIDE (when data visualization is needed):
1. **CDN引入**: Use script tag to include ECharts CDN
2. **图表容器**: Create div element with id and fixed dimensions, z-index ≤ 10
3. **初始化代码**: Use window.onload to initialize chart with echarts.init()
4. **图表配置**: Configure title, tooltip, xAxis, yAxis, and series data
5. **颜色协调**: Use colors from the unified background's style guide
6. **层次兼容**: Ensure charts work well with the multi-layered background
7. **静态配置**: Disable all animations by setting animation: false in chart options

OUTPUT FORMAT REQUIREMENT:
- Generate ONLY the complete HTML code
- Start with <!DOCTYPE html> and end with </html>
- Include all necessary dependencies and styling
- Ensure the code is ready to run directly in a browser
- DO NOT include any markdown code block markers or explanations
- Respect the Z-axis layer hierarchy in the unified background
- Content must integrate seamlessly with the multi-layered design`

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
          
          const userPrompt = `${modificationContext?.isDirectModification ? '基于现有HTML代码和统一背景进行修改' : '基于统一背景模板生成完整的HTML代码'}：

**幻灯片信息:**
- 标题: ${slide.title}
- 内容: ${slide.content}
- 关键要点: ${slide.keyPoints ? slide.keyPoints.join(', ') : '无'}
- 页码: 第${slideIndex + 1}页，共${totalSlides}页

${unifiedBackground ? `**🎨 统一背景模板（重要）:**
- 主题: ${unifiedBackground.theme}
- 描述: ${unifiedBackground.description}
- 内容区域类名: ${unifiedBackground.contentAreaClass}
- 样式指南: ${JSON.stringify(unifiedBackground.styleGuide, null, 2)}

**背景HTML模板:**
${unifiedBackground.htmlTemplate}

**🔧 实现要求:**
1. 使用上述背景HTML模板作为完整的页面基础
2. 在类名为"${unifiedBackground.contentAreaClass}"的元素中插入具体的幻灯片内容
3. 严格遵循样式指南中定义的颜色、字体、间距标准
4. **CRITICAL对比度要求**：
   - 标题文字使用 headingTextColor: ${unifiedBackground.styleGuide.headingTextColor || '深色'}
   - 正文文字使用 contentTextColor: ${unifiedBackground.styleGuide.contentTextColor || '深色'}
   - 如需要，为内容区域添加 contentBackgroundColor: ${unifiedBackground.styleGuide.contentBackgroundColor || '半透明白色'}
   - 确保对比度比例≥4.5:1，满足WCAG AA标准
5. 保持背景的所有样式和结构不变，只修改内容区域
6. 确保页码 (${slideIndex + 1}/${totalSlides}) 正确显示
7. 所有内容必须与背景设计完美融合且清晰可读` : ''}

${thinkingContent ? `**📋 内容布局指导:**
${thinkingContent}

**重要**: 请严格按照上述内容布局分析来组织和呈现幻灯片内容。` : ''}

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

**技术要求:**
- 生成完整的HTML5文档（从<!DOCTYPE html>到</html>）
- ${unifiedBackground ? '基于提供的统一背景模板，只修改内容区域' : '使用Tailwind CSS CDN实现所有样式'}
- 严格按照1280px × 720px尺寸设计
- 确保投影环境下的可读性
- 包含页码指示器和必要的装饰元素
- 不使用任何CSS动画、过渡效果或JavaScript动画
- **关键要求**：所有内容必须在1280×720px边界内完整显示，不能有任何溢出或被截断

**内容简洁性原则**:
- 每页PPT最多包含3-4个核心要点
- 使用关键词、短语和数字，提高可读性
- 优先使用视觉元素（图表、图标、数据）代替大量文字
- 删除冗余信息，只保留最精简的内容

**内容组织策略**:
- 标题：简洁明了，一句话概括主题
- 要点：使用项目符号，每项不超过15个字
- 描述：如需详细说明，控制在15字以内
- 数据：优先使用图表展示，减少文字说明

${previousSlideInfo ? `**风格一致性要求:**
${previousSlideInfo}

请确保与前页设计的严格一致性。` : ''}

**重要输出格式要求：**
- 直接输出HTML代码，不要使用任何代码块标记
- 不要包含 \`\`\`html 或 \`\`\` 这样的markdown格式
- 从 <!DOCTYPE html> 开始，到 </html> 结束
- 不要添加任何解释文字或注释
- 确保输出的是纯HTML代码，可以直接在浏览器中渲染

请生成完整的HTML代码：`
          
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
                temperature: 0.3, // 降低温度以获得更一致的代码输出
                max_tokens: 6000, // 增加token限制以确保完整的HTML生成
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
          console.error('Error in HTML generation:', error)
          if (!isClosed && !isEnding) {
            const errorData = JSON.stringify({ 
              type: 'error', 
              content: `HTML生成失败: ${error}` 
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
    console.error('Error in PPT HTML generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 