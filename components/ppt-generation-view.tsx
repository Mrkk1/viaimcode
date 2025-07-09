"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronLeft, Download, FileText, Presentation, Loader2, Send, Code, Eye, Trash2, ChevronDown, ChevronRight, Share } from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  // 新增：支持从外部传入初始数据
  initialData?: {
    projectId?: string
    outline?: PPTOutline
    slides?: PPTSlide[]
    chatMessages?: ChatMessage[]
  }
}

// 生成唯一ID的辅助函数
const generateUniqueId = (prefix: string = 'msg') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function PPTGenerationView({
  prompt,
  model,
  provider,
  onBack,
  initialData
}: PPTGenerationViewProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialData?.chatMessages || [])
  const [currentChatInput, setCurrentChatInput] = useState("")
  const [slides, setSlides] = useState<PPTSlide[]>(initialData?.slides || [])
  const [outline, setOutline] = useState<PPTOutline | null>(initialData?.outline || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showOutline, setShowOutline] = useState(true)
  const [previewSize, setPreviewSize] = useState<'small' | 'medium' | 'large'>('large') // 新增预览大小状态
  const [projectId, setProjectId] = useState<string | null>(initialData?.projectId || null) // 持久化项目ID
  
  // 添加 ref 来防止重复执行
  const hasInitialized = useRef(false)
  const isMounted = useRef(true)
  
  // 组件卸载时设置mounted为false
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])



  // 初始化 - 自动开始生成PPT
  useEffect(() => {
    // 如果有初始数据，说明是从后端加载的已存在项目，不需要重新生成
    if (initialData) {
      console.log('从后端加载已存在项目，跳过自动生成')
      return
    }
    
    // 防止严格模式下的重复执行，且确保组件已挂载
    // 同时检查是否已经有聊天记录，避免重复初始化
    const hasUserMessage = chatMessages.some(msg => msg.type === 'user' && msg.content === prompt)
    
    if (prompt.trim() && !hasInitialized.current && isMounted.current && !hasUserMessage) {
      hasInitialized.current = true
      handleInitialGeneration()
    }
    
    // 清理函数 - 组件卸载时重置状态
    return () => {
      hasInitialized.current = false
    }
  }, [prompt, model, provider, chatMessages, initialData]) // 添加initialData依赖

  const handleInitialGeneration = async () => {
    // 防止重复执行 - 如果已经在生成中，直接返回
    if (isGenerating) {
      console.log('已在生成中，跳过重复执行')
      return
    }
    
    setIsGenerating(true)

    // 创建持久化项目（仅创建项目记录，不进行后台生成）
    let currentProjectId = null
    try {
      const createProjectResponse = await fetch('/api/ppt-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt,
          prompt, 
          model, 
          provider 
        }),
      });

      if (createProjectResponse.ok) {
        const { projectId: newProjectId } = await createProjectResponse.json();
        currentProjectId = newProjectId
        setProjectId(newProjectId)
        console.log('PPT项目已创建，项目ID:', newProjectId);
        
    
      }
    } catch (error) {
      console.error('创建PPT项目失败，使用内存模式:', error);
      // 继续使用原有的内存模式
    }
    
    // 1. 用户提问
    const userMessage: ChatMessage = {
      id: generateUniqueId('user'),
      type: 'user',
      content: prompt,
      timestamp: new Date()
    }
    setChatMessages(prev => [...prev, userMessage])

    // 如果有项目ID，保存用户消息到数据库
    if (currentProjectId) {
      console.log('开始保存用户消息到数据库', {
        projectId: currentProjectId,
        contentLength: prompt.length,
        contentPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
      });

      try {
        const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_chat_message',
            messageType: 'user',
            content: prompt
          }),
        });

        const responseText = await response.text();
        console.log('保存用户消息API响应', {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        console.log('用户消息保存成功');
      } catch (error) {
        console.error('保存用户消息失败:', {
          error: error instanceof Error ? error.message : String(error),
          projectId: currentProjectId,
          contentLength: prompt.length
        });
      }
    }

    // 2. AI思考过程（新消息）
    const thinkingMsgId = generateUniqueId('thinking')
    const thinkingMessage: ChatMessage = {
      id: thinkingMsgId,
      type: 'ai',
      content: '开始思考PPT结构...',
      timestamp: new Date(),
      isGenerating: true
    }
    setChatMessages(prev => [...prev, thinkingMessage])

    // 保存思考开始消息到数据库
    if (currentProjectId) {
      // 直接使用currentProjectId而不是依赖state中的projectId
      console.log('保存思考开始消息，使用projectId:', currentProjectId);
      try {
        const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_chat_message',
            messageType: 'ai',
            content: '开始思考PPT结构...'
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        console.log('思考开始消息保存成功');
      } catch (error) {
        console.error('保存思考开始消息失败:', error);
      }
    }

    // 预定义消息ID，避免时间戳冲突
    const outlineMsgId = generateUniqueId('outline')

    try {
      // 流式生成大纲
      const outlineResponse = await fetch('/api/generate-ppt-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, provider }),
      })
      if (!outlineResponse.ok) throw new Error('Failed to generate outline')
      const reader = outlineResponse.body?.getReader()
      if (!reader) throw new Error('Stream could not be read')

      let receivedContent = ""
      let thinkingContent = ""
      let isInThinkingBlock = false
      let outlineContent = ""
      let outlineMsgCreated = false // 标记是否已创建大纲消息
      let finalThinkingContent = "" // 存储最终的思考内容

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
              // 检查思考标签
              const thinkingStartIndex = receivedContent.indexOf("<think>")
              const thinkingEndIndex = receivedContent.indexOf("</think>")
              if (thinkingStartIndex !== -1) {
                isInThinkingBlock = true
                if (thinkingEndIndex !== -1) {
                  // 思考完成
                  thinkingContent = receivedContent.substring(thinkingStartIndex + 7, thinkingEndIndex)
                  outlineContent = receivedContent.substring(thinkingEndIndex + 8)
                  isInThinkingBlock = false
                  // 完成思考过程AI消息
                  finalThinkingContent = `思考过程：\n${thinkingContent}`
                  setChatMessages(prev => prev.map(msg =>
                    msg.id === thinkingMsgId
                      ? { ...msg, content: finalThinkingContent, isGenerating: false }
                      : msg
                  ))
                  
                  // 3. 大纲生成开始（新消息）- 只创建一次
                  if (!outlineMsgCreated) {
                    const outlineStartMessage: ChatMessage = {
                      id: outlineMsgId,
                      type: 'ai',
                      content: '📋 正在生成PPT大纲...',
                      timestamp: new Date(),
                      isGenerating: true
                    }
                    setChatMessages(prev => [...prev, outlineStartMessage])
                    outlineMsgCreated = true
                    
                    // 保存大纲生成开始消息到数据库
                    if (currentProjectId) {
                      try {
                        const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'add_chat_message',
                            messageType: 'ai',
                            content: '📋 正在生成PPT大纲...'
                          }),
                        });

                        if (!response.ok) {
                          const responseText = await response.text();
                          throw new Error(`HTTP ${response.status}: ${responseText}`);
                        }

                        console.log('大纲生成开始消息保存成功');
                      } catch (error) {
                        console.error('保存大纲生成开始消息失败:', error);
                      }
                    }
                  }
                } else {
                  // 正在思考中，流式追加
                  thinkingContent = receivedContent.substring(thinkingStartIndex + 7)
                  setChatMessages(prev => prev.map(msg =>
                    msg.id === thinkingMsgId
                      ? { ...msg, content: `思考过程：\n${thinkingContent}` }
                      : msg
                  ))
                }
              } else if (!isInThinkingBlock) {
                // 大纲内容
                outlineContent = receivedContent
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      // 流式处理结束后，保存思考过程到数据库
      if (currentProjectId && finalThinkingContent) {
        console.log('流式处理结束，开始保存思考过程，内容长度:', finalThinkingContent.length);
        
        try {
          const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: finalThinkingContent
            }),
          });

          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP ${response.status}: ${responseText}`);
          }

          console.log('思考过程保存成功');
        } catch (error) {
          console.error('保存思考过程失败:', error);
        }
      }

      // 解析最终的大纲
      let outlineData: { outline: PPTOutline }
      try {
        // 尝试多种方式提取JSON
        let jsonString = ''
        
        // 方法1: 寻找完整的JSON对象
        const jsonMatch = outlineContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonString = jsonMatch[0]
        } else {
          // 方法2: 寻找slides数组开始的位置
          const slidesMatch = outlineContent.match(/"slides"\s*:\s*\[[\s\S]*\]/)
          if (slidesMatch) {
            jsonString = `{"title":"Generated Presentation",${slidesMatch[0]}}`
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
        
        // 尝试修复常见的JSON错误
        try {
          const parsedOutline = JSON.parse(jsonString)
          // 验证解析结果的结构
          if (!parsedOutline.slides || !Array.isArray(parsedOutline.slides) || parsedOutline.slides.length === 0) {
            throw new Error('Invalid outline structure: missing or empty slides array')
          }
          
          outlineData = { outline: parsedOutline }
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
          
          const parsedOutline = JSON.parse(fixedJson)
          
          if (!parsedOutline.slides || !Array.isArray(parsedOutline.slides) || parsedOutline.slides.length === 0) {
            throw new Error('Invalid outline structure after fix: missing or empty slides array')
          }
          
          outlineData = { outline: parsedOutline }
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
        
        // 更新大纲生成消息显示解析失败信息
        setChatMessages(prev => prev.map(msg =>
          msg.id === outlineMsgId
            ? { ...msg, content: `⚠️ 大纲解析失败，使用默认模板\n\n错误信息：${e}\n\n已自动创建${outlineData.outline.slides.length}页默认大纲。`, isGenerating: false }
            : msg
        ))
      }

      setOutline(outlineData.outline)

      // 如果有项目ID，保存大纲到数据库
      if (currentProjectId) {
        try {
          await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_outline',
              outline: outlineData.outline
            }),
          });
          console.log('大纲已保存到数据库');
        } catch (error) {
          console.error('保存大纲失败:', error);
        }
      }

      // 4. 大纲生成完成（新消息）
      const outlineCompleteContent = `PPT大纲生成完成！\n\n**${outlineData.outline.title}**\n\n共${outlineData.outline.slides.length}页幻灯片：\n${outlineData.outline.slides.map((slide, index) => `${index + 1}. ${slide.title}`).join('\n')}${currentProjectId ? '' : ''}`
      
      setChatMessages(prev => prev.map(msg =>
        msg.id === outlineMsgId
          ? { ...msg, content: outlineCompleteContent, isGenerating: false }
          : msg
      ))

      // 保存大纲完成消息到数据库
      if (currentProjectId) {
        try {
          const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: outlineCompleteContent
            }),
          });

          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP ${response.status}: ${responseText}`);
          }

          console.log('大纲完成消息保存成功');
        } catch (error) {
          console.error('保存大纲完成消息失败:', error);
        }
      }

      // 5. 幻灯片生成开始（新消息）
      const slidesMsgId = generateUniqueId('slides')
 

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
        
        // 添加开始生成单页的消息
        const singleSlideMsgId = generateUniqueId(`slide-${index}`)
        const slideStartContent = `开始生成第${index + 1}页：「${slide.title}」`
        const slideStartMessage: ChatMessage = {
          id: singleSlideMsgId,
          type: 'ai',
          content: slideStartContent,
          timestamp: new Date(),
          isGenerating: true
        }
        setChatMessages(prev => [...prev, slideStartMessage])
        
        // 保存单页生成开始消息到数据库
        if (currentProjectId) {
          try {
            const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add_chat_message',
                messageType: 'ai',
                content: slideStartContent
              }),
            });

            if (!response.ok) {
              const responseText = await response.text();
              throw new Error(`HTTP ${response.status}: ${responseText}`);
            }

            console.log('单页生成开始消息保存成功');
          } catch (error) {
            console.error('保存单页生成开始消息失败:', error);
          }
        }
        
        // 更新生成状态
        setSlides(prev => prev.map((s, i) => 
          i === index ? { ...s, generationProgress: '准备开始思考...' } : s
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
          
          // ========== 第一步：思考分析阶段 ==========
          console.log(`第${index + 1}页 - 开始第一步：思考分析`)
          setSlides(prev => prev.map((s, i) => 
            i === index ? { 
              ...s, 
              generationProgress: '第1步：开始思考设计方案...',
              viewMode: s.userSelectedViewMode === undefined ? 'thinking' : s.viewMode
            } : s
          ))
          
          const thinkingResponse = await fetch('/api/generate-ppt-thinking', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slide: slide,
              slideIndex: index,
              totalSlides: outlineData.outline.slides.length,
              theme: 'auto', // 让AI自动选择最合适的主题
              model,
              provider,
              previousSlideInfo: previousSlideInfo
            }),
          })

          if (!thinkingResponse.ok) {
            throw new Error(`Failed to generate thinking for slide ${index + 1}`)
          }

          const thinkingReader = thinkingResponse.body?.getReader()
          if (!thinkingReader) {
            throw new Error('Thinking stream could not be read')
          }

          let thinkingContent = ""
          let thinkingTimeout: NodeJS.Timeout | null = null

          // 设置思考阶段超时（20秒）
          const resetThinkingTimeout = () => {
            if (thinkingTimeout) clearTimeout(thinkingTimeout)
            thinkingTimeout = setTimeout(() => {
              console.log(`第${index + 1}页思考阶段超时，强制结束`)
              thinkingReader.cancel()
            }, 20000)
          }
          
          resetThinkingTimeout()

          try {
            while (true) {
              const { done, value } = await thinkingReader.read()
              
              if (done) {
                console.log(`第${index + 1}页思考阶段正常结束`)
                break
              }
              
              resetThinkingTimeout()
              
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n').filter(line => line.trim())
              
              for (const line of lines) {
                try {
                  const data = JSON.parse(line)
                  if (data.type === 'content' && data.content) {
                    thinkingContent += data.content
                    
                    // 实时更新思考内容
                    setSlides(prev => prev.map((s, i) => 
                      i === index ? { 
                        ...s, 
                        generationProgress: `第1步：思考中... (${thinkingContent.length}字符)`,
                        realtimeThinkingContent: thinkingContent,
                        thinkingContent: thinkingContent
                      } : s
                    ))
                  }
                } catch (e) {
                  console.log(`第${index + 1}页解析思考SSE数据失败:`, e)
                }
              }
            }
          } finally {
            if (thinkingTimeout) {
              clearTimeout(thinkingTimeout)
            }
          }

          console.log(`第${index + 1}页思考阶段完成，思考内容长度: ${thinkingContent.length}`)
          
          // 验证思考内容是否正确保存
          console.log(`第${index + 1}页思考内容验证:`)
          console.log(`- 长度: ${thinkingContent.length}`)
          console.log(`- 开头100字符: "${thinkingContent.substring(0, 100)}"`)
          console.log(`- 结尾100字符: "${thinkingContent.substring(thinkingContent.length - 100)}"`)
          console.log(`- 是否包含设计关键词: ${thinkingContent.includes('设计') || thinkingContent.includes('布局') || thinkingContent.includes('颜色')}`)

          // 更新思考完成状态
          setSlides(prev => prev.map((s, i) => 
            i === index ? { 
              ...s, 
              generationProgress: '第1步：思考完成，准备生成代码...',
              thinkingContent: thinkingContent,
              realtimeThinkingContent: thinkingContent
            } : s
          ))

          // 短暂延迟，让用户看到思考完成的状态
          await new Promise(resolve => setTimeout(resolve, 500))

          // ========== 第二步：HTML代码生成阶段 ==========
          console.log(`第${index + 1}页 - 开始第二步：生成HTML代码`)
          console.log(`第${index + 1}页 - 思考内容长度: ${thinkingContent.length}`)
          console.log(`第${index + 1}页 - 思考内容预览: ${thinkingContent.substring(0, 200)}...`)
          
          setSlides(prev => prev.map((s, i) => 
            i === index ? { 
              ...s, 
              generationProgress: '第2步：基于思考结果生成HTML代码...'
            } : s
          ))

          const htmlResponse = await fetch('/api/generate-ppt-html', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              slide: slide,
              slideIndex: index,
              totalSlides: outlineData.outline.slides.length,
              theme: 'auto', // 让AI自动选择最合适的主题
              model,
              provider,
              previousSlideInfo: previousSlideInfo,
              thinkingContent: thinkingContent // 将思考结果传递给HTML生成
            }),
          })

          if (!htmlResponse.ok) {
            throw new Error(`Failed to generate HTML for slide ${index + 1}`)
          }

          const htmlReader = htmlResponse.body?.getReader()
          if (!htmlReader) {
            throw new Error('HTML stream could not be read')
          }

          let htmlContent = ""
          let htmlTimeout: NodeJS.Timeout | null = null
          let lastUpdateTime = 0

          // 设置HTML生成阶段超时（30秒）
          const resetHtmlTimeout = () => {
            if (htmlTimeout) clearTimeout(htmlTimeout)
            htmlTimeout = setTimeout(() => {
              console.log(`第${index + 1}页HTML生成阶段超时，强制结束`)
              htmlReader.cancel()
            }, 30000)
          }
          
          resetHtmlTimeout()

          try {
            while (true) {
              const { done, value } = await htmlReader.read()
              
              if (done) {
                console.log(`第${index + 1}页HTML生成阶段正常结束`)
                break
              }
              
              resetHtmlTimeout()
              
              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split('\n').filter(line => line.trim())
              
              for (const line of lines) {
                try {
                  const data = JSON.parse(line)
                  if (data.type === 'content' && data.content) {
                    htmlContent += data.content
                    const currentTime = Date.now()
                    
                    // 节流更新HTML内容（每300ms最多更新一次）
                    if (currentTime - lastUpdateTime > 300) {
                      setSlides(prev => prev.map((s, i) => 
                        i === index ? { 
                          ...s, 
                          htmlCode: htmlContent,
                          generationProgress: `第2步：生成中... (${Math.floor(htmlContent.length / 1024)}KB)`
                        } : s
                      ))
                      lastUpdateTime = currentTime
                    }
                  }
                } catch (e) {
                  console.log(`第${index + 1}页解析HTML SSE数据失败:`, e)
                }
              }
            }
          } finally {
            if (htmlTimeout) {
              clearTimeout(htmlTimeout)
            }
          }

          // 清理HTML代码并检查完整性
          let finalHtmlCode = htmlContent.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim()
          
          console.log(`第${index + 1}页原始HTML长度: ${finalHtmlCode.length}`)
          console.log(`第${index + 1}页HTML开头: ${finalHtmlCode.substring(0, 100)}`)
          console.log(`第${index + 1}页HTML结尾: ${finalHtmlCode.substring(finalHtmlCode.length - 100)}`)
          
          // 检查HTML是否完整
          const isHTMLComplete = finalHtmlCode.includes('<!DOCTYPE html>') && 
                                finalHtmlCode.includes('</html>') &&
                                finalHtmlCode.trim().endsWith('</html>')
          
          console.log(`第${index + 1}页HTML完整性检查: ${isHTMLComplete}`)
          
          // 如果HTML不完整，尝试修复
          if (!isHTMLComplete) {
            console.log(`第${index + 1}页HTML不完整，尝试修复...`)
            
            // 如果有DOCTYPE但没有结束标签，尝试智能补全
            if (finalHtmlCode.includes('<!DOCTYPE html>') && !finalHtmlCode.includes('</html>')) {
              // 检查是否缺少body或html结束标签
              if (!finalHtmlCode.includes('</body>')) {
                finalHtmlCode += '\n</body>'
              }
              if (!finalHtmlCode.includes('</html>')) {
                finalHtmlCode += '\n</html>'
              }
              console.log(`第${index + 1}页HTML修复后长度: ${finalHtmlCode.length}`)
            }
            // 如果完全没有HTML结构，使用默认模板
            else if (!finalHtmlCode.includes('<!DOCTYPE html>')) {
              console.log(`第${index + 1}页使用默认HTML模板`)
              finalHtmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${slide.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            width: 1280px;
            height: 720px;
            overflow: hidden;
            font-family: 'Arial', sans-serif;
        }
        .slide-container {
            width: 1280px;
            height: 720px;
            position: relative;
        }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="slide-container flex items-center justify-center p-8">
        <div class="max-w-4xl mx-auto text-center">
            <div class="bg-white/80 backdrop-blur-sm shadow-xl border border-blue-200/50 rounded-2xl p-12">
                <h1 class="text-5xl font-bold text-blue-900 mb-8">${slide.title}</h1>
                <p class="text-xl text-blue-700 mb-8 leading-relaxed">${slide.content}</p>
                <div class="space-y-4">
                    ${slide.keyPoints ? slide.keyPoints.map((point: string) => `
                        <div class="flex items-center justify-center">
                            <div class="bg-blue-600 w-3 h-3 rounded-full mr-4"></div>
                            <span class="text-lg text-blue-700">${point}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </div>
            <div class="absolute bottom-8 right-8 text-blue-700 text-sm">
                ${index + 1} / ${outlineData.outline.slides.length}
            </div>
        </div>
    </div>
</body>
</html>`
            }
          }
          
          // 最终验证HTML完整性
          const finalCheck = finalHtmlCode.includes('<!DOCTYPE html>') && 
                            finalHtmlCode.includes('</html>') &&
                            finalHtmlCode.trim().endsWith('</html>')
          
          console.log(`第${index + 1}页最终HTML完整性: ${finalCheck}`)
          console.log(`第${index + 1}页最终HTML长度: ${finalHtmlCode.length}`)
          
          // 如果仍然不完整，记录详细诊断信息
          if (!finalCheck) {
            console.error(`第${index + 1}页HTML仍然不完整:`)
            console.error(`- 包含DOCTYPE: ${finalHtmlCode.includes('<!DOCTYPE html>')}`)
            console.error(`- 包含</html>: ${finalHtmlCode.includes('</html>')}`)
            console.error(`- 以</html>结尾: ${finalHtmlCode.trim().endsWith('</html>')}`)
            console.error(`- 思考内容长度: ${thinkingContent.length}`)
            console.error(`- HTML内容长度: ${htmlContent.length}`)
            console.error(`- 最后100个字符: "${finalHtmlCode.substring(finalHtmlCode.length - 100)}"`)
            
            // 在UI中显示警告
            setSlides(prev => prev.map((s, i) => 
              i === index ? { 
                ...s, 
                generationProgress: '⚠️ HTML可能不完整，但已尝试修复'
              } : s
            ))
          }

          const endTime = Date.now()
          console.log(`第${index + 1}页两步生成完成，总耗时: ${endTime - startTime}ms`)
          
          // 完成状态
          setSlides(prev => prev.map((s, i) => 
            i === index ? { 
              ...s, 
              htmlCode: finalHtmlCode,
              isGenerating: false,
              generationProgress: '两步生成完成',
              thinkingContent: thinkingContent,
              realtimeThinkingContent: thinkingContent
            } : s
          ))

          // 更新currentSlides状态以供下一页参考
          currentSlides[index] = {
            ...currentSlides[index],
            htmlCode: finalHtmlCode,
            isGenerating: false,
            generationProgress: '两步生成完成',
            thinkingContent: thinkingContent,
            realtimeThinkingContent: thinkingContent
          }

          // 如果有项目ID，保存幻灯片到数据库
          if (currentProjectId) {
            try {
              await fetch(`/api/ppt-tasks/${currentProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'save_slide',
                  slideIndex: index,
                  slideData: {
                    title: slide.title,
                    content: slide.content,
                    htmlCode: finalHtmlCode,
                    thinkingContent: thinkingContent,
                    status: 'completed'
                  }
                }),
              });
              console.log(`第${index + 1}页已保存到数据库`);
              
              // 更新生成进度状态
              setSlides(prev => prev.map((s, i) => 
                i === index ? { 
                  ...s, 
                  generationProgress: '生成完成并已保存'
                } : s
              ))
            } catch (error) {
              console.error(`保存第${index + 1}页失败:`, error);
            }
          }

          // 更新单页生成状态为完成
          const slideCompleteContent = `第${index + 1}页「${slide.title}」生成完成`
          setChatMessages(prev => prev.map(msg =>
            msg.id === singleSlideMsgId
              ? { ...msg, content: slideCompleteContent, isGenerating: false }
              : msg
          ))
          
          // 保存单页生成完成消息到数据库
          if (currentProjectId) {
            try {
              const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'add_chat_message',
                  messageType: 'ai',
                  content: slideCompleteContent
                }),
              });

              if (!response.ok) {
                const responseText = await response.text();
                throw new Error(`HTTP ${response.status}: ${responseText}`);
              }

              console.log('单页生成完成消息保存成功');
            } catch (error) {
              console.error('保存单页生成完成消息失败:', error);
            }
          }

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

          // 如果有项目ID，保存失败状态到数据库
          if (currentProjectId) {
            try {
              await fetch(`/api/ppt-tasks/${currentProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'save_slide',
                  slideIndex: index,
                  slideData: {
                    title: slide.title,
                    content: slide.content,
                    htmlCode: '',
                    thinkingContent: thinkingContent || '',
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : String(error)
                  }
                }),
              });
              console.log(`第${index + 1}页失败状态已保存到数据库`);
            } catch (saveError) {
              console.error(`保存第${index + 1}页失败状态失败:`, saveError);
            }
          }

          // 更新单页生成状态为失败
          const slideFailContent = `第${index + 1}页「${slide.title}」生成失败：${error}`
          setChatMessages(prev => prev.map(msg =>
            msg.id === singleSlideMsgId
              ? { ...msg, content: slideFailContent, isGenerating: false }
              : msg
          ))
          
          // 保存单页生成失败消息到数据库
          if (currentProjectId) {
            try {
              const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'add_chat_message',
                  messageType: 'ai',
                  content: slideFailContent
                }),
              });

              if (!response.ok) {
                const responseText = await response.text();
                throw new Error(`HTTP ${response.status}: ${responseText}`);
              }

              console.log('单页生成失败消息保存成功');
            } catch (error) {
              console.error('保存单页生成失败消息失败:', error);
            }
          }

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

      // 更新幻灯片生成状态为完成
      setChatMessages(prev => prev.map(msg =>
        msg.id === slidesMsgId
          ? { ...msg, content: `幻灯片生成进度：${successCount}/${outlineData.outline.slides.length}页完成`, isGenerating: false }
          : msg
      ))

      // 如果有项目ID，更新项目完成状态
      if (currentProjectId) {
        try {
          await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'complete_project',
              totalSlides: outlineData.outline.slides.length,
              completedSlides: successCount,
              failedSlides: failureCount
            }),
          });
          console.log('项目状态已更新为完成');
        } catch (error) {
          console.error('更新项目状态失败:', error);
        }
      }

      // 6. 全部生成完成（新消息）
      const finalCompleteContent = `PPT全部生成完成！\n\n生成统计：\n- 总页数：${outlineData.outline.slides.length}页\n- 成功：${successCount}页\n- 失败：${failureCount}页\n\n`
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 100).toString(),
        type: 'ai',
        content: finalCompleteContent,
        timestamp: new Date(),
        isGenerating: false
      }])

      // 保存最终完成消息到数据库
      if (currentProjectId) {
        try {
          const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: finalCompleteContent
            }),
          });

          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP ${response.status}: ${responseText}`);
          }

          console.log('最终完成消息保存成功');
        } catch (error) {
          console.error('保存最终完成消息失败:', error);
        }
      }

      if (successCount > 0) {
        toast.success(`PPT生成完成！${successCount}/${outlineData.outline.slides.length}页成功生成`)
      } else {
        toast.error('PPT生成失败，请重试')
      }
    } catch (error) {
      console.error('Error generating PPT:', error)
      
      // 重置初始化状态，允许重新尝试
      hasInitialized.current = false
      
      const errorContent = `PPT生成过程中出现错误\n\n错误信息：${error}\n\n请检查网络连接或稍后重试。`
      
      setChatMessages(prev => [...prev, {
        id: generateUniqueId('error'),
        type: 'ai',
        content: errorContent,
        timestamp: new Date(),
        isGenerating: false
      }])

      // 保存错误消息到数据库
      if (currentProjectId) {
        try {
          const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: errorContent
            }),
          });

          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP ${response.status}: ${responseText}`);
          }

          console.log('错误消息保存成功');
        } catch (error) {
          console.error('保存错误消息失败:', error);
        }
      }
      toast.error('PPT生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendChatMessage = async () => {
    if (!currentChatInput.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: generateUniqueId('chat-user'),
      type: 'user',
      content: currentChatInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setCurrentChatInput("")
    setIsGenerating(true)

    // 添加AI响应消息
    const aiMessage: ChatMessage = {
      id: generateUniqueId('chat-ai'),
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

  const downloadPPT = async () => {
    if (slides.length === 0) return

    try {
      // 显示加载提示
      toast.info('正在生成PDF，请稍候...')
      
      // 创建PDF文档 (自定义尺寸，完全匹配PPT的1280x720)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1280, 720]
      })

      // 自定义页面尺寸：1280px x 720px
      const pageWidth = 1280
      const pageHeight = 720

      // 为每个幻灯片生成PDF页面
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        
        if (!slide.htmlCode) {
          console.warn(`第${i + 1}页没有HTML代码，跳过`)
          continue
        }

        try {
          // 创建一个临时的iframe来渲染HTML
          const iframe = document.createElement('iframe')
          iframe.style.position = 'absolute'
          iframe.style.left = '-9999px'
          iframe.style.top = '-9999px'
          iframe.style.width = '1280px'
          iframe.style.height = '720px'
          iframe.style.border = 'none'
          iframe.style.visibility = 'hidden'
          iframe.style.pointerEvents = 'none'
          document.body.appendChild(iframe)

          // 等待iframe加载完成
          await new Promise<void>((resolve) => {
            iframe.onload = () => {
              // 确保Tailwind CSS加载完成
              setTimeout(() => {
                // 检查iframe内容是否已渲染
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
                if (iframeDoc) {
                  // 等待字体和样式加载完成
                  setTimeout(resolve, 1500)
                } else {
                  resolve()
                }
              }, 500)
            }
            iframe.srcdoc = slide.htmlCode
          })

          // 获取iframe的文档
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (!iframeDoc) {
            throw new Error('无法访问iframe文档')
          }

          // 使用html2canvas截取iframe内容
          const canvas = await html2canvas(iframeDoc.body, {
            width: 1280,
            height: 720,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            foreignObjectRendering: true,
            logging: false,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0
          } as any)

          // 移除临时iframe
          document.body.removeChild(iframe)

          // 如果不是第一页，添加新页面
          if (i > 0) {
            pdf.addPage()
          }

          // PDF页面尺寸完全匹配PPT尺寸，直接1:1放置
          const imgWidth = pageWidth  // 1280px
          const imgHeight = pageHeight // 720px
          const x = 0
          const y = 0

          // 将canvas转换为图片并添加到PDF
          const imgData = canvas.toDataURL('image/jpeg', 0.9)
          pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight)

          // 更新进度
          toast.info(`正在生成PDF... (${i + 1}/${slides.length})`)

        } catch (error) {
          console.error(`生成第${i + 1}页PDF时出错:`, error)
          toast.error(`第${i + 1}页转换失败，跳过`)
          continue
        }
      }

      // 保存PDF
      const filename = `${outline?.title || 'generated-ppt'}.pdf`
      pdf.save(filename)
      
      toast.success('PDF生成完成！')

    } catch (error) {
      console.error('生成PDF时出错:', error)
      toast.error('PDF生成失败，请重试')
    }
  }

  // 更新单个幻灯片的视图模式
  const updateSlideViewMode = (slideId: string, newViewMode: 'render' | 'code' | 'thinking') => {
    console.log(`用户手动切换第${slideId}页视图模式为: ${newViewMode}`)
    
    // 先重置当前视图的滚动位置
    const currentSlideElement = document.querySelector(`[data-slide-id="${slideId}"]`)
    if (currentSlideElement) {
      const currentScrollableElement = currentSlideElement.querySelector('.slide-content-container') as HTMLElement
      if (currentScrollableElement) {
        console.log(`重置${slideId}页当前视图滚动位置`)
        currentScrollableElement.scrollTop = 0
        currentScrollableElement.scrollLeft = 0
      }
    }
    
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

    // 切换视图模式后，再次确保新视图的滚动位置重置
    setTimeout(() => {
      const slideElement = document.querySelector(`[data-slide-id="${slideId}"]`)
      if (slideElement) {
        const scrollableElement = slideElement.querySelector('.slide-content-container') as HTMLElement
        if (scrollableElement) {
          console.log(`确保${slideId}页新视图滚动位置重置`)
          scrollableElement.scrollTop = 0
          scrollableElement.scrollLeft = 0
          
          // 添加短暂的视觉反馈
          scrollableElement.style.transition = 'opacity 0.1s ease'
          scrollableElement.style.opacity = '0.9'
          setTimeout(() => {
            scrollableElement.style.opacity = '1'
            setTimeout(() => {
              scrollableElement.style.transition = ''
            }, 100)
          }, 50)
        } else {
          console.warn(`未找到${slideId}页的滚动容器`)
        }
      } else {
        console.warn(`未找到${slideId}页的DOM元素`)
      }
    }, 100) // 增加延迟确保DOM完全更新
  }

  const downloadHTML = () => {
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
        body {
            margin: 0;
            padding: 0;
            background: #1f2937;
            font-family: 'Arial', sans-serif;
            overflow: hidden;
        }
        .slide {
            width: 1280px;
            height: 720px;
            display: none;
            overflow: hidden;
            margin: 0 auto;
            position: relative;
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
            background: rgba(0, 0, 0, 0.8);
            padding: 10px 20px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
        }
        .nav-button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            margin: 0 5px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .nav-button:hover {
            background: #2563eb;
        }
        .slide-counter {
            color: white;
            padding: 8px 16px;
            font-size: 14px;
        }
        .fullscreen-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
        }
    </style>
