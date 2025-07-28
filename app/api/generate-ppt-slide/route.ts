import { NextRequest, NextResponse } from 'next/server'
import { 
  WEB_SEARCH_TOOL, 
  supportsWebSearch, 
  buildSearchPrompt,
  addWebSearchTool
} from '../../../lib/web-search'

export async function POST(request: NextRequest) {
  console.log('request', request)
  try {
    const { slide, slideIndex, totalSlides, theme, model, provider, previousSlideInfo, enableWebSearch = false } = await request.json()

    console.log('幻灯片生成API - 接收到的参数:')
    console.log('- slide.title:', slide?.title)
    console.log('- slideIndex:', slideIndex)
    console.log('- model:', model)
    console.log('- provider:', provider)
    console.log('- enableWebSearch:', enableWebSearch)

    // 检查是否支持联网搜索
    const canUseWebSearch = enableWebSearch && supportsWebSearch(provider)
    console.log('联网搜索状态:', { enableWebSearch, provider, canUseWebSearch })

    if (!slide || !model || !provider) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 根据主题选择样式配置
    const themeConfig = {
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

    const currentTheme = themeConfig[theme as keyof typeof themeConfig] || themeConfig.modern

    // 构建专门用于生成幻灯片HTML的系统提示词，支持思考过程和风格连贯性
    const systemPrompt = `You are an expert presentation designer specializing in creating beautiful, professional HTML slides using Tailwind CSS. You have extensive experience in corporate presentations, visual design, and user experience.

${canUseWebSearch ? `
🌐 INTERNET SEARCH CAPABILITY:
You have access to real-time internet search through the $web_search tool. Use this capability to:
- Gather the latest data, statistics, and examples related to the slide content
- Find authoritative sources and current information
- Verify facts and get up-to-date industry insights
- Discover relevant case studies and best practices
- Obtain current market trends and developments

When creating slide content, actively use search to ensure information is accurate, current, and well-supported by authoritative sources.
` : ''}

CRITICAL OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACT STRUCTURE:

STEP 1: THINKING PHASE (MUST BE COMPLETED FIRST)
Start your response with <think> and end with </think>. This section must contain your complete design analysis before any HTML generation begins.

STEP 2: GENERATION PHASE (ONLY AFTER THINKING IS COMPLETE)
After the thinking phase is completely finished, provide the complete HTML code.

REQUIRED THINKING STRUCTURE (MUST BE EXTREMELY DETAILED):
1. **需求分析** (Requirements Analysis)
   - 分析幻灯片主题和内容要求
   - 确定目标受众和演示场景
   - 理解在整个演示文稿中的位置和作用

2. **设计策略** (Design Strategy)
   - 基于内容确定最适合的布局方案
   - 选择视觉层次和信息架构
   - 确定核心设计理念和视觉风格

3. **尺寸和比例规划** (Dimension & Proportion Planning)
   - 针对1280px宽 × 720px高的标准演示尺寸进行设计
   - 规划各区域的比例分配（如左右分栏、上下布局等）
   - 考虑不同屏幕和投影设备的显示效果

4. **色彩方案设计** (Color Scheme Design)
   - 分析当前主题色彩配置
   - 确定主色调、辅助色和强调色的使用
   - 考虑色彩的心理效应和品牌一致性
   - 如有前页参考，详细分析其色彩特点并保持一致

5. **版式布局设计** (Layout Design)
   - 确定标题、内容、装饰元素的具体位置
   - 规划网格系统和对齐方式
   - 设计视觉流向和阅读路径
   - 确保重要信息的视觉突出

6. **Tailwind CSS实现策略** (Implementation Strategy)
   - 选择具体的Tailwind类名来实现设计效果
   - 规划响应式设计和动画效果
   - 考虑代码的可维护性和性能

7. **视觉装饰和图形元素** (Visual Elements)
   - 设计背景装饰、图标、分割线等元素
   - 确保装饰元素支持而不干扰主要内容
   - 考虑品牌元素和主题相关的视觉符号

8. **风格一致性检查** (Style Consistency)
   - 如有前页参考，详细对比分析设计元素
   - 确保字体大小、间距、圆角等细节一致
   - 保持整体演示文稿的视觉连贯性

IMPORTANT: Your thinking process must be comprehensive and complete before you start generating any HTML code. Do not mix thinking and code generation.

SLIDE SPECIFICATIONS:
- Title: ${slide.title}
- Content: ${slide.content}
- Key Points: ${slide.keyPoints.join(', ')}
- Slide ${slideIndex + 1} of ${totalSlides}
- Target Dimensions: 1280px × 720px

DESIGN REQUIREMENTS:
1. **专业演示标准**: 创建适合商务演示的专业级幻灯片
2. **尺寸精确**: 严格按照1280px × 720px设计，确保在标准投影设备上完美显示
3. **主题配色**: 使用提供的主题色彩配置
4. **视觉层次**: 建立清晰的信息层次和视觉引导
5. **品牌一致性**: 保持专业、现代、国际化的设计风格
6. **可读性**: 确保所有文本在投影环境下清晰可读
7. **风格统一**: 如有前页参考，必须保持设计语言的高度一致

THEME CONFIGURATION:
- Background: ${currentTheme.backgroundColor}
- Primary Text: ${currentTheme.primaryColor}
- Secondary Text: ${currentTheme.secondaryColor}
- Accent Color: ${currentTheme.accentColor}
- Card Style: ${currentTheme.cardStyle}

TECHNICAL REQUIREMENTS:
1. 使用Tailwind CSS CDN实现所有样式
2. 创建完整的HTML5文档结构
3. 实现响应式设计原则
4. 添加适当的过渡动画和交互效果
5. 在右下角添加页码指示器
6. 确保代码结构清晰、语义化

EXACT OUTPUT FORMAT (NO DEVIATION ALLOWED):
<think>
[Write your extremely detailed design thinking process here, covering all 8 aspects above. This must be complete before any HTML generation begins.]
</think>

[Complete HTML code from <!DOCTYPE html> to </html>]

Remember: Complete ALL thinking first, then generate HTML. Do not interleave thinking and code generation.`

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
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
                  { role: 'user', content: `请为演示文稿创建一个专业的幻灯片页面。

**重要：请严格按照以下两个步骤执行**
第一步：完整的设计思考过程（用<think></think>包围）
第二步：完整的HTML代码生成

**核心信息:**
标题: ${slide.title}
内容描述: ${slide.content}
关键要点: ${slide.keyPoints.join(', ')}

**设计要求:**
- 这是第${slideIndex + 1}页，共${totalSlides}页
- 目标尺寸: 1280px × 720px (标准演示比例)
- 适用场景: 商务演示、投影展示
- 设计风格: 专业、现代、国际化

**技术要求:**
- 使用Tailwind CSS实现所有样式
- 确保在投影设备上的可读性
- 包含适当的视觉层次和引导
- 添加页码和品牌元素

${previousSlideInfo ? `**风格参考信息:**
${previousSlideInfo}

请特别注意保持与前页的设计一致性，包括：
- 相同的色彩体系和配色方案
- 一致的字体大小和层次结构
- 相同的布局网格和对齐方式
- 统一的装饰元素和视觉风格
- 保持整体演示文稿的专业性和连贯性` : '这是演示文稿的第一页或前面页面的风格信息不可用，请创建一个专业、现代的设计风格，为后续页面建立设计基准。'}

**执行要求:**
1. 首先在<think></think>标签内完成所有8个维度的详细设计分析
2. 思考过程必须完整结束后，再开始生成HTML代码
3. 不要在思考过程中混入任何HTML代码
4. 确保思考过程涵盖系统提示中的所有要求

请严格按照这个顺序执行，确保思考和生成两个阶段完全分离。` }
                ],
                temperature: 0.7,
                max_tokens: 4000,
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
                  { role: 'user', content: `请为演示文稿创建一个专业的幻灯片页面。

**重要：请严格按照以下两个步骤执行**
第一步：完整的设计思考过程（用<think></think>包围）
第二步：完整的HTML代码生成

**核心信息:**
标题: ${slide.title}
内容描述: ${slide.content}
关键要点: ${slide.keyPoints.join(', ')}

**设计要求:**
- 这是第${slideIndex + 1}页，共${totalSlides}页
- 目标尺寸: 1280px × 720px (标准演示比例)
- 适用场景: 商务演示、投影展示
- 设计风格: 专业、现代、国际化

**技术要求:**
- 使用Tailwind CSS实现所有样式
- 确保在投影设备上的可读性
- 包含适当的视觉层次和引导
- 添加页码和品牌元素

${previousSlideInfo ? `**风格参考信息:**
${previousSlideInfo}

请特别注意保持与前页的设计一致性，包括：
- 相同的色彩体系和配色方案
- 一致的字体大小和层次结构
- 相同的布局网格和对齐方式
- 统一的装饰元素和视觉风格
- 保持整体演示文稿的专业性和连贯性` : '这是演示文稿的第一页或前面页面的风格信息不可用，请创建一个专业、现代的设计风格，为后续页面建立设计基准。'}

**执行要求:**
1. 首先在<think></think>标签内完成所有8个维度的详细设计分析
2. 思考过程必须完整结束后，再开始生成HTML代码
3. 不要在思考过程中混入任何HTML代码
4. 确保思考过程涵盖系统提示中的所有要求

请严格按照这个顺序执行，确保思考和生成两个阶段完全分离。` }
                ],
                temperature: 0.7,
                max_tokens: 4000,
                stream: true,
              }),
            })
          } else {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              error: 'Unsupported provider for slide generation' 
            })))
            controller.close()
            return
          }

          if (!response.ok) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              error: 'Failed to generate slide' 
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
    console.error('Error generating PPT slide:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 