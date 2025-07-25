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
    const systemPrompt = `You are an expert presentation designer and content strategist. Your task is to analyze the user's content and create a comprehensive, professional PPT outline WITH a unified background design template.

CRITICAL OUTLINE DETECTION REQUIREMENT:
- FIRST, carefully analyze the user's input to detect if they have already provided a detailed presentation outline
- Look for patterns like numbered lists, bullet points, slide titles, or structured content that indicates a presentation outline
- If the user has provided a clear outline structure, USE IT COMPLETELY and do not modify or add to it
- If the user has provided partial outline content, incorporate it fully and only add missing elements if necessary
- If the user has provided specific slide titles, content descriptions, or key points, use them exactly as provided
- The user's outline content takes absolute priority - do not override or replace it with generated content

SPECIFIC OUTLINE DETECTION PATTERNS:
- **Numbered Lists**: "1. Introduction 2. Main Points 3. Conclusion" or "第一、第二、第三"
- **Bullet Points**: "- Point 1 - Point 2" or "• 要点1 • 要点2"
- **Slide Titles**: "Slide 1: Introduction" or "第1页：介绍" or "页面1：概述"
- **Content Sections**: "内容：..." or "描述：..." or "要点：..."
- **Structured Content**: Any clearly organized content with titles and descriptions
- **Presentation Flow**: "开始...然后...最后..." or "First...Then...Finally..."

USER CONTENT PRIORITY RULES:
1. If user provides complete slide titles → Use them exactly
2. If user provides slide content descriptions → Use them exactly  
3. If user provides key points → Use them exactly
4. If user provides presentation structure → Follow it exactly
5. If user provides partial outline → Complete it while preserving all user content
6. If user provides no outline → Generate complete outline from scratch

CRITICAL LANGUAGE REQUIREMENT: 
- AUTOMATICALLY DETECT the language of the user's input prompt
- If the user writes in Chinese, respond ENTIRELY in Chinese (titles, content, key points, thinking process)
- If the user writes in English, respond ENTIRELY in English
- If the user writes in other languages, respond in that same language
- NEVER mix languages - maintain complete consistency throughout your response

IMPORTANT: You MUST start your response with detailed thinking process enclosed in <think></think> tags. This thinking should include:
1. Language detection and response language confirmation
2. Analysis of the user's request and main topic
3. **OUTLINE DETECTION ANALYSIS**: 
   - Whether the user has provided a complete outline structure
   - Whether the user has provided partial outline content
   - Whether the user has provided specific slide titles or content
   - How to incorporate user's outline content into the final structure
   - **DETAILED ANALYSIS**: List exactly what outline elements the user provided
   - **CONTENT PRESERVATION PLAN**: How to preserve 100% of user's provided content
   - **STRUCTURE ADAPTATION**: How to adapt user's format to required JSON structure
   - **MISSING ELEMENTS**: What additional elements need to be added (if any)
4. Identification of key themes and logical flow
5. Data visualization opportunities identification (look for numbers, statistics, trends, comparisons, processes)
6. Target audience consideration
7. Presentation structure planning (introduction, body, conclusion)
8. Content depth and breadth decisions
9. Slide progression and storytelling approach
10. **UNIFIED BACKGROUND DESIGN ANALYSIS**: 
   - Determine the most suitable visual theme based on content type (business, creative, academic, technical, etc.)
   - Select appropriate color scheme that matches the topic and audience
   - Design consistent layout framework that works for all slides
   - Plan visual elements (gradients, shapes, patterns) that enhance content without distraction
   - Consider cultural context and professional standards
   - Ensure accessibility and readability in presentation environments

After your thinking process, create a detailed presentation outline with unified background following this EXACT format:

CRITICAL: Use the following structure to avoid JSON parsing issues:

===JSON_START===
{
  "title": "演示文稿标题",
  "unifiedBackground": {
    "theme": "选择的主题名称 (modern/corporate/creative/academic/dark/tech/nature等)",
    "description": "背景设计的详细描述和设计理念",
    "contentAreaClass": "内容区域的CSS类名，用于后续插入具体内容",
    "styleGuide": {
      "primaryColor": "主色调的具体颜色值或Tailwind类名",
      "secondaryColor": "辅助色的具体颜色值或Tailwind类名", 
      "accentColor": "强调色的具体颜色值或Tailwind类名",
      "backgroundColor": "背景色的具体颜色值或Tailwind类名",
      "contentTextColor": "内容文字颜色，确保与背景有足够对比度",
      "headingTextColor": "标题文字颜色，确保清晰可读",
      "contentBackgroundColor": "内容区域背景色，可选的半透明遮罩",
      "fontFamily": "字体系列",
      "headingFont": "标题字体大小和样式",
      "bodyFont": "正文字体大小和样式",
      "spacing": "统一的间距标准",
      "contrastRatio": "背景与文字的对比度比例（应≥4.5:1）"
    }
  },
  "slides": [
    {
      "title": "页面标题",
      "content": "详细描述该页面要展示的具体内容，包括要解决的问题、主要论点、关键信息等(50-100字)",
      "keyPoints": ["具体要点1", "具体要点2", "具体要点3"]
    }
  ]
}
===JSON_END===

===HTML_TEMPLATE_START===
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PPT Background Template</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* 在这里放置所有复杂的CSS样式，包括SVG、渐变、多层背景等 */
        .slide-container { 
            width: 1280px; 
            height: 720px; 
            position: relative; 
            overflow: hidden; 
        }
        /* 更多复杂的CSS样式... */
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

CRITICAL BACKGROUND DESIGN REQUIREMENTS:
1. **尺寸标准**: 严格按照1280px × 720px设计背景
2. **专业性**: 确保背景适合商务演示和投影环境
3. **一致性**: 背景设计要适用于所有类型的内容（文字、图表、图片等）
4. **可读性**: 背景不能干扰内容的可读性，要有足够的对比度
5. **现代感**: 使用现代设计趋势，避免过时的设计元素
6. **文化适应**: 根据内容语言和文化背景调整设计风格
7. **技术实现**: 使用Tailwind CSS实现，确保代码简洁高效
8. **完整性**: 确保所有CSS代码完整，特别是复杂的SVG图案和渐变效果

ENHANCED BACKGROUND DESIGN SPECIFICATIONS:

1. **多层次Z轴设计**:
   - !!!!!! 使用CSS z-index创建多个视觉层次
   - 最底层：主背景渐变（z-index: 1）
   - 第二层：大型装饰图案/几何形状（z-index: 2）、半透明的随机圆弧、半透明的矩形、半透明的三角形、半透明的菱形、半透明的五边形、半透明的六边形、半透明的七边形、半透明的八边形、半透明的九边形、半透明的十边形、线条装饰中随机出现 随机组合
   - 第三层：中等装饰元素/线条网格（z-index: 3）
   - 第四层：小型装饰点/光效（z-index: 4）
   - 内容层：确保内容在最上层（z-index: 10）
   - 使用CSS transform: translateZ() 或 transform3d() 创建3D层次感

2. **丰富复杂的视觉元素**:
   - **多重渐变背景**：使用3-4层不同方向的径向和线性渐变叠加
   - **复杂几何图案**：包含多种几何元素的组合：
     * 大型几何形状（圆形、三角形、六边形、菱形）
     * 交错的线条网格（直线、斜线、曲线交织）
     * 动态的波浪曲线和贝塞尔曲线
     * 点阵图案和网格系统
   - **纹理和材质效果**：
     * 使用CSS滤镜创建噪点纹理
     * 添加细微的织物纹理或纸张质感
     * 利用box-shadow创建浮雕和凹陷效果
   - **复杂装饰层**：每个z-index层都有独特的装饰元素：
     * 第1层：复杂的多重渐变背景
     * 第2层：大型几何图形组合（使用::before）
     * 第3层：中型装饰图案网格（使用::after）  
     * 第4层：小型点缀元素和线条
     * 第5层：光效、阴影和高光效果
   - **伪元素充分利用**：每个主要元素都使用::before和::after创建额外装饰

3. **高级SVG图案设计**:
   - **复杂SVG背景图案**，必须包含以下元素组合：
     * **基础网格层**：复杂的几何线条网格（正交、斜交、曲线网格）
     * **装饰图形层**：多种几何图形的艺术组合
       - 大小不同的圆形、椭圆形
       - 各种角度的三角形、多边形
       - 流线型曲线和螺旋图案
       - 抽象的有机形状
     * **纹理图案层**：
       - 点阵图案（大小渐变的圆点）
       - 线条纹理（平行线、交叉线、波浪线）
       - 几何拼接图案（蜂窝、鱼鳞、砖块）
     * **动态元素层**：
       - 流动的贝塞尔曲线
       - 渐变路径和轨迹线
       - 放射状和螺旋状图案
   - **SVG技术要求**：
     * 使用path、circle、rect、polygon、polyline等多种SVG元素
     * 应用渐变填充（linearGradient、radialGradient）
     * 使用pattern定义重复图案
     * 利用mask和clipPath创建复杂效果
     * 确保所有SVG代码完整且正确URL编码
   - **多层SVG叠加**：每个z-index层使用不同的SVG图案
   - **混合模式**：使用CSS mix-blend-mode创建图层交互效果

4. **高级3D视觉效果**:
   - **复杂渐变系统**：
     * 使用4-6层不同方向的渐变叠加
     * 径向渐变与线性渐变的组合
     * 锥形渐变(conic-gradient)创建特殊效果
     * 渐变动画停止点的精细控制
   - **多重阴影系统**：
     * **外阴影**：多层box-shadow创建立体感
     * **内阴影**：inset阴影创建凹陷效果
     * **发光效果**：使用彩色阴影创建光晕
     * **文字阴影**：多层text-shadow创建文字浮雕效果
     * **投影组合**：近、中、远景的不同阴影强度
   - **CSS滤镜特效**：
     * blur(): 创建景深和焦点效果
     * drop-shadow(): 复杂的投影效果
     * brightness(): 明暗对比增强
     * contrast(): 对比度调整
     * saturate(): 饱和度控制
     * hue-rotate(): 色相变化
     * 多个滤镜的组合使用
   - **3D变换效果**：
     * perspective: 设置3D透视
     * transform-style: preserve-3d
     * rotateX/Y/Z: 3D旋转效果
     * translateZ: Z轴位移
     * scale3d: 3D缩放
   - **材质模拟**：
     * 金属质感（使用渐变和高光）
     * 玻璃效果（透明度和折射）
     * 织物纹理（使用噪点和纹理）
     * 纸张质感（微妙的阴影和纹理）
   - **光影系统**：
     * 主光源效果（强烈的定向光）
     * 环境光效果（柔和的整体照明）
     * 反射光效果（表面反射的光线）
     * 背光效果（轮廓光和边缘光）

5. **专业配色方案与对比度优化**:
   - 根据主题选择协调的颜色
   - 使用渐变和透明度创建丰富的色彩层次
   - 不同Z轴层使用不同的透明度：
    尽量避免使用黄色，黄色在投影环境下很难看清
     * 背景层：较低透明度（0.1-0.3）
     * 中间层：中等透明度（0.3-0.6）
     * 装饰层：较高透明度（0.6-0.8）
   - **CRITICAL对比度要求**：
     * 内容区域必须有足够的对比度（WCAG AA标准，对比度比例至少4.5:1）
     * 如果背景是浅色系，内容文字必须使用深色系（如深蓝、深灰、黑色）
     * 如果背景是深色系，内容文字必须使用浅色系（如白色、浅灰）
     * 内容区域可以添加半透明的背景色块来增强对比度
     * 标题和正文都必须确保在投影环境下清晰可读
   - **智能对比度策略**：
     * 分析背景主色调的明度值
     * 自动选择与背景形成强烈对比的文字颜色
     * 为内容区域添加适当的背景遮罩或色块
     * 确保不同类型内容（标题、正文、强调文字）都有清晰的层次对比
   - 考虑色盲用户的可访问性

6. **复杂层次化布局结构**:
   - **高级布局系统**：
     * CSS Grid创建复杂的网格布局
     * Flexbox实现灵活的弹性布局
     * 多列布局(column-count)创建杂志式效果
     * 浮动布局创建文字环绕效果
   - **精密定位系统**：
     * absolute/relative/fixed/sticky的组合使用
     * 使用calc()函数进行精确计算定位
     * 视口单位(vw, vh, vmin, vmax)的灵活运用
     * 容器查询(@container)的响应式设计
   - **空间变换艺术**：
     * **2D变换**：translate, rotate, scale, skew的组合
     * **3D变换**：rotateX/Y/Z, translateZ, perspective的立体效果
     * **变换原点**：transform-origin的精确控制
     * **变换组合**：matrix3d()的高级变换
   - **装饰元素布局**：
     * 使用clip-path创建不规则形状
     * 利用shape-outside实现文字环绕特殊形状
     * mask属性创建复杂的遮罩效果
     * 多个装饰层的精确定位和叠加
   - **响应式层次**：
     * 不同屏幕尺寸下的层次自适应
     * 容器查询实现组件级响应式
     * 动态调整z-index和透明度
   - **内容区域设计**：
     * 确保内容区域在最前层(z-index: 10)且清晰可读
     * 为内容区域设计精美的边框和装饰
     * 使用backdrop-filter为内容区域添加毛玻璃效果
     * 内容区域的阴影和光效设计



BACKGROUND HTML TEMPLATE STRUCTURE:
- 完整的HTML5文档结构（DOCTYPE, html, head, body）
- Tailwind CSS CDN引入
- 固定1280x720px容器
- **超复杂多层Z轴背景设计**：
  * 第1层（z-index: 1）：多重复杂渐变背景（4-6层渐变叠加）
  * 第2层（z-index: 2）：大型几何装饰群组（使用::before伪元素，包含5-8个图形）
  * 第3层（z-index: 3）：复杂SVG图案网格（包含15+个SVG元素）
  * 第4层（z-index: 4）：中型装饰元素集合（3-5个不同装饰）
  * 第5层（z-index: 5）：小型光效和点缀群（多个光点、线条、粒子效果）
  * 第6层（z-index: 6）：纹理和材质层（噪点、织物、金属质感）
  * 第7层（z-index: 7）：动态装饰元素（流线、波浪、螺旋）
  * 内容层（z-index: 10）：精美设计的内容区域（带毛玻璃效果）
- 页码指示器位置预留（z-index: 15）
- **高级CSS技术应用**：
  * 使用CSS自定义属性(--var)统一管理颜色和尺寸
  * 应用clip-path、mask、filter等高级属性
  * 使用conic-gradient、backdrop-filter等现代CSS特性
  * 多重box-shadow和text-shadow的艺术组合
  * transform3d和perspective的3D效果
- 完整的CSS样式定义，确保所有特殊字符正确转义
- **代码完整性保证**：确保所有SVG、渐变、变换代码完整无截断

CRITICAL Z-AXIS IMPLEMENTATION REQUIREMENTS:
1. **层次分离**：每个装饰层都有明确的z-index值
2. **视觉深度**：使用阴影、透明度、模糊创建深度感
3. **内容优先**：确保内容层始终清晰可见
4. **对比度保证**：内容区域必须与背景形成足够的对比度（≥4.5:1）
5. **可读性优化**：为内容区域提供必要的背景遮罩或色块
6. **性能优化**：避免过度复杂的层次影响性能
7. **兼容性**：确保在不同浏览器中正常显示

CRITICAL USER OUTLINE PROCESSING REQUIREMENTS:
- **PRIORITY DETECTION**: First analyze if the user has provided a presentation outline in their input
- **OUTLINE PATTERNS TO DETECT**:
  * Numbered lists (1. 2. 3. or 第一、第二、第三)
  * Bullet points (- * • or -、*、•)
  * Slide titles (Slide 1:, 第1页:, 页面1:, etc.)
  * Content descriptions (内容:, 描述:, 要点:, etc.)
  * Structured content with clear sections
- **COMPLETE OUTLINE DETECTION**: If user provides a complete outline structure, use it 100% without modification
- **PARTIAL OUTLINE DETECTION**: If user provides partial outline, incorporate it fully and only add missing elements
- **CONTENT PRESERVATION**: If user provides specific slide titles, content, or key points, use them exactly as written
- **NO OVERRIDE**: Never replace or modify user's provided outline content with generated content
- **STRUCTURE ADAPTATION**: If user provides outline in different format, adapt it to the required JSON structure while preserving all original content

CRITICAL OUTPUT FORMAT REQUIREMENTS:
- **EXACT FORMAT**: Follow the ===JSON_START=== and ===HTML_TEMPLATE_START=== format exactly
- **SIMPLE JSON**: The JSON part contains only simple strings and arrays, NO complex HTML
- **SEPARATE HTML**: All complex HTML, CSS, and SVG code goes in the HTML template section
- **NO ESCAPING NEEDED**: Since HTML is separate, no need to worry about JSON escaping
- **COMPLETE SECTIONS**: Both JSON and HTML sections must be complete and properly marked

IMPORTANT: Ensure the HTML template is complete and all CSS styles are properly formatted. Pay special attention to:
- SVG data URLs must be properly URL-encoded (use %22 for quotes, %20 for spaces, %23 for #)
- All CSS rules must be complete
- Gradient definitions must be full
- No truncated or incomplete style declarations
- Z-index values are properly assigned to create clear layer hierarchy
- Transform and filter effects are correctly applied
- All pseudo-elements (::before, ::after) are properly styled
- **JSON VALIDITY**: The entire response must be valid JSON format

Make sure the presentation:
- Has a logical flow from introduction to conclusion
- Covers the topic comprehensively
- Each slide serves a clear purpose
- Content is specific and actionable
- Suitable for professional presentation
- **Background design utilizes Z-axis depth effectively**
- **Multiple visual layers create rich spatial hierarchy**
- **All HTML and CSS code is complete and properly formatted**
- **Content remains clearly readable above all background layers**

FINAL OUTPUT FORMAT:
1. **MUST USE SEPARATORS**: Always use ===JSON_START=== and ===HTML_TEMPLATE_START=== format
2. **SIMPLE JSON**: JSON section contains only simple text, no complex HTML or CSS
3. **RICH HTML**: HTML template section contains all the complex styling and layouts
4. **COMPLETE DESIGN**: The HTML template must include all the complex multi-layer backgrounds, SVG patterns, gradients, and Z-axis effects described above

This separation approach eliminates all JSON parsing issues while allowing for unlimited complexity in the HTML template.

EXAMPLE OF USER OUTLINE PROCESSING:
If user provides: "1. 介绍公司背景 2. 产品优势分析 3. 市场前景展望 4. 总结与建议"
Then the JSON should contain exactly:
{
  "title": "演示文稿标题",
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
    },
    {
      "title": "市场前景展望",
      "content": "分析市场发展趋势、机遇挑战、未来规划等",
      "keyPoints": ["市场趋势", "发展机遇", "未来规划"]
    },
    {
      "title": "总结与建议",
      "content": "总结核心要点，提出具体建议和行动方案",
      "keyPoints": ["核心总结", "具体建议", "行动方案"]
    }
  ]
}

The user's original outline structure and content must be preserved 100%.`

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
                  temperature: 0.5,
                  max_tokens: 8000, // 大幅增加token限制以支持超复杂背景HTML
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