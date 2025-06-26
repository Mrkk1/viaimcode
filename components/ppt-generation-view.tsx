"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Download, FileText, Presentation, Loader2, Send, Code, Eye, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface PPTSlide {
  id: string
  title: string
  content: string
  htmlCode: string
  isGenerating: boolean
  generationProgress: string
  thinkingContent?: string
  realtimeThinkingContent?: string
  viewMode: 'render' | 'code' | 'thinking' // 每张幻灯片独立的视图模式
  userSelectedViewMode?: 'render' | 'code' | 'thinking' // 用户手动选择的视图模式
}

interface PPTOutline {
  title: string
  slides: Array<{
    title: string
    content: string
    keyPoints: string[]
  }>
}

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isGenerating?: boolean
}

interface PPTGenerationViewProps {
  prompt: string
  model: string
  provider: string
  onBack: () => void
}

export function PPTGenerationView({
  prompt,
  model,
  provider,
  onBack
}: PPTGenerationViewProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentChatInput, setCurrentChatInput] = useState("")
  const [slides, setSlides] = useState<PPTSlide[]>([])
  const [outline, setOutline] = useState<PPTOutline | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showOutline, setShowOutline] = useState(true)

  // 初始化 - 自动开始生成PPT
  useEffect(() => {
    if (prompt.trim()) {
      handleInitialGeneration()
    }
  }, [])

  const handleInitialGeneration = async () => {
    setIsGenerating(true)
    
    // 不添加用户消息到聊天记录，直接开始生成
    // 添加AI生成中消息
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: '正在分析您的内容...',
      timestamp: new Date(),
      isGenerating: true
    }
    setChatMessages([aiMessage])

    try {
      // 流式生成大纲
      const outlineResponse = await fetch('/api/generate-ppt-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          provider
        }),
      })

      if (!outlineResponse.ok) {
        throw new Error('Failed to generate outline')
      }

      const reader = outlineResponse.body?.getReader()
      if (!reader) {
        throw new Error('Stream could not be read')
      }

      let receivedContent = ""
      let thinkingContent = ""
      let isInThinkingBlock = false
      let thinkingStartProcessed = false // 标记思考开始是否已处理
      let thinkingEndProcessed = false   // 标记思考结束是否已处理
      let outlineContent = ""

      // 处理流式大纲生成
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.type === 'content' && data.content) {
              receivedContent += data.content
              console.log('接收到内容片段:', data.content)
              
              // 检查思考标签
              const thinkingStartIndex = receivedContent.indexOf("<think>")
              const thinkingEndIndex = receivedContent.indexOf("</think>")
              
              console.log('思考标签检查:', { thinkingStartIndex, thinkingEndIndex, isInThinkingBlock })
              
              if (thinkingStartIndex !== -1) {
                if (!isInThinkingBlock) {
                  isInThinkingBlock = true
                  console.log('进入思考块')
                  setChatMessages(prev => prev.map(msg => 
                    msg.id === aiMessage.id 
                      ? { ...msg, content: '正在思考PPT结构...' }
                      : msg
                  ))
                }
                
                if (thinkingEndIndex !== -1) {
                  // 思考完成
                  thinkingContent = receivedContent.substring(thinkingStartIndex + 7, thinkingEndIndex)
                  outlineContent = receivedContent.substring(thinkingEndIndex + 8)
                  isInThinkingBlock = false
                  
                  console.log('思考完成')
                  console.log('思考内容长度:', thinkingContent.length)
                  console.log('大纲内容长度:', outlineContent.length)
                  console.log('大纲内容预览:', outlineContent.substring(0, 200))
                  
                  setChatMessages(prev => prev.map(msg => 
                    msg.id === aiMessage.id 
                      ? { ...msg, content: `思考过程：\n${thinkingContent}\n\n正在生成大纲...` }
                      : msg
                  ))
                } else {
                  // 正在思考中
                  thinkingContent = receivedContent.substring(thinkingStartIndex + 7)
                  setChatMessages(prev => prev.map(msg => 
                    msg.id === aiMessage.id 
                      ? { ...msg, content: `思考中...\n${thinkingContent}` }
                      : msg
                  ))
                }
              } else if (!isInThinkingBlock) {
                // 大纲内容
                outlineContent = receivedContent
                console.log('更新大纲内容，当前长度:', outlineContent.length)
                setChatMessages(prev => prev.map(msg => 
                  msg.id === aiMessage.id 
                    ? { ...msg, content: `正在生成大纲...\n${outlineContent.substring(0, 500)}${outlineContent.length > 500 ? '...' : ''}` }
                    : msg
                ))
              }
            }
          } catch (e) {
            console.log('解析行失败:', line, e)
            // 忽略解析错误
          }
        }
      }

      console.log('流式接收完成')
      console.log('最终接收内容长度:', receivedContent.length)
      console.log('最终思考内容长度:', thinkingContent.length)
      console.log('最终大纲内容长度:', outlineContent.length)
      console.log('最终大纲内容:', outlineContent)

      // 解析最终的大纲
      let outlineData
      try {
        console.log('开始解析大纲内容:', outlineContent.substring(0, 500) + '...')
        
        // 尝试多种方式提取JSON
        let jsonString = ''
        
        // 方法1: 寻找完整的JSON对象
        const jsonMatch = outlineContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonString = jsonMatch[0]
          console.log('找到JSON匹配:', jsonString.substring(0, 200) + '...')
        } else {
          // 方法2: 寻找slides数组开始的位置
          const slidesMatch = outlineContent.match(/"slides"\s*:\s*\[[\s\S]*\]/)
          if (slidesMatch) {
            jsonString = `{"title":"Generated Presentation",${slidesMatch[0]}}`
            console.log('使用slides匹配构建JSON:', jsonString.substring(0, 200) + '...')
          } else {
            throw new Error('No JSON structure found in content')
          }
        }
        
        // 清理JSON字符串 - 更彻底的清理
        jsonString = jsonString
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/^\s*[\r\n]+/gm, '') // 移除空行
          .replace(/,(\s*[}\]])/g, '$1') // 移除多余的逗号
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // 确保属性名有引号
          .trim()
        
        console.log('清理后的JSON:', jsonString.substring(0, 300) + '...')
        
        // 尝试修复常见的JSON错误
        try {
          const parsedOutline = JSON.parse(jsonString)
          console.log('JSON解析成功:', parsedOutline)
          
          // 验证解析结果的结构
          if (!parsedOutline.slides || !Array.isArray(parsedOutline.slides) || parsedOutline.slides.length === 0) {
            throw new Error('Invalid outline structure: missing or empty slides array')
          }
          
          outlineData = { outline: parsedOutline }
          console.log(`成功解析大纲，包含${parsedOutline.slides.length}页幻灯片`)
          
        } catch (parseError) {
          console.error('JSON解析失败，尝试修复:', parseError)
          
          // 尝试修复JSON - 移除最后一个不完整的对象
          let fixedJson = jsonString
          const lastCommaIndex = jsonString.lastIndexOf(',')
          if (lastCommaIndex > 0) {
            const beforeComma = jsonString.substring(0, lastCommaIndex)
            const afterComma = jsonString.substring(lastCommaIndex + 1)
            
            // 如果逗号后面的内容不完整，就移除它
            if (!afterComma.trim().match(/^\s*\{.*\}\s*$/)) {
              fixedJson = beforeComma + jsonString.substring(jsonString.lastIndexOf(']'))
            }
          }
          
          console.log('尝试修复后的JSON:', fixedJson.substring(0, 300) + '...')
          const parsedOutline = JSON.parse(fixedJson)
          
          if (!parsedOutline.slides || !Array.isArray(parsedOutline.slides) || parsedOutline.slides.length === 0) {
            throw new Error('Invalid outline structure after fix: missing or empty slides array')
          }
          
          outlineData = { outline: parsedOutline }
          console.log(`修复后成功解析大纲，包含${parsedOutline.slides.length}页幻灯片`)
        }
        
      } catch (e) {
        console.error('大纲解析失败:', e)
        console.error('原始内容:', outlineContent)
        
        // 如果解析失败，尝试从思考内容中提取信息
        let fallbackTitle = "Generated Presentation"
        if (thinkingContent.includes('为什么要全球化')) {
          fallbackTitle = "为什么要全球化"
        } else if (prompt.length > 0) {
          fallbackTitle = prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
        }
        
        // 创建更智能的默认大纲
        outlineData = {
          outline: {
            title: fallbackTitle,
            slides: [
              {
                title: "标题页",
                content: `${fallbackTitle}的主题介绍`,
                keyPoints: ["主题概述", "重要性", "目标"]
              },
              {
                title: "核心内容",
                content: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
                keyPoints: ["关键要点1", "关键要点2", "关键要点3"]
              },
              {
                title: "总结",
                content: "总结与展望",
                keyPoints: ["主要结论", "未来展望", "行动建议"]
              }
            ]
          }
        }
        
        // 更新聊天消息显示解析失败信息
        setChatMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: `大纲解析失败，使用默认模板。错误: ${e}\n\n正在生成默认的3页幻灯片...` }
            : msg
        ))
      }

      setOutline(outlineData.outline)

      // 更新AI消息
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { 
              ...msg, 
              content: `已生成PPT大纲："${outlineData.outline.title}"，包含${outlineData.outline.slides.length}页幻灯片。\n\n正在并行生成所有页面...`, 
              isGenerating: true 
            }
          : msg
      ))

      // 初始化所有幻灯片状态
      const initialSlides: PPTSlide[] = outlineData.outline.slides.map((slide: any, index: number) => ({
        id: `slide-${index}`,
        title: slide.title,
        content: slide.content,
        htmlCode: '',
        isGenerating: true,
        generationProgress: '准备生成...',
        thinkingContent: '',
        realtimeThinkingContent: '',
        viewMode: 'render',
        userSelectedViewMode: undefined // 初始时用户没有手动选择
      }))
      setSlides(initialSlides)

      // 串行生成 - 一页一页依次生成，保持风格统一
      console.log(`开始串行生成${outlineData.outline.slides.length}页幻灯片...`)
      
      // 维护当前生成状态
      let currentSlides = [...initialSlides]
      
      // 串行生成所有幻灯片
      for (let index = 0; index < outlineData.outline.slides.length; index++) {
        const slide = outlineData.outline.slides[index]
        const startTime = Date.now()
        console.log(`开始生成第${index + 1}页: ${slide.title}`)
        
        // 更新生成状态
        setSlides(prev => prev.map((s, i) => 
          i === index ? { ...s, generationProgress: '正在生成...' } : s
        ))
        
        try {
          // 获取前一页的信息作为风格参考
          let previousSlideInfo = ''
          if (index > 0) {
            const prevSlide = currentSlides[index - 1]
            if (prevSlide && prevSlide.htmlCode && !prevSlide.htmlCode.includes('生成失败')) {
              // 详细分析前一页的设计特点
              const htmlCode = prevSlide.htmlCode
              
              // 提取色彩信息
              const colorClasses = htmlCode.match(/(?:bg-|text-|border-|from-|to-)[\w-]+/g) || []
              const uniqueColors = [...new Set(colorClasses)].slice(0, 8)
              
              // 提取布局信息
              const layoutClasses = htmlCode.match(/(?:grid|flex|w-|h-|p-|m-|space-|gap-)[\w-]+/g) || []
              const layoutInfo = [...new Set(layoutClasses)].slice(0, 10)
              
              // 提取字体和文本信息
              const textClasses = htmlCode.match(/(?:text-|font-|leading-)[\w-]+/g) || []
              const textInfo = [...new Set(textClasses)].slice(0, 8)
              
              // 提取装饰元素
              const decorativeClasses = htmlCode.match(/(?:rounded-|shadow-|backdrop-|opacity-)[\w-]+/g) || []
              const decorativeInfo = [...new Set(decorativeClasses)].slice(0, 6)
              
              // 分析HTML结构
              const hasGrid = htmlCode.includes('grid')
              const hasFlex = htmlCode.includes('flex')
              const hasCard = htmlCode.includes('card') || htmlCode.includes('bg-white') || htmlCode.includes('bg-gray')
              const hasGradient = htmlCode.includes('gradient')
              const hasBackdrop = htmlCode.includes('backdrop')
              
              previousSlideInfo = `
**前一页设计分析报告:**

**页面信息:**
- 标题: "${prevSlide.title}"
- 设计类型: ${hasCard ? '卡片式布局' : '全屏式布局'}
- 布局方式: ${hasGrid ? '网格布局' : hasFlex ? '弹性布局' : '流式布局'}

**色彩体系:**
- 主要色彩类: ${uniqueColors.join(', ')}
- 是否使用渐变: ${hasGradient ? '是' : '否'}
- 是否使用背景模糊: ${hasBackdrop ? '是' : '否'}

**布局结构:**
- 布局相关类: ${layoutInfo.join(', ')}
- 主要容器特点: ${hasCard ? '使用了卡片容器设计' : '采用全屏直接布局'}

**字体和文本:**
- 文本样式类: ${textInfo.join(', ')}
- 文本层次: 已建立清晰的标题-内容-要点层次结构

**装饰元素:**
- 装饰样式类: ${decorativeInfo.join(', ')}

**设计要求:**
1. **严格保持色彩一致性** - 使用相同的色彩类和配色方案
2. **保持布局结构** - 采用相似的容器和网格系统
3. **统一字体层次** - 使用相同的字体大小和权重系统
4. **延续装饰风格** - 保持相同的圆角、阴影、透明度等视觉效果
5. **确保视觉连贯性** - 整体设计应该看起来像同一套演示文稿的连续页面

**特别注意:**
- 如果前页使用了特定的布局比例，请保持相同比例
- 如果前页有特殊的装饰元素（如分割线、图标、背景图案），请在新页面中延续
- 保持相同的内容密度和留白比例
- 确保页码和品牌元素的位置和样式一致`
            }
          }
          
          const response = await fetch('/api/generate-ppt-slide', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slide: slide,
              slideIndex: index,
              totalSlides: outlineData.outline.slides.length,
              theme: 'modern',
              model,
              provider,
              previousSlideInfo: previousSlideInfo // 传递前一页信息
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to generate slide ${index + 1}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('Stream could not be read')
          }

          let receivedContent = ""
          let thinkingContent = ""
          let htmlContent = ""
          let isInThinkingBlock = false
          let thinkingStartProcessed = false // 标记思考开始是否已处理
          let thinkingEndProcessed = false   // 标记思考结束是否已处理
          let lastUpdateTime = 0 // 添加节流控制
          
          setSlides(prev => prev.map((s, i) => 
            i === index ? { ...s, generationProgress: '开始思考设计...' } : s
          ))

          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n').filter(line => line.trim())
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.type === 'content' && data.content) {
                  receivedContent += data.content
                  const currentTime = Date.now()
                  
                  // 检查思考标签
                  const thinkingStartIndex = receivedContent.indexOf("<think>")
                  const thinkingEndIndex = receivedContent.indexOf("</think>")
                  
                  console.log(`第${index + 1}页流式数据更新:`, {
                    contentLength: receivedContent.length,
                    thinkingStartIndex,
                    thinkingEndIndex,
                    isInThinkingBlock,
                    thinkingStartProcessed,
                    thinkingEndProcessed,
                    latestChunk: data.content.substring(0, 50) + '...'
                  })
                  
                  // 处理思考开始（只处理一次）
                  if (thinkingStartIndex !== -1 && !thinkingStartProcessed) {
                    isInThinkingBlock = true
                    thinkingStartProcessed = true
                    console.log(`第${index + 1}页开始思考阶段`)
                    setSlides(prev => {
                      const updatedSlides = prev.map((s, i) => {
                        if (i === index) {
                          console.log(`第${index + 1}页思考开始 - 当前viewMode: ${s.viewMode}, userSelectedViewMode: ${s.userSelectedViewMode}`)
                          const shouldAutoSwitch = s.userSelectedViewMode === undefined
                          const newViewMode = shouldAutoSwitch ? 'thinking' : s.viewMode
                          console.log(`第${index + 1}页思考开始 - 是否自动切换: ${shouldAutoSwitch}, 新viewMode: ${newViewMode}`)
                          return { 
                            ...s, 
                            generationProgress: '正在思考设计方案...',
                            // 只在用户从未手动选择过视图模式时才自动切换到思考模式
                            viewMode: newViewMode
                          }
                        }
                        return s
                      })
                      return updatedSlides
                    })
                  }
                  
                  // 处理思考结束（只处理一次）
                  if (thinkingEndIndex !== -1 && !thinkingEndProcessed && thinkingStartProcessed) {
                    thinkingEndProcessed = true
                    isInThinkingBlock = false
                    thinkingContent = receivedContent.substring(thinkingStartIndex + 7, thinkingEndIndex)
                    htmlContent = receivedContent.substring(thinkingEndIndex + 8)
                    
                    console.log(`第${index + 1}页思考阶段完成`)
                    console.log(`思考内容长度: ${thinkingContent.length}`)
                    console.log(`HTML内容长度: ${htmlContent.length}`)
                    console.log(`HTML内容预览:`, htmlContent.substring(0, 100) + '...')
                    
                    setSlides(prev => prev.map((s, i) => {
                      if (i === index) {
                        console.log(`第${index + 1}页思考完成 - 当前viewMode: ${s.viewMode}, userSelectedViewMode: ${s.userSelectedViewMode}`)
                        console.log(`第${index + 1}页思考完成 - 保持当前视图模式不变: ${s.viewMode}`)
                        return { 
                          ...s, 
                          generationProgress: '思考完成，正在生成代码...',
                          htmlCode: htmlContent,
                          thinkingContent: thinkingContent,
                          realtimeThinkingContent: thinkingContent,
                          // 完全不自动切换视图模式，保持用户当前选择
                          // 如果用户没有手动选择过，保持当前模式不变
                        }
                      }
                      return s
                    }))
                  }
                  
                  // 处理思考中的内容更新
                  if (isInThinkingBlock && thinkingStartIndex !== -1 && thinkingEndIndex === -1) {
                    if (currentTime - lastUpdateTime > 200) { // 每200ms最多更新一次
                      thinkingContent = receivedContent.substring(thinkingStartIndex + 7)
                      console.log(`第${index + 1}页思考中，当前思考内容长度: ${thinkingContent.length}`)
                      setSlides(prev => prev.map((s, i) => 
                        i === index ? { 
                          ...s, 
                          generationProgress: `思考中... (${thinkingContent.length}字符)`,
                          realtimeThinkingContent: thinkingContent
                          // 不修改viewMode，保持用户选择
                        } : s
                      ))
                      lastUpdateTime = currentTime
                    }
                  }
                  
                  // 处理HTML内容更新（思考完成后）
                  if (thinkingEndProcessed && !isInThinkingBlock) {
                    if (currentTime - lastUpdateTime > 300) {
                      htmlContent = receivedContent.substring(thinkingEndIndex + 8)
                      setSlides(prev => prev.map((s, i) => 
                        i === index ? { 
                          ...s, 
                          htmlCode: htmlContent,
                          generationProgress: `生成中... (${Math.floor(htmlContent.length / 1024)}KB)`
                          // 不修改viewMode，保持用户选择
                        } : s
                      ))
                      lastUpdateTime = currentTime
                    }
                  }
                  
                  // 处理没有思考标签的情况（直接生成HTML）
                  if (thinkingStartIndex === -1 && !thinkingStartProcessed) {
                    if (currentTime - lastUpdateTime > 300) {
                      htmlContent = receivedContent
                      setSlides(prev => prev.map((s, i) => 
                        i === index ? { 
                          ...s, 
                          htmlCode: htmlContent,
                          generationProgress: `生成中... (${Math.floor(htmlContent.length / 1024)}KB)`
                          // 不修改viewMode，保持用户选择
                        } : s
                      ))
                      lastUpdateTime = currentTime
                    }
                  }
                }
              } catch (e) {
                // 忽略解析错误
                console.log(`第${index + 1}页解析SSE数据失败:`, e)
              }
            }
          }

          // 清理HTML代码
          let finalHtmlCode = htmlContent.replace(/```html\s*/g, '').replace(/```\s*/g, '')
          
          // 确保HTML代码是完整的
          if (!finalHtmlCode.includes('<!DOCTYPE html>')) {
            finalHtmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slide.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-8">
    <div class="max-w-4xl mx-auto text-center">
        <div class="bg-white/80 backdrop-blur-sm shadow-xl border border-blue-200/50 rounded-2xl p-12">
            <h1 class="text-5xl font-bold text-blue-900 mb-8">${slide.title}</h1>
            <p class="text-xl text-blue-700 mb-8 leading-relaxed">${slide.content}</p>
            <div class="space-y-4">
                ${slide.keyPoints.map((point: string) => `
                    <div class="flex items-center justify-center">
                        <div class="bg-blue-600 w-3 h-3 rounded-full mr-4"></div>
                        <span class="text-lg text-blue-700">${point}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="absolute bottom-8 right-8 text-blue-700 text-sm">
            ${index + 1} / ${outlineData.outline.slides.length}
        </div>
    </div>
</body>
</html>`
          }

          const endTime = Date.now()
          console.log(`第${index + 1}页生成完成，耗时: ${endTime - startTime}ms`)
          
          // 完成状态
          setSlides(prev => prev.map((s, i) => 
            i === index ? { 
              ...s, 
              htmlCode: finalHtmlCode,
              isGenerating: false,
              generationProgress: '生成完成',
              thinkingContent: thinkingContent,
              realtimeThinkingContent: thinkingContent
              // 不修改viewMode，保持用户选择
            } : s
          ))

          // 更新currentSlides状态以供下一页参考
          currentSlides[index] = {
            ...currentSlides[index],
            htmlCode: finalHtmlCode,
            isGenerating: false,
            generationProgress: '生成完成',
            thinkingContent: thinkingContent,
            realtimeThinkingContent: thinkingContent
          }

          // 更新AI消息显示当前进度
          setChatMessages(prev => prev.map(msg => 
            msg.id === aiMessage.id 
              ? { 
                  ...msg, 
                  content: `正在串行生成PPT幻灯片...\n\n已完成: ${index + 1}/${outlineData.outline.slides.length} 页\n当前: ${slide.title}`, 
                  isGenerating: true 
                }
              : msg
          ))

        } catch (error) {
          const endTime = Date.now()
          console.error(`第${index + 1}页生成失败，耗时: ${endTime - startTime}ms`, error)
          
          // 更新失败状态
          setSlides(prev => prev.map((s, i) => 
            i === index ? { 
              ...s, 
              isGenerating: false, 
              generationProgress: '生成失败',
              htmlCode: `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f3f4f6; color: #6b7280; font-family: Arial, sans-serif;">
                  <div style="text-align: center;">
                    <h2>生成失败</h2>
                    <p>第${index + 1}页生成时出现错误</p>
                    <p style="font-size: 12px; margin-top: 10px;">${error}</p>
                  </div>
                </div>
              ` 
            } : s
          ))

          // 可以选择继续生成下一页或停止
          console.log(`第${index + 1}页生成失败，继续生成下一页...`)
        }
      }

      // 串行生成完成
      console.log('串行生成完成')
      
      // 统计结果
      const successCount = currentSlides.filter(slide => 
        slide.htmlCode && !slide.htmlCode.includes('生成失败')
      ).length
      const failureCount = outlineData.outline.slides.length - successCount

      console.log(`串行生成完成: ${successCount}页成功, ${failureCount}页失败`)

      // 更新AI消息为完成状态
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { 
              ...msg, 
              content: `PPT并行生成完成！共${outlineData.outline.slides.length}页幻灯片，${successCount}页成功生成${failureCount > 0 ? `，${failureCount}页生成失败` : ''}。\n\n您可以点击左侧大纲切换查看不同页面，或者继续对话来修改特定页面。`, 
              isGenerating: false 
            }
          : msg
      ))

      if (successCount > 0) {
        toast.success(`PPT生成完成！${successCount}/${outlineData.outline.slides.length}页成功生成`)
      } else {
        toast.error('PPT生成失败，请重试')
      }
    } catch (error) {
      console.error('Error generating PPT:', error)
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: '抱歉，PPT生成失败。请稍后重试。', isGenerating: false }
          : msg
      ))
      toast.error('PPT生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendChatMessage = async () => {
    if (!currentChatInput.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentChatInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setCurrentChatInput("")
    setIsGenerating(true)

    // 添加AI响应消息
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '正在处理您的请求...',
      timestamp: new Date(),
      isGenerating: true
    }
    setChatMessages(prev => [...prev, aiMessage])

    try {
      // 这里可以根据用户输入来修改特定幻灯片或整个PPT
      // 暂时模拟处理
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: '我已经理解您的要求。您可以具体描述需要修改的内容，比如"修改第2页的标题"或"调整整体颜色风格"等。', isGenerating: false }
          : msg
      ))
    } catch (error) {
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: '抱歉，处理请求时出现错误。', isGenerating: false }
          : msg
      ))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChatMessage()
    }
  }

  const clearChat = () => {
    setChatMessages([])
  }

  const downloadPPT = () => {
    if (slides.length === 0) return

    const combinedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${outline?.title || 'Generated PPT'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .slide {
            width: 100vw;
            height: 100vh;
            display: none;
            overflow: hidden;
        }
        .slide.active {
            display: block;
        }
        .slide-navigation {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
        }
    </style>
</head>
<body class="bg-gray-900">
    ${slides.map((slide, index) => `
    <div class="slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
        ${slide.htmlCode}
    </div>
    `).join('')}
    
    <div class="slide-navigation flex gap-4 bg-black/50 px-4 py-2 rounded-lg">
        <button onclick="previousSlide()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Previous
        </button>
        <span id="slide-counter" class="px-4 py-2 text-white">
            1 / ${slides.length}
        </span>
        <button onclick="nextSlide()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Next
        </button>
    </div>

    <script>
        let currentSlide = 0;
        const totalSlides = ${slides.length};

        function showSlide(index) {
            document.querySelectorAll('.slide').forEach(slide => {
                slide.classList.remove('active');
            });
            document.getElementById('slide-' + index).classList.add('active');
            document.getElementById('slide-counter').textContent = (index + 1) + ' / ' + totalSlides;
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }

        function previousSlide() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            showSlide(currentSlide);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                previousSlide();
            }
        });
    </script>
