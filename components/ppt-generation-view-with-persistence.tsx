"use client"

import { useState, useEffect, useRef } from "react"
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
  slideIndex: number
  title: string
  content: string
  htmlCode?: string
  thinkingContent?: string
  status: 'pending' | 'thinking' | 'generating' | 'completed' | 'failed'
  progress: string
  viewMode: 'render' | 'code' | 'thinking'
  userSelectedViewMode?: 'render' | 'code' | 'thinking'
}

interface PPTOutline {
  title: string
  content: string // JSON string
}

interface ChatMessage {
  id: string
  messageType: 'user' | 'ai'
  content: string
  isGenerating: boolean
  createdAt: string
}

export interface PPTTaskData {
  task: {
    id: string
    title: string
    prompt: string
    model: string
    provider: string
    status: 'pending' | 'generating_outline' | 'generating_slides' | 'completed' | 'failed'
    progress: number
    totalSlides: number
    completedSlides: number
    errorMessage?: string
    createdAt: string
    completedAt?: string
  }
  outline: PPTOutline | null
  slides: PPTSlide[]
  chatMessages: ChatMessage[]
}

interface PPTGenerationViewWithPersistenceProps {
  taskId: string
  taskData: PPTTaskData
  onBack: () => void
}

export function PPTGenerationViewWithPersistence({
  taskId,
  taskData: initialTaskData,
  onBack
}: PPTGenerationViewWithPersistenceProps) {
  const [taskData, setTaskData] = useState<PPTTaskData>(initialTaskData)
  const [currentChatInput, setCurrentChatInput] = useState("")
  const [showOutline, setShowOutline] = useState(true)
  const [previewSize, setPreviewSize] = useState<'small' | 'medium' | 'large'>('large')
  const [isUpdating, setIsUpdating] = useState(false)
  
  // 轮询更新任务状态
  useEffect(() => {
    if (taskData.task.status === 'generating_outline' || 
        taskData.task.status === 'generating_slides') {
      
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/ppt-tasks/${taskId}`)
          if (response.ok) {
            const updatedData = await response.json()
            setTaskData(updatedData)
          }
        } catch (error) {
          console.error('更新任务状态失败:', error)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [taskId, taskData.task.status])

  const handleSendChatMessage = async () => {
    if (!currentChatInput.trim() || isUpdating) return

    // 这里可以添加聊天功能的实现
    // 暂时显示提示
    toast.info('聊天功能正在开发中...')
    setCurrentChatInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChatMessage()
    }
  }

  const clearChat = () => {
    // 清空聊天记录的功能
    toast.info('清空聊天记录功能正在开发中...')
  }

  const downloadPPT = () => {
    const completedSlides = taskData.slides.filter(slide => slide.status === 'completed' && slide.htmlCode)
    
    if (completedSlides.length === 0) {
      toast.error('没有可下载的幻灯片')
      return
    }

    const combinedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${taskData.task.title}</title>
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
            ${completedSlides.map((slide, index) => `
            <div class="slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
                ${slide.htmlCode}
            </div>
            `).join('')}
        </div>
    </div>
    
    <div class="slide-navigation">
        <button class="nav-button" onclick="previousSlide()">上一页</button>
        <span id="slide-counter" class="slide-counter">1 / ${completedSlides.length}</span>
        <button class="nav-button" onclick="nextSlide()">下一页</button>
        <button class="nav-button" onclick="toggleFullscreen()" style="margin-left: 10px;">全屏</button>
    </div>

    <script>
        let currentSlide = 0;
        const totalSlides = ${completedSlides.length};

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
    a.download = `${taskData.task.title}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('PPT已下载')
  }

  // 更新单个幻灯片的视图模式
  const updateSlideViewMode = (slideId: string, newViewMode: 'render' | 'code' | 'thinking') => {
    setTaskData(prev => ({
      ...prev,
      slides: prev.slides.map(slide => 
        slide.id === slideId 
          ? { ...slide, viewMode: newViewMode, userSelectedViewMode: newViewMode }
          : slide
      )
    }))
  }

  // 解析大纲内容
  const parsedOutline = taskData.outline ? JSON.parse(taskData.outline.content) : null

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{taskData.task.title}</h1>
            <p className="text-sm text-gray-400">
              状态: {taskData.task.status} | 进度: {taskData.task.progress}% | 
              完成: {taskData.task.completedSlides}/{taskData.task.totalSlides}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={downloadPPT}
            disabled={taskData.slides.filter(s => s.status === 'completed').length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            下载PPT
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Chat & Outline */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between mb-4" style={{position: 'sticky', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(0, 0, 0, 0.8)'}}>
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

            {taskData.chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Presentation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无对话记录</p>
              </div>
            ) : (
              taskData.chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.messageType === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.messageType === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <div className="text-sm prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {message.isGenerating && (
                      <div className="flex items-center mt-2">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-xs opacity-75">生成中...</span>
                      </div>
                    )}
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Outline Section */}
            {parsedOutline && (
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
                    <p className="text-sm text-gray-400 mb-3">{taskData.slides.length} 页</p>
                    {taskData.slides.map((slide) => (
                      <div
                        key={slide.id}
                        className="p-3 rounded-lg bg-gray-700 text-gray-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium">
                              {slide.slideIndex + 1}
                            </span>
                            <span className="text-sm truncate" title={slide.title}>
                              {slide.title}
                            </span>
                          </div>
                          {slide.status === 'thinking' || slide.status === 'generating' ? (
                            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                          ) : slide.status === 'completed' ? (
                            <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" />
                          ) : slide.status === 'failed' ? (
                            <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
                          ) : (
                            <div className="w-3 h-3 bg-gray-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs opacity-75 mt-1">
                          {slide.progress}
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
                disabled={!currentChatInput.trim() || isUpdating}
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
              {taskData.slides.length > 0 && (
                <span className="text-gray-400 text-sm">共 {taskData.slides.length} 页</span>
              )}
            </div>
          </div>

          {/* All Slides Display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {taskData.slides.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>暂无幻灯片</p>
                  <p className="text-sm mt-2">任务正在处理中...</p>
                </div>
              </div>
            ) : (
              taskData.slides.map((slide) => (
                <Card key={slide.id} className="bg-gray-800 border-gray-700 shadow-lg" data-slide-id={slide.id}>
                  <CardContent className="p-0">
                    {/* Slide Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">第{slide.slideIndex + 1}页</span>
                        <span className="text-gray-400">{slide.title}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={() => updateSlideViewMode(slide.id, 'render')}
                          variant="ghost"
                          size="sm"
                          className={slide.viewMode === 'render' 
                            ? 'bg-white text-black hover:bg-white' 
                            : 'text-gray-400 hover:text-gray-400 hover:bg-transparent'
                          }
                        >
                          预览
                        </Button>
                        <Button
                          onClick={() => updateSlideViewMode(slide.id, 'code')}
                          variant="ghost"
                          size="sm"
                          className={slide.viewMode === 'code' 
                            ? 'bg-white text-black hover:bg-white' 
                            : 'text-gray-400 hover:text-gray-400 hover:bg-transparent'
                          }
                        >
                          代码
                        </Button>
                        <Button
                          onClick={() => updateSlideViewMode(slide.id, 'thinking')}
                          variant="ghost"
                          size="sm"
                          className={slide.viewMode === 'thinking' 
                            ? 'bg-white text-black hover:bg-white' 
                            : 'text-gray-400 hover:text-gray-400 hover:bg-transparent'
                          }
                        >
                          思考
                        </Button>
                      </div>
                    </div>

                    {/* Slide Content */}
                    <div className="bg-white overflow-hidden relative w-[768px] h-[432px] mx-auto">
                      {slide.viewMode === 'render' ? (
                        <div className="h-full bg-white overflow-hidden relative">
                          {slide.htmlCode && slide.status === 'completed' ? (
                            <>
                              <iframe
                                srcDoc={slide.htmlCode}
                                className="border-0"
                                title={`Slide ${slide.slideIndex + 1}`}
                                style={{
                                  width: '1280px',
                                  height: '720px',
                                  transform: 'scale(0.6)',
                                  transformOrigin: 'top left'
                                }}
                              />
                              <Button
                                onClick={() => {
                                  const newWindow = window.open('', '_blank', 'width=1280,height=720');
                                  if (newWindow) {
                                    newWindow.document.write(slide.htmlCode!);
                                    newWindow.document.close();
                                  }
                                }}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded"
                                size="sm"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                              <div className="text-center">
                                {slide.status === 'thinking' || slide.status === 'generating' ? (
                                  <>
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                    <p>{slide.progress}</p>
                                  </>
                                ) : slide.status === 'failed' ? (
                                  <>
                                    <div className="text-red-400 mb-2">生成失败</div>
                                    <p className="text-sm">{slide.progress}</p>
                                  </>
                                ) : (
                                  <p>等待生成</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : slide.viewMode === 'code' ? (
                        <div className="h-full bg-gray-900 overflow-auto">
                          <div className="p-4">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                              {slide.htmlCode || '代码生成中...'}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full bg-gray-900 overflow-auto">
                          <div className="p-4">
                            {slide.thinkingContent ? (
                              <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-gray-300 leading-relaxed text-sm">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                  >
                                    {slide.thinkingContent}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ) : slide.status === 'thinking' || slide.status === 'generating' ? (
                              <div className="bg-gray-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                                  <span className="text-yellow-300 text-sm">正在思考幻灯片设计...</span>
                                </div>
                                <div className="text-gray-400 text-sm">
                                  状态: {slide.progress}
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