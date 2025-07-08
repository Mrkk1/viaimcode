"use client"

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Eye, Calendar, User, Heart, Share2, Download, Maximize, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface PPTProject {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  model: string;
  provider: string;
  status: string;
  progress: number;
  totalSlides: number;
  completedSlides: number;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
}

interface PPTOutline {
  id: string;
  projectId: string;
  title: string;
  content: string;
}

interface PPTSlide {
  id: string;
  projectId: string;
  slideIndex: number;
  title: string;
  content: string;
  htmlCode?: string;
  thinkingContent?: string;
  status: string;
  progress: string;
}

interface PPTChatMessage {
  id: string;
  projectId: string;
  messageType: 'user' | 'ai' | 'system';
  content: string;
  isGenerating: boolean;
  createdAt: Date;
}

interface PPTShareClientProps {
  project: PPTProject;
  outline: PPTOutline | null;
  slides: PPTSlide[];
  chatMessages: PPTChatMessage[];
}

export default function PPTShareClient({ project, outline, slides, chatMessages }: PPTShareClientProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 生成全屏适配的幻灯片内容
  const getFullscreenSlideContent = (originalHtml: string): string => {
    // 添加全屏适配的CSS样式
    const fullscreenStyles = `
      <style>
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          overflow: hidden !important;
          transform-origin: center center !important;
        }
        
        /* 自适应缩放 */
        .slide-container, 
        [style*="width: 1280px"], 
        [style*="height: 720px"] {
          width: 100vw !important;
          height: 100vh !important;
          transform: none !important;
          max-width: none !important;
          max-height: none !important;
        }
        
        /* 保持16:9比例的自适应缩放 */
        .aspect-ratio-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: inherit;
        }
        
        .aspect-ratio-content {
          width: 100vw;
          height: 100vh;
          transform: scale(min(calc(100vw / 1280), calc(100vh / 720)));
          transform-origin: center center;
        }
        
        /* 确保所有固定尺寸元素都能适配 */
        [style*="1280px"] {
          width: 100vw !important;
        }
        
        [style*="720px"] {
          height: 100vh !important;
        }
      </style>
    `;
    
    // 如果原HTML包含完整的HTML结构
    if (originalHtml.includes('<!DOCTYPE html>')) {
      // 在head标签中插入样式
      return originalHtml.replace('</head>', fullscreenStyles + '</head>');
    } else {
      // 如果只是HTML片段，包装成完整的HTML
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          ${fullscreenStyles}
        </head>
        <body>
          <div class="aspect-ratio-container">
            <div class="aspect-ratio-content">
              ${originalHtml}
            </div>
          </div>
        </body>
        </html>
      `;
    }
  };

  // 自动播放功能
  useEffect(() => {
    if (isPlaying && slides.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % slides.length);
      }, 5000); // 5秒切换一次
      setPlayInterval(interval);
      return () => clearInterval(interval);
    } else if (playInterval) {
      clearInterval(playInterval);
      setPlayInterval(null);
    }
  }, [isPlaying, slides.length]);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevSlide();
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToNextSlide();
          break;
        case 'Home':
          e.preventDefault();
          setCurrentSlideIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrentSlideIndex(slides.length - 1);
          break;
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isFullscreen]);

  // 全屏状态监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const goToNextSlide = () => {
    if (slides.length > 0) {
      setCurrentSlideIndex(prev => (prev + 1) % slides.length);
    }
  };

  const goToPrevSlide = () => {
    if (slides.length > 0) {
      setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetPresentation = () => {
    setCurrentSlideIndex(0);
    setIsPlaying(false);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
      } catch (err) {
        console.error('进入全屏失败:', err);
        toast.error('进入全屏失败');
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('退出全屏失败:', err);
        toast.error('退出全屏失败');
      }
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('退出全屏失败:', err);
      }
    }
  };

  const sharePresentation = async () => {
    try {
      const shareUrl = window.location.href;
      
      if (navigator.share) {
        await navigator.share({
          title: project.title,
          text: `查看这个精彩的PPT演示：${project.title}`,
          url: shareUrl
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('分享链接已复制到剪贴板');
      } else {
        toast.info(`分享链接: ${shareUrl}`);
      }
    } catch (error) {
      console.error('分享失败:', error);
      toast.error('分享失败');
    }
  };

  const downloadPresentation = () => {
    if (slides.length === 0) return;

    const combinedHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.title}</title>
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
            width: 100vw;
            height: 100vh;
            display: none;
            overflow: hidden;
            position: relative;
        }
        .slide.active {
            display: block;
        }
        .slide-content {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .slide-inner {
            width: 1280px;
            height: 720px;
            transform: scale(min(calc(100vw / 1280), calc(100vh / 720)));
            transform-origin: center center;
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
    </style>
</head>
<body>
    <div class="slide-wrapper">
        ${slides.map((slide, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
            <div class="slide-content">
                <div class="slide-inner">
                    ${slide.htmlCode ? 
                      // 如果有HTML代码，直接使用
                      slide.htmlCode.includes('<!DOCTYPE html>') ? 
                        // 如果是完整HTML，提取body内容
                        slide.htmlCode.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] || slide.htmlCode :
                        // 如果是HTML片段，直接使用
                        slide.htmlCode
                      : 
                      // 如果没有HTML代码，使用默认模板
                      `<div style="width: 1280px; height: 720px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-family: Arial, sans-serif;">
                          <div style="text-align: center;">
                              <h2 style="font-size: 2rem; margin-bottom: 1rem;">${slide.title}</h2>
                              <p style="font-size: 1.2rem;">${slide.content}</p>
                          </div>
                      </div>`
                    }
                </div>
            </div>
        </div>
        `).join('')}
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
            }
        });

        // 触摸控制
        let touchStartX = 0;
        document.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', function(e) {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    previousSlide();
                }
            }
        });
    </script>