</body>
</html>
    `

    const blob = new Blob([combinedHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${outline?.title || 'generated-ppt'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 更新单个幻灯片的视图模式
  const updateSlideViewMode = (slideId: string, newViewMode: 'render' | 'code' | 'thinking') => {
    console.log(`用户手动切换第${slideId}页视图模式为: ${newViewMode}`)
    setSlides(prev => {
      const updatedSlides = prev.map(slide => {
        if (slide.id === slideId) {
          console.log(`更新前 - slideId: ${slideId}, 当前viewMode: ${slide.viewMode}, userSelectedViewMode: ${slide.userSelectedViewMode}`)
          const updated = { 
            ...slide, 
            viewMode: newViewMode,
            userSelectedViewMode: newViewMode // 记录用户的手动选择
          }
          console.log(`更新后 - slideId: ${slideId}, 新viewMode: ${updated.viewMode}, 新userSelectedViewMode: ${updated.userSelectedViewMode}`)
          return updated
        }
        return slide
      })
      return updatedSlides
    })
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}


      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Chat & Outline */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">对话记录</h3>
              <Button
                onClick={clearChat}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>开始对话来生成和修改PPT</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {/* 改进思考过程的显示样式 */}
                    {message.content.includes('思考过程：') ? (
                      <div className="text-sm">
                        {message.content.split('\n\n').map((section, index) => {
                          if (section.startsWith('思考过程：')) {
                            const thinkingContent = section.replace('思考过程：\n', '')
                            return (
                              <div key={index} className="mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium text-blue-300">📋 大纲思考过程</span>
                                </div>
                                <div className="bg-blue-900/30 rounded-md p-3 border-l-2 border-blue-400">
                                  <div className="text-xs text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeHighlight]}
                                    >
                                      {thinkingContent}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            )
                          } else if (section.includes('思考中...')) {
                            const thinkingContent = section.replace('思考中...\n', '')
                            return (
                              <div key={index} className="mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                                  <span className="text-xs font-medium text-blue-300">📋 正在思考大纲结构...</span>
                                </div>
                                <div className="bg-blue-900/30 rounded-md p-3 border-l-2 border-blue-400">
                                  <div className="text-xs text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      rehypePlugins={[rehypeHighlight]}
                                    >
                                      {thinkingContent}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            )
                          } else {
                            return (
                              <div key={index}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                  >
                                    {section}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )
                          }
                        })}
                      </div>
                    ) : (
                      <div className="text-sm prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            // 自定义样式组件
                            h1: ({...props}) => <h1 className="text-lg font-bold mb-2 text-white" {...props} />,
                            h2: ({...props}) => <h2 className="text-base font-semibold mb-2 text-white" {...props} />,
                            h3: ({...props}) => <h3 className="text-sm font-medium mb-1 text-white" {...props} />,
                            p: ({...props}) => <p className="mb-2 text-gray-100" {...props} />,
                            ul: ({...props}) => <ul className="list-disc list-inside mb-2 text-gray-100" {...props} />,
                            ol: ({...props}) => <ol className="list-decimal list-inside mb-2 text-gray-100" {...props} />,
                            li: ({...props}) => <li className="mb-1 text-gray-100" {...props} />,
                            code: ({...props}) => <code className="bg-gray-600 px-1 py-0.5 rounded text-xs text-gray-100" {...props} />,
                            pre: ({...props}) => <pre className="bg-gray-800 p-2 rounded mb-2 overflow-x-auto" {...props} />,
                            blockquote: ({...props}) => <blockquote className="border-l-2 border-gray-500 pl-3 italic text-gray-300 mb-2" {...props} />,
                            strong: ({...props}) => <strong className="font-semibold text-white" {...props} />,
                            em: ({...props}) => <em className="italic text-gray-200" {...props} />,
                            a: ({...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    
                    {message.isGenerating && !message.content.includes('思考') && (
                      <div className="flex items-center mt-2">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs opacity-75">生成中...</span>
                      </div>
                    )}
                    <p className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Outline Section */}
            {outline && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">大纲</h3>
                  <Button
                    onClick={() => setShowOutline(!showOutline)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showOutline ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
                
                {showOutline && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400 mb-3">{slides.length} 页</p>
                    {slides.map((slide, index) => (
                      <div
                        key={slide.id}
                        className="p-3 rounded-lg bg-gray-700 text-gray-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="text-sm">{slide.title}</span>
                          </div>
                          {slide.isGenerating && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                        </div>
                        <p className="text-xs opacity-75 mt-1">{slide.generationProgress}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <Textarea
                value={currentChatInput}
                onChange={(e) => setCurrentChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="描述您想要的修改..."
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 min-h-[40px] max-h-[120px]"
                rows={1}
              />
              <Button
                onClick={handleSendChatMessage}
                disabled={!currentChatInput.trim() || isGenerating}
                className="bg-purple-600 hover:bg-purple-700 px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>

        {/* Right Panel - All Slides List */}
        <div className="flex-1 bg-gray-900 flex flex-col">
          {/* Preview Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-4">
              <h3 className="text-white font-medium">所有幻灯片</h3>
              {slides.length > 0 && (
                <span className="text-gray-400 text-sm">共 {slides.length} 页</span>
              )}
            </div>
          </div>

          {/* All Slides Display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {slides.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>暂无幻灯片</p>
                  <p className="text-sm mt-2">开始对话来生成PPT内容</p>
                </div>
              </div>
            ) : (
              slides.map((slide, index) => (
                <Card key={slide.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-0">
                    {/* Slide Header */}
                    <div className="flex items-center justify-between p-1 border-b border-gray-700">
                  
                      <div className="flex items-center space-x-2">
                   
                        <div className="flex items-center space-x-1 p-1">
                          <Button
                            onClick={() => updateSlideViewMode(slide.id, 'render')}
                            variant="ghost"
                            size="sm"
                            className={slide.viewMode === 'render' 
                              ? 'bg-white text-black hover:bg-white' 
                              : 'text-gray-400 hover:text-gray-400 hover:bg-transparent'
                            }
                            title="预览模式 - 查看渲染效果"
                          >
                           <div>
                            预览
                            </div>
                          </Button>
                          <Button
                            onClick={() => updateSlideViewMode(slide.id, 'code')}
                            variant="ghost"
                            size="sm"
                            className={slide.viewMode === 'code' 
                              ? 'bg-white text-black hover:bg-white' 
                              : 'text-gray-400 hover:text-gray-400 hover:bg-transparent'
                            }
                            title="代码模式 - 查看生成的HTML代码"
                          >
                            <div>
                            代码
                            </div>
                          </Button>
                          <Button
                            onClick={() => updateSlideViewMode(slide.id, 'thinking')}
                            variant="ghost"
                            size="sm"
                            className={slide.viewMode === 'thinking' 
                              ? 'bg-white text-black hover:bg-white' 
                              : 'text-gray-400 hover:text-gray-400 hover:bg-transparent'
                            }
                            title="思考模式 - 查看AI思考过程"
                          >
                            <div>
                            思考
                            </div>
                          </Button>
                        </div>
                      
                      </div>
                    </div>

                    {/* Slide Content */}
                    <div className="h-96">
                      {slide.viewMode === 'render' ? (
                        <div className="h-full bg-white overflow-hidden">
                          {slide.htmlCode ? (
                            <iframe
                              srcDoc={slide.htmlCode}
                              className="w-full h-full border-0"
                              title={`Slide ${index + 1}`}
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                              <div className="text-center">
                                {slide.isGenerating ? (
                                  <>
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                    <p>{slide.generationProgress}</p>
                                  </>
                                ) : (
                                  <p>等待生成</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : slide.viewMode === 'code' ? (
                        <div className="h-full bg-gray-900 p-4 overflow-auto">
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                            {slide.htmlCode || '代码生成中...'}
                          </pre>
                        </div>
                      ) : (
                        // 思考模式
                        <div className="h-full bg-gray-900 overflow-auto">
                          <div className="p-4">
                       
                            
                            {slide.realtimeThinkingContent ? (
                              <div className="bg-gray-800 rounded-lg p-4">
                            
                                <div className="text-gray-300 leading-relaxed text-sm">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                      // 自定义样式组件，适配思考内容显示
                                      h1: ({...props}) => <h1 className="text-base font-bold mb-2 text-white" {...props} />,
                                      h2: ({...props}) => <h2 className="text-sm font-semibold mb-2 text-white" {...props} />,
                                      h3: ({...props}) => <h3 className="text-sm font-medium mb-1 text-white" {...props} />,
                                      p: ({...props}) => <p className="mb-2 text-gray-300" {...props} />,
                                      ul: ({...props}) => <ul className="list-disc ml-4 mb-2 text-gray-300" {...props} />,
                                      ol: ({...props}) => <ol className="list-decimal ml-4 mb-2 text-gray-300" {...props} />,
                                      li: ({...props}) => <li className="mb-1 text-gray-300" {...props} />,
                                      code: ({...props}) => <code className="bg-gray-700 px-1 py-0.5 rounded text-xs text-gray-200" {...props} />,
                                      pre: ({...props}) => <pre className="bg-gray-900 p-2 rounded mb-2 overflow-x-auto text-xs" {...props} />,
                                      blockquote: ({...props}) => <blockquote className="border-l-2 border-blue-400 pl-3 italic text-gray-400 mb-2" {...props} />,
                                      strong: ({...props}) => <strong className="font-semibold text-white" {...props} />,
                                      em: ({...props}) => <em className="italic text-gray-200" {...props} />,
                                      a: ({...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                                    }}
                                  >
                                    {slide.realtimeThinkingContent}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : slide.isGenerating ? (
                              <div className="bg-gray-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                                  <span className="text-yellow-300 text-sm">正在思考幻灯片设计...</span>
                                </div>
                                <div className="text-gray-400 text-sm">
                                  状态: {slide.generationProgress}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  调试: 思考内容 = {slide.realtimeThinkingContent ? `"${slide.realtimeThinkingContent.substring(0, 50)}..."` : '等待中...'}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-500">
                                <p>暂无思考过程</p>
                                <p className="text-sm mt-1">该幻灯片尚未开始生成</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 