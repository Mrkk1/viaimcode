"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Laptop, Smartphone, Tablet, Copy, Download, RefreshCw, Loader2, Save, ArrowRight, Share2, History, Clock, Undo2, MousePointer2, Settings, X, Trash2, Send } from "lucide-react"
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
import { VisualEditor } from "@/components/visual-editor"
import { ChatInterface, ChatMessage } from "@/components/chat-interface"
import { PreviewPanel } from "@/components/preview-panel"

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

// 添加图片替换对话框的接口
interface ImageReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: (newImageSrc: string) => void;
  currentImageSrc: string;
}

// 图片替换对话框组件
const ImageReplaceDialog = ({ isOpen, onClose, onReplace, currentImageSrc }: ImageReplaceDialogProps) => {
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setImageUrl("");
      setUploadedFile(null);
      setPreviewUrl("");
      setIsUploading(false);
    }
  }, [isOpen]);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      
      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // 清空URL输入
      setImageUrl("");
    } else {
      toast.error('请选择有效的图片文件');
    }
  };

  // 处理URL输入
  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setUploadedFile(null);
      setPreviewUrl(url);
    } else {
      setPreviewUrl("");
    }
  };

  // 处理替换
  const handleReplace = async () => {
    try {
      setIsUploading(true);
      
      let newImageSrc = "";
      
      if (uploadedFile) {
        // 上传文件到服务器
        const formData = new FormData();
        formData.append('image', uploadedFile);
        
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('图片上传失败');
        }
        
        const data = await response.json();
        newImageSrc = data.url;
      } else if (imageUrl) {
        // 使用URL
        newImageSrc = imageUrl;
      } else {
        toast.error('请选择图片或输入图片链接');
        return;
      }
      
      onReplace(newImageSrc);
      onClose();
      toast.success('图片替换成功');
    } catch (error) {
      console.error('图片替换失败:', error);
      toast.error('图片替换失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>替换图片</DialogTitle>
          <DialogDescription>
            上传新图片或输入图片链接来替换当前图片
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* 当前图片预览 */}
          <div className="space-y-2">
            <Label>当前图片</Label>
            <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
              {currentImageSrc ? (
                <img 
                  src={currentImageSrc} 
                  alt="Current" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling!.textContent = '图片加载失败';
                  }}
                />
              ) : (
                <span className="text-gray-500">无图片</span>
              )}
            </div>
          </div>

          {/* 新图片预览 */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>新图片预览</Label>
              <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* 文件上传 */}
          <div className="space-y-2">
            <Label>上传图片</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                选择文件
              </Button>
            </div>
          </div>

          {/* 或者分隔线 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">或者</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* URL输入 */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">图片链接</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={isUploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            取消
          </Button>
          <Button 
            onClick={handleReplace} 
            disabled={!previewUrl || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              '替换图片'
            )}
          </Button>
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
  const [hasSelectedElementContext, setHasSelectedElementContext] = useState(false)
  const [selectedElementContext, setSelectedElementContext] = useState("")
  const [showImageReplaceDialog, setShowImageReplaceDialog] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState("")
  const [selectedImageFingerprint, setSelectedImageFingerprint] = useState<any>(null)
  const [selectedImageElement, setSelectedImageElement] = useState<HTMLElement | null>(null)
  const [imageReplaceButton, setImageReplaceButton] = useState<{
    show: boolean;
    x: number;
    y: number;
  }>({ show: false, x: 0, y: 0 })
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isInitialMount = useRef(true)
  const previousGeneratedCode = useRef(generatedCode)
  const versionHistoryRef = useRef<HistoryVersion[]>(versionHistory)
  // 可视化编辑器相关状态
  const [isVisualMode, setIsVisualMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  // 使用ref来跟踪是否是通过可视化编辑器更新的代码，避免触发额外的useEffect
  const isVisualCodeUpdateRef = useRef(false)
  // 添加保存加载状态
  const [isSaving, setIsSaving] = useState(false)
  
  // Chat模式相关状态
  const [isChatMode, setIsChatMode] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentChatInput, setCurrentChatInput] = useState("")
  const [previewMode, setPreviewMode] = useState<'render' | 'code'>('render') // 右侧预览模式

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

  // 直接更新iframe DOM的函数，避免闪烁
  const updateIframeDOMDirectly = useCallback((newCode: string) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
      console.log('iframe未准备好，回退到传统更新方式');
      return false;
    }

    try {
      const iframeDoc = iframe.contentDocument;
      const iframeWin = iframe.contentWindow;
      
      // 检查新代码是否是完整的HTML文档
      const isFullDocument = newCode.includes('<!DOCTYPE') || newCode.includes('<html');
      
      // 保存当前滚动位置（添加null检查）
      let scrollTop = 0;
      let scrollLeft = 0;
      
      try {
        if (iframeDoc.documentElement) {
          scrollTop = iframeDoc.documentElement.scrollTop || 0;
          scrollLeft = iframeDoc.documentElement.scrollLeft || 0;
        }
        if (iframeDoc.body && scrollTop === 0 && scrollLeft === 0) {
          scrollTop = iframeDoc.body.scrollTop || 0;
          scrollLeft = iframeDoc.body.scrollLeft || 0;
        }
      } catch (scrollError) {
        console.log('获取滚动位置失败，使用默认值:', scrollError);
        scrollTop = 0;
        scrollLeft = 0;
      }
      
      if (isFullDocument) {
        console.log('检测到完整HTML文档，尝试智能更新');
        
        // 对于完整HTML文档，尝试解析并更新
        try {
          // 创建一个临时DOM来解析新的HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newCode;
          
          // 查找body内容
          let bodyContent = '';
          const bodyElement = tempDiv.querySelector('body');
          if (bodyElement) {
            bodyContent = bodyElement.innerHTML;
          } else {
            // 如果没有body标签，使用整个内容
            bodyContent = newCode;
          }
          
          // 查找head内容中的样式
          let headStyles = '';
          const headElement = tempDiv.querySelector('head');
          if (headElement) {
            const styleElements = headElement.querySelectorAll('style');
            styleElements.forEach(style => {
              headStyles += style.outerHTML;
            });
            
            const linkElements = headElement.querySelectorAll('link[rel="stylesheet"]');
            linkElements.forEach(link => {
              headStyles += link.outerHTML;
            });
          }
          
          // 更新head中的样式（如果有新样式）
          if (headStyles && iframeDoc.head) {
            // 移除旧的动态样式
            const oldDynamicStyles = iframeDoc.head.querySelectorAll('style[data-dynamic], link[data-dynamic]');
            oldDynamicStyles.forEach(el => el.remove());
            
            // 添加新样式
            const tempStyleDiv = iframeDoc.createElement('div');
            tempStyleDiv.innerHTML = headStyles;
            Array.from(tempStyleDiv.children).forEach(child => {
              child.setAttribute('data-dynamic', 'true');
              iframeDoc.head.appendChild(child);
            });
          }
          
          // 更新body内容
          if (iframeDoc.body && bodyContent) {
            // 创建包装div
            const wrapper = iframeDoc.createElement('div');
            wrapper.style.width = '90%';
            wrapper.style.maxWidth = '1200px';
            wrapper.style.margin = '0 auto';
            wrapper.style.padding = '20px';
            wrapper.innerHTML = bodyContent;
            
            // 清空body并添加新内容
            iframeDoc.body.innerHTML = '';
            iframeDoc.body.appendChild(wrapper);
            
            console.log('完整HTML文档智能更新成功');
            
            // 恢复滚动位置
            requestAnimationFrame(() => {
              if (iframeDoc.documentElement) {
                iframeDoc.documentElement.scrollTop = scrollTop;
                iframeDoc.documentElement.scrollLeft = scrollLeft;
              }
              if (iframeDoc.body) {
                iframeDoc.body.scrollTop = scrollTop;
                iframeDoc.body.scrollLeft = scrollLeft;
              }
            });
            
            return true;
          }
        } catch (parseError) {
          console.log('完整HTML文档解析失败，回退到传统方式:', parseError);
          return false;
        }
      } else {
        // 对于HTML片段，直接更新body内容
        const bodyContent = newCode.trim();
        
        // 更新body内容
        if (iframeDoc.body && bodyContent) {
          // 创建一个包装div来容纳新内容
          const wrapper = iframeDoc.createElement('div');
          wrapper.style.width = '90%';
          wrapper.style.maxWidth = '1200px';
          wrapper.style.margin = '0 auto';
          wrapper.style.padding = '20px';
          wrapper.innerHTML = bodyContent;
          
          // 清空body并添加新内容
          iframeDoc.body.innerHTML = '';
          iframeDoc.body.appendChild(wrapper);
          
          console.log('HTML片段直接更新成功');
          
          // 恢复滚动位置
          requestAnimationFrame(() => {
            if (iframeDoc.documentElement) {
              iframeDoc.documentElement.scrollTop = scrollTop;
              iframeDoc.documentElement.scrollLeft = scrollLeft;
            }
            if (iframeDoc.body) {
              iframeDoc.body.scrollTop = scrollTop;
              iframeDoc.body.scrollLeft = scrollLeft;
            }
          });
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('直接更新iframe DOM失败:', error);
      return false;
    }
  }, []);

  // 智能预览更新函数，优先使用DOM直接更新
  const smartUpdatePreview = useCallback((code: string) => {
    // 在可视化模式下不更新预览
    if (isVisualMode) {
      return;
    }
    
    console.log('🔄 开始智能预览更新，代码长度:', code.length);
    
    // 尝试直接更新DOM
    const domUpdateSuccess = updateIframeDOMDirectly(code);
    
    // 如果DOM直接更新失败，回退到传统方式
    if (!domUpdateSuccess) {
      console.log('⚠️ 智能更新失败，使用传统更新方式');
      const preparedHtml = prepareHtmlContent(code);
      prevContentRef.current = preparedHtml;
      setPreviewContent(preparedHtml);
      // 更新key以强制重新渲染
      setPreviewKey(prev => prev + 1);
    } else {
      console.log('✅ 智能更新成功，预览已无缝更新');
    }
  }, [isVisualMode, updateIframeDOMDirectly, prepareHtmlContent]);

  // 防抖的智能预览更新
  const debouncedSmartUpdatePreview = useCallback(
    debounce(smartUpdatePreview, 300), // 增加防抖时间，减少频繁更新
    [smartUpdatePreview]
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
      // 只有在代码真正改变时才更新 originalCode 和 editedCode
      // 避免在手动保存时重复设置
      if (generatedCode !== previousGeneratedCode.current) {
        console.log('代码发生变化，更新 originalCode 和 editedCode');
        setOriginalCode(generatedCode)
        setEditedCode(generatedCode)
        // 对于AI生成的代码，使用传统更新方式确保完整加载
        debouncedUpdatePreview(generatedCode)
      }
      
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
  }, [generatedCode, debouncedUpdatePreview, isGenerating, generationComplete, initialVersions])
  // 移除 versionHistory 依赖，避免在手动保存时重复触发

  // Check if changes have been made and update preview content
  useEffect(() => {
    console.log('🔍 useEffect触发检查:', {
      editedCode: editedCode?.length || 0,
      originalCode: originalCode?.length || 0,
      isVisualMode,
      isVisualCodeUpdate: isVisualCodeUpdateRef.current,
      hasChanges: editedCode !== originalCode
    });
    
    if (editedCode !== originalCode) {
      setHasChanges(true)
    } else {
      setHasChanges(false)
    }

    // Update preview content with debounce when code is edited
    // 在可视化模式下不自动更新预览，避免刷新iframe
    // 在代码编辑模式下使用智能更新，避免闪烁
    // 如果是通过可视化编辑器更新的代码，也不触发预览更新（因为DOM已经直接更新了）
    if (editedCode && !isVisualMode && !isVisualCodeUpdateRef.current) {
      console.log('📝 触发智能预览更新，原因: 代码编辑');
      debouncedSmartUpdatePreview(editedCode);
    } else {
      console.log('⏸️ 跳过预览更新，原因:', {
        noEditedCode: !editedCode,
        isVisualMode,
        isVisualCodeUpdate: isVisualCodeUpdateRef.current
      });
    }
  }, [editedCode, originalCode, debouncedSmartUpdatePreview, isVisualMode])

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
        console.log('当前版本历史数量:', prev.length);
        console.log('准备添加新版本:', newVersion.title);
        
        // 只过滤掉完全相同的版本（ID相同），而不是代码相同的版本
        // 允许用户保存多个具有相同代码但不同时间戳的版本
        const filtered = prev.filter(v => v.id !== newVersion.id);
        const newHistory = [...filtered, newVersion];
        
        console.log('过滤后版本数量:', filtered.length);
        console.log('添加新版本后数量:', newHistory.length);
        console.log('新版本历史:', newHistory.map(v => ({ id: v.id, title: v.title, type: v.type })));
        
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
  const saveChanges = async () => {
    console.log('=== 开始保存操作 ===');
    
    // 设置保存加载状态
    setIsSaving(true);
    
    try {
      // 立即显示一个测试toast，确保toast系统正常工作
   
      
      // 显示正在生成缩略图的提示
      toast.loading('Generating Thumbnail...', {
        id: 'saving-toast',
        duration: 10000, // 10秒超时
      });
      
      setOriginalCode(editedCode)
      setHasChanges(false)
      
      // 保存时创建新版本，标记为手动保存类型，等待完成
      // 使用 versionHistoryRef 获取最新的版本数量
      const currentVersionCount = versionHistoryRef.current.length;
      console.log('保存前版本数量:', currentVersionCount);
      console.log('保存前版本历史:', versionHistoryRef.current.map(v => ({ id: v.id, title: v.title })));
      
      // 更新提示为正在保存版本
      toast.loading('Saving Version...', {
        id: 'saving-toast',
        duration: 10000,
      });
      
      const newVersion = await createNewVersion(editedCode, `Manual Save Version ${currentVersionCount + 1}`, 'manual');
      
      if (newVersion) {
        console.log('手动保存版本创建完成:', newVersion.id, newVersion.title);
        console.log('保存后版本历史长度:', versionHistory.length);
        
        // 立即检查状态是否更新
        setTimeout(() => {
          console.log('延迟检查 - 版本历史长度:', versionHistory.length);
          console.log('延迟检查 - versionHistoryRef长度:', versionHistoryRef.current.length);
          console.log('延迟检查 - 当前版本ID:', currentVersionId);
        }, 50);
        
        // 强制触发重新渲染，确保UI更新
        setTimeout(() => {
          console.log('强制检查版本历史更新:', versionHistory.length);
          // 如果历史版本没有更新，手动触发一次状态更新
          setVersionHistory(prev => {
            console.log('强制更新检查 - 当前版本数:', prev.length);
            console.log('强制更新检查 - 版本列表:', prev.map(v => ({ id: v.id, title: v.title })));
            return [...prev]; // 创建新数组引用，强制重新渲染
          });
        }, 100);
        
        // 显示成功提示
        toast.success('Code saved as new version', {
          id: 'saving-toast',
          duration: 3000,
        });
        console.log('=== 保存操作完成 ===');
      } else {
        console.error('创建版本失败');
        toast.error('Save failed, please try again', {
          id: 'saving-toast',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('创建手动保存版本失败:', error);
      toast.error('Save failed, please try again', {
        id: 'saving-toast',
        duration: 5000,
      });
    } finally {
      // 重置保存加载状态
      setIsSaving(false);
    }
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

    if (isVisualMode) {
      // 可视化模式下，强制刷新iframe
      // Force immediate update by flushing the debounce queue
      debouncedUpdatePreview.flush();

      // Prepare the HTML content
      const preparedHtml = prepareHtmlContent(currentCode);
      setPreviewContent(preparedHtml);

      // Change the key to reload the preview
      setPreviewKey(prevKey => prevKey + 1);
    } else {
      // 代码编辑模式下，优先尝试智能更新
      const domUpdateSuccess = updateIframeDOMDirectly(currentCode);
      
      if (!domUpdateSuccess) {
        // 如果智能更新失败，使用传统方式
        console.log('手动刷新：智能更新失败，使用传统方式');
        // Force immediate update by flushing the debounce queue
        debouncedUpdatePreview.flush();

        // Prepare the HTML content
        const preparedHtml = prepareHtmlContent(currentCode);
        setPreviewContent(preparedHtml);

        // Change the key to reload the preview
        setPreviewKey(prevKey => prevKey + 1);
      } else {
        console.log('手动刷新：智能更新成功');
      }
    }
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
    
    // 如果有选中元素的上下文，智能组合用户输入和上下文
    let finalPrompt = newPrompt.trim();
    if (hasSelectedElementContext && selectedElementContext) {
      // 检查用户输入是否已经包含了对元素的引用
      const userInput = newPrompt.trim();
      const hasElementReference = userInput.toLowerCase().includes('this') || 
                                 userInput.toLowerCase().includes('element') ||
                                 userInput.toLowerCase().includes('selected');
      
      if (hasElementReference) {
        // 如果用户已经引用了元素，直接组合
        finalPrompt = `${selectedElementContext}\n\nUser request: ${userInput}`;
      } else {
        // 如果用户没有引用元素，添加连接词
        finalPrompt = `${selectedElementContext}\n\nSpecifically: ${userInput}`;
      }
    }
    
    // 更新PREVIOUS PROMPT显示
    setPrompt(finalPrompt);
    
    onRegenerateWithNewPrompt(finalPrompt)
    setNewPrompt("") // Reset input field
    setHasChanges(false)
    setHasSelectedElementContext(false) // Reset context state
    setSelectedElementContext("") // Reset context
  }

  // Handle NEW PROMPT input changes
  const handleNewPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewPrompt(value);
    
    // 如果用户清空了输入框，重置上下文状态
    if (hasSelectedElementContext && !value.trim()) {
      setHasSelectedElementContext(false);
      setSelectedElementContext("");
    }
  };

  // Chat模式处理函数
  const handleSendChatMessage = async () => {
    if (!currentChatInput.trim() || isGenerating) return;

    // 构建完整的用户消息内容，包含选中元素上下文
    let fullUserMessage = currentChatInput.trim();
    if (hasSelectedElementContext && selectedElementContext) {
      // 智能组合选中元素上下文和用户输入
      if (!fullUserMessage.toLowerCase().includes('selected') && 
          !fullUserMessage.toLowerCase().includes('element') &&
          !fullUserMessage.toLowerCase().includes('this')) {
        // 如果用户输入没有明确引用选中元素，则添加上下文
        fullUserMessage = `${selectedElementContext} ${fullUserMessage}`;
      } else {
        // 如果用户输入已经引用了元素，则只需要添加选中元素的描述
        fullUserMessage = `${fullUserMessage} (referring to: ${selectedElementContext.replace("Please modify the selected element: ", "")})`;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: fullUserMessage,
      timestamp: new Date()
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isGenerating: true
    };

    // 添加用户消息和正在生成的助手消息
    setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    setCurrentChatInput("");
    
    // 清理选中元素状态
    if (hasSelectedElementContext) {
      setHasSelectedElementContext(false);
      setSelectedElementContext("");
    }

    try {
      // 构建对话上下文
      const conversationContext = chatMessages.map(msg => 
        `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const fullPrompt = `基于以下现有代码和对话历史，按照用户的最新要求进行修改：

现有代码：
${isEditable ? editedCode : originalCode}

对话历史：
${conversationContext}

用户最新要求：
${fullUserMessage}

请保持代码结构的完整性，只修改必要的部分。返回完整的修改后的代码。`;

      // 更新PREVIOUS PROMPT显示
      setPrompt(fullPrompt);
      
      // 调用生成函数
      onRegenerateWithNewPrompt(fullPrompt);

    } catch (error) {
      console.error('Chat message error:', error);
      // 移除失败的助手消息
      setChatMessages(prev => prev.slice(0, -1));
    }
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentChatInput(e.target.value);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  // 监听生成状态变化，更新聊天消息
  useEffect(() => {
    if (isChatMode && !isGenerating && generationComplete) {
      // 当代码生成完成时，更新最后一条助手消息
      setChatMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.type === 'assistant' && lastMessage.isGenerating) {
          const updatedMessage = {
            ...lastMessage,
            content: '代码已成功生成并更新！您可以继续提出修改要求。',
            isGenerating: false
          };
          return [...prev.slice(0, -1), updatedMessage];
        }
        return prev;
      });
    }
  }, [isGenerating, generationComplete, isChatMode]);

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

  // 辅助函数：解析style字符串为对象
  const parseStyleString = (styleString: string): Record<string, string> => {
    const styleObj: Record<string, string> = {};
    if (!styleString) return styleObj;
    
    const declarations = styleString.split(';');
    declarations.forEach(declaration => {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex > 0) {
        const property = declaration.substring(0, colonIndex).trim();
        const value = declaration.substring(colonIndex + 1).trim();
        if (property && value) {
          styleObj[property] = value;
        }
      }
    });
    
    return styleObj;
  };

  // 处理可视化编辑器的样式变更
  const handleStyleChange = useCallback((property: string, value: string) => {
    console.log('样式变更:', property, value, selectedElement);
    if (!selectedElement) {
      console.log('没有选中的元素');
      return;
    }

    try {
      // 特殊处理文本内容属性
      if (property === 'textContent' || property === 'innerHTML') {
        console.log('处理文本内容更新:', property, value);
        
        // 直接更新DOM中的文本内容
        if (property === 'textContent') {
          selectedElement.textContent = value;
        } else if (property === 'innerHTML') {
          selectedElement.innerHTML = value;
        }
        
        // 确保编辑模式已启用
        if (!isEditable) {
          console.log('启用编辑模式');
          setIsEditable(true);
        }

        // 获取当前代码
        const currentCode = isEditable ? editedCode : originalCode;
        const lines = currentCode.split('\n');
        
        // 查找元素所在的行
        const findElementLine = () => {
          // 策略1: 通过ID精确匹配
          if (selectedElement.id) {
            const idMatch = lines.findIndex(line => 
              line.includes(`id="${selectedElement.id}"`) || line.includes(`id='${selectedElement.id}'`)
            );
            if (idMatch !== -1) {
              console.log('通过ID找到元素:', selectedElement.id);
              return idMatch;
            }
          }
          
          // 策略2: 通过类名匹配
          if (selectedElement.className) {
            const className = selectedElement.className.trim();
            const classMatch = lines.findIndex(line => 
              line.includes(`class="${className}"`) || line.includes(`class='${className}'`)
            );
            if (classMatch !== -1) {
              console.log('通过类名找到元素:', className);
              return classMatch;
            }
          }
          
          // 策略3: 通过标签名和原始文本内容匹配
          const tagName = selectedElement.tagName.toLowerCase();
          const originalText = selectedElement.textContent?.trim();
          
          if (originalText && originalText.length > 3) {
            const textMatch = lines.findIndex(line => 
              line.includes(`<${tagName}`) && line.includes(originalText)
            );
            if (textMatch !== -1) {
              console.log('通过标签名和文本内容找到元素:', tagName, originalText);
              return textMatch;
            }
          }
          
          // 策略4: 通过标签名匹配第一个
          const tagMatch = lines.findIndex(line => line.includes(`<${tagName}`));
          if (tagMatch !== -1) {
            console.log('通过标签名找到元素:', tagName);
            return tagMatch;
          }
          
          console.warn('所有元素定位策略都失败了');
          return -1;
        };
        
        const targetLineIndex = findElementLine();
        
        if (targetLineIndex !== -1) {
          const targetLine = lines[targetLineIndex];
          console.log('找到元素所在行:', targetLineIndex + 1, targetLine);
          
          // 更新文本内容
          let updatedLine = targetLine;
          const tagName = selectedElement.tagName.toLowerCase();
          
          if (property === 'textContent') {
            // 更新纯文本内容 - 替换标签之间的内容
            const tagPattern = new RegExp(`(<${tagName}[^>]*>)([^<]*?)(</${tagName}>)`, 'i');
            const selfClosingPattern = new RegExp(`(<${tagName}[^>]*?)\\s*/>`, 'i');
            
            if (tagPattern.test(targetLine)) {
              // 有开始和结束标签
              updatedLine = targetLine.replace(tagPattern, `$1${value}$3`);
              console.log('成功更新文本内容');
            } else if (selfClosingPattern.test(targetLine)) {
              // 自闭合标签，转换为开始结束标签
              updatedLine = targetLine.replace(selfClosingPattern, `$1>${value}</${tagName}>`);
              console.log('成功将自闭合标签转换并添加文本内容');
            }
          } else if (property === 'innerHTML') {
            // 更新HTML内容
            const tagPattern = new RegExp(`(<${tagName}[^>]*>)(.*?)(</${tagName}>)`, 'is');
            const selfClosingPattern = new RegExp(`(<${tagName}[^>]*?)\\s*/>`, 'i');
            
            if (tagPattern.test(targetLine)) {
              // 有开始和结束标签
              updatedLine = targetLine.replace(tagPattern, `$1${value}$3`);
              console.log('成功更新HTML内容');
            } else if (selfClosingPattern.test(targetLine)) {
              // 自闭合标签，转换为开始结束标签
              updatedLine = targetLine.replace(selfClosingPattern, `$1>${value}</${tagName}>`);
              console.log('成功将自闭合标签转换并添加HTML内容');
            }
          }
          
          if (updatedLine !== targetLine) {
            // 更新代码
            const newLines = [...lines];
            newLines[targetLineIndex] = updatedLine;
            const newCode = newLines.join('\n');
            
            // 标记这是通过可视化编辑器更新的代码
            isVisualCodeUpdateRef.current = true;
            
            // 在可视化模式下，只更新代码，不触发预览刷新
            if (isVisualMode) {
              // 静默更新代码，不触发预览刷新
              setEditedCode(newCode);
              setHasChanges(true);
              console.log('可视化模式：文本内容已静默更新，不刷新预览');
            } else {
              // 非可视化模式，正常更新代码和预览
              setEditedCode(newCode);
              setHasChanges(true);
              console.log('文本内容代码已更新');
            }
            
            // 重置标志
            setTimeout(() => {
              isVisualCodeUpdateRef.current = false;
            }, 100);
            
            console.log('文本内容替换成功，新内容:', value);
          } else {
            console.error('未能更新文本内容');
          }
        } else {
          console.error('未能在代码中找到对应的元素');
        }
        
        return; // 文本内容处理完成，直接返回
      }
      
      // 特殊处理图片src属性
      if (property === 'src' && selectedElement.tagName.toLowerCase() === 'img') {
        console.log('处理图片src属性更新:', value);
        
        // 直接更新DOM中的图片src
        const imgElement = selectedElement as HTMLImageElement;
        const originalSrc = imgElement.src || imgElement.getAttribute('src') || '';
        imgElement.src = value;
        
        // 确保编辑模式已启用
        if (!isEditable) {
          console.log('启用编辑模式');
          setIsEditable(true);
        }

        // 获取当前代码
        const currentCode = isEditable ? editedCode : originalCode;
        const lines = currentCode.split('\n');
        let targetLineIndex = -1;
        
        // 改进的图片定位策略：使用多重匹配条件
        const findImageLine = () => {
          // 策略1: 通过ID精确匹配
          if (selectedElement.id) {
            const idMatch = lines.findIndex(line => 
              line.includes('<img') && 
              (line.includes(`id="${selectedElement.id}"`) || line.includes(`id='${selectedElement.id}'`))
            );
            if (idMatch !== -1) {
              console.log('通过ID找到图片:', selectedElement.id);
              return idMatch;
            }
          }
          
          // 策略2: 通过类名和原始src组合匹配
          if (selectedElement.className && originalSrc) {
            const className = selectedElement.className.trim();
            // 提取原始src的文件名部分用于匹配
            const srcFileName = originalSrc.split('/').pop()?.split('?')[0] || '';
            
            const classAndSrcMatch = lines.findIndex(line => 
              line.includes('<img') && 
              (line.includes(`class="${className}"`) || line.includes(`class='${className}'`)) &&
              (srcFileName ? line.includes(srcFileName) : true)
            );
            if (classAndSrcMatch !== -1) {
              console.log('通过类名和src文件名找到图片:', className, srcFileName);
              return classAndSrcMatch;
            }
          }
          
          // 策略3: 通过原始src精确匹配
          if (originalSrc) {
            // 尝试匹配完整的src
            const fullSrcMatch = lines.findIndex(line => 
              line.includes('<img') && line.includes(originalSrc)
            );
            if (fullSrcMatch !== -1) {
              console.log('通过完整src找到图片:', originalSrc);
              return fullSrcMatch;
            }
            
            // 尝试匹配src的文件名部分
            const srcFileName = originalSrc.split('/').pop()?.split('?')[0];
            if (srcFileName && srcFileName.length > 3) {
              const fileNameMatch = lines.findIndex(line => 
                line.includes('<img') && line.includes(srcFileName)
              );
              if (fileNameMatch !== -1) {
                console.log('通过src文件名找到图片:', srcFileName);
                return fileNameMatch;
              }
            }
          }
          
          // 策略4: 通过alt属性匹配
          const altText = selectedElement.getAttribute('alt');
          if (altText) {
            const altMatch = lines.findIndex(line => 
              line.includes('<img') && 
              (line.includes(`alt="${altText}"`) || line.includes(`alt='${altText}'`))
            );
            if (altMatch !== -1) {
              console.log('通过alt属性找到图片:', altText);
              return altMatch;
            }
          }
          
          // 策略5: 通过类名匹配（如果没有原始src）
          if (selectedElement.className) {
            const className = selectedElement.className.trim();
            const classMatch = lines.findIndex(line => 
              line.includes('<img') && 
              (line.includes(`class="${className}"`) || line.includes(`class='${className}'`))
            );
            if (classMatch !== -1) {
              console.log('通过类名找到图片:', className);
              return classMatch;
            }
          }
          
          // 策略6: 通过元素在DOM中的位置匹配（最后的备选）
          // 获取所有img元素，找到当前元素的索引
          const iframe = iframeRef.current;
          if (iframe?.contentDocument) {
            const allImages = Array.from(iframe.contentDocument.querySelectorAll('img'));
            const elementIndex = allImages.indexOf(selectedElement as HTMLImageElement);
            
            if (elementIndex !== -1) {
              // 在代码中找到第N个img标签
              let imgCount = 0;
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('<img')) {
                  if (imgCount === elementIndex) {
                    console.log('通过DOM位置找到图片，索引:', elementIndex);
                    return i;
                  }
                  imgCount++;
                }
              }
            }
          }
          
          console.warn('所有图片定位策略都失败了');
          return -1;
        };
        
        targetLineIndex = findImageLine();
        
        if (targetLineIndex !== -1) {
          const targetLine = lines[targetLineIndex];
          console.log('找到图片所在行:', targetLineIndex + 1, targetLine);
          
          // 替换图片src属性
          let updatedLine = targetLine;
          
          // 匹配各种可能的src属性格式
          const srcPatterns = [
            /src\s*=\s*["']([^"']*)["']/gi,
            /src\s*=\s*([^\s>]*)/gi
          ];
          
          let replaced = false;
          for (const pattern of srcPatterns) {
            if (pattern.test(targetLine)) {
              updatedLine = targetLine.replace(pattern, `src="${value}"`);
              replaced = true;
              console.log('成功替换src属性');
              break;
            }
          }
          
          if (!replaced) {
            // 如果没有找到src属性，尝试添加src属性
            if (targetLine.includes('<img')) {
              updatedLine = targetLine.replace(/<img([^>]*?)>/gi, `<img$1 src="${value}">`);
              replaced = true;
              console.log('成功添加src属性');
            }
          }
          
          if (replaced) {
            // 更新代码
            const newLines = [...lines];
            newLines[targetLineIndex] = updatedLine;
            const newCode = newLines.join('\n');
            
            // 标记这是通过可视化编辑器更新的代码
            isVisualCodeUpdateRef.current = true;
            
            // 在可视化模式下，只更新代码，不触发预览刷新
            if (isVisualMode) {
              // 静默更新代码，不触发预览刷新
              setEditedCode(newCode);
              setHasChanges(true);
              console.log('可视化模式：图片src已静默更新，不刷新预览');
            } else {
              // 非可视化模式，正常更新代码和预览
              setEditedCode(newCode);
              setHasChanges(true);
              console.log('图片src代码已更新');
            }
            
            // 重置标志
            setTimeout(() => {
              isVisualCodeUpdateRef.current = false;
            }, 100);
            
            console.log('图片src替换成功，新的src:', value);
          } else {
            console.error('未能找到或替换图片src属性');
          }
        } else {
          console.error('未能在代码中找到对应的图片元素');
        }
        
        return; // 图片src处理完成，直接返回
      }
      
      // 处理CSS样式属性（原有逻辑）
      // 直接修改元素样式（用于实时预览），使用!important确保优先级
      selectedElement.style.setProperty(property, value, 'important');
      console.log('已应用样式到元素:', selectedElement.style.cssText);

      // 确保编辑模式已启用
      if (!isEditable) {
        console.log('启用编辑模式');
        setIsEditable(true);
        // 不要更新originalCode，保持原有的基准代码
        // setOriginalCode(editedCode || originalCode);
      }

      // 获取当前代码
      const currentCode = isEditable ? editedCode : originalCode;
      
      // 简化的元素定位：通过元素的ID、类名或标签名来查找
      const lines = currentCode.split('\n');
      let targetLineIndex = -1;
      
      // 策略1: 通过ID查找
      if (selectedElement.id) {
        targetLineIndex = lines.findIndex(line => 
          line.includes(`id="${selectedElement.id}"`) || line.includes(`id='${selectedElement.id}'`)
        );
      }
      
      // 策略2: 通过类名查找（如果没有ID）
      if (targetLineIndex === -1 && selectedElement.className) {
        const className = selectedElement.className.trim();
        targetLineIndex = lines.findIndex(line => 
          line.includes(`class="${className}"`) || line.includes(`class='${className}'`)
        );
      }
      
      // 策略3: 通过标签名查找第一个匹配项（最后的备选）
      if (targetLineIndex === -1) {
        const tagName = selectedElement.tagName.toLowerCase();
        targetLineIndex = lines.findIndex(line => line.includes(`<${tagName}`));
      }
      
      if (targetLineIndex !== -1) {
        const targetLine = lines[targetLineIndex];
        console.log('找到目标行:', targetLineIndex + 1, targetLine);
        
        // 修改目标行的样式
        let updatedLine = targetLine;
        
        // 检查是否已有style属性
        const styleRegex = /style\s*=\s*["']([^"']*)["']/i;
        const styleMatch = targetLine.match(styleRegex);
        
        if (styleMatch) {
          // 已有style属性，更新它
          const existingStyles = styleMatch[1];
          const styleObj = parseStyleString(existingStyles);
          
          // 更新特定属性，添加!important确保优先级
          styleObj[property] = `${value} !important`;
          
          // 重新构建style字符串
          const newStyleString = Object.entries(styleObj)
            .filter(([_, val]) => val && val.trim() !== '')
            .map(([prop, val]) => `${prop}: ${val}`)
            .join('; ');
          
          // 替换style属性
          updatedLine = targetLine.replace(styleRegex, `style="${newStyleString}"`);
        } else {
          // 没有style属性，添加一个，使用!important确保优先级
          const newStyle = `${property}: ${value} !important`;
          
          // 找到标签的结束位置（>之前）
          const tagEndMatch = targetLine.match(/^(\s*<[^>]*?)(\s*\/?>.*)/);
          if (tagEndMatch) {
            updatedLine = `${tagEndMatch[1]} style="${newStyle}"${tagEndMatch[2]}`;
          } else {
            console.warn('无法解析标签结构，跳过样式更新');
            return;
          }
        }
        
        console.log('更新后的行:', updatedLine);
        
        // 更新代码
        const newLines = [...lines];
        newLines[targetLineIndex] = updatedLine;
        const newCode = newLines.join('\n');
        
        // 标记这是通过可视化编辑器更新的代码
        isVisualCodeUpdateRef.current = true;
        
        // 在可视化模式下，只更新代码，不触发预览刷新
        if (isVisualMode) {
          // 静默更新代码，不触发预览刷新
          setEditedCode(newCode);
          setHasChanges(true);
          console.log('可视化模式：代码已静默更新，不刷新预览');
        } else {
          // 非可视化模式，正常更新代码和预览
          setEditedCode(newCode);
          setHasChanges(true);
          console.log('代码已更新');
        }
        
        // 重置标志
        setTimeout(() => {
          isVisualCodeUpdateRef.current = false;
        }, 100);
        
      } else {
        console.warn('未能在代码中找到对应的元素');
      }
    } catch (error) {
      console.error('更新代码时出错:', error);
    }
  }, [selectedElement, isEditable, editedCode, originalCode, isVisualMode]);

  // 防抖的预览更新函数
 

  // 监听editedCode变化，防抖更新预览
  useEffect(() => {
    // 在可视化模式下不自动更新预览，避免抖动
    // 如果是通过可视化编辑器更新的代码，也不触发预览更新（因为DOM已经直接更新了）
    if (editedCode && hasChanges && !isVisualMode && !isVisualCodeUpdateRef.current) {
      console.log('防抖预览更新');
    }
  }, [editedCode, hasChanges, isVisualMode]);

  // 处理元素选择（扩展现有的元素选择功能）
  const handleElementSelectForVisual = useCallback((element: HTMLElement) => {
    if (!isVisualMode) return;
    
    setSelectedElement(element);
    
    // 高亮选中的元素
    const iframe = iframeRef.current;
    if (iframe?.contentDocument) {
      // 移除之前的高亮
      const prevHighlighted = iframe.contentDocument.querySelectorAll('.visual-editor-selected');
      prevHighlighted.forEach(el => el.classList.remove('visual-editor-selected'));
      
      // 添加高亮样式
      element.classList.add('visual-editor-selected');
      
      // 添加高亮样式到iframe的head中
      let style = iframe.contentDocument.getElementById('visual-editor-styles');
      if (!style) {
        style = iframe.contentDocument.createElement('style');
        style.id = 'visual-editor-styles';
        style.textContent = `
          .visual-editor-selected {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
          }
        `;
        iframe.contentDocument.head.appendChild(style);
      }
    }
  }, [isVisualMode]);

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

  // 生成元素的绝对DOM路径指纹（100%精确定位）
  const generateElementFingerprint = useCallback((element: HTMLElement) => {
    console.log('开始生成元素绝对DOM路径指纹，元素:', element);
    
    // 生成从body到目标元素的完整树路径
    const generateTreePath = (el: HTMLElement): Array<{
      tagName: string;
      childIndex: number; // 在父元素的所有子元素中的索引
      tagChildIndex: number; // 在父元素的同标签子元素中的索引
      totalChildren: number; // 父元素的子元素总数
      totalTagChildren: number; // 父元素的同标签子元素总数
      id?: string;
      className?: string;
      attributes?: Record<string, string>;
    }> => {
      const path: Array<{
        tagName: string;
        childIndex: number;
        tagChildIndex: number;
        totalChildren: number;
        totalTagChildren: number;
        id?: string;
        className?: string;
        attributes?: Record<string, string>;
      }> = [];
      
      let current = el;
      
      // 从目标元素向上遍历到body
      while (current && current !== document.body && current.parentElement) {
        const parent = current.parentElement;
        const allChildren = Array.from(parent.children); // 父元素的所有子元素
        const sameTagChildren = allChildren.filter(child => 
          child.tagName === current.tagName
        ); // 父元素的同标签子元素
        
        // 计算索引
        const childIndex = allChildren.indexOf(current); // 在所有子元素中的索引
        const tagChildIndex = sameTagChildren.indexOf(current); // 在同标签子元素中的索引
        
        // 收集所有属性
        const attributes: Record<string, string> = {};
        if (current.attributes) {
          for (let i = 0; i < current.attributes.length; i++) {
            const attr = current.attributes[i];
            attributes[attr.name] = attr.value;
          }
        }
        
        const pathNode = {
          tagName: current.tagName.toLowerCase(),
          childIndex: childIndex,
          tagChildIndex: tagChildIndex,
          totalChildren: allChildren.length,
          totalTagChildren: sameTagChildren.length,
          id: current.id || undefined,
          className: current.className || undefined,
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined
        };
        
        path.unshift(pathNode); // 添加到路径开头，保持从body到目标元素的顺序
        current = parent;
      }
      
      return path;
    };
    
    // 提取元素的唯一特征
    const extractUniqueFeatures = (el: HTMLElement) => {
      // 获取直接文本内容（不包括子元素）
      const getDirectText = (element: HTMLElement): string => {
        return Array.from(element.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent?.trim())
          .filter(text => text && text.length > 0)
          .join(' ');
      };
      
      // 获取所有文本内容
      const getAllText = (element: HTMLElement): string => {
        return element.textContent?.trim() || '';
      };
      
      // 获取特殊属性（如src, href等）
      const getSpecialAttributes = (element: HTMLElement): Record<string, string> => {
        const specialAttrs: Record<string, string> = {};
        const importantAttrs = ['src', 'href', 'alt', 'title', 'data-*', 'aria-*'];
        
        if (element.attributes) {
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            if (importantAttrs.some(pattern => 
              pattern.endsWith('*') ? attr.name.startsWith(pattern.slice(0, -1)) : attr.name === pattern
            )) {
              specialAttrs[attr.name] = attr.value;
            }
          }
        }
        
        return specialAttrs;
      };
      
      return {
        directText: getDirectText(el),
        allText: getAllText(el),
        specialAttributes: getSpecialAttributes(el),
        innerHTML: el.innerHTML,
        outerHTML: el.outerHTML
      };
    };
    
    const treePath = generateTreePath(element);
    const uniqueFeatures = extractUniqueFeatures(element);
    
    console.log('生成的树路径:', treePath);
    console.log('元素唯一特征:', uniqueFeatures);
    
    return {
      // 树路径 - 从body到目标元素的完整路径
      treePath,
      // 元素基本信息
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      // 唯一特征
      uniqueFeatures,
      // 备用信息（兼容现有代码）
      xpath: '', // 保留字段但不使用
      layeredPath: [], // 保留字段但不使用
      cssPath: '', // 保留字段但不使用
      keyText: uniqueFeatures.directText || uniqueFeatures.allText.substring(0, 50),
      textContent: uniqueFeatures.allText
    };
  }, []);

  // 通过树路径在代码中精确定位元素
  const findElementInCode = useCallback((fingerprint: {
    treePath: Array<{
      tagName: string;
      childIndex: number;
      tagChildIndex: number;
      totalChildren: number;
      totalTagChildren: number;
      id?: string;
      className?: string;
      attributes?: Record<string, string>;
    }>;
    tagName: string;
    id: string;
    className: string;
    uniqueFeatures: {
      directText: string;
      allText: string;
      specialAttributes: Record<string, string>;
      innerHTML: string;
      outerHTML: string;
    };
    keyText: string;
    textContent: string;
    // 兼容字段
    absolutePath?: any[];
    xpath?: string;
    layeredPath?: any[];
    cssPath?: string;
  }) => {
    const currentCode = isEditable ? editedCode : originalCode;
    const lines = currentCode.split('\n');
    
    console.log('🔍 开始通过树路径查找元素');
    console.log('目标树路径:', fingerprint.treePath);
    console.log('目标特征:', fingerprint.uniqueFeatures);
    
    // 策略1: 通过树路径精确定位
    if (fingerprint.treePath && fingerprint.treePath.length > 0) {
      console.log('🔍 使用树路径匹配');
      
      // 找到所有可能的目标标签行
      const targetTag = fingerprint.tagName;
      const candidateLines: Array<{lineIndex: number, line: string}> = [];
      
      lines.forEach((line, index) => {
        // 查找包含目标标签的行
        if (line.includes(`<${targetTag}`)) {
          candidateLines.push({lineIndex: index, line});
        }
      });
      
      console.log(`找到 ${candidateLines.length} 个候选 ${targetTag} 标签`);
      
      if (candidateLines.length === 0) {
        console.log('❌ 没有找到目标标签');
        return null;
      }
      
      // 如果只有一个候选，直接返回
      if (candidateLines.length === 1) {
        console.log('✅ 唯一候选标签，行号:', candidateLines[0].lineIndex + 1);
        return {
          lineIndex: candidateLines[0].lineIndex,
          score: 100,
          confidence: '绝对精确'
        };
      }
      
      // 多个候选时，通过树路径进行精确匹配
      const targetElement = fingerprint.treePath[fingerprint.treePath.length - 1]; // 目标元素的路径节点
      
      console.log('目标元素路径节点:', targetElement);
      
      // 方法1: 通过ID精确匹配
      if (targetElement.id) {
        const exactMatch = candidateLines.find(({line}) => 
          line.includes(`id="${targetElement.id}"`) || line.includes(`id='${targetElement.id}'`)
        );
        if (exactMatch) {
          console.log('✅ 通过ID绝对精确匹配，行号:', exactMatch.lineIndex + 1);
          return {
            lineIndex: exactMatch.lineIndex,
            score: 100,
            confidence: '绝对精确'
          };
        }
      }
      
      // 方法2: 通过特殊属性匹配（如src, href等）
      if (targetElement.attributes) {
        for (const [attrName, attrValue] of Object.entries(targetElement.attributes)) {
          if (['src', 'href', 'alt', 'title'].includes(attrName) && attrValue) {
            const matchingLines = candidateLines.filter(({line}) => 
              line.includes(`${attrName}="${attrValue}"`) || line.includes(`${attrName}='${attrValue}'`)
            );
            
            if (matchingLines.length === 1) {
              // 如果只有一个匹配，直接返回
              console.log(`✅ 通过属性${attrName}绝对精确匹配，行号:`, matchingLines[0].lineIndex + 1);
              return {
                lineIndex: matchingLines[0].lineIndex,
                score: 100,
                confidence: '绝对精确'
              };
            } else if (matchingLines.length > 1) {
              // 如果有多个匹配，使用tagChildIndex来选择正确的一个
              if (targetElement.tagChildIndex !== undefined && targetElement.tagChildIndex < matchingLines.length) {
                console.log(`✅ 通过属性${attrName}+tagChildIndex精确匹配，行号:`, matchingLines[targetElement.tagChildIndex].lineIndex + 1);
                return {
                  lineIndex: matchingLines[targetElement.tagChildIndex].lineIndex,
                  score: 95,
                  confidence: '高精确'
                };
              }
            }
          }
        }
      }
      
      // 方法3: 通过类名匹配（结合位置信息）
      if (targetElement.className) {
        const matchingLines = candidateLines.filter(({line}) => 
          line.includes(`class="${targetElement.className}"`) || line.includes(`class='${targetElement.className}'`)
        );
        
        if (matchingLines.length === 1) {
          // 如果只有一个匹配，直接返回
          console.log('✅ 通过类名唯一匹配，行号:', matchingLines[0].lineIndex + 1);
          return {
            lineIndex: matchingLines[0].lineIndex,
            score: 90,
            confidence: '高精确'
          };
        } else if (matchingLines.length > 1) {
          // 如果有多个匹配，使用tagChildIndex来选择正确的一个
          if (targetElement.tagChildIndex !== undefined && targetElement.tagChildIndex < matchingLines.length) {
            console.log(`✅ 通过类名+tagChildIndex精确匹配，行号:`, matchingLines[targetElement.tagChildIndex].lineIndex + 1);
            return {
              lineIndex: matchingLines[targetElement.tagChildIndex].lineIndex,
              score: 85,
              confidence: '高精确'
            };
          } else {
            console.log(`⚠️ 类名匹配到多个元素但tagChildIndex超出范围，匹配数: ${matchingLines.length}，tagChildIndex: ${targetElement.tagChildIndex}`);
          }
        }
      }
      
      // 方法4: 通过直接文本内容匹配
      if (fingerprint.uniqueFeatures.directText && fingerprint.uniqueFeatures.directText.length > 2) {
        const exactMatch = candidateLines.find(({line}) => 
          line.includes(fingerprint.uniqueFeatures.directText)
        );
        if (exactMatch) {
          console.log('✅ 通过直接文本内容绝对精确匹配，行号:', exactMatch.lineIndex + 1);
          return {
            lineIndex: exactMatch.lineIndex,
            score: 80,
            confidence: '精确'
          };
        }
      }
      
      // 方法5: 使用tagChildIndex作为最后的备选方案
      if (targetElement.tagChildIndex !== undefined && targetElement.tagChildIndex < candidateLines.length) {
        console.log(`⚠️ 使用tagChildIndex备选方案，索引: ${targetElement.tagChildIndex}，行号:`, candidateLines[targetElement.tagChildIndex].lineIndex + 1);
        return {
          lineIndex: candidateLines[targetElement.tagChildIndex].lineIndex,
          score: 75,
          confidence: '中等精确'
        };
      }
    }
    
    // 备选策略: 兼容旧版本指纹格式
    console.log('🔍 使用备选匹配策略');
    
    // ID匹配
    if (fingerprint.id) {
      const lineIndex = lines.findIndex(line => 
        line.includes(`<${fingerprint.tagName}`) &&
        (line.includes(`id="${fingerprint.id}"`) || line.includes(`id='${fingerprint.id}'`))
      );
      if (lineIndex !== -1) {
        console.log('✅ 备选ID匹配成功，行号:', lineIndex + 1);
        return {
          lineIndex,
          score: 95,
          confidence: '精确'
        };
      }
    }
    
    // 类名匹配
    if (fingerprint.className && fingerprint.tagName) {
      const lineIndex = lines.findIndex(line => 
        line.includes(`<${fingerprint.tagName}`) && 
        (line.includes(`class="${fingerprint.className}"`) || line.includes(`class='${fingerprint.className}'`))
      );
      if (lineIndex !== -1) {
        console.log('✅ 备选类名匹配成功，行号:', lineIndex + 1);
        return {
          lineIndex,
          score: 85,
          confidence: '高'
        };
      }
    }
    
    console.log('❌ 所有匹配策略都失败了');
    return null;
  }, [isEditable, editedCode, originalCode]);

  // 处理元素选择模式
  const handleElementSelect = useCallback((element: HTMLElement) => {
    if (!isElementSelectMode && !isVisualMode) return;
    
    // 如果是可视化模式，调用可视化编辑器的元素选择处理
    if (isVisualMode) {
      handleElementSelectForVisual(element);
      return;
    }
    
    try {
      console.log('选中的元素:', element.tagName, element);
      
      // 生成元素的描述信息用于NEW PROMPT
      const generateElementDescription = (el: HTMLElement): string => {
        const tagName = el.tagName.toLowerCase();
        const text = el.textContent?.trim();
        
        // 生成简洁的元素描述用于小标签显示
        if (tagName === 'img') {
          const alt = el.getAttribute('alt');
          return alt ? `image: ${alt}` : 'image';
        } else if (tagName === 'button') {
          return text ? `button: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : 'button';
        } else if (tagName === 'a') {
          return text ? `link: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : 'link';
        } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          return text ? `${tagName}: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}` : tagName;
        } else if (tagName === 'p') {
          return text ? `p: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}` : 'paragraph';
        } else if (tagName === 'div') {
          const className = el.className;
          if (className.includes('card')) return 'card';
          if (className.includes('header')) return 'header';
          if (className.includes('footer')) return 'footer';
          if (className.includes('nav')) return 'nav';
          return text ? `div: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : 'div';
        } else if (tagName === 'span') {
          return text ? `span: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : 'span';
        } else if (tagName === 'input') {
          const type = el.getAttribute('type') || 'text';
          const placeholder = el.getAttribute('placeholder');
          return placeholder ? `${type}: ${placeholder.substring(0, 15)}${placeholder.length > 15 ? '...' : ''}` : type;
        } else {
          return text ? `${tagName}: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : tagName;
        }
      };
      
      const elementDescription = generateElementDescription(element);
      
      // 存储选中元素的上下文信息（用于后台处理）
      const contextForAI = `Please modify the selected element: ${elementDescription}`;
      setSelectedElementContext(contextForAI);
      
      // 保持用户现有的输入，不清空
      // 如果输入框为空，可以提供一个友好的提示
      if (!newPrompt.trim()) {
        setNewPrompt("");
      }
      setHasSelectedElementContext(true);
      
      // 检查是否为图片元素
      const isImage = element.tagName.toLowerCase() === 'img';
      
      if (isImage) {
        // 如果是图片，显示替换按钮
        const imgElement = element as HTMLImageElement;
        const currentSrc = imgElement.src || imgElement.getAttribute('src') || '';
        
        console.log('检测到图片元素，当前src:', currentSrc);
        
        // 生成元素指纹用于后续替换
        const fingerprint = generateElementFingerprint(element);
        
        // 获取图片在iframe中的位置
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          const iframeRect = iframe.getBoundingClientRect();
          const imgRect = element.getBoundingClientRect();
          
          // 计算图片在全局坐标系中的位置
          const globalImgRect = {
            left: iframeRect.left + imgRect.left,
            top: iframeRect.top + imgRect.top,
            right: iframeRect.left + imgRect.right,
            bottom: iframeRect.top + imgRect.bottom,
            width: imgRect.width,
            height: imgRect.height
          };
          
          // 获取视口尺寸
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // 检查图片是否完全在iframe可视区域内
          // 只有完全在iframe内才认为是可见的，否则按超出处理
          const isCompletelyVisible = globalImgRect.left >= iframeRect.left && 
                                     globalImgRect.right <= iframeRect.right && 
                                     globalImgRect.top >= iframeRect.top && 
                                     globalImgRect.bottom <= iframeRect.bottom;
          
          const isVisible = isCompletelyVisible;
          
          // 添加可视性检测的调试信息
          console.log('可视性检测:', {
            isCompletelyVisible,
            leftOK: globalImgRect.left >= iframeRect.left,
            rightOK: globalImgRect.right <= iframeRect.right,
            topOK: globalImgRect.top >= iframeRect.top,
            bottomOK: globalImgRect.bottom <= iframeRect.bottom,
            globalImgRect,
            iframeRect
          });
          
          let buttonX: number;
          let buttonY: number;
          
          if (isVisible) {
            // 图片在iframe内，计算基于图片位置的按钮位置
            const preferredX = globalImgRect.right - 40; // 图片右上角偏移40px
            const preferredY = globalImgRect.top + 10;   // 图片顶部偏移10px
            
            // 确保按钮不超出屏幕边界（按钮大小约为40x40px）
            const buttonSize = 40;
            const margin = 10; // 距离边界的最小距离
            
            buttonX = Math.max(margin, Math.min(preferredX, viewportWidth - buttonSize - margin));
            buttonY = Math.max(margin, Math.min(preferredY, viewportHeight - buttonSize - margin));
            
            console.log('图片在iframe内，按钮位置:', { buttonX, buttonY, globalImgRect });
          } else {
            // 图片超出iframe范围，根据超出方向决定按钮位置
            const buttonSize = 40;
            const margin = 10;
            
            // 计算图片与iframe的相对位置
            const isTopOverflow = globalImgRect.top < iframeRect.top;
            const isBottomOverflow = globalImgRect.bottom > iframeRect.bottom;
            const isLeftOverflow = globalImgRect.left < iframeRect.left;
            const isRightOverflow = globalImgRect.right > iframeRect.right;
            
            // 计算图片在iframe内的可见部分
            const visibleLeft = Math.max(globalImgRect.left, iframeRect.left);
            const visibleRight = Math.min(globalImgRect.right, iframeRect.right);
            const visibleTop = Math.max(globalImgRect.top, iframeRect.top);
            const visibleBottom = Math.min(globalImgRect.bottom, iframeRect.bottom);
            
            // 添加详细调试信息
            console.log('超出检测详情:', {
              globalImgRect,
              iframeRect,
              isTopOverflow,
              isBottomOverflow,
              isLeftOverflow,
              isRightOverflow,
              visibleRect: { visibleLeft, visibleRight, visibleTop, visibleBottom }
            });
            
            // X位置：优先放在图片可见部分的右侧
            if (isRightOverflow) {
              // 图片右侧超出，按钮放在可见部分内
              buttonX = visibleRight - 35;
            } else {
              // 图片右侧没超出，按钮放在图片右侧
              buttonX = globalImgRect.right - 35;
            }
            
            // Y位置：根据超出方向决定
            if (isTopOverflow && !isBottomOverflow) {
              // 只有顶部超出，按钮显示在可见部分下方
              buttonY = visibleBottom + 5;
              console.log('顶部超出，按钮放在下方:', buttonY);
            } else if (isBottomOverflow && !isTopOverflow) {
              // 只有底部超出，按钮显示在可见部分上方
              buttonY = visibleTop - buttonSize - 5;
              console.log('底部超出，按钮放在上方:', buttonY);
            } else if (isTopOverflow && isBottomOverflow) {
              // 上下都超出，按钮放在可见区域中间
              buttonY = visibleTop + (visibleBottom - visibleTop) / 2 - buttonSize / 2;
              console.log('上下都超出，按钮放在中间:', buttonY);
            } else {
              // 只有左右超出，按钮放在图片顶部
              buttonY = globalImgRect.top + 10;
              console.log('左右超出，按钮放在顶部:', buttonY);
            }
            
            // 确保按钮不超出屏幕边界
            buttonX = Math.max(margin, Math.min(buttonX, viewportWidth - buttonSize - margin));
            buttonY = Math.max(margin, Math.min(buttonY, viewportHeight - buttonSize - margin));
            
            console.log('最终按钮位置:', { buttonX, buttonY });
          }
          
          setSelectedImageSrc(currentSrc);
          setSelectedImageFingerprint(fingerprint);
          setSelectedImageElement(element);
          setImageReplaceButton({
            show: true,
            x: buttonX,
            y: buttonY
          });
          
          // toast.success('已选中图片并填充提示，可以在NEW PROMPT中描述修改需求');
          // return;
          
          // 对于图片，也执行代码跳转逻辑，但使用已生成的指纹
          const result = findElementInCode(fingerprint);
          
          if (result) {
            const targetLineNumber = result.lineIndex + 1;
            
            // 通过自定义事件通知CodeEditor跳转到指定行
            const event = new CustomEvent('jumpToLine', {
              detail: { lineNumber: targetLineNumber }
            });
            
            console.log('图片元素跳转事件:', event.detail);
            window.dispatchEvent(event);
            
            // 显示成功提示（包含图片和代码定位信息）
            // toast.success(`图片已选中，代码已定位到第 ${targetLineNumber} 行`, {
            //   duration: 3000,
            // });
          } else {
            console.warn('图片元素未找到匹配的代码行');
            // 只显示图片选中的提示
            toast.success('已选中图片，但未能定位到对应代码');
          }
          
          // 高亮选中的图片（绿色边框表示图片选中）
          element.style.outline = '3px solid #10b981';
          element.style.outlineOffset = '2px';
          
          // 3秒后移除高亮
          setTimeout(() => {
            element.style.outline = '';
            element.style.outlineOffset = '';
          }, 3000);
          
          return; // 图片处理完成，不再执行下面的通用逻辑
        }
      }
      
      // 如果不是图片，执行原有的代码定位逻辑
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
        // toast.success(`已选中元素并填充提示，代码已定位到第 ${targetLineNumber} 行`);
      } else {
        console.warn('未找到匹配的代码行');
        // toast.success('已选中元素并填充提示，但未能在代码中找到对应的元素');
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
  }, [isElementSelectMode, generateElementFingerprint, findElementInCode, setNewPrompt]);

  // 设置iframe的元素选择事件监听
  const setupElementSelection = useCallback(() => {
    if (!iframeRef.current || (!isElementSelectMode && !isVisualMode)) return;
    
    const iframe = iframeRef.current;
    
    // 等待iframe加载完成的函数
    const waitForIframeLoad = () => {
      return new Promise<Document>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Iframe load timeout'));
        }, 5000);
        
        const checkIframe = () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && iframeDoc.readyState === 'complete' && iframeDoc.body) {
              clearTimeout(timeout);
              resolve(iframeDoc);
            } else {
              setTimeout(checkIframe, 100);
            }
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        };
        
        checkIframe();
      });
    };
    
    // 异步设置事件监听器
    const setupListeners = async () => {
      try {
        const iframeDoc = await waitForIframeLoad();
        
        // 检查是否已经有样式，避免重复添加
        const existingStyle = iframeDoc.querySelector('#element-selection-style');
        if (!existingStyle) {
          // 添加样式来显示可选择状态
          const style = iframeDoc.createElement('style');
          style.id = 'element-selection-style';
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
        }
        
        // 为body添加选择模式类
        if (iframeDoc.body && !iframeDoc.body.classList.contains('element-selectable')) {
          iframeDoc.body.classList.add('element-selectable');
        }
        
        // 移除之前的事件监听器（如果存在）
        const existingHandler = (iframeDoc as any).__elementSelectHandler;
        if (existingHandler) {
          iframeDoc.removeEventListener('click', existingHandler, true);
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
        
        // 保存处理器引用以便后续清理
        (iframeDoc as any).__elementSelectHandler = handleClick;
        iframeDoc.addEventListener('click', handleClick, true);
        
        console.log('元素选择事件监听器已设置');
        
        // 返回清理函数
        return () => {
          try {
            if (iframeDoc.body) {
              iframeDoc.body.classList.remove('element-selectable');
            }
            if ((iframeDoc as any).__elementSelectHandler) {
              iframeDoc.removeEventListener('click', (iframeDoc as any).__elementSelectHandler, true);
              delete (iframeDoc as any).__elementSelectHandler;
            }
            const style = iframeDoc.querySelector('#element-selection-style');
            if (style && style.parentNode) {
              style.parentNode.removeChild(style);
            }
            console.log('元素选择事件监听器已清理');
          } catch (error) {
            console.error('清理元素选择监听器时出错:', error);
          }
        };
      } catch (error) {
        console.error('设置元素选择监听器失败:', error);
        return () => {}; // 返回空的清理函数
      }
    };
    
    // 立即尝试设置，如果失败则返回空的清理函数
    const cleanupPromise = setupListeners();
    
    // 返回一个同步的清理函数，它会等待异步设置完成后再清理
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      }).catch(() => {
        // 忽略清理时的错误
      });
    };
  }, [isElementSelectMode, isVisualMode, handleElementSelect]);

  // 监听元素选择模式变化
  useEffect(() => {
    if (isElementSelectMode) {
      const cleanup = setupElementSelection();
      return cleanup;
    }
  }, [isElementSelectMode, setupElementSelection, previewKey, editedCode]);

  // 监听预览内容变化，重新设置元素选择
  useEffect(() => {
    if (isElementSelectMode && previewContent) {
      // 延迟更长时间确保iframe内容已完全加载和渲染
      const timer = setTimeout(() => {
        console.log('预览内容已更新，重新设置元素选择监听器');
        try {
          setupElementSelection();
        } catch (error) {
          console.error('重新设置元素选择监听器失败:', error);
        }
      }, 1000); // 增加到1秒延迟
      
      return () => clearTimeout(timer);
    }
  }, [previewContent, isElementSelectMode, setupElementSelection]);

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
      // 只在初始化时设置版本历史，避免覆盖用户手动保存的版本
      setVersionHistory(prev => {
        // 如果当前版本历史为空或者长度小于初始版本，则使用初始版本
        if (prev.length === 0 || prev.length < initialVersions.length) {
          console.log('初始化版本历史，从', prev.length, '个版本更新到', initialVersions.length, '个版本');
          return initialVersions;
        }
        // 否则保持当前版本历史不变
        console.log('保持当前版本历史不变，当前有', prev.length, '个版本');
        return prev;
      });
      
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
  }, [initialVersions, updatePreviewAfterVersionChange]);
  // 移除 currentVersionId 依赖，避免在版本切换时重置版本历史

  // 处理图片替换
  const handleImageReplace = useCallback((newImageSrc: string) => {
    if (!selectedImageFingerprint) {
      toast.error('未找到选中的图片信息');
      return;
    }

    try {
      const currentCode = isEditable ? editedCode : originalCode;
      const lines = currentCode.split('\n');
      
      // 在代码中查找图片元素
      const result = findElementInCode(selectedImageFingerprint);
      
      if (result) {
        const lineIndex = result.lineIndex;
        const line = lines[lineIndex];
        
        console.log('找到图片所在行:', lineIndex + 1, line);
        
        // 替换图片src属性
        let updatedLine = line;
        
        // 匹配各种可能的src属性格式
        const srcPatterns = [
          /src\s*=\s*["']([^"']*)["']/gi,
          /src\s*=\s*([^\s>]*)/gi
        ];
        
        let replaced = false;
        for (const pattern of srcPatterns) {
          if (pattern.test(line)) {
            updatedLine = line.replace(pattern, `src="${newImageSrc}"`);
            replaced = true;
            break;
          }
        }
        
        if (!replaced) {
          // 如果没有找到src属性，尝试添加src属性
          if (line.includes('<img')) {
            updatedLine = line.replace(/<img([^>]*?)>/gi, `<img$1 src="${newImageSrc}">`);
            replaced = true;
          }
        }
        
        if (replaced) {
          // 更新代码
          const newLines = [...lines];
          newLines[lineIndex] = updatedLine;
          const newCode = newLines.join('\n');
          
          if (isEditable) {
            setEditedCode(newCode);
          } else {
            // 如果不在编辑模式，自动启用编辑模式
            setIsEditable(true);
            setEditedCode(newCode);
            setOriginalCode(currentCode);
          }
          
          // 更新预览
          updatePreviewAfterVersionChange(newCode);
          
          console.log('图片替换成功，新的src:', newImageSrc);
          toast.success('图片已成功替换');
        } else {
          console.error('未能找到或替换图片src属性');
          toast.error('图片替换失败：未找到src属性');
        }
      } else {
        console.error('未能在代码中找到对应的图片元素');
        toast.error('图片替换失败：未找到对应的代码');
      }
    } catch (error) {
      console.error('图片替换过程出错:', error);
      toast.error('图片替换失败');
    } finally {
      // 清理状态
      setSelectedImageFingerprint(null);
      setSelectedImageSrc("");
    }
  }, [selectedImageFingerprint, isEditable, editedCode, originalCode, findElementInCode, updatePreviewAfterVersionChange]);

  // 显示图片替换对话框
  const openImageReplaceDialog = useCallback(() => {
    setImageReplaceButton({ show: false, x: 0, y: 0 });
    setShowImageReplaceDialog(true);
  }, []);

  // 隐藏图片替换按钮
  const hideImageReplaceButton = useCallback(() => {
    setImageReplaceButton({ show: false, x: 0, y: 0 });
    // 移除图片高亮
    if (selectedImageElement) {
      selectedImageElement.style.outline = '';
      selectedImageElement.style.outlineOffset = '';
      setSelectedImageElement(null);
    }
  }, [selectedImageElement]);

  // 监听document点击事件，点击按钮外部时关闭按钮
  useEffect(() => {
    if (imageReplaceButton.show) {
      const handleDocumentClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const button = document.getElementById('image-replace-button');
        
        // 如果点击的不是按钮本身，则关闭按钮
        if (button && !button.contains(target)) {
          hideImageReplaceButton();
        }
      };

      // 延迟添加事件监听器，避免立即触发
      const timer = setTimeout(() => {
        document.addEventListener('click', handleDocumentClick);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleDocumentClick);
      };
    }
  }, [imageReplaceButton.show, hideImageReplaceButton]);

  // 跟踪全局鼠标位置，用于在图片不可见时定位按钮
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // 将鼠标位置保存到全局变量中
      (window as any).__lastMouseEvent = {
        clientX: event.clientX,
        clientY: event.clientY
      };
    };

    // 只在元素选择模式下跟踪鼠标位置
    if (isElementSelectMode) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isElementSelectMode]);

  // 监听元素选择模式变化
  useEffect(() => {
    if (!isElementSelectMode) {
      // 退出选择模式时隐藏按钮
      hideImageReplaceButton();
    }
  }, [isElementSelectMode, hideImageReplaceButton]);

  // 当开始生成时，退出元素选择模式
  useEffect(() => {
    if (isGenerating) {
      setIsElementSelectMode(false);
      setHasSelectedElementContext(false);
      setSelectedElementContext("");
    }
  }, [isGenerating]);

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
                  mode="coding"
                  position="top-left"
                />
              </div>
            )}

            {/* 切换模式 */}
            {generationComplete && (
              
              <div  className="ml-3 flex items-center space-x-3 px-2 py-1 backdrop-blur-md bg-white/10 rounded-xl border border-white/20">
                <div className="flex items-center space-x-1">
                  {/* 代码编辑模式 */}
                  <button
                    onClick={() => {
                      if (isVisualMode || isChatMode) {
                        setIsVisualMode(false);
                        setIsChatMode(false);
                        
                        // 切换模式时，取消元素选择模式
                        setIsElementSelectMode(false);
                        
                        // 切换到代码编辑模式时，清理可视化编辑相关状态
                        setSelectedElement(null);
                        
                        // 清理图片替换相关状态
                        setImageReplaceButton({ show: false, x: 0, y: 0 });
                        setSelectedImageSrc("");
                        setSelectedImageFingerprint(null);
                        setSelectedImageElement(null);
                      }
                    }}
                    disabled={isGenerating || (!isVisualMode && !isChatMode)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all cursor-pointer backdrop-blur-sm ${
                      !isVisualMode && !isChatMode
                        ? 'bg-blue-500/80 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">Code</span>
                  </button>
                    {/* Chat模式 */}
                    <button
                    onClick={() => {
                      if (!isChatMode) {
                        setIsChatMode(true);
                        setIsVisualMode(false);
                        
                        // 切换模式时，取消元素选择模式
                        setIsElementSelectMode(false);
                        
                        // 清理图片替换相关状态
                        setImageReplaceButton({ show: false, x: 0, y: 0 });
                        setSelectedImageSrc("");
                        setSelectedImageFingerprint(null);
                        setSelectedImageElement(null);
                      }
                    }}
                    disabled={isGenerating || isChatMode}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all cursor-pointer backdrop-blur-sm ${
                      isChatMode 
                        ? 'bg-purple-500/80 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">Chat</span>
                  </button>
                  {/* 可视化编辑模式 */}
                  <button
                    onClick={() => {
                      if (!isVisualMode) {
                        setIsVisualMode(true);
                        setIsChatMode(false);
                        
                        // 切换模式时，取消元素选择模式
                        setIsElementSelectMode(false);
                        
                        // 切换到可视化模式时，自动启用编辑模式
                        if (!isEditable) {
                          setIsEditable(true);
                        }
                        
                        // 清理图片替换相关状态
                        setImageReplaceButton({ show: false, x: 0, y: 0 });
                        setSelectedImageSrc("");
                        setSelectedImageFingerprint(null);
                        setSelectedImageElement(null);
                      }
                    }}
                    disabled={isGenerating || isVisualMode}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all cursor-pointer backdrop-blur-sm ${
                      isVisualMode 
                        ? 'bg-green-500/80 text-white shadow-lg shadow-green-500/25 border border-green-400/30' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" ><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h2"/><path d="M14 3h1"/><path d="M3 9v1"/><path d="M21 9v2"/><path d="M3 14v1"/></svg>
                    <span className="text-xs font-medium">Edit</span>
                  </button>

                
                </div>
                
          
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
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
                    mode="coding"
                    position="top-left"
                  />
                </div>
              )}
            </div>
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
                    {generationComplete && !isVisualMode && (
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
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    )}
                    {!isVisualMode && (
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
                    )}
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
                  ) : isVisualMode ? (
                    <VisualEditor
                      selectedElement={selectedElement}
                      onStyleChange={handleStyleChange}
                      onRefreshPreview={() => {
                        console.log('手动刷新预览');
                        debouncedUpdatePreview.flush();
                        const currentCode = isEditable ? editedCode : originalCode;
                        const preparedHtml = prepareHtmlContent(currentCode);
                        setPreviewContent(preparedHtml);
                        setPreviewKey(prev => prev + 1);
                      }}
                    />
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
              {!isVisualMode && (
              <div className="h-[35%] p-3 flex flex-col overflow-hidden">
                <div className="mb-2 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-medium text-gray-400">NEW PROMPT</h3>
                    {hasSelectedElementContext && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-300 font-medium">Selected</span>
                        <div className="w-px h-3 bg-blue-500/30 mx-1"></div>
                        <span className="text-xs text-blue-200/80 font-mono">
                          {selectedElementContext.replace("Please modify the selected element: ", "")}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 h-4 w-4 p-0 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/20"
                          onClick={() => {
                            setHasSelectedElementContext(false);
                            setSelectedElementContext("");
                          }}
                          title="Clear selection"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
             
                  <div className="relative">
                    <Textarea
                      value={newPrompt}
                      onChange={handleNewPromptChange}
                      placeholder={hasSelectedElementContext ? "make this bigger, change color to red, etc..." : "Enter a new prompt..."}
                      className={`min-h-[60px] w-full rounded-md border p-2 pr-10 text-sm focus:ring-white ${
                        hasSelectedElementContext 
                          ? 'border-blue-600/50 bg-blue-950/30 text-blue-100 focus:border-blue-400' 
                          : 'border-gray-800 bg-gray-900/50 text-gray-300 focus:border-white'
                      }`}
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
                    {hasSelectedElementContext && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute bottom-2 right-9 h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                        onClick={() => {
                          setNewPrompt("");
                          setHasSelectedElementContext(false);
                          setSelectedElementContext("");
                        }}
                        title="Clear selected element context"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Clear</span>
                      </Button>
                    )}
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
)}
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
                  {generationComplete && (!isChatMode || (isChatMode && previewMode === 'render')) && (
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
                {isChatMode && previewMode === 'code' ? (
                  /* Chat模式下的代码显示 */
                  <div className="w-full h-full bg-gray-950 rounded-md border border-gray-800 overflow-hidden">
                    <div className="h-full">
                      <CodeEditor
                        code={isEditable ? editedCode : originalCode}
                        isEditable={false}
                        onChange={() => {}}
                      />
                    </div>
                  </div>
                ) : (
                  /* 渲染预览模式 */
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
                            <span>Click to modify elements</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                {isChatMode ? (
                  /* Chat模式界面 */
                  <div className="h-full flex flex-col">
                    {/* Chat标题栏 */}
                    <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium">CHAT CONVERSATION</h2>
                        <Badge variant="outline" className="text-xs bg-purple-900/20 text-purple-300 border-purple-500/20">
                          {chatMessages.length} messages
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                          onClick={() => setChatMessages([])}
                          disabled={isGenerating || chatMessages.length === 0}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      </div>
                    </div>

                    {/* Chat消息区域 */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <ScrollArea className="flex-1 p-3">
                        <div className="space-y-4">
                          {chatMessages.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                              <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm">Start a conversation to modify your project</p>
                              <p className="text-xs text-gray-600 mt-1">Ask questions or request changes to your code</p>
                              <p className="text-xs text-gray-600 mt-2 flex items-center justify-center gap-1">
                                <MousePointer2 className="w-3 h-3" />
                                Click "Select" in preview to choose elements
                              </p>
                            </div>
                          ) : (
                            chatMessages.map((message) => (
                              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                  message.type === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-800 text-gray-200 border border-gray-700'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium opacity-80">
                                      {message.type === 'user' ? 'You' : 'AI Assistant'}
                                    </span>
                                    <span className="text-xs opacity-60">
                                      {message.timestamp.toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    {message.isGenerating ? (
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Coding...</span>
                                      </div>
                                    ) : (
                                      <p className="whitespace-pre-wrap">{message.content}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      {/* Chat输入区域 */}
                      <div className="border-t border-gray-800 p-3">
                        {/* 选中元素上下文显示 */}
                        {hasSelectedElementContext && selectedElementContext && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-blue-300 font-medium">Selected Element</span>
                              <div className="w-px h-3 bg-blue-500/30 mx-1"></div>
                              <span className="text-xs text-blue-200/80 font-mono flex-1">
                                {selectedElementContext.replace("Please modify the selected element: ", "")}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ml-1 h-4 w-4 p-0 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/20"
                                onClick={() => {
                                  setHasSelectedElementContext(false);
                                  setSelectedElementContext("");
                                }}
                                title="Clear selection"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="relative">
                          <Textarea
                            value={currentChatInput}
                            onChange={handleChatInputChange}
                            onKeyDown={handleChatKeyDown}
                            placeholder={hasSelectedElementContext 
                              ? "Describe how to modify the selected element... (e.g., make it bigger, change color to red)" 
                              : "Type your message... (Shift+Enter for new line)"
                            }
                            className={`min-h-[60px] w-full rounded-md border p-2 pr-10 text-sm focus:ring-purple-400 resize-none ${
                              hasSelectedElementContext 
                                ? 'border-blue-600/50 bg-blue-950/30 text-blue-100 focus:border-blue-400' 
                                : 'border-gray-800 bg-gray-900/50 text-gray-300 focus:border-purple-400'
                            }`}
                            disabled={isGenerating}
                          />
                          <Button
                            size="sm"
                            className={`absolute bottom-2 right-2 h-6 w-6 p-0 ${
                              currentChatInput.trim() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                            onClick={handleSendChatMessage}
                            disabled={!currentChatInput.trim() || isGenerating}
                          >
                            <Send className={`h-3 w-3 ${currentChatInput.trim() ? 'text-white' : 'text-gray-400'}`} />
                            <span className="sr-only">Send message</span>
                          </Button>
                        </div>
                        
                     
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 原有的代码编辑器界面 */
                  <>
                    {/* Code-Editor-Bereich */}
                    <div className="h-[65%] border-b border-gray-800 flex flex-col">
                      <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-gray-900/50">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-medium">GENERATED HTML</h2>
                          {generationComplete && !isVisualMode && (
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
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          )}
                          {!isVisualMode && (
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
                          )}
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
                        ) : isVisualMode ? (
                          <VisualEditor
                            selectedElement={selectedElement}
                            onStyleChange={handleStyleChange}
                            onRefreshPreview={() => {
                              console.log('手动刷新预览');
                              debouncedUpdatePreview.flush();
                              const currentCode = isEditable ? editedCode : originalCode;
                              const preparedHtml = prepareHtmlContent(currentCode);
                              setPreviewContent(preparedHtml);
                              setPreviewKey(prev => prev + 1);
                            }}
                          />
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
                    {!isVisualMode && (
                    <div className="h-[35%] p-3 flex flex-col overflow-hidden">
                      <div className="mb-2 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xs font-medium text-gray-400">NEW PROMPT</h3>
                          {hasSelectedElementContext && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-blue-300 font-medium">Selected</span>
                              <div className="w-px h-3 bg-blue-500/30 mx-1"></div>
                              <span className="text-xs text-blue-200/80 font-mono">
                                {selectedElementContext.replace("Please modify the selected element: ", "")}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="ml-1 h-4 w-4 p-0 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/20"
                                onClick={() => {
                                  setHasSelectedElementContext(false);
                                  setSelectedElementContext("");
                                }}
                                title="Clear selection"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                     
                        <div className="relative">
                          <Textarea
                            value={newPrompt}
                            onChange={handleNewPromptChange}
                            placeholder={hasSelectedElementContext ? "make this bigger, change color to red, etc..." : "Enter a new prompt..."}
                            className={`min-h-[60px] w-full rounded-md border p-2 pr-10 text-sm focus:ring-white ${
                              hasSelectedElementContext 
                                ? 'border-blue-600/50 bg-blue-950/30 text-blue-100 focus:border-blue-400' 
                                : 'border-gray-800 bg-gray-900/50 text-gray-300 focus:border-white'
                            }`}
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
                          {hasSelectedElementContext && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute bottom-2 right-9 h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                              onClick={() => {
                                setNewPrompt("");
                                setHasSelectedElementContext(false);
                                setSelectedElementContext("");
                              }}
                              title="Clear selected element context"
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Clear</span>
                            </Button>
                          )}
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
                    )}
                  </>
                )}
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700" />

            {/* Rechte Spalte - Live-Vorschau */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="p-2 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">LIVE PREVIEW</h2>
                    {isChatMode && (
                      <div className="flex items-center space-x-1 ml-3">
                        <Button
                          variant={previewMode === 'render' ? "secondary" : "ghost"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setPreviewMode('render')}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Render
                        </Button>
                        <Button
                          variant={previewMode === 'code' ? "secondary" : "ghost"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setPreviewMode('code')}
                        >
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Code
                        </Button>
                      </div>
                    )}
                  </div>
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
                    {generationComplete && (!isChatMode || (isChatMode && previewMode === 'render')) && (
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
                  {isChatMode && previewMode === 'code' ? (
                    /* Chat模式下的代码显示 */
                    <div className="w-full h-full bg-gray-950 rounded-md border border-gray-800 overflow-hidden">
                      <div className="h-full">
                        <CodeEditor
                          code={isEditable ? editedCode : originalCode}
                          isEditable={false}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  ) : (
                    /* 渲染预览模式 */
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
                              <span>Click to modify elements
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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

      <ImageReplaceDialog
        isOpen={showImageReplaceDialog}
        onClose={() => {
          setShowImageReplaceDialog(false);
          setSelectedImageSrc("");
          setSelectedImageFingerprint(null);
        }}
        onReplace={handleImageReplace}
        currentImageSrc={selectedImageSrc}
      />

      {/* 浮动图片替换按钮 */}
      {imageReplaceButton.show && (
        <div
          className="fixed z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg cursor-pointer transition-all duration-200 hover:scale-110"
          style={{
            left: `${imageReplaceButton.x}px`,
            top: `${imageReplaceButton.y}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            openImageReplaceDialog();
          }}
          title="替换图片"
          id="image-replace-button"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
        </div>
      )}
    </div>
  )
}