</head>
<body>
    <div class="fullscreen-container">
        <div class="slide-wrapper">
            ${slides.map((slide, index) => `
            <div class="slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
                ${slide.htmlCode}
            </div>
            `).join('')}
        </div>
    </div>
    
    <div class="slide-navigation">
        <button class="nav-button" onclick="previousSlide()">上一页</button>
        <span id="slide-counter" class="slide-counter">1 / ${slides.length}</span>
        <button class="nav-button" onclick="nextSlide()">下一页</button>
        <button class="nav-button" onclick="toggleFullscreen()" style="margin-left: 10px;">全屏</button>
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

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        // 键盘控制
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousSlide();
            } else if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
            }
        });

        // 触摸控制（移动设备）
        let touchStartX = 0;
        document.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', function(e) {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) { // 最小滑动距离
                if (diff > 0) {
                    nextSlide(); // 向左滑动，下一页
                } else {
                    previousSlide(); // 向右滑动，上一页
                }
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
    
    toast.success('HTML文件下载完成！')
  }

  const handleSharePPT = async () => {
    if (!projectId) {
      toast.error('项目ID不存在，无法分享')
      return
    }

    try {
      // 调用分享API
      const response = await fetch('/api/ppt-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, isPublic: true })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '分享失败')
      }

      const data = await response.json()
      
      // 复制分享链接到剪贴板
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(data.shareUrl)
          toast.success('分享链接已复制到剪贴板')
        } else {
          // 回退到传统方法
          const textArea = document.createElement('textarea')
          textArea.value = data.shareUrl
          textArea.style.position = 'fixed'
          textArea.style.left = '0'
          textArea.style.top = '0'
          textArea.style.width = '2em'
          textArea.style.height = '2em'
          textArea.style.padding = '0'
          textArea.style.border = 'none'
          textArea.style.outline = 'none'
          textArea.style.boxShadow = 'none'
          textArea.style.background = 'transparent'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          
          try {
            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)
            
            if (successful) {
              toast.success('分享链接已复制到剪贴板')
            } else {
              toast.info(`分享链接: ${data.shareUrl}`)
            }
          } catch (err) {
            document.body.removeChild(textArea)
            console.error('复制失败:', err)
            toast.error('复制失败，请手动复制链接')
            toast.info(data.shareUrl)
          }
        }
      } catch (clipboardError) {
        console.error('复制到剪贴板失败:', clipboardError)
        toast.info(`分享链接: ${data.shareUrl}`)
      }
      
    } catch (error) {
      console.error('分享PPT失败:', error)
      toast.error(error instanceof Error ? error.message : '分享失败')
    }
  }

  return (
    <div className="bg-gray-900 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      {/* Header */}
 

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden" style={{width: '812px%'}}>
        {/* Left Panel - Chat & Outline */}
        <div className={`${
          previewSize === 'small' ? 'w-1/2' : 
          previewSize === 'medium' ? 'w-2/5' : 
          ' '
        } bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300`} style={{width: '-webkit-fill-available'}}>
          {/* Chat Messages */}      <div className="flex items-center justify-between  p-3" style={{position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1}}>

              <h3 className={`font-semibold text-white ${
                previewSize === 'small' ? 'text-base' : 'text-lg'
              }`}>对话记录</h3>
              <Button
                onClick={clearChat}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
    

            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className={previewSize === 'small' ? 'text-sm' : 'text-base'}>
                  开始对话来生成和修改PPT
                </p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`${
                      previewSize === 'small' ? 'max-w-[85%]' : 'max-w-[80%]'
                    } rounded-lg px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {/* 改进思考过程的显示样式 */}
                    {message.content.includes('思考过程：') ? (
                      <div className="text-sm">
                        {message.content.split('\n\n').map((section, index) => {
                          // 生成唯一的key，结合消息ID和索引
                          const sectionKey = `${message.id}-section-${index}-${section.substring(0, 10).replace(/\s/g, '')}`
                          
                          if (section.startsWith('思考过程：')) {
                            return (
                              <div key={sectionKey}>
                                
                              </div>
                            )
                          } else if (section.includes('思考中...')) {
                            const thinkingContent = section.replace('思考中...\n', '')
                            return (
                              <div key={sectionKey} className="mb-3">
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
                              <div key={sectionKey}>
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
               
                    <p className="text-xs opacity-75 mt-1">
                      {(() => {
                        const timestamp = message.timestamp;
                     
                        
                        if (timestamp instanceof Date) {
                          return timestamp.toLocaleTimeString();
                        } else if (typeof timestamp === 'string') {
                          const date = new Date(timestamp);
                          return isNaN(date.getTime()) ? '时间格式错误' : date.toLocaleTimeString();
                        } else if (typeof timestamp === 'number') {
                          return new Date(timestamp).toLocaleTimeString();
                        } else {
                          return `时间未知(${typeof timestamp})`;
                        }
                      })()}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Outline Section */}
            {outline && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold text-white ${
                    previewSize === 'small' ? 'text-base' : 'text-lg'
                  }`}>大纲</h3>
                  <Button
                    onClick={() => setShowOutline(!showOutline)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
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
                        className={`p-3 rounded-lg bg-gray-700 text-gray-300 ${
                          previewSize === 'small' ? 'p-2' : 'p-3'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className={`${
                              previewSize === 'small' ? 'text-xs' : 'text-sm'
                            } truncate`} title={slide.title}>
                              {previewSize === 'small' && slide.title.length > 12 
                                ? slide.title.substring(0, 12) + '...' 
                                : slide.title}
                            </span>
                          </div>
                          {slide.isGenerating && (
                            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                          )}
                        </div>
                        <p className={`text-xs opacity-75 mt-1 ${
                          previewSize === 'small' ? 'hidden' : 'block'
                        }`}>
                          {slide.generationProgress}
                        </p>
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
                <Send className="w-4 h-4 text-white" />
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
            <div className="flex items-center space-x-2">
              {/* 下载按钮 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={slides.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={downloadPPT}>
                    <FileText className="w-4 h-4 mr-2" />
                    下载为 PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadHTML}>
                    <Code className="w-4 h-4 mr-2" />
                    下载为 HTML
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* 分享按钮 */}
              {/* <Button
                onClick={handleSharePPT}
                disabled={slides.length === 0 || !projectId}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Share className="w-4 h-4 mr-2" />
                分享
              </Button> */}

              {/* 注释掉了 */}
            </div>
          </div>

          {/* All Slides Display */}
          <div className={`flex-1 overflow-y-auto p-4 ${
            previewSize === 'large' ? 'space-y-8' : 'space-y-6'
          }`} style={{width: '812px'}}>
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
                <Card key={slide.id} className="bg-gray-800 border-gray-700 shadow-lg" data-slide-id={slide.id}>
                  <CardContent className="p-0">
                    {/* Slide Header */}
                    <div className="flex items-center justify-between  border-b border-gray-700">
                  
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
                    <div className={`bg-white overflow-hidden relative ${
                      previewSize === 'small' ? 'w-[256px] h-[144px]' : // 256x144 (16:9)
                      previewSize === 'medium' ? 'w-[512px] h-[288px]' : // 512x288 (16:9)
                      'w-[768px] h-[432px]' // 768x432 (16:9)
                    } mx-auto`}>
                      {slide.viewMode === 'render' ? (
                        <div className="h-full bg-white overflow-hidden relative slide-content-container">
                          {slide.htmlCode ? (
                            <>
                              <iframe
                                srcDoc={slide.htmlCode}
                                className="border-0"
                                title={`Slide ${index + 1}`}
                                style={{
                                  width: '1280px',
                                  height: '720px',
                                  transform: previewSize === 'small' ? 'scale(0.2)' : 
                                           previewSize === 'medium' ? 'scale(0.4)' : 
                                           'scale(0.6)',
                                  transformOrigin: 'top left'
                                }}
                              />
                              {/* 全屏预览按钮 */}
                              <Button
                                onClick={() => {
                                  const newWindow = window.open('', '_blank', 'width=1280,height=720');
                                  if (newWindow) {
                                    newWindow.document.write(slide.htmlCode);
                                    newWindow.document.close();
                                  }
                                }}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded"
                                size="sm"
                                title="全屏预览 (1280x720)"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {/* 显示当前比例信息 */}
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                {previewSize === 'small' ? '256×144' : 
                                 previewSize === 'medium' ? '512×288' : 
                                 '768×432'} (16:9)
                              </div>
                            </>
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
                        <div className="h-full bg-gray-900 slide-content-container" style={{ overflow: 'auto' }}>
                          <div className="p-4">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                              {slide.htmlCode || '代码生成中...'}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        // 思考模式
                        <div className="h-full bg-gray-900 slide-content-container" style={{ overflow: 'auto' }}>
                          <div className="p-4">
                       
                            
                            {slide.realtimeThinkingContent || slide.thinkingContent ? (
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
                                    {slide.realtimeThinkingContent || slide.thinkingContent}
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