</body>
</html>
    `;

    const blob = new Blob([combinedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-black ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      {/* 顶部信息栏 */}
      {!isFullscreen && (
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <div className=" mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">{project.title}</h1>
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                {project.completedSlides}/{project.totalSlides} 页
              </Badge>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: zhCN })}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Eye className="w-4 h-4" />
                <span>{project.viewCount} 次查看</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowInfo(!showInfo)}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white"
              >
                {showInfo ? '隐藏信息' : '显示信息'}
              </Button>
              {/* <Button
                onClick={sharePresentation}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                <Share2 className="w-4 h-4 mr-2" />
                分享
              </Button> */}
              {/* <Button
                onClick={downloadPresentation}
                variant="outline"
                size="sm"
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button> */}
            </div>
        
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="flex flex-1">
        {/* 左侧信息面板 */}
        {!isFullscreen && showInfo && (
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">演示信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">描述</h4>
                  <p className="text-sm text-gray-400">{project.prompt}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">生成模型</h4>
                  <p className="text-sm text-gray-400">{project.model} ({project.provider})</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">幻灯片列表</h4>
                  <div className="space-y-2">
                    {slides.map((slide, index) => (
                      <div
                        key={slide.id}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          index === currentSlideIndex 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        onClick={() => setCurrentSlideIndex(index)}
                      >
                        <div className="text-sm font-medium">{index + 1}. {slide.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 主要演示区域 */}
        <div className="flex-1 flex flex-col">
          {/* 幻灯片显示区域 */}
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            {currentSlide ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <div 
                  className="bg-white overflow-hidden"
                  style={{
                    width: isFullscreen ? '100vw' : '1280px',
                    height: isFullscreen ? '100vh' : '720px',
                    borderRadius: isFullscreen ? '0' : '8px',
                    boxShadow: isFullscreen ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    transform: isFullscreen ? 'none' : 'scale(0.7)',
                    transformOrigin: 'center'
                  }}
                >
                  {currentSlide.htmlCode ? (
                    <iframe
                      srcDoc={isFullscreen ? getFullscreenSlideContent(currentSlide.htmlCode) : currentSlide.htmlCode}
                      className="w-full h-full border-0"
                      title={`幻灯片 ${currentSlideIndex + 1}`}
                      style={{
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-gray-500"
                      style={{
                        fontSize: isFullscreen ? '2rem' : '1.5rem'
                      }}
                    >
                      <div className="text-center">
                        <h2 
                          className="font-bold mb-4"
                          style={{
                            fontSize: isFullscreen ? '3rem' : '2rem'
                          }}
                        >
                          {currentSlide.title}
                        </h2>
                        <p 
                          style={{
                            fontSize: isFullscreen ? '1.5rem' : '1.125rem'
                          }}
                        >
                          {currentSlide.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 页码指示器 */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentSlideIndex + 1} / {slides.length}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-xl">暂无幻灯片内容</p>
              </div>
            )}
          </div>

          {/* 底部控制栏 */}
          <div className="bg-gray-900 border-t border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={goToPrevSlide}
                  disabled={slides.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={togglePlay}
                  disabled={slides.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-800"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={goToNextSlide}
                  disabled={slides.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={resetPresentation}
                  disabled={slides.length === 0}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">
                  使用 ← → 键或空格键控制播放
                </span>
                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-800"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 