import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { 
      userInput, 
      currentSlides, 
      selectedElement, 
      chatHistory, 
      model, 
      provider 
    } = await request.json()

    if (!userInput || !model || !provider) {
      return NextResponse.json(
        { error: 'Missing required parameters: userInput, model, or provider' },
        { status: 400 }
      )
    }

    console.log('智能分析API - 接收到的参数:')
    console.log('- userInput:', userInput)
    console.log('- currentSlides数量:', currentSlides?.length || 0)
    console.log('- selectedElement:', selectedElement?.description || '无')
    console.log('- model:', model)
    console.log('- provider:', provider)

    // 构建分析上下文
    const slidesInfo = currentSlides?.map((slide: any, index: number) => 
      `第${index + 1}页: "${slide.title}" - ${slide.content?.substring(0, 50)}...`
    ).join('\n') || '无幻灯片信息'

    const recentHistory = chatHistory?.slice(-3).map((msg: any) => 
      `${msg.type}: ${msg.content?.substring(0, 100)}...`
    ).join('\n') || '无对话历史'

    // 智能分析系统提示词
    const systemPrompt = `你是一个PPT修改意图分析专家。请分析用户的修改需求，并返回结构化的判断结果。

**核心任务：**
1. 准确理解用户的修改意图和范围
2. 判断是单页修改、多页修改还是全局修改
3. 提取具体的修改要求
4. 给出置信度和建议操作

**分析规则：**
1. 如果用户选中了元素，优先考虑单页修改（置信度+0.3）
2. 如果提到"所有页面"、"整体"、"全部"、"每一页"，判断为全局修改
3. 如果提到具体页码（如"第1页"、"第三页"），判断为单页或多页修改
4. 如果提到主题、风格、配色、整体布局等，通常是全局修改
5. 如果需求模糊不清，设置needsConfirmation为true
6. 文本内容修改通常是单页，样式主题修改通常是全局

**修改类型定义：**
- content: 内容修改（文字、标题、要点等）
- style: 样式修改（颜色、字体、大小等）
- structure: 结构修改（布局、排版、组件等）
- theme: 主题修改（整体风格、配色方案等）
- add_new: 添加新页面

请严格按照以下JSON格式返回分析结果，不要包含任何其他内容：

{
  "intent": {
    "scope": "single|multiple|global|add_new",
    "confidence": 0.95,
    "reasoning": "详细的判断理由",
    "targetPages": [0],
    "modificationType": "content|style|structure|theme|add_new",
    "priority": "high|medium|low"
  },
  "suggestedAction": {
    "actionType": "regenerate_single_page|regenerate_multiple_pages|regenerate_all_pages|add_new_slide",
    "description": "具体的操作描述",
    "needsConfirmation": false
  },
  "extractedRequirements": {
    "specificChanges": ["具体的修改要求"],
    "stylePreferences": ["风格偏好"],
    "contentUpdates": ["内容更新要求"]
  }
}`

    // 构建用户提示词
    const userPrompt = `
**当前PPT信息：**
总页数：${currentSlides?.length || 0}
幻灯片列表：
${slidesInfo}

**选中元素信息：**
${selectedElement ? `
- 页面：第${selectedElement.slideIndex + 1}页
- 元素：${selectedElement.description}
- 上下文：${selectedElement.context}
` : '无选中元素'}

**最近对话历史：**
${recentHistory}

**用户修改需求：**
"${userInput}"

请分析上述信息，判断用户的修改意图并返回JSON格式的结果。
    `

    // 根据provider选择相应的API
    let apiUrl = ''
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (provider === 'kimi' || provider === 'deepseek') {
      apiUrl = 'https://api.moonshot.cn/v1/chat/completions'
      headers['Authorization'] = `Bearer ${process.env.MOONSHOT_API_KEY}`
    } else if (provider === 'openai') {
      apiUrl = 'https://api.openai.com/v1/chat/completions'
      headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`
    } else {
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 }
      )
    }

    console.log('调用大模型API进行意图分析...')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1, // 低温度确保结果稳定
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('大模型API调用失败:', response.status, errorText)
      throw new Error(`API call failed: ${response.status}`)
    }

    const data = await response.json()
    const analysisContent = data.choices?.[0]?.message?.content

    if (!analysisContent) {
      throw new Error('No analysis content received from AI')
    }

    console.log('大模型返回的分析结果:', analysisContent)

    // 解析JSON结果
    let analysisResult
    try {
      // 提取JSON部分（可能包含其他文本）
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No valid JSON found in response')
      }
    } catch (parseError) {
      console.error('解析AI返回的JSON失败:', parseError)
      console.error('原始内容:', analysisContent)
      
      // 提供默认的分析结果
      analysisResult = {
        intent: {
          scope: selectedElement ? 'single' : 'unclear',
          confidence: 0.5,
          reasoning: '无法解析AI分析结果，使用默认判断',
          targetPages: selectedElement ? [selectedElement.slideIndex] : [],
          modificationType: 'content',
          priority: 'medium'
        },
        suggestedAction: {
          actionType: selectedElement ? 'regenerate_single_page' : 'need_clarification',
          description: '需要进一步确认修改范围和具体要求',
          needsConfirmation: true
        },
        extractedRequirements: {
          specificChanges: [userInput],
          stylePreferences: [],
          contentUpdates: []
        }
      }
    }

    // 验证和优化分析结果
    if (selectedElement && analysisResult.intent.scope === 'unclear') {
      analysisResult.intent.scope = 'single'
      analysisResult.intent.targetPages = [selectedElement.slideIndex]
      analysisResult.intent.confidence = Math.min(analysisResult.intent.confidence + 0.3, 1.0)
      analysisResult.suggestedAction.needsConfirmation = false
    }

    console.log('最终分析结果:', JSON.stringify(analysisResult, null, 2))

    return NextResponse.json({
      success: true,
      analysis: analysisResult
    })

  } catch (error) {
    console.error('智能分析API错误:', error)
    return NextResponse.json(
      { 
        error: 'Analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 