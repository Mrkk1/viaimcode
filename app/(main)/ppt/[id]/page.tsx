'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PPTGenerationView } from '@/components/ppt-generation-view';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// 后端数据类型
interface PPTTaskData {
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
  outline: {
    title: string
    content: string // JSON string
  } | null
  slides: Array<{
    id: string
    slideIndex: number
    title: string
    content: string
    htmlCode?: string
    thinkingContent?: string
    status: 'pending' | 'thinking' | 'generating' | 'completed' | 'failed'
    progress: string
  }>
  chatMessages: Array<{
    id: string
    messageType: 'user' | 'ai'
    content: string
    isGenerating: boolean
    createdAt: string
  }>
}

// 前端组件需要的数据类型
interface PPTSlide {
  id: string
  title: string
  content: string
  htmlCode: string
  isGenerating: boolean
  generationProgress: string
  thinkingContent?: string
  realtimeThinkingContent?: string
  viewMode: 'render' | 'code' | 'thinking'
  userSelectedViewMode?: 'render' | 'code' | 'thinking'
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

// 数据转换函数
function convertTaskDataToInitialData(taskData: PPTTaskData) {
  // 转换大纲
  let outline: PPTOutline | undefined = undefined
  if (taskData.outline) {
    try {
      const parsedOutline = JSON.parse(taskData.outline.content)
      outline = {
        title: parsedOutline.title || taskData.task.title,
        slides: parsedOutline.slides || []
      }
    } catch (error) {
      console.error('解析大纲失败:', error)
      // 如果解析失败，从幻灯片数据创建大纲
      outline = {
        title: taskData.task.title,
        slides: taskData.slides.map(slide => ({
          title: slide.title,
          content: slide.content,
          keyPoints: []
        }))
      }
    }
  }

  // 转换幻灯片
  const slides: PPTSlide[] = taskData.slides.map((slide, index) => {
    console.log(`幻灯片${index}转换:`, {
      id: slide.id,
      title: slide.title,
      status: slide.status,
      progress: slide.progress,
      htmlCode长度: slide.htmlCode?.length || 0,
      thinkingContent长度: slide.thinkingContent?.length || 0,
      thinkingContent内容: slide.thinkingContent ? slide.thinkingContent.substring(0, 100) + '...' : '无'
    });
    
    return {
      id: slide.id,
      title: slide.title,
      content: slide.content,
      htmlCode: slide.htmlCode || '',
      isGenerating: slide.status === 'thinking' || slide.status === 'generating',
      generationProgress: slide.progress,
      thinkingContent: slide.thinkingContent,
      realtimeThinkingContent: slide.thinkingContent,
      viewMode: slide.htmlCode ? 'render' : slide.thinkingContent ? 'thinking' : 'render',
      userSelectedViewMode: undefined
    };
  })

  console.log('转换后的幻灯片:', slides)
  console.log('原始幻灯片数据:', taskData.slides)

  // 转换聊天记录
  const chatMessages: ChatMessage[] = taskData.chatMessages.map((msg, index) => {
    const timestamp = new Date(msg.createdAt);
    console.log(`聊天记录${index}转换:`, {
      原始时间: msg.createdAt,
      转换后时间: timestamp,
      时间戳有效: !isNaN(timestamp.getTime()),
      时间字符串: timestamp.toString()
    });
    
    // 确保ID的唯一性，添加前缀和索引以避免与新生成的消息冲突
    const uniqueId = `db-${msg.id}-${index}`;
    
    return {
      id: uniqueId,
      type: msg.messageType,
      content: msg.content,
      timestamp: timestamp,
      isGenerating: msg.isGenerating
    };
  })

  console.log('转换后的聊天记录:', chatMessages)
  console.log('原始聊天记录:', taskData.chatMessages)

  return {
    projectId: taskData.task.id,
    outline,
    slides,
    chatMessages
  }
}

export default function PPTTaskPage() {
  const params = useParams();
  const router = useRouter();
  const [taskData, setTaskData] = useState<PPTTaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskId = params?.id as string;

  useEffect(() => {
    if (!taskId) return;

    const fetchTaskData = async () => {
      try {
        const response = await fetch(`/api/ppt-tasks/${taskId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('任务不存在');
          } else if (response.status === 403) {
            setError('无权访问此任务');
          } else {
            setError('加载任务失败');
          }
          return;
        }

        const data = await response.json();
        setTaskData(data);
      } catch (err) {
        console.error('获取任务数据失败:', err);
        setError('加载任务失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();

    // 如果任务正在进行中，设置轮询
    const interval = setInterval(() => {
      if (taskData?.task.status === 'generating_outline' || 
          taskData?.task.status === 'generating_slides') {
        fetchTaskData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, taskData?.task.status]);

  const handleBack = () => {
    router.push('/ppt-plaza');
  };

  if (loading) {
    return (
      <div className=" bg-gray-900 flex items-center justify-center" style={{height: 'calc(100vh - 64px)'}}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className=" bg-gray-900 flex items-center justify-center" style={{height: 'calc(100vh - 64px)'}}>
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <Button onClick={handleBack} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            返回PPT列表
          </Button>
        </div>
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className=" bg-gray-900 flex items-center justify-center" style={{height: 'calc(100vh - 64px)'}}>
        <div className="text-center">
          <div className="text-white text-xl mb-4">Task data does not exist</div>
          <Button onClick={handleBack} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // 转换数据格式
  const initialData = convertTaskDataToInitialData(taskData);

  return (
    <div className=" bg-gray-900" style={{height: 'calc(100vh - 64px)'}}>
      <PPTGenerationView
        prompt={taskData.task.prompt}
        model={taskData.task.model}
        provider={taskData.task.provider}
        onBack={handleBack}
        initialData={initialData}
      />
    </div>
  );
} 