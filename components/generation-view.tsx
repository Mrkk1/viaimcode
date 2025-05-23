"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Laptop, Smartphone, Tablet, Copy, Download, RefreshCw, Loader2, Save, ArrowRight, Share2, History, Clock, Undo2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CodeEditor } from "@/components/code-editor"
import { WorkSteps } from "@/components/work-steps"
import html2canvas from 'html2canvas'
import { v4 as uuidv4 } from 'uuid'
import { EditHistory } from "@/components/edit-history"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface GenerationViewProps {
  prompt: string
  setPrompt: (value: string) => void
  model: string
  provider?: string
  generatedCode: string
  isGenerating: boolean
  generationComplete: boolean
  onRegenerateWithNewPrompt: (newPrompt: string) => void
  thinkingOutput?: string
  isThinking?: boolean
}

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
  thumbnailUrl?: string;
}

export interface HistoryVersion {
  id: string
  timestamp: Date
  thumbnail: string
  code: string
  title?: string
  isPublished?: boolean
  shareUrl?: string
  type?: 'ai' | 'manual'  // 添加版本类型标识
}

// 扩展历史版本接口，添加发布状态跟踪
interface ExtendedHistoryVersion extends HistoryVersion {
  isPublished?: boolean;
  shareUrl?: string;
}

