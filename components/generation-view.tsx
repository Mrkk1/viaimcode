"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Laptop, Smartphone, Tablet, Copy, Download, RefreshCw, Loader2, Save, ArrowRight, Share2, History, Clock, Undo2, MousePointer2 } from "lucide-react"
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
  projectId?: string | null
  initialVersions?: HistoryVersion[]
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
          <DialogTitle>发布网站</DialogTitle>
          <DialogDescription>
            填写标题和描述来发布网站，发布后将生成分享链接
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="w-full aspect-video rounded-lg overflow-hidden border border-gray-800 relative bg-gray-800">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
                <span className="ml-2 text-sm text-gray-300">Generating preview...</span>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                <div className="text-red-400 mb-2">Failed to generate preview</div>
                <div className="text-xs text-gray-400">Will use default preview image</div>
              </div>
            )}
            {imgSrc && (
              <img 
                src={imgSrc} 
                alt="Website Preview" 
                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => {
                  setImageLoaded(true);
                }}
                onError={(e) => {
                  console.error('Failed to load preview:', e);
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">网站标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入网站标题"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">网站描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入网站描述"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>发布</Button>
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
  isThinking = false,
  projectId,
  initialVersions = []
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
  const [versionHistory, setVersionHistory] = useState<HistoryVersion[]>(initialVersions)
  const [currentVersionId, setCurrentVersionId] = useState<string>("")
  const [isElementSelectMode, setIsElementSelectMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isInitialMount = useRef(true)
  const previousGeneratedCode = useRef(generatedCode)
  const versionHistoryRef = useRef<HistoryVersion[]>(versionHistory)

  // 同步更新 versionHistoryRef
  useEffect(() => {
    versionHistoryRef.current = versionHistory;
  }, [versionHistory]);

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

  // 监听生成的代码变化，并在生成完成时创建新版本
  useEffect(() => {
    console.log('useEffect triggered:', {
      hasGeneratedCode: !!generatedCode,
      generatedCodeLength: generatedCode?.length || 0,
      isGenerating,
      generationComplete,
      isInitialMount: isInitialMount.current,
      previousCodeLength: previousGeneratedCode.current?.length || 0
    });
    
    if (generatedCode) {
      setOriginalCode(generatedCode)
      setEditedCode(generatedCode)
      debouncedUpdatePreview(generatedCode)
      
      // 只在生成完成且代码不为空时创建版本
      if (generationComplete && !isGenerating && generatedCode.trim() !== '') {
        console.log('生成已完成，检查是否需要创建版本');
        
        // 检查是否是新生成的代码（不在现有版本历史中）
        const isNewCode = !versionHistory.some(v => v.code === generatedCode);
        console.log('是否是新代码:', isNewCode);
        
        if (isNewCode) {
          // 如果是从项目详情页加载的，且已有初始版本，则不创建新版本
          const shouldSkip = isInitialMount.current && initialVersions.length > 0;
          console.log('是否应该跳过创建:', shouldSkip, {
            isInitialMount: isInitialMount.current,
            initialVersionsLength: initialVersions.length
          });
          
          if (!shouldSkip) {
            // 延迟创建版本，确保所有状态都已更新
            setTimeout(() => {
              console.log('准备创建AI生成版本，代码长度:', generatedCode.length);
              createNewVersion(generatedCode, "AI Generated Version", 'ai');
            }, 1000); // 延迟1秒
          }
        }
      } else if (generatedCode !== previousGeneratedCode.current) {
        console.log('代码已更改但不满足创建版本的条件:', {
          generationComplete,
          isGenerating,
          codeNotEmpty: generatedCode.trim() !== ''
        });
      }
      
      // 更新之前的代码引用
      previousGeneratedCode.current = generatedCode;
    }
    
    // 标记初始加载已完成
    if (isInitialMount.current && generatedCode && generationComplete) {
      console.log('初始加载完成，设置isInitialMount为false');
      isInitialMount.current = false;
    }
  }, [generatedCode, debouncedUpdatePreview, isGenerating, generationComplete, versionHistory, initialVersions])

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
    console.log('createNewVersion 被调用:', { 
      codeLength: code.length, 
      title, 
      type,
      hasProjectId: !!projectId,
      currentVersionCount: versionHistoryRef.current.length
    });
    
    try {
      // 生成缩略图
      let thumbnail = '';
      
      console.log('需要生成新的缩略图');
      // 检查 generateThumbnail 是否存在
      if (typeof generateThumbnail !== 'function') {
        console.error('generateThumbnail 函数未定义！');
        // 使用默认缩略图
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 630;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '48px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('AI Generated', canvas.width / 2, canvas.height / 2);
          thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        }
      } else {
        // 直接使用generateThumbnail函数，传入当前要保存的代码
        thumbnail = await generateThumbnail(code);
        console.log('缩略图生成完成，大小:', thumbnail.length);
      }
      
      // 如果有projectId，创建项目版本
      if (projectId) {
        try {
          const versionCount = versionHistoryRef.current.length;
          const response = await fetch(`/api/projects/${projectId}/versions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              thumbnail,
              type,
              title: title || `Version ${versionCount + 1}`,
              description: prompt,
            }),
          });

          if (response.ok) {
            const versionData = await response.json();
            console.log('项目版本创建成功:', versionData.id);
          } else {
            console.error('创建项目版本失败，状态码:', response.status);
          }
        } catch (error) {
          console.error('创建项目版本失败:', error);
        }
      } else {
        console.log('没有projectId，只在前端创建版本');
      }
      
      // 创建新版本对象
      const newVersion: HistoryVersion = {
        id: uuidv4(),
        timestamp: new Date(),
        thumbnail,
        code,
        title: title || `Version ${versionHistoryRef.current.length + 1}`,
        isPublished: false,  // 初始状态为未发布
        shareUrl: "",  // 初始无分享链接
        type: type as 'ai' | 'manual'
      };
      
      console.log('创建新版本对象:', newVersion.id, newVersion.title);
      
      // 添加到历史版本列表
      setVersionHistory(prev => {
        // 保证版本不重复（根据代码内容去重）
        const filtered = prev.filter(v => v.code !== code);
        const newHistory = [...filtered, newVersion];
        console.log('更新版本历史，新版本数量:', newHistory.length);
        return newHistory;
      });
      
      // 设置当前版本ID
      setCurrentVersionId(newVersion.id);
      console.log('设置当前版本ID:', newVersion.id);
      
      return newVersion;
    } catch (error) {
      console.error('创建历史版本失败:', error);
      return null;
    }
  }, [projectId, prompt]);

  // Function to save changes
  const saveChanges = () => {
    setOriginalCode(editedCode)
    setHasChanges(false)
    
    // 保存时创建新版本，标记为手动保存类型
    createNewVersion(editedCode, `Manual Save Version ${versionHistory.length + 1}`, 'manual');
    
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
    setHasChanges(false)
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
      // 如果需要重新保存，直接打开保存对话框，不显示额外提示
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
          } else {
            // 只显示链接，不显示额外提示
            toast.info(
              <div onClick={() => window.open(fullUrl, '_blank')} className="cursor-pointer text-blue-500 hover:underline">
                点击打开链接
              </div>
            );
          }
        } catch (err) {
          document.body.removeChild(textArea);
          console.error('复制失败:', err);
          // 只显示一次错误提示
          toast.error('复制失败，请点击下方链接手动复制');
          toast.info(
            <div className="break-all">
              {fullUrl}
            </div>
          );
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      if (shareUrl) {
        const fullUrl = shareUrl.startsWith('http') 
          ? shareUrl 
          : `${window.location.origin}${shareUrl}`;
        // 只显示一次错误提示
        toast.error('复制失败，请点击下方链接手动复制');
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
      
      // 获取当前版本的缩略图
      const currentVersion = versionHistory.find(v => v.id === currentVersionId);
      const currentCode = isEditable ? editedCode : originalCode;
      
      // 检查当前代码是否与版本中保存的代码不同
      const codeChanged = currentVersion && currentVersion.code !== currentCode;
      
      if (currentVersion && currentVersion.thumbnail && !codeChanged && !hasChanges) {
        // 如果当前版本有缩略图且代码没有改变，直接使用
        setThumbnailUrl(currentVersion.thumbnail);
        console.log('使用当前版本的缩略图显示对话框（代码未改变）');
        setShowSaveDialog(true);
      } else {
        // 如果没有缩略图或代码已改变，需要重新生成
        console.log('需要重新生成缩略图，原因:', {
          hasCurrentVersion: !!currentVersion,
          hasThumbnail: !!(currentVersion && currentVersion.thumbnail),
          codeChanged,
          hasChanges
        });
        
        // 同步预览内容与当前编辑的代码
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
        generateThumbnail(currentCode).then(imageData => {
          if (imageData && imageData.length > 1000) {
            console.log('已生成真实预览图，更新UI');
            setThumbnailUrl(imageData);
          }
        }).catch(error => {
          console.error('生成预览图失败:', error);
        });
      }
      
    } catch (error) {
      console.error('准备显示对话框失败:', error);
      // 即使生成预览图失败，也显示对话框
      setShowSaveDialog(true);
    }
  };

  // 新增函数：生成缩略图
  const generateThumbnail = async (customCode?: string): Promise<string> => {
    try {
      // 1. 重置页面滚动位置 - 解决一些截图空白问题
      window.scrollTo(0, 0);
      
      // 2. 当前的HTML内容 - 优先使用传入的代码，否则使用当前编辑的代码
      const htmlContent = customCode || (isEditable ? editedCode : originalCode);
      console.log('generateThumbnail 使用的代码长度:', htmlContent.length, '来源:', customCode ? 'customCode' : (isEditable ? 'editedCode' : 'originalCode'));
      
      // 3. 创建临时容器
      const container = document.createElement('div');
      container.style.position = 'fixed';  // 使用fixed而不是absolute
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '1200px';  // 使用标准的OG图片宽度
      container.style.height = '630px';  // 使用标准的OG图片高度
      container.style.background = '#ffffff'; // 使用白色背景，避免透明问题
      container.style.overflow = 'hidden';
      container.style.zIndex = '-999999';  // 确保在最上层
      container.style.transform = 'scale(1)';  // 确保没有缩放
      
      
      // 4. 准备完整的HTML文档，但不添加额外的样式
      const preparedHtml = htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html') 
        ? htmlContent 
        : `<!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  overflow: hidden;
                  width: 100%;
                  height: 100%;
                }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>`;
      
      // 5. 使用iframe而不是直接注入DIV，确保HTML文档结构完整
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = '#ffffff';
      iframe.style.position = 'absolute';
      iframe.style.left = '0';
      iframe.style.top = '0';
      
      // 添加到DOM中
      container.appendChild(iframe);
      document.body.appendChild(container);
      
      // 设置一个更长的超时时间
      const IFRAME_LOAD_TIMEOUT = 5000; // 5秒
      
      // 等待iframe加载，添加更可靠的加载检测
      await new Promise<void>((resolve) => {
        let hasResolved = false;
        
        // 主加载事件
        iframe.onload = () => {
          if (!hasResolved) {
            hasResolved = true;
            // 额外等待一下，确保内容渲染
            setTimeout(resolve, 1000);
          }
        };
        
        // 确保srcdoc设置后立即开始监听加载
        iframe.srcdoc = preparedHtml;
        
        // 如果iframe有contentDocument，监听它的DOMContentLoaded和load事件
        const checkContentLoaded = () => {
          if (iframe.contentDocument && iframe.contentWindow) {
            const doc = iframe.contentDocument;
            const win = iframe.contentWindow;
            
            // 检查文档是否已加载
            if (doc.readyState === 'complete') {
              // 检查是否有图片需要加载
              const images = doc.querySelectorAll('img');
              const imagePromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              });
              
              // 等待所有图片加载完成
              Promise.all(imagePromises).then(() => {
                if (!hasResolved) {
                  hasResolved = true;
                  // 额外等待，确保CSS动画等完成
                  setTimeout(resolve, 1500);
                }
              });
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
      
      // 额外等待时间，确保内容完全渲染
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let imageData = '';
      
      // 6. 尝试使用html2canvas进行截图
      try {
        // 确保iframe内容已完全加载
        if (iframe.contentDocument && iframe.contentDocument.body) {
          // 获取实际内容的尺寸
          const body = iframe.contentDocument.body;
          const html = iframe.contentDocument.documentElement;
          
          // 计算实际内容高度
          const contentHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );
          
          // 限制最大高度，避免截图过大
          const maxHeight = 2000;
          const actualHeight = Math.min(contentHeight, maxHeight);
          
          // 调整iframe高度以适应内容
          iframe.style.height = actualHeight + 'px';
          container.style.height = actualHeight + 'px';
          
          // 等待布局更新
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 设置更好的html2canvas配置
          const canvas = await html2canvas(iframe.contentDocument.body, {
            allowTaint: true,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',  // 确保白色背景
            width: 1200,  // 固定宽度
            height: actualHeight,  // 使用实际高度
            scale: 2,  // 提高清晰度
            windowWidth: 1200,
            windowHeight: actualHeight,
            onclone: (clonedDoc: Document) => {
              // 在克隆的文档中修复可能的样式问题
              const clonedBody = clonedDoc.body;
              if (clonedBody) {
                clonedBody.style.margin = '0';
                clonedBody.style.padding = '0';
                clonedBody.style.overflow = 'visible';
              }
            }
          } as any);  // 使用 as any 来避免类型错误
          
          // 创建最终的缩略图，调整到标准尺寸
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = 1200;
          finalCanvas.height = 630;
          const finalCtx = finalCanvas.getContext('2d');
          
          if (finalCtx) {
            // 填充白色背景
            finalCtx.fillStyle = '#ffffff';
            finalCtx.fillRect(0, 0, 1200, 630);
            
            // 计算如何将截图适配到630高度
            const scale = Math.min(1, 630 / canvas.height);
            const scaledWidth = canvas.width * scale;
            const scaledHeight = canvas.height * scale;
            const x = (1200 - scaledWidth) / 2;
            const y = 0;
            
            // 绘制缩放后的截图
            finalCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
            
            imageData = finalCanvas.toDataURL('image/jpeg', 0.9);
            console.log('成功生成预览图，大小:', imageData.length);
          }
        } else {
          throw new Error('iframe内容未加载完成');
        }
      } catch (error) {
        console.error('截图失败:', error);
        
        // 7. 如果截图失败，创建一个模拟预览图
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法创建Canvas上下文');
        
        // 设置标准OG图片尺寸
        canvas.width = 1200;
        canvas.height = 630;
        
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 创建一个模拟的网页内容区域
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const contentWidth = canvas.width * 0.8;
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
        ctx.fillText('网页预览', canvas.width / 2, contentY + 120);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        ctx.fillText('由 LocalSite AI 生成', canvas.width / 2, contentY + 170);
        
        // 添加模拟内容块
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        // 内容区块
        ctx.fillRect(contentX + 40, contentY + 220, (contentWidth - 80) * 0.7, 30);
        ctx.fillRect(contentX + 40, contentY + 270, (contentWidth - 80) * 0.5, 30);
        ctx.fillRect(contentX + 40, contentY + 320, (contentWidth - 80) * 0.6, 80);
        
        imageData = canvas.toDataURL('image/jpeg', 0.9);
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
      canvas.width = 1200;
      canvas.height = 630;
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
      return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAA8AGoDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhNBUQdhcRKBMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KACgAoAKACgAoAKACgDj/ih8VvDnwh8KyeIPFN9tsEkSBQkbSSTzOcJFEigvI5weFBOAT2NAHzl4t/4Kw/Dqw1Qtovh7xdqtjn5Ly4jt7UTD13o7OAf9zd9KAKNl/wVd+GoushqPhrxZZ2JPz3KNbXJT32oyBvzBoA9l+Fv7RHgD4t6ZDdeFPFWnX0sy7ms5JPKurdvc9GX/aUkH0NAHaUAFABQAUAFABQAUAFABQB8xft8fFG9k8S+HfAdhI0VqsZ1jUCpwXdj5UKn2AV2I9StAHy5QAUAe6/sYa41l8SNT0pnxFqGnNIo/6aRMv9A5oA+p6ACgAoAKACgAoAKACgDO8WeL9K8D+G77XNbvY7HTtPhaa4mboqj09STwAOSxAHJoA/Pv4l+Op/iJ481bxBcEq1/OzxIf8AlnEPlRP+AgD8c0AZFABQBvfDDxq/w68faP4gRWcabdLJMi/8tITlZF/FGYUAAV+oHQO0AFABQAUAFABQAUAfnV+0T8aJPi18RbzUIZGbS9Pdraxts8Ii/KXx6sSCf9kL6UAfV/7HfwftvhZ8K7S8uLdRrXiJFvb52GZI0b/VRZ7Yj+9jndI2exoA9YoAKACgAoAKACgAoAKAPzN+LHhF/APxF8QaA6kLp1/NFHnrJHuLRt/wJCpoAx/DXiW+8I+I9P1nTJvIv9MuEuraXGdsiHIPuO49QTQAPrd7Nf8A2pr6423HmbpfMO/fndu3Zzu3fNnvnNAFagAoAKACgAoAKACgAoAKAPH/ANsb4Pt8Rfho+r2MJk1rwsWuoNo5ltT/AK1PwGJB/ut6UAfHVndzWF3DdW8jRXEEiyxSDqrqcgj8DQBDQAUAFABQAUAFABQAUAFABQB2nwK+M118C/HTaxGkk+nXUZtdRtU+9JDnIZP9pGw2PcqP4hQAufF+vPrTai2rX5v2ffcTfa33sScncuc5xz60AZ1ABQAUAFABQAUAFABQAUAGr4I8caj8P/ABRZa1pU3k3ti/mRk/dde6OOzKcEH60Af/Z';
    }
  };

  // 修改handleSaveWebsite函数以使用新的预览图生成逻辑
  const handleSaveWebsite = async (title: string, description: string) => {
    try {
      // 创建预览图的时间戳，确保唯一性
      const timestamp = new Date().getTime();
      
      // 显示加载状态
      toast.loading('Saving website...');
      
      // 确保使用当前显示的代码（优先使用编辑后的代码，如果没有编辑则使用原始生成的代码）
      const currentContent = isEditable ? editedCode : originalCode;
      console.log('保存网页中，使用代码长度:', currentContent.length, '编辑模式:', isEditable);
      
      // 获取当前版本的缩略图
      let imageData = '';
      const currentVersion = versionHistory.find(v => v.id === currentVersionId);
      
      // 检查当前代码是否与版本中保存的代码不同
      const codeChanged = currentVersion && currentVersion.code !== currentContent;
      
      if (currentVersion && currentVersion.thumbnail && !codeChanged && !hasChanges) {
        // 如果当前版本有缩略图且代码没有改变，直接使用
        imageData = currentVersion.thumbnail;
        console.log('使用当前版本的缩略图（代码未改变）');
      } else if (thumbnailUrl && !thumbnailUrl.includes('生成中') && !codeChanged && !hasChanges) {
        // 如果有thumbnailUrl且不是临时的，且代码没有改变，使用它
        imageData = thumbnailUrl;
        console.log('使用现有的缩略图URL（代码未改变）');
      } else {
        // 如果代码已改变或没有缩略图，需要重新生成
        console.log('需要重新生成缩略图，原因:', {
          hasCurrentVersion: !!currentVersion,
          hasThumbnail: !!(currentVersion && currentVersion.thumbnail),
          codeChanged,
          hasChanges,
          hasThumbnailUrl: !!thumbnailUrl
        });
        try {
          imageData = await generateThumbnail(currentContent);
        } catch (error) {
          console.error('生成预览图失败:', error);
        }
      }
      
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
          useExistingImage: currentVersion && currentVersion.thumbnail ? true : false, // 标记是否使用现有图片
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
      
      // 更新当前版本的发布状态
      if (currentVersion) {
        // 更新前端状态
        setVersionHistory(prev => 
          prev.map(v => v.id === currentVersion.id 
            ? {
                ...v,
                isPublished: true,
                shareUrl: fullShareUrl,
                title: title || v.title || 'Untitled Website'
              }
            : v
          )
        );
        
        // 如果有projectId，更新数据库中的版本发布状态
        if (projectId) {
          try {
            const updateResponse = await fetch(`/api/projects/${projectId}/versions/${currentVersion.id}/publish`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                isPublished: true,
                shareUrl: fullShareUrl
              }),
            });
            
            if (!updateResponse.ok) {
              console.error('更新版本发布状态失败');
            } else {
              console.log('版本发布状态已更新到数据库');
            }
          } catch (error) {
            console.error('更新版本发布状态时出错:', error);
          }
        }
      } else if (data.thumbnailUrl) {
        // 如果没有当前版本，创建一个新版本
        const fullThumbnailUrl = data.thumbnailUrl.startsWith('http') 
          ? data.thumbnailUrl 
          : `${window.location.origin}${data.thumbnailUrl}`;
        
        const savedVersion = await createNewVersion(currentContent, title || 'Untitled Website', 'manual');
        if (savedVersion) {
          setVersionHistory(prev => 
            prev.map(v => v.id === savedVersion.id 
              ? {
                  ...v, 
                  thumbnail: fullThumbnailUrl, 
                  title: title || 'Untitled Website',
                  isPublished: true,
                  shareUrl: fullShareUrl
                } 
              : v
            )
          );
          setCurrentVersionId(savedVersion.id);
          
          // 如果有projectId，更新数据库中的版本发布状态
          if (projectId) {
            try {
              const updateResponse = await fetch(`/api/projects/${projectId}/versions/${savedVersion.id}/publish`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  isPublished: true,
                  shareUrl: fullShareUrl
                }),
              });
              
              if (!updateResponse.ok) {
                console.error('更新新版本发布状态失败');
              } else {
                console.log('新版本发布状态已更新到数据库');
              }
            } catch (error) {
              console.error('更新新版本发布状态时出错:', error);
            }
          }
        }
      }
      
      // 关闭加载提示
      toast.dismiss();
      toast.success('网站发布成功！');
      
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

  // 生成元素的XPath路径（从根节点开始往下构建）
  const generateElementFingerprint = useCallback((element: HTMLElement) => {
    console.log('开始生成元素XPath指纹，元素:', element);
    
    // 1. 从根节点开始往下生成完整的XPath路径
    const generateXPath = (el: HTMLElement): string => {
      const pathSegments: string[] = [];
      let current = el;
      
      // 先收集从目标元素到根节点的路径
      const reversePath: HTMLElement[] = [];
      while (current && current !== document.body && current.parentElement) {
        reversePath.push(current);
        current = current.parentElement;
      }
      
      // 反转路径，从根节点开始往下构建
      const forwardPath = reversePath.reverse();
      
      // 为每个节点生成XPath段
      forwardPath.forEach((node, index) => {
        const parent = node.parentElement;
        if (!parent) return;
        
        const siblings = Array.from(parent.children);
        const tagName = node.tagName.toLowerCase();
        
        // 计算在相同标签兄弟中的位置（从1开始）
        const sameTagSiblings = siblings.filter(sibling => sibling.tagName === node.tagName);
        const tagIndex = sameTagSiblings.indexOf(node) + 1;
        
        // 优先级：ID > 唯一class > class+索引 > 标签+索引
        if (node.id) {
          // ID是唯一的，可以直接定位
          pathSegments.push(`${tagName}[@id='${node.id}']`);
        } else if (node.className) {
          const className = node.className.trim();
          
          // 特殊处理body标签，过滤掉动态添加的类
          let cleanClassName = className;
          if (tagName === 'body') {
            cleanClassName = className
              .replace(/\s*element-selectable\s*/g, ' ')
              .trim();
          }
          
          if (cleanClassName) {
            const sameClassSiblings = siblings.filter(sibling => 
              sibling.tagName === node.tagName && sibling.className === className
            );
            
            if (sameClassSiblings.length === 1) {
              // class在同标签兄弟中是唯一的
              pathSegments.push(`${tagName}[@class='${cleanClassName}']`);
            } else {
              // class不唯一，需要添加索引
              const classIndex = sameClassSiblings.indexOf(node) + 1;
              pathSegments.push(`${tagName}[@class='${cleanClassName}'][${classIndex}]`);
            }
          } else {
            // 如果清理后没有class，使用标签索引
            if (sameTagSiblings.length === 1) {
              pathSegments.push(tagName);
            } else {
              pathSegments.push(`${tagName}[${tagIndex}]`);
            }
          }
        } else {
          // 没有ID和class，使用标签索引
          if (sameTagSiblings.length === 1) {
            pathSegments.push(tagName);
          } else {
            pathSegments.push(`${tagName}[${tagIndex}]`);
          }
        }
      });
      
      return '//' + pathSegments.join('/');
    };
    
    // 2. 生成分层路径信息（用于逐层匹配）
    const generateLayeredPath = (el: HTMLElement): Array<{
      tagName: string;
      id?: string;
      className?: string;
      index?: number;
      level: number;
    }> => {
      const layers: Array<{
        tagName: string;
        id?: string;
        className?: string;
        index?: number;
        level: number;
      }> = [];
      let current = el;
      let level = 0;
      
      // 收集从目标元素到根节点的路径
      const reversePath: HTMLElement[] = [];
      while (current && current !== document.body && current.parentElement) {
        reversePath.push(current);
        current = current.parentElement;
      }
      
      // 反转路径，从根节点开始
      const forwardPath = reversePath.reverse();
      
      forwardPath.forEach((node, index) => {
        const parent = node.parentElement;
        if (!parent) return;
        
        const siblings = Array.from(parent.children);
        const sameTagSiblings = siblings.filter(sibling => sibling.tagName === node.tagName);
        const tagIndex = sameTagSiblings.indexOf(node) + 1;
        
        const layer: {
          tagName: string;
          id?: string;
          className?: string;
          index?: number;
          level: number;
        } = {
          tagName: node.tagName.toLowerCase(),
          level: index,
          index: tagIndex
        };
        
        if (node.id) {
          layer.id = node.id;
        }
        
        if (node.className) {
          layer.className = node.className.trim();
          
          // 特殊处理body标签，过滤掉动态添加的类
          if (node.tagName.toLowerCase() === 'body') {
            layer.className = layer.className
              .replace(/\s*element-selectable\s*/g, ' ')
              .trim();
          }
          
          // 计算在相同class兄弟中的索引
          const sameClassSiblings = siblings.filter(sibling => 
            sibling.tagName === node.tagName && sibling.className === node.className
          );
          if (sameClassSiblings.length > 1) {
            layer.index = sameClassSiblings.indexOf(node) + 1;
          }
        }
        
        layers.push(layer);
      });
      
      return layers;
    };
    
    // 3. 生成备用的CSS选择器路径
    const generateCSSPath = (el: HTMLElement): string => {
      const pathSegments: string[] = [];
      let current = el;
      
      // 收集路径段
      const reversePath: HTMLElement[] = [];
      while (current && current !== document.body && current.parentElement) {
        reversePath.push(current);
        current = current.parentElement;
      }
      
      // 从根节点开始构建CSS路径
      reversePath.reverse().forEach(node => {
        let selector = node.tagName.toLowerCase();
        
        if (node.id) {
          selector += `#${node.id}`;
        } else {
          if (node.className) {
            const classes = node.className.trim().split(/\s+/).join('.');
            selector += `.${classes}`;
          }
          
          // 添加nth-child以确保精确性
          const parent = node.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(node) + 1;
            selector += `:nth-child(${index})`;
          }
        }
        
        pathSegments.push(selector);
      });
      
      return pathSegments.join(' > ');
    };
    
    // 4. 提取关键文本用于验证
    const extractKeyText = (el: HTMLElement): string => {
      // 获取元素的直接文本内容（不包括子元素）
      const directText = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent?.trim())
        .filter(text => text && text.length > 0)
        .join(' ');
      
      if (directText) return directText;
      
      // 如果没有直接文本，获取第一个有意义的子元素文本
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 2) {
          return text;
        }
      }
      
      return '';
    };
    
    const xpath = generateXPath(element);
    const layeredPath = generateLayeredPath(element);
    const cssPath = generateCSSPath(element);
    const keyText = extractKeyText(element);
    

    
    return {
      xpath,
      layeredPath,
      cssPath,
      keyText,
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      id: element.id || '',
      textContent: element.textContent?.trim() || ''
    };
  }, []);

  // 在代码中通过完整DOM路径精确查找元素（完全模拟浏览器控制台）
  const findElementInCode = useCallback((fingerprint: {
    xpath: string;
    layeredPath: Array<{
      tagName: string;
      id?: string;
      className?: string;
      index?: number;
      level: number;
    }>;
    cssPath: string;
    keyText: string;
    tagName: string;
    className: string;
    id: string;
    textContent: string;
  }) => {
    const currentCode = isEditable ? editedCode : originalCode;
    const lines = currentCode.split('\n');
    
    
    // 策略1: ID精确匹配（最高优先级）
    if (fingerprint.id) {
      const lineIndex = lines.findIndex(line => 
        line.includes(`id="${fingerprint.id}"`) || line.includes(`id='${fingerprint.id}'`)
      );
      if (lineIndex !== -1) {
        return {
          lineIndex,
          score: 100,
          confidence: '精确'
        };
      }
    }
    
    // 策略2: 完整DOM路径验证（模拟浏览器控制台）
    const fullPathMatch = (): number | null => {
      
      if (fingerprint.layeredPath.length === 0) return null;
      
      // 获取目标层（最后一层）
      const targetLayer = fingerprint.layeredPath[fingerprint.layeredPath.length - 1];
      
      // 首先找到所有可能的目标元素
      const candidateLines: number[] = [];
      
      if (targetLayer.className) {
        lines.forEach((line, index) => {
          if (line.includes(`<${targetLayer.tagName}`) && 
              (line.includes(`class="${targetLayer.className}"`) || 
               line.includes(`class='${targetLayer.className}'`))) {
            candidateLines.push(index);
          }
        });
      } else {
        lines.forEach((line, index) => {
          if (line.includes(`<${targetLayer.tagName}`)) {
            candidateLines.push(index);
          }
        });
      }
      
      // console.log(`找到${candidateLines.length}个候选目标元素:`, candidateLines.map(i => i + 1));
      
      if (candidateLines.length === 0) return null;
      if (candidateLines.length === 1) {
        // console.log('✅ 唯一候选元素匹配:', candidateLines[0] + 1);
        return candidateLines[0];
      }
      
      // 多个候选元素，需要完整路径验证
      // console.log('多个候选元素，开始完整路径验证');
      
      for (const candidateLineIndex of candidateLines) {
        // console.log(`验证候选行 ${candidateLineIndex + 1}`);
        
        // 验证完整的父级路径
        let isValidPath = true;
        let currentSearchLine = candidateLineIndex;
        
        // 从倒数第二层开始向上验证（跳过目标层，因为已经匹配了）
        // 同时跳过body标签（第0层），因为body标签可能有动态类
        for (let layerIndex = fingerprint.layeredPath.length - 2; layerIndex >= 1; layerIndex--) {
          const parentLayer = fingerprint.layeredPath[layerIndex];
          console.log(`验证第${layerIndex}层父元素:`, parentLayer);
          
          // 向上搜索父元素（在当前行之前的一定范围内）
          let foundParent = false;
          const searchStart = Math.max(0, currentSearchLine - 50); // 向上搜索50行
          
          for (let i = currentSearchLine - 1; i >= searchStart; i--) {
            const line = lines[i];
            
            // 检查是否匹配父层
            let parentMatches = false;
            
            if (parentLayer.id) {
              // 通过ID匹配父元素
              if (line.includes(`<${parentLayer.tagName}`) && 
                  (line.includes(`id="${parentLayer.id}"`) || line.includes(`id='${parentLayer.id}'`))) {
                parentMatches = true;
              }
            } else if (parentLayer.className) {
              // 通过class匹配父元素
              if (line.includes(`<${parentLayer.tagName}`) && 
                  (line.includes(`class="${parentLayer.className}"`) || 
                   line.includes(`class='${parentLayer.className}'`))) {
                parentMatches = true;
              }
            } else {
              // 通过标签匹配父元素
              if (line.includes(`<${parentLayer.tagName}`)) {
                parentMatches = true;
              }
            }
            
            if (parentMatches) {
              foundParent = true;
              currentSearchLine = i;
              break;
            }
          }
          
          if (!foundParent) {
            isValidPath = false;
            break;
          }
        }
        
        if (isValidPath) {
          return candidateLineIndex;
        } else {
        }
      }
      
      return candidateLines[0];
    };
    
    const fullPathResult = fullPathMatch();
    if (fullPathResult !== null) {
      return {
        lineIndex: fullPathResult,
        score: 95,
        confidence: '精确'
      };
    }
    
    // 策略3: 关键文本匹配（用于验证和备选）
    if (fingerprint.keyText && fingerprint.keyText.length > 3) {
      const lineIndex = lines.findIndex(line => line.includes(fingerprint.keyText));
      if (lineIndex !== -1) {
        return {
          lineIndex,
          score: 90,
          confidence: '高'
        };
      }
    }
    
    // 策略4: XPath直接解析匹配
    const xpathDirectMatch = (): number | null => {
      
      // 解析XPath中的最具体的标识符
      const xpathParts = fingerprint.xpath.split('/').filter(part => part.length > 0);
      
      // 寻找包含ID的部分
      for (const part of xpathParts) {
        const idMatch = part.match(/\[@id='([^']+)'\]/);
        if (idMatch) {
          const id = idMatch[1];
          const lineIndex = lines.findIndex(line => 
            line.includes(`id="${id}"`) || line.includes(`id='${id}'`)
          );
          if (lineIndex !== -1) {
            return lineIndex;
          }
        }
      }
      
      return null;
    };
    
    const xpathResult = xpathDirectMatch();
    if (xpathResult !== null) {
      return {
        lineIndex: xpathResult,
        score: 85,
        confidence: '高'
      };
    }
    
    // 策略5: CSS路径匹配（最后的备选）
    if (fingerprint.cssPath.includes('nth-child')) {
      const nthMatch = fingerprint.cssPath.match(/:nth-child\((\d+)\)/g);
      if (nthMatch) {
        const lastNthMatch = nthMatch[nthMatch.length - 1];
        const indexMatch = lastNthMatch.match(/:nth-child\((\d+)\)/);
        if (indexMatch) {
          const nthIndex = parseInt(indexMatch[1]) - 1;
          
          const tagLines: number[] = [];
          lines.forEach((line, index) => {
            if (line.includes(`<${fingerprint.tagName}`)) {
              tagLines.push(index);
            }
          });
          
          if (tagLines.length > nthIndex) {
            return {
              lineIndex: tagLines[nthIndex],
              score: 80,
              confidence: '中'
            };
          }
        }
      }
    }
    
    console.log('❌ 所有匹配策略都失败了');
    return null;
  }, [isEditable, editedCode, originalCode]);

  // 处理元素选择模式
  const handleElementSelect = useCallback((element: HTMLElement) => {
    if (!isElementSelectMode) return;
    
    try {
      
      // 生成元素指纹
      const fingerprint = generateElementFingerprint(element);
      
      // 在代码中查找元素
      const result = findElementInCode(fingerprint);
      
      if (result) {
        const targetLineNumber = result.lineIndex + 1;
        
        // 通过自定义事件通知CodeEditor跳转到指定行
        const event = new CustomEvent('jumpToLine', {
          detail: { lineNumber: targetLineNumber }
        });
        
        console.log('触发跳转事件:', event.detail);
        window.dispatchEvent(event);
        
        // 显示成功提示
        toast.success(`已定位到第 ${targetLineNumber} 行`, {
          duration: 2000,
        });
      } else {
        console.warn('未找到匹配的代码行');
        toast.error('未能在代码中找到对应的元素');
      }
      
      // 高亮选中的元素
      element.style.outline = '2px solid #3b82f6';
      element.style.outlineOffset = '2px';
      
      // 3秒后移除高亮
      setTimeout(() => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }, 3000);
      
    } catch (error) {
      console.error('元素选择处理失败:', error);
      toast.error('元素选择失败');
    }
  }, [isElementSelectMode, generateElementFingerprint, findElementInCode]);

  // 设置iframe的元素选择事件监听
  const setupElementSelection = useCallback(() => {
    if (!iframeRef.current || !isElementSelectMode) return;
    
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;
    
    // 添加样式来显示可选择状态
    const style = iframeDoc.createElement('style');
    style.textContent = `
      .element-selectable * {
        cursor: crosshair !important;
      }
      .element-selectable *:hover {
        outline: 2px dashed #3b82f6 !important;
        outline-offset: 2px !important;
      }
    `;
    iframeDoc.head.appendChild(style);
    
    // 为body添加选择模式类
    if (iframeDoc.body) {
      iframeDoc.body.classList.add('element-selectable');
    }
    
    // 添加点击事件监听
    const handleClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (target) {
        handleElementSelect(target);
      }
    };
    
    iframeDoc.addEventListener('click', handleClick, true);
    
    // 返回清理函数
    return () => {
      if (iframeDoc.body) {
        iframeDoc.body.classList.remove('element-selectable');
      }
      iframeDoc.removeEventListener('click', handleClick, true);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [isElementSelectMode, handleElementSelect]);

  // 监听元素选择模式变化
  useEffect(() => {
    if (isElementSelectMode) {
      const cleanup = setupElementSelection();
      return cleanup;
    }
  }, [isElementSelectMode, setupElementSelection, previewKey]);

  // 删除历史版本
  const handleDeleteVersion = useCallback(async (versionId: string) => {
    // 确保不删除当前正在使用的版本
    if (versionId === currentVersionId) {
      toast.error('无法删除当前正在使用的版本');
      return;
    }
    
    console.log('删除前版本数量:', versionHistory.length);
    
    // 如果有projectId，调用API删除数据库中的版本
    if (projectId) {
      try {
        const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('删除版本失败');
        }
        
        // 从前端状态中删除
        setVersionHistory(prev => {
          const newHistory = prev.filter(v => v.id !== versionId);
          console.log('删除后版本数量:', newHistory.length);
          return newHistory;
        });
        toast.success('已删除历史版本');
      } catch (error) {
        console.error('删除版本失败:', error);
        toast.error('删除失败，请重试');
      }
    } else {
      // 如果没有projectId，只从前端状态中删除（临时版本）
      setVersionHistory(prev => {
        const newHistory = prev.filter(v => v.id !== versionId);
        console.log('删除后版本数量:', newHistory.length);
        return newHistory;
      });
      toast.success('已删除历史版本');
    }
  }, [currentVersionId, projectId]);
  
  // 当initialVersions变化时，更新versionHistory
  useEffect(() => {
    if (initialVersions && initialVersions.length > 0) {
      setVersionHistory(initialVersions);
      // 如果还没有设置当前版本ID，设置为最新的版本（数组中的最后一个）
      if (!currentVersionId && initialVersions.length > 0) {
        const latestVersion = initialVersions[initialVersions.length - 1];
        setCurrentVersionId(latestVersion.id);
        console.log('设置默认当前版本为最新版本:', latestVersion.id, latestVersion.title);
        
        // 同时更新编辑器内容为最新版本的代码
        if (latestVersion.code) {
          setEditedCode(latestVersion.code);
          setOriginalCode(latestVersion.code);
          // 更新预览内容
          updatePreviewAfterVersionChange(latestVersion.code);
        }
      }
    }
  }, [initialVersions, currentVersionId, updatePreviewAfterVersionChange]);
  
  return (
    <div className="h-[calc(100vh-61px)] bg-black text-white flex flex-col overflow-hidden">
      {/* Header - Kompakter gestaltet */}
      <header className="border-b border-gray-800 py-2 px-4"  >
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
              className="border-gray-800 text-gray-400 hover:text-gray-900 hover:bg-white h-8"
              disabled={isGenerating}
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Restart</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-gray-900 hover:bg-white h-8"
              disabled={!generatedCode || isGenerating}
              onClick={() => handleDownloadOrShare('download')}
            >
              <Download className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-gray-900 hover:bg-white h-8"
              disabled={!generatedCode || isGenerating}
              onClick={() => handleDownloadOrShare('share')}
            >
              <Share2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Share</span>
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
                      className="h-7 px-2 text-gray-400 hover:text-gray-900 hover:bg-white"
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
                      className="h-7 px-2 mr-2 text-gray-400 "
                      onClick={refreshPreview}
                      title="Refresh preview"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      <span className="text-xs hidden sm:inline">Refresh</span>
                    </Button>
                  )}
                  {generationComplete && (
                    <Button
                      variant={isElementSelectMode ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2 mr-2 text-gray-400 hover:text-gray-900 hover:bg-white"
                      onClick={() => setIsElementSelectMode(!isElementSelectMode)}
                      title={isElementSelectMode ? "退出元素选择模式" : "进入元素选择模式"}
                    >
                      <MousePointer2 className="w-4 h-4 mr-1" />
                      <span className="text-xs hidden sm:inline">Select</span>
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
                  <Button
                    key={`history-btn-${versionHistory.length}`}
                    variant={showHistory ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 ml-2 px-2 flex items-center gap-1"
                    onClick={() => setShowHistory(!showHistory)}
                    title={showHistory ? "隐藏历史版本" : "显示历史版本"}
                  >
                    <History className="w-4 h-4" />
                    <span className="text-xs">{versionHistory.length}</span>
                  </Button>
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
                        {/* Element selection mode indicator */}
                        {isElementSelectMode && (
                          <div className="absolute top-4 left-4 z-20 bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm flex items-center shadow-lg">
                            <MousePointer2 className="w-4 h-4 mr-2" />
                            <span>点击元素定位到代码</span>
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
                        className="h-7 px-2 text-gray-400 hover:text-gray-900 hover:bg-white"
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
                        className="h-7 px-2 mr-2 text-gray-400 hover:text-gray-900 hover:bg-white"
                        onClick={refreshPreview}
                        title="Refresh preview"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        <span className="text-xs hidden sm:inline">Refresh</span>
                      </Button>
                    )}
                    {generationComplete && (
                      <Button
                        variant={isElementSelectMode ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 mr-2 text-gray-400 hover:text-gray-900 hover:bg-white"
                        onClick={() => setIsElementSelectMode(!isElementSelectMode)}
                        title={isElementSelectMode ? "退出元素选择模式" : "进入元素选择模式"}
                      >
                        <MousePointer2 className="w-4 h-4 mr-1" />
                        <span className="text-xs hidden sm:inline">Select</span>
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
                    <Button
                      key={`history-btn-${versionHistory.length}`}
                      variant={showHistory ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 ml-2 px-2 flex items-center gap-1"
                      onClick={() => setShowHistory(!showHistory)}
                      title={showHistory ? "隐藏历史版本" : "显示历史版本"}
                    >
                      <History className="w-4 h-4" />
                      <span className="text-xs">{versionHistory.length}</span>
                    </Button>
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
                          {/* Element selection mode indicator */}
                          {isElementSelectMode && (
                            <div className="absolute top-4 left-4 z-20 bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm flex items-center shadow-lg">
                              <MousePointer2 className="w-4 h-4 mr-2" />
                              <span>点击元素定位到代码</span>
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