const SaveDialog = ({ isOpen, onClose, onSave, thumbnailUrl }: SaveDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  
  // 修复：data:image类型不拼接query，http(s)图片才拼接防缓存参数
  useEffect(() => {
    if (thumbnailUrl) {
      if (thumbnailUrl.startsWith('data:image')) {
        setImgSrc(thumbnailUrl);
      } else {
        const hasParams = thumbnailUrl.includes('?');
        const timestamp = new Date().getTime();
        const newSrc = hasParams 
          ? `${thumbnailUrl}&_t=${timestamp}` 
          : `${thumbnailUrl}?_t=${timestamp}`;
        setImgSrc(newSrc);
      }
      setImageLoaded(false);
      setImageError(false);
    } else {
      setImgSrc("");
    }
  }, [thumbnailUrl, isOpen]);

  const handleSave = () => {
    onSave(title, description);
    setTitle("");
    setDescription("");
    onClose();
  };
  
  // 重置图像加载状态
  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>保存网页</DialogTitle>
          <DialogDescription>
            输入网页的标题和描述以保存
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="w-full aspect-video rounded-lg overflow-hidden border border-gray-800 relative bg-gray-800">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <span className="ml-2 text-sm text-gray-300">生成预览图中...</span>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                <div className="text-red-400 mb-2">预览图生成失败</div>
                <div className="text-xs text-gray-400">将使用默认预览图</div>
              </div>
            )}
            {imgSrc && (
              <img 
                src={imgSrc} 
                alt="网页预览" 
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => {
                  setImageLoaded(true);
                }}
                onError={(e) => {
                  console.error('预览图加载失败:', e);
                  setImageError(true);
                  setImageLoaded(true); // 即使失败也要隐藏加载状态
                }}
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入网页标题"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入网页描述"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function GenerationView({
  prompt,
  setPrompt,
  model,
  provider = 'deepseek',
  generatedCode,
  isGenerating,
  generationComplete,
  onRegenerateWithNewPrompt,
  thinkingOutput = "",
  isThinking = false
}: GenerationViewProps) {
  const [viewportSize, setViewportSize] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [copySuccess, setCopySuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")
  const [isEditable, setIsEditable] = useState(false)
  const [editedCode, setEditedCode] = useState(generatedCode)
  const [originalCode, setOriginalCode] = useState(generatedCode)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [previewContent, setPreviewContent] = useState("")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newPrompt, setNewPrompt] = useState("")
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
  const [showHistory, setShowHistory] = useState(false)
  const [versionHistory, setVersionHistory] = useState<HistoryVersion[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<string>("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Previous preview content for transition effect
  const prevContentRef = useRef<string>("")

  // Function to prepare HTML content with dark mode styles
  const prepareHtmlContent = (code: string): string => {
    // Add a dark mode default style and viewport meta tag
    const headContent = `
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; img-src 'self' data: blob: *;">
      <style>
        :root {
          color-scheme: dark;
        }
        html, body {
          background-color: #121212;
          color: #ffffff;
          min-height: 100%;
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        /* Smooth transition for body background */
        body {
          transition: background-color 0.2s ease;
        }
        /* Ensure all images can be accessed by html2canvas */
        img {
          crossorigin: anonymous;
        }
        /* 优化内容居中显示 */
        body > * {
          max-width: 100%;
          margin-left: auto;
          margin-right: auto;
        }
        /* 确保内容至少占据一定比例的空间 */
        main, div, section {
          min-width: 80%;
        }
        /* 为容器添加一些内边距 */
        .container, main, section, article {
          padding: 20px;
          box-sizing: border-box;
        }
      </style>
    `;

    let result = "";

    // Check if the code already has a <head> tag
    if (code.includes('<head>')) {
      // Insert the head content
      result = code.replace('<head>', `<head>${headContent}`);
    } else if (code.includes('<html>')) {
      // Create a head tag if there's an html tag but no head
      result = code.replace('<html>', `<html><head>${headContent}</head>`);
    } else {
      // Wrap the entire content with proper HTML structure
      result = `
        <!DOCTYPE html>
        <html>
          <head>
            ${headContent}
          </head>
          <body>
            <div style="width: 90%; max-width: 1200px; margin: 0 auto; padding: 20px;">
              ${code}
            </div>
          </body>
        </html>
      `;
    }

    return result;
  };

  // Debounced function for updating preview content
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdatePreview = useCallback(
    debounce((code: string) => {
      const preparedHtml = prepareHtmlContent(code);
      prevContentRef.current = preparedHtml;
      setPreviewContent(preparedHtml);
    }, 50), // Very short debounce for live updates, but enough to prevent excessive re-renders
    []
  );

  // Update editedCode and originalCode when generatedCode changes
  useEffect(() => {
    setEditedCode(generatedCode)
    setOriginalCode(generatedCode)
    setHasChanges(false)

    // Update preview content with debounce
    if (generatedCode) {
      debouncedUpdatePreview(generatedCode);
      
      // 重新生成代码时创建新的历史版本
      if (!isGenerating && generationComplete) {
        // 使用setTimeout避免初始化时的循环依赖问题
        setTimeout(() => {
          createNewVersion(generatedCode, "AI生成版本", 'ai');
        }, 100);
      }
    }
  }, [generatedCode, debouncedUpdatePreview, isGenerating, generationComplete])

  // Check if changes have been made and update preview content
  useEffect(() => {
    if (editedCode !== originalCode) {
      setHasChanges(true)
    } else {
      setHasChanges(false)
    }

    // Update preview content with debounce when code is edited
    if (editedCode) {
      debouncedUpdatePreview(editedCode);
    }
  }, [editedCode, originalCode, debouncedUpdatePreview])

  // 更新预览内容的函数
  const updatePreviewAfterVersionChange = useCallback((code: string) => {
    // 强制立即更新预览内容，不使用防抖
    if (debouncedUpdatePreview && typeof debouncedUpdatePreview.flush === 'function') {
      debouncedUpdatePreview.flush();
    }
    
    // 直接准备HTML并设置内容
    const preparedHtml = prepareHtmlContent(code);
    setPreviewContent(preparedHtml);
    
    // 更新key以彻底重新渲染iframe
    setPreviewKey(prev => prev + 1);
    
    // 额外添加一个延迟更新，确保内容被正确加载
    setTimeout(() => {
      const preparedHtmlAgain = prepareHtmlContent(code);
      setPreviewContent(preparedHtmlAgain);
      setPreviewKey(prev => prev + 1);
    }, 100);
  }, [debouncedUpdatePreview]);

  // 处理从历史版本中选择一个版本
  const handleSelectVersion = useCallback((version: HistoryVersion) => {
    // 如果当前有未保存的更改，先提示用户是否保存
    if (hasChanges) {
      if (window.confirm('当前有未保存的更改，切换版本后将丢失这些更改。是否继续？')) {
        setEditedCode(version.code);
        setOriginalCode(version.code);
        setCurrentVersionId(version.id);
        setHasChanges(false);
        
        // 如果版本已发布，更新共享URL
        if (version.isPublished && version.shareUrl) {
          setShareUrl(version.shareUrl);
          setLastSavedPrompt(prompt);  // 假设当前prompt与该版本一致
          setLastSavedContent(version.code);
          console.log('切换到已发布版本，更新分享链接:', version.shareUrl);
        }
        
        // 更新预览内容
        updatePreviewAfterVersionChange(version.code);
        
        // 如果编辑功能未启用，自动启用
        if (!isEditable) {
          setIsEditable(true);
        }
      }
    } else {
      // 没有未保存的更改，直接切换
      setEditedCode(version.code);
      setOriginalCode(version.code);
      setCurrentVersionId(version.id);
      
      // 如果版本已发布，更新共享URL
      if (version.isPublished && version.shareUrl) {
        setShareUrl(version.shareUrl);
        setLastSavedPrompt(prompt);  // 假设当前prompt与该版本一致
        setLastSavedContent(version.code);
        console.log('切换到已发布版本，更新分享链接:', version.shareUrl);
      }
      
      // 更新预览内容
      updatePreviewAfterVersionChange(version.code);
      
      // 如果编辑功能未启用，自动启用
      if (!isEditable) {
        setIsEditable(true);
      }
    }
  }, [hasChanges, isEditable, prompt, updatePreviewAfterVersionChange]);
  
  // 创建新的历史版本
  const createNewVersion = useCallback(async (code: string, title?: string, type: string = 'manual') => {
    try {
      // 生成缩略图
      let thumbnail = thumbnailUrl;
      
      // 如果没有缩略图或者使用的是之前的缩略图，重新生成
      if (!thumbnail || versionHistory.some(v => v.thumbnail === thumbnail)) {
        // 直接使用generateThumbnail函数
        thumbnail = await generateThumbnail();
      }
      
      // 创建新版本对象
      const newVersion: HistoryVersion = {
        id: uuidv4(),
        timestamp: new Date(),
        thumbnail,
        code,
        title: title || `版本 ${versionHistory.length + 1}`,
        isPublished: false,  // 初始状态为未发布
        shareUrl: "",  // 初始无分享链接
        type: type as 'ai' | 'manual'
      };
      
      // 添加到历史版本列表
      setVersionHistory(prev => {
        // 保证版本不重复（根据代码内容去重）
        const filtered = prev.filter(v => v.code !== code);
        return [...filtered, newVersion];
      });
      
      // 设置当前版本ID
      setCurrentVersionId(newVersion.id);
      
      return newVersion;
    } catch (error) {
      console.error('创建历史版本失败:', error);
      return null;
    }
  }, [thumbnailUrl, versionHistory]);

  // Function to save changes
  const saveChanges = () => {
    setOriginalCode(editedCode)
    setHasChanges(false)
    
    // 保存时创建新版本，标记为手动保存类型
    createNewVersion(editedCode, `手动保存版本 ${versionHistory.length + 1}`, 'manual');
  }

  // Function to copy the generated code to clipboard
  const copyToClipboard = () => {
    // Copy the current code (either edited or original)
    const currentCode = isEditable ? editedCode : originalCode
    navigator.clipboard.writeText(currentCode)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(err => {
        console.error('Error copying:', err)
      })
  }

  // Function to manually refresh the preview
  const refreshPreview = () => {
    // Update the current content
    const currentCode = isEditable ? editedCode : originalCode;

    // Force immediate update by flushing the debounce queue
    debouncedUpdatePreview.flush();

    // Prepare the HTML content
    const preparedHtml = prepareHtmlContent(currentCode);
    setPreviewContent(preparedHtml);

    // Change the key to reload the preview
    setPreviewKey(prevKey => prevKey + 1);
  }

  // Function to download the generated code as an HTML file
  const downloadCode = () => {
    const currentCode = isEditable ? editedCode : originalCode
    const element = document.createElement("a")
    const file = new Blob([currentCode], {type: 'text/html'})
    element.href = URL.createObjectURL(file)
    element.download = "generated-website.html"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Function to handle sending a new prompt
  const handleSendNewPrompt = () => {
    if (!newPrompt.trim() || isGenerating) return
    onRegenerateWithNewPrompt(newPrompt)
    setNewPrompt("") // Reset input field
  }

  // 复制分享链接
  const copyShareUrl = async () => {
    // 检查当前选择的版本是否已发布
    const currentVersion = versionHistory.find(v => v.id === currentVersionId);
    
    // 如果当前版本已发布且有分享链接，则直接使用
    if (currentVersion?.isPublished && currentVersion?.shareUrl) {
      try {
        console.log('当前版本已发布，直接复制分享链接:', currentVersion.shareUrl);
        
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(currentVersion.shareUrl);
          toast.success('分享链接已复制到剪贴板');
        } else {
          // 回退到传统方法
          const textArea = document.createElement('textarea');
          textArea.value = currentVersion.shareUrl;
          // 确保文本框可见，这对一些浏览器很重要
          textArea.style.position = 'fixed';
          textArea.style.left = '0';
          textArea.style.top = '0';
          textArea.style.width = '2em';
          textArea.style.height = '2em';
          textArea.style.padding = '0';
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';
          textArea.style.background = 'transparent';
          document.body.appendChild(textArea);
          
          // 选择文本并复制
          textArea.focus();
          textArea.select();
          
          try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
              toast.success('分享链接已复制到剪贴板');
            } else {
              toast.info(`分享链接: ${currentVersion.shareUrl}`);
              // 显示一个能点击的链接
              toast.info(
                <div onClick={() => window.open(currentVersion.shareUrl, '_blank')} className="cursor-pointer text-blue-500 hover:underline">
                  点击打开链接
                </div>
              );
            }
          } catch (err) {
            document.body.removeChild(textArea);
            console.error('复制失败:', err);
            toast.error('复制失败，请手动复制链接');
            // 显示可以手动复制的链接
            toast.info(
              <div className="break-all">
                {currentVersion.shareUrl}
              </div>
            );
          }
        }
        return;
      } catch (err) {
        console.error('使用已发布版本链接失败:', err);
        // 如果出错，继续尝试常规方法
      }
    }
    
    // 检查是否需要重新保存（当前版本未发布或没有分享链接）
    const currentContent = isEditable ? editedCode : originalCode;
    const shouldResave = !shareUrl || prompt !== lastSavedPrompt || currentContent !== lastSavedContent;

    if (shouldResave) {
      // 如果需要重新保存，打开保存对话框
      toast.info('内容已更改，需要先保存才能分享');
      await handleShowSaveDialog();
      return;
    }

    try {
      // 构建完整的URL，确保包含域名
      const fullUrl = shareUrl?.startsWith('http') 
        ? shareUrl 
        : `${window.location.origin}${shareUrl}`;
      
      console.log('准备复制分享链接:', fullUrl);
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success('分享链接已复制到剪贴板');
      } else {
        // 回退到传统方法
        const textArea = document.createElement('textarea');
        textArea.value = fullUrl;
        // 确保文本框可见，这对一些浏览器很重要
        textArea.style.position = 'fixed';
        textArea.style.left = '0';
        textArea.style.top = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        document.body.appendChild(textArea);
        
        // 选择文本并复制
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            toast.success('分享链接已复制到剪贴板');
          } else {
            toast.info(`分享链接: ${fullUrl}`);
            // 显示一个能点击的链接
            toast.info(
              <div onClick={() => window.open(fullUrl, '_blank')} className="cursor-pointer text-blue-500 hover:underline">
                点击打开链接
              </div>
            );
          }
        } catch (err) {
          document.body.removeChild(textArea);
          console.error('复制失败:', err);
          toast.error('复制失败，请手动复制链接');
          // 显示可以手动复制的链接
          toast.info(
            <div className="break-all">
              {fullUrl}
            </div>
          );
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动复制链接');
      if (shareUrl) {
        const fullUrl = shareUrl.startsWith('http') 
          ? shareUrl 
          : `${window.location.origin}${shareUrl}`;
        toast.info(
          <div className="break-all">
            {fullUrl}
          </div>
        );
      }
    }
  };

  // 添加状态来跟踪最后保存的内容
  const [lastSavedPrompt, setLastSavedPrompt] = useState(prompt);
  const [lastSavedContent, setLastSavedContent] = useState('');

  // 修改按钮函数逻辑，确保点击分享按钮时也会打开保存对话框
  const handleDownloadOrShare = (action: 'download' | 'share') => {
    if (action === 'download') {
      downloadCode();
    } else {
      // 分享操作
      copyShareUrl();
    }
  };

  // 在显示保存对话框之前先生成预览图
  const handleShowSaveDialog = async () => {
    try {
      console.log('准备显示保存对话框...');
      
      // 同步预览内容与当前编辑的代码
      const currentCode = isEditable ? editedCode : originalCode;
      
      // 强制更新预览内容
      if (debouncedUpdatePreview && typeof debouncedUpdatePreview.flush === 'function') {
        debouncedUpdatePreview.flush();
      }
      const preparedHtml = prepareHtmlContent(currentCode);
      setPreviewContent(preparedHtml);
      
      // 创建一个临时预览图
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建canvas上下文');
      
      // 设置画布大小为标准Open Graph图片尺寸
      canvas.width = 1200;
      canvas.height = 630;
      
      // 简单背景
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 添加标识文本
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('网页预览图生成中...', canvas.width / 2, canvas.height / 2);
      ctx.font = '16px sans-serif';
      ctx.fillText(`准备中...`, canvas.width / 2, canvas.height / 2 + 40);
      
      // 转换为base64图片格式
      const tempImageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // 设置临时预览图并显示对话框
      setThumbnailUrl(tempImageData);
      console.log('设置临时预览图，显示保存对话框');
      setShowSaveDialog(true);
      
      // 异步生成真正的预览图
      generateThumbnail().then(imageData => {
        if (imageData && imageData.length > 1000) {
          console.log('已生成真实预览图，更新UI');
          setThumbnailUrl(imageData);
        }
      }).catch(error => {
        console.error('生成预览图失败:', error);
      });
      
    } catch (error) {
      console.error('准备显示对话框失败:', error);
      // 即使生成预览图失败，也显示对话框
      setShowSaveDialog(true);
    }
  };

  // 新增函数：生成缩略图
  const generateThumbnail = async (): Promise<string> => {
    try {
      // 1. 重置页面滚动位置 - 解决一些截图空白问题
      window.scrollTo(0, 0);
      
      // 2. 当前的HTML内容
      const htmlContent = isEditable ? editedCode : originalCode;
      
      // 3. 创建临时容器
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1000px';  // 较小的宽度，更接近实际网页比例
      container.style.height = '800px';  // 增加高度，减少空白区域
      container.style.background = '#121212'; // 深色背景
      container.style.overflow = 'hidden';
      container.style.zIndex = '-1';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      
      // 4. 准备完整的HTML文档
      const preparedHtml = prepareHtmlContent(htmlContent);
      
      // 5. 使用iframe而不是直接注入DIV，确保HTML文档结构完整
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = '#121212';
      
      // 添加到DOM中
      container.appendChild(iframe);
      document.body.appendChild(container);
      
      // 设置一个更长的超时时间
      const IFRAME_LOAD_TIMEOUT = 3000; // 3秒
      
      // 等待iframe加载，添加更可靠的加载检测
      await new Promise<void>((resolve) => {
        let hasResolved = false;
        
        // 主加载事件
        iframe.onload = () => {
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }
        };
        
        // 确保srcdoc设置后立即开始监听加载
        iframe.srcdoc = preparedHtml;
        
        // 如果iframe有contentDocument，监听它的DOMContentLoaded和load事件
        const checkContentLoaded = () => {
          if (iframe.contentDocument) {
            if (iframe.contentDocument.readyState === 'complete' || 
                iframe.contentDocument.readyState === 'interactive') {
              if (!hasResolved) {
                hasResolved = true;
                resolve();
              }
            }
          }
        };
        
        // 定期检查iframe是否已加载
        const checkInterval = setInterval(() => {
          checkContentLoaded();
        }, 100);
        
        // 设置超时，防止无限等待
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!hasResolved) {
            hasResolved = true;
            console.log('Iframe加载超时，继续处理');
            resolve();
          }
        }, IFRAME_LOAD_TIMEOUT);
      });
      
      // 额外等待时间，确保内容完全渲染，增加到1.5秒
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let imageData = '';
      
      // 6. 尝试使用html2canvas进行截图
      try {
        // 确保iframe内容已完全加载
        if (iframe.contentDocument && iframe.contentDocument.body) {
          // 在截图前确保内容居中且填满可视区域
          if (iframe.contentDocument.body.firstElementChild) {
            const content = iframe.contentDocument.body.firstElementChild as HTMLElement;
            if (content) {
              content.style.width = '100%';
              content.style.margin = '0 auto';
              content.style.padding = '20px';
              content.style.boxSizing = 'border-box';
            }
          }
          
          // 设置更长的超时时间和更好的配置
          const canvas = await html2canvas(iframe.contentDocument.body, {
            allowTaint: true,
            useCORS: true,
            logging: false,
            background: '#121212',
            width: container.clientWidth,
            height: container.clientHeight
          });
          
          imageData = canvas.toDataURL('image/jpeg', 0.95);
          console.log('成功生成预览图，大小:', imageData.length);
        } else {
          throw new Error('iframe内容未加载完成');
        }
      } catch (error) {
        console.error('截图失败:', error);
        
        // 7. 如果截图失败，创建一个模拟预览图 - 使用更贴近网页比例的布局
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法创建Canvas上下文');
        
        // 设置尺寸为更符合网页比例的尺寸
        canvas.width = 1000;
        canvas.height = 800;
        
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 创建一个模拟的网页内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const contentWidth = canvas.width * 0.9;
        const contentHeight = canvas.height * 0.7;
        const contentX = (canvas.width - contentWidth) / 2;
        const contentY = (canvas.height - contentHeight) / 2;
        ctx.fillRect(contentX, contentY, contentWidth, contentHeight);
        
        // 添加一个标题栏
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(contentX, contentY, contentWidth, 50);
        
        // 添加文本
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('网页预览', canvas.width / 2, contentY + 100);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        ctx.fillText('由 LocalSite AI 生成', canvas.width / 2, contentY + 150);
        
        // 添加模拟内容块
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        // 标题或导航
        ctx.fillRect(contentX + 40, contentY + 200, contentWidth - 80, 40);
        // 内容区块
        ctx.fillRect(contentX + 40, contentY + 260, (contentWidth - 80) * 0.7, 30);
        ctx.fillRect(contentX + 40, contentY + 310, (contentWidth - 80) * 0.5, 30);
        ctx.fillRect(contentX + 40, contentY + 360, (contentWidth - 80) * 0.6, 100);
        
        imageData = canvas.toDataURL('image/jpeg', 0.95);
      }
      
      // 8. 清理临时DOM元素
      try {
        document.body.removeChild(container);
      } catch (e) {
        console.error('清理临时DOM元素失败:', e);
      }
      
      return imageData;
    } catch (error) {
      console.error('生成缩略图过程出错:', error);
      
      // 创建一个基础预览图作为备选
      const canvas = document.createElement('canvas');
      canvas.width = 1000;  // 调整为更合适的宽高比
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 简单渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#334155');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LocalSite AI', canvas.width / 2, canvas.height / 2);
        
        return canvas.toDataURL('image/jpeg', 0.9);
      }
      
      // 如果连Canvas都创建失败，返回静态图片的base64
      return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAA8AGoDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KACgAoAKACgAoAKACgDj/ih8VvDnwh8KyeIPFN9tsEkSBQkbSSTzOcJFEigvI5weFBOAT2NAHzl4t/4Kw/Dqw1Qtovh7xdqtjn5Ly4jt7UTD13o7OAf9zd9KAKNl/wVd+GoushqPhrxZZ2JPz3KNbXJT32oyBvzBoA9l+Fv7RHgD4t6ZDdeFPFWnX0sy7ms5JPKurdvc9GX/aUkH0NAHaUAFABQAUAFABQAUAFABQB8xft8fFG9k8S+HfAdhI0VqsZ1jUCpwXdj5UKn2AV2I9StAHy5QAUAe6/sYa41l8SNT0pnxFqGnNIo/6aRMv9A5oA+p6ACgAoAKACgAoAKACgDO8WeL9K8D+G77XNbvY7HTtPhaa4mboqj09STwAOSxAHJoA/Pv4l+Op/iJ481bxBcEq1/OzxIf8AlnEPlRP+AgD8c0AZFABQBvfDDxq/w68faP4gRWcabdLJMi/8tITlZF/FGYUAAV+oHQO0AFABQAUAFABQAUAfnV+0T8aJPi18RbzUIZGbS9Pdraxts8Ii/KXx6sSCf9kL6UAfV/7HfwftvhZ8K7S8uLdRrXiJFvb52GZI0b/VRZ7Yj+9jndI2exoA9YoAKACgAoAKACgAoAKAPzN+LHhF/APxF8QaA6kLp1/NFHnrJHuLRt/wJCpoAx/DXiW+8I+I9P1nTJvIv9MuEuraXGdsiHIPuO49QTQAPrd7Nf8A2pr6423HmbpfMO/fndu3Zzu3fNnvnNAFagAoAKACgAoAKACgAoAKAPH/ANsb4Pt8Rfho+r2MJk1rwsWuoNo5ltT/AK1PwGJB/ut6UAfHVndzWF3DdW8jRXEEiyxSDqrqcgj8DQBDQAUAFABQAUAFABQAUAFABQB2nwK+M118C/HTaxGkk+nXUZtdRtU+9JDnIZP9pGw2PcqP4hQAufF+vPrTai2rX5v2ffcTfa33sScncuc5xz60AZ1ABQAUAFABQAUAFABQAUAGr4I8caj8P/ABRZa1pU3k3ti/mRk/dde6OOzKcEH60Af/Z';
    }
  };

  // 修改handleSaveWebsite函数以使用新的预览图生成逻辑
  const handleSaveWebsite = async (title: string, description: string) => {
    try {
      // 创建预览图的时间戳，确保唯一性
      const timestamp = new Date().getTime();
      
      // 显示加载状态
      toast.loading('正在保存网页...');
      
      // 使用之前生成的缩略图，如果没有则重新生成
      let imageData = thumbnailUrl;
      if (!imageData || imageData.includes('生成中')) {
        try {
          imageData = await generateThumbnail();
        } catch (error) {
          console.error('保存前生成预览图失败:', error);
        }
      }
      
      // 确保使用当前显示的代码（优先使用编辑后的代码，如果没有编辑则使用原始生成的代码）
      // 注意：明确使用当前正在编辑的代码，而不是使用其他变量
      const currentContent = isEditable ? editedCode : originalCode;
      console.log('保存网页中，使用代码长度:', currentContent.length, '编辑模式:', isEditable);
      
      // 保存到服务器
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          htmlContent: currentContent,
          prompt,
          imageData,
          timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
      setLastSavedPrompt(prompt);
      setLastSavedContent(currentContent);
      
      // 构建完整的分享URL
      const fullShareUrl = data.shareUrl?.startsWith('http') 
        ? data.shareUrl 
        : `${window.location.origin}${data.shareUrl}`;
      
      // 打印调试信息
      console.log('保存成功，获得分享链接:', fullShareUrl);
      
      // 确保使用服务器返回的thumbnailUrl
      if (data.thumbnailUrl) {
        // 使用完整URL
        const fullThumbnailUrl = data.thumbnailUrl.startsWith('http') 
          ? data.thumbnailUrl 
          : `${window.location.origin}${data.thumbnailUrl}`;
        console.log('服务器返回的预览图URL:', fullThumbnailUrl);
        // 更新缩略图URL，确保使用最新的服务器版本
        setThumbnailUrl(fullThumbnailUrl);
        
        // 为此保存创建新的历史版本，使用服务器返回的预览图
        const savedVersion = await createNewVersion(currentContent, title || '保存的网页', 'manual');
        if (savedVersion) {
          // 如果版本创建成功且有预览图，更新版本的预览图并标记为已发布
          setVersionHistory(prev => 
            prev.map(v => v.id === savedVersion.id 
              ? {
                  ...v, 
                  thumbnail: fullThumbnailUrl, 
                  title: title || '保存的网页',
                  isPublished: true,
                  shareUrl: fullShareUrl
                } 
              : v
            )
          );
          
          // 同时更新当前版本的ID
          setCurrentVersionId(savedVersion.id);
        } else {
          // 如果没有创建新版本，则尝试更新当前版本
          setVersionHistory(prev => 
            prev.map(v => v.id === currentVersionId 
              ? {
                  ...v,
                  isPublished: true,
                  shareUrl: fullShareUrl
                }
              : v
            )
          );
        }
      }
      
      // 关闭加载提示
      toast.dismiss();
      toast.success('保存成功！');
      
      // 构建完整URL
      const fullUrl = data.shareUrl?.startsWith('http') 
        ? data.shareUrl 
        : `${window.location.origin}${data.shareUrl}`;
      
      // 使用更安全的方式复制到剪贴板
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(fullUrl);
          toast.success('分享链接已复制到剪贴板');
          console.log('成功复制到剪贴板:', fullUrl);
        } else {
          // 回退到传统方法
          const textArea = document.createElement('textarea');
          textArea.value = fullUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '0';
          textArea.style.top = '0';
          textArea.style.width = '2em';
          textArea.style.height = '2em';
          textArea.style.padding = '0';
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';
          textArea.style.background = 'transparent';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
              toast.success('分享链接已复制到剪贴板');
              console.log('成功通过execCommand复制:', fullUrl);
            } else {
              toast.info(`分享链接: ${fullUrl}`);
              console.log('无法复制，显示链接:', fullUrl);
            }
          } catch (clipboardError) {
            document.body.removeChild(textArea);
            console.error('复制到剪贴板失败:', clipboardError);
            toast.info(`分享链接: ${fullUrl}`);
            // 显示可点击的链接
            toast.info(
              <div onClick={() => window.open(fullUrl, '_blank')} className="cursor-pointer text-blue-500 hover:underline">
                点击打开链接
              </div>
            );
          }
        }
      } catch (err) {
        console.error('复制到剪贴板失败:', err);
        toast.error('复制失败，请手动复制链接');
        if (data.shareUrl) {
          const fullUrl = data.shareUrl.startsWith('http') 
            ? data.shareUrl 
            : `${window.location.origin}${data.shareUrl}`;
          toast.info(
            <div className="break-all">
              {fullUrl}
            </div>
          );
        }
      }
    } catch (error) {
      // 关闭任何正在显示的加载提示
      toast.dismiss();
      console.error('保存失败:', error);
      toast.error('保存失败，请重试');
    }
  };

  // 使用 getDisplayMedia API 尝试截取屏幕内容
  const captureDisplayMedia = async (): Promise<string> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.log('浏览器不支持getDisplayMedia API');
      return '';
    }
    
    try {
      toast.info('请在弹出窗口中选择要截图的内容', {
        duration: 5000,
      });
      
      // 请求用户选择要分享的内容
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      
      // 创建视频元素
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      
      // 等待视频准备好
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });
      
      // 等待一帧
      await new Promise(requestAnimationFrame);
      
      // 创建canvas和截图
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建canvas上下文');
      }
      
      // 绘制视频帧
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 停止所有轨道
      stream.getTracks().forEach(track => track.stop());
      
      // 转换为图片数据
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      console.log('使用getDisplayMedia捕获成功，大小:', imageData.length);
      
      return imageData;
    } catch (error) {
      console.error('使用getDisplayMedia捕获失败:', error);
      return '';
    }
  };

  // 删除历史版本
  const handleDeleteVersion = useCallback((versionId: string) => {
    // 确保不删除当前正在使用的版本
    if (versionId === currentVersionId) {
      toast.error('无法删除当前正在使用的版本');
      return;
    }
    
    setVersionHistory(prev => prev.filter(v => v.id !== versionId));
    toast.success('已删除历史版本');
  }, [currentVersionId]);
  
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header - Kompakter gestaltet */}
      <header className="border-b border-gray-800 py-2 px-4"  style={{ marginTop: '61px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">
              {provider === 'deepseek' ? 'DEEPSEEK' :
               provider === 'openai_compatible' ? 'CUSTOM API' :
               provider === 'ollama' ? 'OLLAMA' :
               provider === 'lm_studio' ? 'LM STUDIO' : 'AI'}
            </h1>
            <Badge variant="outline" className="bg-gray-900 text-white border-white">
              {model}
            </Badge>
            {thinkingOutput && (
              <div className="ml-2">
                <ThinkingIndicator
                  thinkingOutput={thinkingOutput}
                  isThinking={isThinking}
                  position="top-left"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 h-8"
              disabled={isGenerating}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Restart</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 h-8"
              disabled={!generatedCode || isGenerating}
              onClick={() => handleDownloadOrShare('download')}
            >
              <Download className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 h-8"
              disabled={!generatedCode || isGenerating}
              onClick={() => handleDownloadOrShare('share')}
            >
              <Share2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">分享</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Tab-Navigation */}
      <div className="md:hidden flex border-b border-gray-800 bg-gray-900/50">
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "code" ? "text-white border-b-2 border-white" : "text-gray-400"
          }`}
          onClick={() => setActiveTab("code")}
        >
          CODE
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "preview" ? "text-white border-b-2 border-white" : "text-gray-400"
          }`}
          onClick={() => setActiveTab("preview")}
        >
          PREVIEW
        </button>
      </div>

      {/* Hauptinhalt - Flexibler und responsiver mit Resizable Panels */}
      <div className="flex flex-1 overflow-hidden " style={{ marginTop: '11px' }}>
        {/* Mobile View - Entweder Code oder Preview basierend auf activeTab */}
        <div className="md:hidden w-full flex flex-col">
          {activeTab === "code" ? (
            <>
              {/* Code-Editor-Bereich */}
              <div className="h-[65%] border-b border-gray-800 flex flex-col">
                <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">GENERATED HTML</h2>
                    {generationComplete && (
                      <div className="ml-3 flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {isEditable ? 'Edit' : 'Read Only'}
                        </span>
                        <Switch
                          checked={isEditable}
                          onCheckedChange={(checked) => {
                            if (!checked && hasChanges) {
                              handleShowSaveDialog();
                            } else {
                              setIsEditable(checked);
                            }
                          }}
                          disabled={isGenerating}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditable && hasChanges && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-900/20"
                        onClick={saveChanges}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-gray-400 hover:text-white"
                      onClick={copyToClipboard}
                      disabled={!generatedCode || isGenerating}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {copySuccess ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {isGenerating && !generatedCode ? (
                    <div className="h-full w-full flex items-center justify-center bg-gray-950">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 mb-4 mx-auto animate-spin text-white" />
                        <p className="text-gray-400">Generating code...</p>
                      </div>
                    </div>
                  ) : (
                    <CodeEditor
                      code={isEditable ? editedCode : originalCode}
                      isEditable={isEditable && generationComplete}
                      onChange={(newCode) => setEditedCode(newCode)}
                    />
                  )}
                </div>
              </div>

              {/* Prompt und Work Steps Bereich */}
              <div className="h-[35%] p-3 flex flex-col overflow-hidden">
                <div className="mb-2 flex-shrink-0">
                  <h3 className="text-xs font-medium text-gray-400 mb-1">NEW PROMPT</h3>
                  <div className="relative">
                    <Textarea
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="Enter a new prompt..."
                      className="min-h-[60px] w-full rounded-md border border-gray-800 bg-gray-900/50 p-2 pr-10 text-sm text-gray-300 focus:border-white focus:ring-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendNewPrompt()
                        }
                      }}
                      disabled={isGenerating}
                    />
                    <Button
                      size="sm"
                      className={`absolute bottom-2 right-2 h-6 w-6 p-0 ${newPrompt.trim() ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                      onClick={handleSendNewPrompt}
                      disabled={!newPrompt.trim() || isGenerating}
                    >
                      <ArrowRight className={`h-3 w-3 ${newPrompt.trim() ? 'text-white' : 'text-gray-400'}`} />
                      <span className="sr-only">Send</span>
                    </Button>
                  </div>
                  {prompt && (
                    <div className="mt-2">
                      <h4 className="text-xs font-medium text-gray-400">PREVIOUS PROMPT:</h4>
                      <ScrollArea className="h-12 w-full rounded-md border border-gray-800 bg-gray-900/30 p-2 mt-1">
                        <p className="text-xs text-gray-400">{prompt}</p>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden">
                  <h3 className="text-xs font-medium text-gray-400 mb-1">AI WORK STEPS</h3>
                  <div className="h-[calc(100%-20px)] overflow-hidden">
                    <WorkSteps
                      isGenerating={isGenerating}
                      generationComplete={generationComplete}
                      generatedCode={isEditable ? editedCode : generatedCode}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Live Preview für Mobile */}
              <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                <h2 className="text-sm font-medium">LIVE PREVIEW</h2>
                <div className="flex items-center gap-1">
                  {generationComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 mr-2 text-gray-400 hover:text-white"
                      onClick={refreshPreview}
                      title="Refresh preview"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      <span className="text-xs hidden sm:inline">Refresh</span>
                    </Button>
                  )}
                  <Button
                    variant={viewportSize === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewportSize("desktop")}
                  >
                    <Laptop className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewportSize === "tablet" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewportSize("tablet")}
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewportSize === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setViewportSize("mobile")}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  {/* 只在桌面版显示历史按钮 */}
                  {versionHistory.length > 0 && (
                    <Button
                      variant={showHistory ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 ml-2 px-2 flex items-center gap-1"
                      onClick={() => setShowHistory(!showHistory)}
                      title={showHistory ? "隐藏历史版本" : "显示历史版本"}
                    >
                      <History className="w-4 h-4" />
                      <span className="text-xs">{versionHistory.length}</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className={`flex-1 ${showHistory ? 'max-h-[calc(100%-160px)]' : ''} p-3 flex items-center justify-center overflow-hidden`}>
                <div
                  className={`bg-gray-900 rounded-md border border-gray-800 overflow-hidden transition-all duration-300 flex items-center justify-center preview-container ${
                    viewportSize === "desktop"
                      ? "w-full h-[calc(100%-190px)]"
                      : viewportSize === "tablet"
                        ? "w-[768px] h-[1024px] max-h-[90%]"
                        : "w-[375px] h-[667px] max-h-[90%]"
                  }`}
                  style={{
                    transform: viewportSize !== "desktop" ? 'scale(0.9)' : 'none',
                  }}
                >
                  {!originalCode && !editedCode ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
                      {isGenerating ? (
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 mb-2 mx-auto animate-spin" />
                          <p>Generating preview...</p>
                        </div>
                      ) : (
                        <p>No preview available yet</p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full relative bg-white">
                      <iframe
                        ref={iframeRef}
                        key={previewKey}
                        srcDoc={previewContent}
                        className="w-full h-full absolute inset-0 z-10"
                        title="Preview"
                        sandbox="allow-scripts"
                        style={{
                          backgroundColor: '#121212',
                          opacity: 1,
                          transition: 'opacity 0.15s ease-in-out',
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          overflow: 'hidden',
                        }}
                      />
                      {/* Loading indicator that shows only during generation */}
                      {isGenerating && (
                        <div className="absolute bottom-4 right-4 z-20 bg-gray-800/80 text-white px-3 py-1 rounded-full text-xs flex items-center">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Updating preview...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop View - Resizable Panels */}
        <div className="hidden md:block w-full h-full">
          <ResizablePanelGroup
            direction="horizontal"
            className="w-full h-full"
          >
            {/* Linke Spalte - Code-Editor und Steuerelemente */}
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="h-full flex flex-col border-r border-gray-800">
                {/* Code-Editor-Bereich */}
                <div className="h-[65%] border-b border-gray-800 flex flex-col">
                  <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-medium">GENERATED HTML</h2>
                      {generationComplete && (
                        <div className="ml-3 flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {isEditable ? 'Edit' : 'Read Only'}
                          </span>
                          <Switch
                            checked={isEditable}
                            onCheckedChange={(checked) => {
                              if (!checked && hasChanges) {
                                handleShowSaveDialog();
                              } else {
                                setIsEditable(checked);
                              }
                            }}
                            disabled={isGenerating}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditable && hasChanges && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-900/20"
                          onClick={saveChanges}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-400 hover:text-white"
                        onClick={copyToClipboard}
                        disabled={!generatedCode || isGenerating}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        {copySuccess ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {isGenerating && !generatedCode ? (
                      <div className="h-full w-full flex items-center justify-center bg-gray-950">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 mb-4 mx-auto animate-spin text-white" />
                          <p className="text-gray-400">Generating code...</p>
                        </div>
                      </div>
                    ) : (
                      <CodeEditor
                        code={isEditable ? editedCode : originalCode}
                        isEditable={isEditable && generationComplete}
                        onChange={(newCode) => setEditedCode(newCode)}
                      />
                    )}
                  </div>
                </div>

                {/* Prompt und Work Steps Bereich */}
                <div className="h-[35%] p-3 flex flex-col overflow-hidden">
                  <div className="mb-2 flex-shrink-0">
                    <h3 className="text-xs font-medium text-gray-400 mb-1">NEW PROMPT</h3>
                    <div className="relative">
                      <Textarea
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        placeholder="Enter a new prompt..."
                        className="min-h-[60px] w-full rounded-md border border-gray-800 bg-gray-900/50 p-2 pr-10 text-sm text-gray-300 focus:border-white focus:ring-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendNewPrompt()
                          }
                        }}
                        disabled={isGenerating}
                      />
                      <Button
                        size="sm"
                        className={`absolute bottom-2 right-2 h-6 w-6 p-0 ${newPrompt.trim() ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                        onClick={handleSendNewPrompt}
                        disabled={!newPrompt.trim() || isGenerating}
                      >
                        <ArrowRight className={`h-3 w-3 ${newPrompt.trim() ? 'text-white' : 'text-gray-400'}`} />
                        <span className="sr-only">Send</span>
                      </Button>
                    </div>
                    {prompt && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-400">PREVIOUS PROMPT:</h4>
                        <ScrollArea className="h-12 w-full rounded-md border border-gray-800 bg-gray-900/30 p-2 mt-1">
                          <p className="text-xs text-gray-400">{prompt}</p>
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h3 className="text-xs font-medium text-gray-400 mb-1">AI WORK STEPS</h3>
                    <div className="h-[calc(100%-20px)] overflow-hidden">
                      <WorkSteps
                        isGenerating={isGenerating}
                        generationComplete={generationComplete}
                        generatedCode={isEditable ? editedCode : generatedCode}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700" />

            {/* Rechte Spalte - Live-Vorschau */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                  <h2 className="text-sm font-medium">LIVE PREVIEW</h2>
                  <div className="flex items-center gap-1">
                    {generationComplete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 mr-2 text-gray-400 hover:text-white"
                        onClick={refreshPreview}
                        title="Refresh preview"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        <span className="text-xs hidden sm:inline">Refresh</span>
                      </Button>
                    )}
                    <Button
                      variant={viewportSize === "desktop" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewportSize("desktop")}
                    >
                      <Laptop className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewportSize === "tablet" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewportSize("tablet")}
                    >
                      <Tablet className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewportSize === "mobile" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewportSize("mobile")}
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                    {/* 只在桌面版显示历史按钮 */}
                    {versionHistory.length > 0 && (
                      <Button
                        variant={showHistory ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 ml-2 px-2 flex items-center gap-1"
                        onClick={() => setShowHistory(!showHistory)}
                        title={showHistory ? "隐藏历史版本" : "显示历史版本"}
                      >
                        <History className="w-4 h-4" />
                        <span className="text-xs">{versionHistory.length}</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`flex-1 ${showHistory ? 'max-h-[calc(100%-160px)]' : ''} p-3 flex items-center justify-center overflow-hidden`}>
                  <div
                    className={`bg-gray-900 rounded-md border border-gray-800 overflow-hidden transition-all duration-300 flex items-center justify-center preview-container ${
                      viewportSize === "desktop"
                        ? "w-full h-full"
                        : viewportSize === "tablet"
                          ? "w-[768px] h-[1024px] max-h-[90%]"
                          : "w-[375px] h-[667px] max-h-[90%]"
                    }`}
                    style={{
                      transform: viewportSize !== "desktop" ? 'scale(0.9)' : 'none',
                    }}
                  >
                    {!originalCode && !editedCode ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400">
                        {isGenerating ? (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 mb-2 mx-auto animate-spin" />
                            <p>Generating preview...</p>
                          </div>
                        ) : (
                          <p>No preview available yet</p>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full relative bg-white">
                        <iframe
                          ref={iframeRef}
                          key={previewKey}
                          srcDoc={previewContent}
                          className="w-full h-full absolute inset-0 z-10"
                          title="Preview"
                          sandbox="allow-scripts"
                          style={{
                            backgroundColor: '#121212',
                            opacity: 1,
                            transition: 'opacity 0.15s ease-in-out',
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            overflow: 'hidden',
                          }}
                        />
                        {/* Loading indicator that shows only during generation */}
                        {isGenerating && (
                          <div className="absolute bottom-4 right-4 z-20 bg-gray-800/80 text-white px-3 py-1 rounded-full text-xs flex items-center">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Updating preview...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* 只在桌面视图显示历史编辑组件 */}
                <EditHistory
                  versions={versionHistory}
                  onSelectVersion={handleSelectVersion}
                  onDeleteVersion={handleDeleteVersion}
                  currentVersionId={currentVersionId}
                  isVisible={showHistory}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveWebsite}
        thumbnailUrl={thumbnailUrl}
      />
    </div>
  )
}
