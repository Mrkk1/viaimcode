"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronLeft, Download, FileText, Presentation, Loader2, Send, Code, Eye, Trash2, ChevronDown, ChevronRight, Share, MousePointer2, X, Copy, Check } from "lucide-react"
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
  unifiedBackground?: {
    theme: string
    description: string
    htmlTemplate: string
    contentAreaClass: string
    styleGuide: {
      primaryColor: string
      secondaryColor: string
      accentColor: string
      backgroundColor: string
      contentTextColor?: string
      headingTextColor?: string
      contentBackgroundColor?: string
      fontFamily: string
      headingFont: string
      bodyFont: string
      spacing: string
      contrastRatio?: string
    }
  }
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
  // 联网搜索状态
  const [enableWebSearch, setEnableWebSearch] = useState(true)
  const [searchStats, setSearchStats] = useState<{ tokensUsed: number; searchCount: number }>({ tokensUsed: 0, searchCount: 0 })
  const [isSearching, setIsSearching] = useState(false)
  
  // 检查是否支持联网搜索
  const supportsWebSearch = provider === 'kimi' || provider === 'deepseek'
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialData?.chatMessages || [])
  const [currentChatInput, setCurrentChatInput] = useState("")
  const [slides, setSlides] = useState<PPTSlide[]>(initialData?.slides || [])
  const [outline, setOutline] = useState<PPTOutline | null>(initialData?.outline || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showOutline, setShowOutline] = useState(true)
  const [previewSize, setPreviewSize] = useState<'small' | 'medium' | 'large'>('large') // 新增预览大小状态
  const [projectId, setProjectId] = useState<string | null>(initialData?.projectId || null) // 持久化项目ID
  
  // 元素选择相关状态
  const [isElementSelectMode, setIsElementSelectMode] = useState(false)
  const [hasSelectedElementContext, setHasSelectedElementContext] = useState(false)
  const [selectedElementContext, setSelectedElementContext] = useState("")
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null)
  const [selectedElementInfo, setSelectedElementInfo] = useState<{
    element: HTMLElement;
    domPath: string;
    xpath: string;
    cssSelector: string;
    originalText: string;
    originalHTML: string;
    parentHTML: string;
    tagName: string;
    attributes: Record<string, string>;
    slideId: string;
    slideIndex: number;
  } | null>(null)
  
  // 复制功能相关状态
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  
  // 添加 ref 来防止重复执行
  const hasInitialized = useRef(false)
  const isMounted = useRef(true)
  
  // 组件卸载时设置mounted为false
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 复制消息内容到剪贴板
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      // 处理markdown格式的内容，提取纯文本
      const plainText = content.replace(/\*\*(.*?)\*\*/g, '$1') // 移除加粗标记
                             .replace(/\*(.*?)\*/g, '$1')     // 移除斜体标记
                             .replace(/`(.*?)`/g, '$1')       // 移除行内代码标记
                             .replace(/```[\s\S]*?```/g, '')  // 移除代码块
                             .replace(/#+\s/g, '')            // 移除标题标记
                             .replace(/^\s*[-*+]\s/gm, '• ')  // 转换列表标记
                             .replace(/^\s*\d+\.\s/gm, '')    // 移除有序列表标记
                             .trim()
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(plainText)
        setCopiedMessageId(messageId)
        toast.success('消息内容已复制到剪贴板')
        
        // 3秒后重置复制状态
        setTimeout(() => {
          setCopiedMessageId(null)
        }, 3000)
      } else {
        // 回退到传统复制方法
        const textArea = document.createElement('textarea')
        textArea.value = plainText
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
            setCopiedMessageId(messageId)
            toast.success('消息内容已复制到剪贴板')
            setTimeout(() => {
              setCopiedMessageId(null)
            }, 3000)
          } else {
            throw new Error('复制命令执行失败')
          }
        } catch (err) {
          document.body.removeChild(textArea)
          console.error('复制失败:', err)
          toast.error('复制失败，请手动选择文本复制')
        }
      }
    } catch (error) {
      console.error('复制到剪贴板失败:', error)
      toast.error('复制失败，请手动选择文本复制')
    }
  }

  // 生成CSS选择器
  const generateCSSSelector = useCallback((element: HTMLElement): string => {
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling: Element | null = current.previousElementSibling;
        let index = 1;
        while (sibling) {
          if (sibling.tagName === current.tagName) index++;
          sibling = sibling.previousElementSibling;
        }
        if (index > 1) {
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement as HTMLElement;
    }
    
    return path.join(' > ');
  }, []);

  // 生成XPath
  const generateXPath = useCallback((element: HTMLElement): string => {
    const getElementIdx = (elt: Element): number => {
      let count = 1;
      for (let sib = elt.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (sib.tagName === elt.tagName) count++;
      }
      return count;
    };

    const segs = [];
    let current: Element | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      const idx = getElementIdx(current);
      segs.unshift(`${tagName}[${idx}]`);
      current = current.parentElement;
    }
    
    return '//' + segs.join('/');
  }, []);

  // 生成DOM路径字符串
  const generateDOMPath = useCallback((element: HTMLElement): string => {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      const classes = current.className ? `.${current.className.split(' ').join('.')}` : '';
      const id = current.id ? `#${current.id}` : '';
      
      path.unshift(`${tagName}${id}${classes}`);
      current = current.parentElement as HTMLElement;
    }
    
    return path.join(' > ');
  }, []);

  // 生成元素的绝对DOM路径指纹（100%精确定位）
  const generateElementFingerprint = useCallback((element: HTMLElement, slideId: string, slideIndex: number) => {
    console.log('开始生成元素绝对DOM路径指纹，元素:', element, '幻灯片:', slideId);
    
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
      
      // 从目标元素向上遍历，包含body但不包含html
      while (current && current.tagName.toLowerCase() !== 'html' && current.parentElement) {
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
      
      console.log('生成的完整树路径:', path);
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
      // 幻灯片信息
      slideId,
      slideIndex,
      // 树路径 - 从body到目标元素的完整路径
      treePath,
      // 元素基本信息
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      // 唯一特征
      uniqueFeatures,
      // 备用信息
      keyText: uniqueFeatures.directText || uniqueFeatures.allText.substring(0, 50),
      textContent: uniqueFeatures.allText
    };
  }, []);

  // 处理元素选择
  const handleElementSelect = useCallback((element: HTMLElement, slideId: string, slideIndex: number) => {
    console.log('handleElementSelect 被调用，当前 isElementSelectMode:', isElementSelectMode);
    if (!isElementSelectMode) {
      console.log('元素选择模式已关闭，忽略选择事件');
      return;
    }
    
    try {
      console.log('选中的元素:', element.tagName, element, '幻灯片:', slideId, '索引:', slideIndex);
      
      // 生成元素的描述信息用于输入框上下文
      const generateElementDescription = (el: HTMLElement): string => {
        const tagName = el.tagName.toLowerCase();
        const text = el.textContent?.trim();
        
        // 生成简洁的元素描述
        if (tagName === 'img') {
          const alt = el.getAttribute('alt');
          return alt ? `第${slideIndex + 1}页的图片: ${alt}` : `第${slideIndex + 1}页的图片`;
        } else if (tagName === 'button') {
          return text ? `第${slideIndex + 1}页的按钮: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : `第${slideIndex + 1}页的按钮`;
        } else if (tagName === 'a') {
          return text ? `第${slideIndex + 1}页的链接: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : `第${slideIndex + 1}页的链接`;
        } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          return text ? `第${slideIndex + 1}页的${tagName}标题: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}` : `第${slideIndex + 1}页的${tagName}标题`;
        } else if (tagName === 'p') {
          return text ? `第${slideIndex + 1}页的段落: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}` : `第${slideIndex + 1}页的段落`;
        } else if (tagName === 'div') {
          const className = el.className;
          if (className.includes('card')) return `第${slideIndex + 1}页的卡片`;
          if (className.includes('header')) return `第${slideIndex + 1}页的标题区`;
          if (className.includes('footer')) return `第${slideIndex + 1}页的底部区`;
          return text ? `第${slideIndex + 1}页的div: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : `第${slideIndex + 1}页的div`;
        } else if (tagName === 'span') {
          return text ? `第${slideIndex + 1}页的文本: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : `第${slideIndex + 1}页的文本`;
        } else {
          return text ? `第${slideIndex + 1}页的${tagName}: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}` : `第${slideIndex + 1}页的${tagName}`;
        }
      };
      
      const elementDescription = generateElementDescription(element);
      
      // 收集详细的DOM信息
      const domPath = generateDOMPath(element);
      const xpath = generateXPath(element);
      const cssSelector = generateCSSSelector(element);
      
      // 收集元素的属性信息
      const attributes: Record<string, string> = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attributes[attr.name] = attr.value;
      }
      
      // 获取父元素的HTML（用于上下文）
      const parentHTML = element.parentElement ? element.parentElement.outerHTML : '';
      
      // 存储详细的元素信息
      setSelectedElementInfo({
        element: element,
        domPath: domPath,
        xpath: xpath,
        cssSelector: cssSelector,
        originalText: element.textContent || '',
        originalHTML: element.outerHTML,
        parentHTML: parentHTML,
        tagName: element.tagName.toLowerCase(),
        attributes: attributes,
        slideId: slideId,
        slideIndex: slideIndex
      });
      
      // 存储选中元素的上下文信息
      const contextForAI = `请修改选中的元素: ${elementDescription}`;
      setSelectedElementContext(contextForAI);
      setSelectedSlideId(slideId);
      setSelectedSlideIndex(slideIndex);
      
      // 如果输入框为空，可以提供一个友好的提示
      if (!currentChatInput.trim()) {
        setCurrentChatInput("");
      }
      setHasSelectedElementContext(true);
      
      // 高亮选中的元素
      element.style.outline = '2px solid #3b82f6';
      element.style.outlineOffset = '2px';
      
      // 3秒后移除高亮
      setTimeout(() => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }, 3000);
      
      // 显示成功提示
      toast.success(`已选中${elementDescription}，可以在输入框中描述修改需求`);
      
    } catch (error) {
      console.error('元素选择处理失败:', error);
      toast.error('元素选择失败');
    }
  }, [isElementSelectMode, currentChatInput]);

  // 设置iframe的元素选择事件监听
  const setupElementSelection = useCallback((slideId: string, slideIndex: number, iframe: HTMLIFrameElement) => {
    if (!isElementSelectMode) return;
    
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
            handleElementSelect(target, slideId, slideIndex);
          }
        };
        
        // 保存处理器引用以便后续清理
        (iframeDoc as any).__elementSelectHandler = handleClick;
        iframeDoc.addEventListener('click', handleClick, true);
        
        
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
  }, [isElementSelectMode, handleElementSelect]);

  // 当开始生成时，退出元素选择模式
  useEffect(() => {
    if (isGenerating) {
      setIsElementSelectMode(false);
      setHasSelectedElementContext(false);
      setSelectedElementContext("");
      setSelectedSlideId(null);
      setSelectedSlideIndex(null);
    }
  }, [isGenerating]);

  // 调试：监听元素选择模式状态变化
  useEffect(() => {
    console.log('元素选择模式状态变化:', isElementSelectMode);
  }, [isElementSelectMode]);

  // 使用 ref 来跟踪定时器，避免竞争条件
  const setupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 监听元素选择模式变化，为所有iframe设置或清理监听器
  useEffect(() => {
    // 先清理之前的定时器
    if (setupTimerRef.current) {
      clearTimeout(setupTimerRef.current);
      setupTimerRef.current = null;
    }

    if (isElementSelectMode) {
      // 延迟设置所有iframe的监听器
      setupTimerRef.current = setTimeout(() => {
        // 再次检查状态，防止在延迟期间状态已经改变
        if (!isElementSelectMode) {
          console.log('延迟期间状态已改变，取消设置监听器');
          return;
        }
        
        slides.forEach((slide, index) => {
          if (slide.htmlCode && slide.viewMode === 'render') {
            const iframe = document.querySelector(`iframe[title="Slide ${index + 1}"]`) as HTMLIFrameElement;
            if (iframe) {
              setupElementSelection(slide.id, index, iframe);
            }
          }
        });
        setupTimerRef.current = null;
      }, 1000);

      return () => {
        if (setupTimerRef.current) {
          clearTimeout(setupTimerRef.current);
          setupTimerRef.current = null;
        }
      };
    } else {
      // 当关闭选择模式时，立即清理所有iframe的事件监听器
      // console.log('关闭选择模式，开始清理所有事件监听器');
      slides.forEach((slide, index) => {
        const iframe = document.querySelector(`iframe[title="Slide ${index + 1}"]`) as HTMLIFrameElement;
        if (iframe) {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              // 移除事件监听器
              const existingHandler = (iframeDoc as any).__elementSelectHandler;
              if (existingHandler) {
                iframeDoc.removeEventListener('click', existingHandler, true);
                delete (iframeDoc as any).__elementSelectHandler;
                console.log('已清理幻灯片事件监听器:', slide.id);
              }
              
              // 移除选择模式样式
              if (iframeDoc.body) {
                iframeDoc.body.classList.remove('element-selectable');
              }
              
              // 移除样式标签
              const style = iframeDoc.querySelector('#element-selection-style');
              if (style && style.parentNode) {
                style.parentNode.removeChild(style);
              }
            }
          } catch (error) {
            console.error('清理iframe事件监听器时出错:', error);
          }
        }
      });
      // console.log('清理完成');
    }
  }, [isElementSelectMode, slides, setupElementSelection]);

  // 初始化 - 自动开始生成PPT
  useEffect(() => {
    // 如果有初始数据，说明是从后端加载的已存在项目，不需要重新生成
    if (initialData) {
      // console.log('从后端加载已存在项目，跳过自动生成')
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
        body: JSON.stringify({ prompt, model, provider, enableWebSearch }),
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
            if (data.type === 'tool_call') {
              // 处理工具调用状态
              setIsSearching(true)
              setChatMessages(prev => prev.map(msg =>
                msg.id === thinkingMsgId
                  ? { ...msg, content: `思考过程：\n正在进行联网搜索...` }
                  : msg
              ))
            } else if (data.type === 'search_progress') {
              // 处理搜索进度
              setChatMessages(prev => prev.map(msg =>
                msg.id === thinkingMsgId
                  ? { ...msg, content: `思考过程：\n${data.content}` }
                  : msg
              ))
            } else if (data.type === 'search_stats') {
              // 处理搜索统计
              const tokenMatch = data.content.match(/(\d+) tokens/)
              if (tokenMatch) {
                const tokensUsed = parseInt(tokenMatch[1])
                setSearchStats(prev => ({
                  tokensUsed: prev.tokensUsed + tokensUsed,
                  searchCount: prev.searchCount + 1
                }))
              }
              setIsSearching(false)
            } else if (data.type === 'error') {
              // 处理API返回的错误
              console.error('API返回错误:', data.content)
              throw new Error(`大纲生成失败: ${data.content}`)
            } else if (data.type === 'content' && data.content) {
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
        // 新的解析方式：分离JSON和HTML模板
        let jsonString = ''
        let htmlTemplate = ''
        
        // 检查是否使用了新的分离格式
        if (outlineContent.includes('===JSON_START===') && outlineContent.includes('===HTML_TEMPLATE_START===')) {
          // 使用分离格式
          const jsonStartIndex = outlineContent.indexOf('===JSON_START===') + '===JSON_START==='.length
          const jsonEndIndex = outlineContent.indexOf('===JSON_END===')
          const htmlStartIndex = outlineContent.indexOf('===HTML_TEMPLATE_START===') + '===HTML_TEMPLATE_START==='.length
          const htmlEndIndex = outlineContent.indexOf('===HTML_TEMPLATE_END===')
          
          if (jsonEndIndex > jsonStartIndex && htmlEndIndex > htmlStartIndex) {
            jsonString = outlineContent.substring(jsonStartIndex, jsonEndIndex).trim()
            htmlTemplate = outlineContent.substring(htmlStartIndex, htmlEndIndex).trim()
            console.log('使用分离格式解析，JSON长度:', jsonString.length, 'HTML长度:', htmlTemplate.length)
          } else {
            throw new Error('分离格式标记不完整')
          }
        } else {
          // 回退到旧的解析方式
          console.log('回退到旧的JSON解析方式')
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
        }
        
        // 清理JSON字符串 - 修复常见的格式问题
        jsonString = jsonString
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/^\s*[\r\n]+/gm, '') // 移除空行
          .replace(/,(\s*[}\]])/g, '$1') // 移除多余的逗号
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // 确保属性名有引号
          // 修复错误的转义引号问题 - 这是最常见的问题
          .replace(/\\"/g, '"') // 移除不必要的转义
          .replace(/\\'/g, "'") // 移除不必要的转义
          // 修复CSS属性值的引号问题
          .replace(/"(\w+)":\s*(\w+px|[0-9]+px|[0-9]+%)/g, '"$1": "$2"') // CSS数值需要引号
          .replace(/"(\w+)":\s*([a-zA-Z-]+)\s*;/g, '"$1": "$2";') // CSS属性值需要引号
          .trim()
        
        // 尝试修复常见的JSON错误
        try {
          const parsedOutline = JSON.parse(jsonString)
          // 验证解析结果的结构
          if (!parsedOutline.slides || !Array.isArray(parsedOutline.slides) || parsedOutline.slides.length === 0) {
            throw new Error('Invalid outline structure: missing or empty slides array')
          }
          
          // 如果使用分离格式，将HTML模板添加回unifiedBackground
          if (htmlTemplate && parsedOutline.unifiedBackground) {
            parsedOutline.unifiedBackground.htmlTemplate = htmlTemplate
            console.log('已将分离的HTML模板添加到unifiedBackground')
          }
          
          outlineData = { outline: parsedOutline }
        } catch (parseError) {
          console.error('JSON解析失败，尝试修复:', parseError)
          console.error('解析失败的JSON字符串:', jsonString)
          
                    // 尝试多种修复策略
          let fixedJson = jsonString
          let parsedOutline = null
          
          // 策略1: 修复转义引号问题
          if (!parsedOutline) {
            try {
              // 移除所有不必要的反斜杠转义
              fixedJson = jsonString
                .replace(/\\"/g, '"')  // 移除转义的双引号
                .replace(/\\'/g, "'")  // 移除转义的单引号
                .replace(/\\\\/g, '\\') // 修复双反斜杠
              
              const testParse = JSON.parse(fixedJson)
              if (testParse.slides && Array.isArray(testParse.slides)) {
                console.log('策略1修复成功: 移除转义引号')
                parsedOutline = testParse
              }
            } catch (e) {
              // 策略1失败，尝试策略2
            }
          }
          
          // 策略2: 移除最后一个不完整的对象
          if (!parsedOutline) {
            try {
              const lastCommaIndex = jsonString.lastIndexOf(',')
              if (lastCommaIndex > 0) {
                const beforeComma = jsonString.substring(0, lastCommaIndex)
                const afterComma = jsonString.substring(lastCommaIndex + 1)
                
                // 如果逗号后面的内容不完整，就移除它
                if (!afterComma.trim().match(/^\s*\{.*\}\s*$/)) {
                  fixedJson = beforeComma + jsonString.substring(jsonString.lastIndexOf(']'))
                }
              }
              const testParse = JSON.parse(fixedJson)
              if (testParse.slides && Array.isArray(testParse.slides)) {
                console.log('策略2修复成功: 移除不完整对象')
                parsedOutline = testParse
              }
            } catch (e) {
              // 策略2失败，尝试策略3
            }
          }
          
          // 策略3: 尝试从错误位置截断并修复
          if (!parsedOutline) {
            try {
              const errorMatch = (parseError as Error).message?.match(/position (\d+)/)
              if (errorMatch) {
                const errorPos = parseInt(errorMatch[1])
                // 从错误位置向前查找最近的完整对象结束
                let truncatePos = errorPos
                for (let i = errorPos - 1; i >= 0; i--) {
                  if (jsonString[i] === '}' || jsonString[i] === ']') {
                    truncatePos = i + 1
                    break
                  }
                }
                fixedJson = jsonString.substring(0, truncatePos)
                // 确保JSON结构完整
                if (!fixedJson.endsWith('}')) {
                  fixedJson += '}'
                }
                const testParse = JSON.parse(fixedJson)
                if (testParse.slides && Array.isArray(testParse.slides)) {
                  console.log('策略3修复成功: 从错误位置截断')
                  parsedOutline = testParse
                }
              }
            } catch (e) {
              // 策略3也失败了
            }
          }
          
          // 如果所有策略都失败，抛出错误
          if (!parsedOutline) {
            throw new Error(`JSON解析失败: ${String(parseError)}`)
          }
          
          // 如果使用分离格式，将HTML模板添加回unifiedBackground
          if (htmlTemplate && parsedOutline.unifiedBackground) {
            parsedOutline.unifiedBackground.htmlTemplate = htmlTemplate
            console.log('修复后已将分离的HTML模板添加到unifiedBackground')
          }
          
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

      // 并行生成 - 同时生成所有幻灯片，通过统一的设计指导保持风格一致
      console.log(`开始并行生成${outlineData.outline.slides.length}页幻灯片...`)
      
      // 维护当前生成状态
      let currentSlides = [...initialSlides]
      
      // 添加开始生成的消息
      const parallelStartContent = `开始并行生成${outlineData.outline.slides.length}页幻灯片...`
      const parallelStartMessage: ChatMessage = {
        id: generateUniqueId('parallel-start'),
        type: 'ai',
        content: parallelStartContent,
        timestamp: new Date(),
        isGenerating: true
      }
      setChatMessages(prev => [...prev, parallelStartMessage])
      
      // 保存开始消息到数据库
      if (currentProjectId) {
        try {
          const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: parallelStartContent
            }),
          });
          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP ${response.status}: ${responseText}`);
          }
          console.log('并行生成开始消息保存成功');
        } catch (error) {
          console.error('保存并行生成开始消息失败:', error);
        }
      }
      
      // 生成统一的设计风格指导
      const generateUnifiedStyleGuide = () => {
        return `
**统一设计风格指导:**

**整体主题:**
- 主题: ${prompt.includes('商业') || prompt.includes('企业') ? '商业专业风格' : prompt.includes('教育') || prompt.includes('学习') ? '教育清新风格' : prompt.includes('科技') ? '科技现代风格' : '通用简洁风格'}
- 色彩基调: ${prompt.includes('蓝色') ? '蓝色系' : prompt.includes('绿色') ? '绿色系' : prompt.includes('红色') ? '红色系' : '蓝白渐变系'}

**设计规范:**
1. **色彩体系** - 使用统一的主色调和辅色搭配
   - 主色: bg-blue-600, text-blue-600, border-blue-500
   - 辅色: bg-gray-100, bg-white, text-gray-800, text-gray-600
   - 强调色: bg-yellow-400, text-yellow-600 (用于重点内容)

2. **布局结构** - 保持一致的页面布局模式
   - 容器: min-h-screen flex flex-col justify-center items-center
   - 内容区: max-w-6xl mx-auto p-8
   - 卡片样式: bg-white rounded-xl shadow-lg p-6

3. **字体层次** - 建立清晰的文字层级
   - 主标题: text-4xl font-bold mb-6
   - 副标题: text-2xl font-semibold mb-4  
   - 正文: text-lg text-gray-700 leading-relaxed
   - 要点: text-base text-gray-600

4. **装饰元素** - 统一的视觉装饰
   - 圆角: rounded-xl (大元素), rounded-lg (小元素)
   - 阴影: shadow-lg (主要内容), shadow-md (次要元素)
   - 间距: space-y-6 (主要间距), space-y-4 (次要间距)

5. **响应式设计** - 确保各设备兼容
   - 移动端适配: responsive breakpoints
   - 弹性布局: flex, grid 合理使用

**视觉连贯性要求:**
- 所有页面应该看起来像同一套演示文稿的连续页面
- 保持相同的视觉节奏和设计语言
- 确保色彩、字体、布局的一致性
`
      }
      
      const unifiedStyleGuide = generateUnifiedStyleGuide()
      
      // 并行生成所有幻灯片
      const slideGenerationPromises = outlineData.outline.slides.map(async (slide: any, index: number) => {
        const startTime = Date.now()
        console.log(`开始生成第${index + 1}页: ${slide.title}`)
        
        // 为每个幻灯片添加单独的消息ID
        const singleSlideMsgId = generateUniqueId(`slide-${index}`)
        
        // 更新生成状态
        setSlides(prev => prev.map((s, i) => 
          i === index ? { ...s, generationProgress: '准备开始思考...' } : s
        ))
        
        try {
          // 使用统一的设计风格指导，而不是依赖前一页
          const previousSlideInfo = unifiedStyleGuide
          
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
              model: 'kimi-k2-0711-preview',
              provider: 'kimi',
              previousSlideInfo: previousSlideInfo,
              unifiedBackground: outlineData.outline.unifiedBackground, // 传递统一背景信息
              enableWebSearch: enableWebSearch // 添加联网搜索参数
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
                  } else if (data.type === 'tool_call') {
                    // 处理工具调用状态
                    setIsSearching(true)
                    setSlides(prev => prev.map((s, i) => 
                      i === index ? { 
                        ...s, 
                        generationProgress: `第1步：${data.content}`,
                      } : s
                    ))
                  } else if (data.type === 'search_progress') {
                    // 处理搜索进度
                    setSlides(prev => prev.map((s, i) => 
                      i === index ? { 
                        ...s, 
                        generationProgress: `第1步：${data.content}`,
                      } : s
                    ))
                  } else if (data.type === 'search_stats') {
                    // 处理搜索统计
                    const tokenMatch = data.content.match(/(\d+) tokens/)
                    if (tokenMatch) {
                      const tokensUsed = parseInt(tokenMatch[1])
                      setSearchStats(prev => ({
                        tokensUsed: prev.tokensUsed + tokensUsed,
                        searchCount: prev.searchCount + 1
                      }))
                    }
                    setIsSearching(false)
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
              model: 'kimi-k2-0711-preview',
              provider: 'kimi',
              previousSlideInfo: previousSlideInfo,
              thinkingContent: thinkingContent, // 将思考结果传递给HTML生成
              unifiedBackground: outlineData.outline.unifiedBackground // 传递统一背景信息
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
              const response = await fetch(`/api/ppt-tasks/${currentProjectId}`, {
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
              
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
              }
              
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
              toast.error(`保存第${index + 1}页失败，修改可能在刷新后丢失`);
              
              // 更新生成进度状态显示保存失败
              setSlides(prev => prev.map((s, i) => 
                i === index ? { 
                  ...s, 
                  generationProgress: '生成完成但保存失败'
                } : s
              ))
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

          // 成功完成，返回结果
          return { slideIndex: index, success: true }

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

          // 返回生成结果
          return { slideIndex: index, success: false, error }
        }
      })

      // 等待所有并行生成完成
      console.log('等待所有并行生成完成...')
      const results = await Promise.allSettled(slideGenerationPromises)
      
      // 统计结果
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value && r.value.success
      ).length
      const failureCount = outlineData.outline.slides.length - successCount

      console.log(`并行生成完成: ${successCount}页成功, ${failureCount}页失败`)

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

    const userInput = currentChatInput.trim()
    
    // 构建完整的用户消息内容，包含选中元素上下文
    let fullUserMessage = userInput;
    if (hasSelectedElementContext && selectedElementContext) {
      // 智能组合选中元素上下文和用户输入
      if (!userInput.toLowerCase().includes('选中') && 
          !userInput.toLowerCase().includes('元素') &&
          !userInput.toLowerCase().includes('这个')) {
        // 如果用户输入没有明确引用选中元素，则添加上下文
        fullUserMessage = `${selectedElementContext} ${userInput}`;
      } else {
        // 如果用户输入已经引用了元素，则只需要添加选中元素的描述
        fullUserMessage = `${userInput} (referring to: ${selectedElementContext.replace("请修改选中的元素: ", "")})`;
      }
    }

    const userMessage: ChatMessage = {
      id: generateUniqueId('chat-user'),
      type: 'user',
      content: fullUserMessage,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setCurrentChatInput("")
    
    // 清理选中元素状态
    if (hasSelectedElementContext) {
      setHasSelectedElementContext(false);
      setSelectedElementContext("");
      setSelectedSlideId(null);
      setSelectedSlideIndex(null);
    }
    
    setIsGenerating(true)

    // 保存用户消息到数据库
    if (projectId) {
      try {
        await fetch(`/api/ppt-tasks/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_chat_message',
            messageType: 'user',
            content: fullUserMessage
          }),
        });
      } catch (error) {
        console.error('保存用户消息失败:', error);
      }
    }

    // 添加AI响应消息
    const aiMessage: ChatMessage = {
      id: generateUniqueId('chat-ai'),
      type: 'ai',
      content: '正在分析您的需求...',
      timestamp: new Date(),
      isGenerating: true
    }
    setChatMessages(prev => [...prev, aiMessage])

    try {
      // 直接使用智能分析API来判断用户意图和修改范围
      // 让大模型来决定是全局重新生成还是特定修改
      await handleSpecificModification(userInput, aiMessage.id)
    } catch (error) {
      console.error('处理聊天消息失败:', error)
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: `抱歉，处理请求时出现错误：${error instanceof Error ? error.message : '未知错误'}`, isGenerating: false }
          : msg
      ))
      
      // 保存错误消息到数据库
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: `抱歉，处理请求时出现错误：${error instanceof Error ? error.message : '未知错误'}`
            }),
          });
        } catch (saveError) {
          console.error('保存错误消息失败:', saveError);
        }
      }
    } finally {
      setIsGenerating(false)
    }
  }



  // 处理完整PPT重新生成
  const handleFullRegeneration = async (userInput: string, aiMessageId: string) => {
    console.log('开始重新生成整个PPT，用户需求:', userInput)
    
    // 收集历史信息
    const historyContext = buildHistoryContext()
    
    // 更新AI消息状态
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: '正在重新生成PPT，请稍候...' }
        : msg
    ))

    try {
      // 1. 生成新的大纲
      const newOutlineMsgId = generateUniqueId('new-outline')
      const outlineStartMessage: ChatMessage = {
        id: newOutlineMsgId,
        type: 'ai',
        content: '📋 基于您的新需求重新生成大纲...',
        timestamp: new Date(),
        isGenerating: true
      }
      setChatMessages(prev => [...prev, outlineStartMessage])

      // 保存大纲生成开始消息
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: '📋 基于您的新需求重新生成大纲...'
        }),
      });
    } catch (error) {
          console.error('保存大纲生成开始消息失败:', error);
        }
      }

      // 构建包含历史信息的提示词
      const enhancedPrompt = `
基于以下历史信息和新需求，重新生成PPT：

**历史信息：**
${historyContext}

**新需求：**
${userInput}

请重新设计PPT结构和内容，保持与新需求的一致性。
      `.trim()

      // 流式生成新大纲
      const outlineResponse = await fetch('/api/generate-ppt-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: enhancedPrompt, 
          model, 
          provider,
          enableWebSearch,
          isRegeneration: true,
          originalPrompt: prompt,
          historyContext: historyContext
        }),
      })

      if (!outlineResponse.ok) throw new Error('Failed to generate new outline')

      const reader = outlineResponse.body?.getReader()
      if (!reader) throw new Error('Stream could not be read')

      let receivedContent = ""
      let thinkingContent = ""
      let isInThinkingBlock = false
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
              
              // 检查思考标签
              const thinkingStartIndex = receivedContent.indexOf("<think>")
              const thinkingEndIndex = receivedContent.indexOf("</think>")
              
              if (thinkingStartIndex !== -1) {
                isInThinkingBlock = true
                if (thinkingEndIndex !== -1) {
                  thinkingContent = receivedContent.substring(thinkingStartIndex + 7, thinkingEndIndex)
                  outlineContent = receivedContent.substring(thinkingEndIndex + 8)
                  isInThinkingBlock = false
                } else {
                  thinkingContent = receivedContent.substring(thinkingStartIndex + 7)
      setChatMessages(prev => prev.map(msg => 
                    msg.id === newOutlineMsgId
                      ? { ...msg, content: `📋 正在思考新的PPT结构...\n\n思考过程：\n${thinkingContent}` }
          : msg
      ))
                }
              } else if (!isInThinkingBlock) {
                outlineContent = receivedContent
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      // 解析新大纲
      let newOutlineData: { outline: PPTOutline }
      try {
        const jsonMatch = outlineContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const jsonString = jsonMatch[0]
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .replace(/,(\s*[}\]])/g, '$1')
            .trim()
          
          const parsedOutline = JSON.parse(jsonString)
          if (!parsedOutline.slides || !Array.isArray(parsedOutline.slides)) {
            throw new Error('Invalid outline structure')
          }
          newOutlineData = { outline: parsedOutline }
        } else {
          throw new Error('No valid JSON found in outline')
        }
      } catch (e) {
        console.error('新大纲解析失败:', e)
        // 使用默认大纲
        newOutlineData = {
          outline: {
            title: "重新生成的PPT",
            slides: [
              {
                title: "标题页",
                content: userInput,
                keyPoints: ["基于新需求", "重新设计", "优化内容"]
              }
            ]
          }
        }
      }

      // 更新大纲
      setOutline(newOutlineData.outline)

      // 保存新大纲到数据库
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_outline',
              outline: newOutlineData.outline
            }),
          });
        } catch (error) {
          console.error('保存新大纲失败:', error);
        }
      }

      // 更新大纲完成消息
      const outlineCompleteContent = `新PPT大纲生成完成！\n\n**${newOutlineData.outline.title}**\n\n共${newOutlineData.outline.slides.length}页幻灯片：\n${newOutlineData.outline.slides.map((slide, index) => `${index + 1}. ${slide.title}`).join('\n')}`
      
    setChatMessages(prev => prev.map(msg => 
        msg.id === newOutlineMsgId
          ? { ...msg, content: outlineCompleteContent, isGenerating: false }
        : msg
    ))

      // 保存大纲完成消息
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: outlineCompleteContent
            }),
          });
        } catch (error) {
          console.error('保存大纲完成消息失败:', error);
        }
      }

      // 2. 重新生成所有幻灯片
      await regenerateAllSlides(newOutlineData.outline, userInput, historyContext)

      // 更新最终AI消息
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: 'PPT重新生成完成！已根据您的新需求重新设计了整个演示文稿。', isGenerating: false }
          : msg
      ))
      
      // 保存最终完成消息
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: 'PPT重新生成完成！已根据您的新需求重新设计了整个演示文稿。'
            }),
          });
        } catch (error) {
          console.error('保存最终完成消息失败:', error);
        }
      }

      toast.success('PPT重新生成完成！')

    } catch (error) {
      console.error('重新生成PPT失败:', error)
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
          ? { ...msg, content: `重新生成PPT时出现错误：${error instanceof Error ? error.message : '未知错误'}`, isGenerating: false }
        : msg
    ))
      toast.error('PPT重新生成失败')
    }
  }

  // 构建历史上下文信息
  const buildHistoryContext = (): string => {
    let context = ""
    
    // 添加原始提示词
    context += `**原始需求：**\n${prompt}\n\n`
    
    // 添加当前大纲信息
    if (outline) {
      context += `**当前大纲：**\n`
      context += `标题：${outline.title}\n`
      context += `幻灯片数量：${outline.slides.length}页\n`
      context += `页面标题：${outline.slides.map((slide, index) => `${index + 1}. ${slide.title}`).join(', ')}\n\n`
    }
    
    // 添加用户的历史对话（最近5条）
    const userMessages = chatMessages.filter(msg => msg.type === 'user').slice(-5)
    if (userMessages.length > 0) {
      context += `**历史对话：**\n`
      userMessages.forEach((msg, index) => {
        context += `${index + 1}. ${msg.content}\n`
      })
      context += `\n`
    }
    
    // 添加当前幻灯片状态
    if (slides.length > 0) {
      const completedSlides = slides.filter(slide => slide.htmlCode && !slide.htmlCode.includes('生成失败'))
      context += `**当前状态：**\n`
      context += `已完成 ${completedSlides.length}/${slides.length} 页幻灯片\n`
      
      if (completedSlides.length > 0) {
        context += `完成的页面：${completedSlides.map(slide => slide.title).join(', ')}\n`
      }
    }
    
    return context
  }

  // 重新生成所有幻灯片
  const regenerateAllSlides = async (newOutline: PPTOutline, userInput: string, historyContext: string) => {
    console.log(`开始重新生成${newOutline.slides.length}页幻灯片...`)
    
    // 初始化新的幻灯片状态
    const newSlides: PPTSlide[] = newOutline.slides.map((slide: any, index: number) => ({
      id: `slide-${index}-${Date.now()}`, // 使用时间戳确保唯一性
      title: slide.title,
      content: slide.content,
      htmlCode: '',
      isGenerating: true,
      generationProgress: '准备生成...',
      thinkingContent: '',
      realtimeThinkingContent: '',
      viewMode: 'render',
      userSelectedViewMode: undefined
    }))
    
    setSlides(newSlides)
    
    // 串行生成所有幻灯片
    let currentSlides = [...newSlides]
    
    for (let index = 0; index < newOutline.slides.length; index++) {
      const slide = newOutline.slides[index]
      const startTime = Date.now()
      console.log(`重新生成第${index + 1}页: ${slide.title}`)
      
      // 添加单页生成开始消息
      const singleSlideMsgId = generateUniqueId(`regen-slide-${index}`)
      const slideStartContent = `🔄 重新生成第${index + 1}页：「${slide.title}」`
      const slideStartMessage: ChatMessage = {
        id: singleSlideMsgId,
        type: 'ai',
        content: slideStartContent,
        timestamp: new Date(),
        isGenerating: true
      }
      setChatMessages(prev => [...prev, slideStartMessage])
      
      // 更新生成状态
      setSlides(prev => prev.map((s, i) => 
        i === index ? { ...s, generationProgress: '开始思考设计...' } : s
      ))
      
      try {
        // 获取前一页信息作为风格参考
        let previousSlideInfo = ''
        if (index > 0) {
          const prevSlide = currentSlides[index - 1]
          if (prevSlide && prevSlide.htmlCode && !prevSlide.htmlCode.includes('生成失败')) {
            previousSlideInfo = `前一页设计参考：${prevSlide.title}\n设计特点：保持一致的视觉风格`
          }
        }
        
        // 构建增强的提示词
        const enhancedSlidePrompt = `
基于以下信息重新生成幻灯片：

**用户新需求：**
${userInput}

**历史上下文：**
${historyContext}

**当前幻灯片信息：**
标题：${slide.title}
内容：${slide.content}
关键点：${slide.keyPoints?.join(', ') || '无'}

**设计要求：**
${previousSlideInfo}

请重新设计这页幻灯片，确保符合用户的新需求。
        `.trim()
        
        // 第一步：思考分析
        setSlides(prev => prev.map((s, i) => 
          i === index ? { 
            ...s, 
            generationProgress: '第1步：思考新设计方案...',
            viewMode: s.userSelectedViewMode === undefined ? 'thinking' : s.viewMode
          } : s
        ))
        
        const thinkingResponse = await fetch('/api/generate-ppt-thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            slide: slide,
            slideIndex: index,
            totalSlides: newOutline.slides.length,
            theme: 'auto',
            model: 'kimi-k2-0711-preview',
            provider: 'kimi',
            previousSlideInfo: previousSlideInfo,
            enhancedPrompt: enhancedSlidePrompt,
            isRegeneration: true,
            unifiedBackground: newOutline.unifiedBackground // 传递统一背景信息
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
        
        try {
          while (true) {
            const { done, value } = await thinkingReader.read()
            if (done) break
            
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
                // 忽略解析错误
              }
            }
          }
    } finally {
          thinkingReader.cancel()
        }

        // 第二步：HTML生成
        setSlides(prev => prev.map((s, i) => 
          i === index ? { 
            ...s, 
            generationProgress: '第2步：基于新需求生成HTML...'
          } : s
        ))

        const htmlResponse = await fetch('/api/generate-ppt-html', {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            slide: slide,
            slideIndex: index,
            totalSlides: newOutline.slides.length,
            theme: 'auto',
            model: 'kimi-k2-0711-preview',
            provider: 'kimi',
            previousSlideInfo: previousSlideInfo,
            thinkingContent: thinkingContent,
            unifiedBackground: newOutline.unifiedBackground, // 传递统一背景信息
            enhancedPrompt: enhancedSlidePrompt,
            isRegeneration: true
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
        
        try {
          while (true) {
            const { done, value } = await htmlReader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n').filter(line => line.trim())
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.type === 'content' && data.content) {
                  htmlContent += data.content
                  
                  // 节流更新HTML内容
                  setSlides(prev => prev.map((s, i) => 
                    i === index ? { 
                      ...s, 
                      htmlCode: htmlContent,
                      generationProgress: `第2步：生成中... (${Math.floor(htmlContent.length / 1024)}KB)`
                    } : s
                  ))
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        } finally {
          htmlReader.cancel()
        }

        // 清理和验证HTML
        let finalHtmlCode = htmlContent.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim()
        
        // 检查HTML完整性
        const isHTMLComplete = finalHtmlCode.includes('<!DOCTYPE html>') && 
                              finalHtmlCode.includes('</html>') &&
                              finalHtmlCode.trim().endsWith('</html>')
        
        if (!isHTMLComplete) {
          if (finalHtmlCode.includes('<!DOCTYPE html>') && !finalHtmlCode.includes('</html>')) {
            if (!finalHtmlCode.includes('</body>')) {
              finalHtmlCode += '\n</body>'
            }
            if (!finalHtmlCode.includes('</html>')) {
              finalHtmlCode += '\n</html>'
            }
          }
        }

        const endTime = Date.now()
        console.log(`第${index + 1}页重新生成完成，耗时: ${endTime - startTime}ms`)
        
        // 完成状态
        setSlides(prev => prev.map((s, i) => 
          i === index ? { 
            ...s, 
            htmlCode: finalHtmlCode,
            isGenerating: false,
            generationProgress: '重新生成完成',
            thinkingContent: thinkingContent,
            realtimeThinkingContent: thinkingContent
          } : s
        ))

        // 更新currentSlides状态
        currentSlides[index] = {
          ...currentSlides[index],
          htmlCode: finalHtmlCode,
          isGenerating: false,
          generationProgress: '重新生成完成',
          thinkingContent: thinkingContent,
          realtimeThinkingContent: thinkingContent
        }

        // 保存到数据库
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
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
          } catch (error) {
            console.error(`保存重新生成的第${index + 1}页失败:`, error);
          }
        }

        // 更新单页生成状态为完成
        const slideCompleteContent = `第${index + 1}页「${slide.title}」重新生成完成`
        setChatMessages(prev => prev.map(msg =>
          msg.id === singleSlideMsgId
            ? { ...msg, content: slideCompleteContent, isGenerating: false }
            : msg
        ))

      } catch (error) {
        console.error(`第${index + 1}页重新生成失败:`, error)
        
        // 更新失败状态
          setSlides(prev => prev.map((s, i) => 
          i === index ? { 
              ...s, 
            isGenerating: false, 
            generationProgress: '重新生成失败',
            htmlCode: `<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f3f4f6; color: #6b7280; font-family: Arial, sans-serif;">
              <div style="text-align: center;">
                <h2>重新生成失败</h2>
                <p>第${index + 1}页重新生成时出现错误</p>
                <p style="font-size: 12px; margin-top: 10px;">${error}</p>
              </div>
            </div>` 
            } : s
          ))

        // 更新单页生成状态为失败
        const slideFailContent = `❌ 第${index + 1}页「${slide.title}」重新生成失败：${error}`
        setChatMessages(prev => prev.map(msg =>
          msg.id === singleSlideMsgId
            ? { ...msg, content: slideFailContent, isGenerating: false }
            : msg
        ))
      }
    }

    console.log('所有幻灯片重新生成完成')
  }

  // 处理特定修改请求
  const handleSpecificModification = async (userInput: string, aiMessageId: string) => {
    console.log('处理特定修改请求:', userInput)
    
    try {
      // 更新AI消息状态
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: '正在分析修改需求...' }
          : msg
      ))
      
      // 1. 调用智能分析API
      const analysisResponse = await fetch('/api/analyze-modification-intent', {
        method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
          userInput,
          currentSlides: slides.map(slide => ({
            title: slide.title,
            content: slide.content,
            htmlCode: slide.htmlCode
          })),
          selectedElement: hasSelectedElementContext ? {
            slideIndex: selectedSlideIndex,
            description: selectedElementContext,
            context: selectedElementContext
          } : null,
          chatHistory: chatMessages.slice(-5),
          model,
          provider
        })
      })

      if (!analysisResponse.ok) {
        throw new Error(`智能分析失败: ${analysisResponse.status}`)
      }

      const { analysis } = await analysisResponse.json()
      console.log('智能分析结果:', analysis)

      // 2. 根据分析结果更新AI消息
      const analysisMessage = `🎯 **智能分析完成**

**修改范围：** ${analysis.intent.scope === 'single' ? '单页修改' : analysis.intent.scope === 'global' ? '全局修改' : '多页修改'}
**置信度：** ${Math.round(analysis.intent.confidence * 100)}%
**修改类型：** ${analysis.intent.modificationType}

**分析结果：** ${analysis.intent.reasoning}

**具体要求：**
${analysis.extractedRequirements.specificChanges.map((change: string) => `• ${change}`).join('\n')}

${analysis.suggestedAction.needsConfirmation ? '请确认是否继续执行此修改？' : '开始执行修改...'}`

      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: analysisMessage }
          : msg
      ))

      // 3. 如果需要确认，等待用户响应
      if (analysis.suggestedAction.needsConfirmation) {
        // 保存分析结果供后续使用
        setChatMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, pendingAnalysis: analysis, awaitingConfirmation: true }
            : msg
        ))
        return
      }

      // 4. 直接执行修改
      await executeModificationStrategy(analysis, userInput, aiMessageId)

    } catch (error) {
      console.error('处理特定修改请求失败:', error)
      
      const errorMessage = `❌ 智能分析失败：${error instanceof Error ? error.message : '未知错误'}\n\n将使用默认处理方式...`
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorMessage }
          : msg
      ))

    }
  }

  // 检测是否为删除整个页面的操作
  const isDeletePageOperation = (analysis: any, userInput: string): boolean => {
    // 如果修改类型是内容修改，即使包含"删除"关键词，也不是删除整个页面
    if (analysis.intent?.modificationType === 'content') {
      return false;
    }
    
    // 只有当修改类型是结构修改(structure)时，才判断是否为删除页面
    if (analysis.intent?.modificationType !== 'structure') {
      return false;
    }
    
    const deletePageKeywords = ['删除', '移除', '去掉', '去除', '删掉', '干掉', '清除', '取消'];
    
    // 检查是否是删除整个页面的表达
    const pageDeletePatterns = [
      /删除第?\s*\d+\s*页$/,
      /移除第?\s*\d+\s*页$/,
      /去掉第?\s*\d+\s*页$/,
      /去除第?\s*\d+\s*页$/,
      /删掉第?\s*\d+\s*页$/
    ];
    
    // 检查用户输入是否匹配删除整页的模式
    const hasDeletePagePattern = pageDeletePatterns.some(pattern => 
      pattern.test(userInput.trim())
    );
    
    // 检查suggestedAction的description中是否明确说明是删除页面操作
    const hasDeletePageInAction = analysis.suggestedAction?.description?.includes('删除第') && 
                                 analysis.suggestedAction?.description?.includes('页') &&
                                 !analysis.suggestedAction?.description?.includes('内容');
    
    return hasDeletePagePattern || hasDeletePageInAction;
  };

  // 执行修改策略
  const executeModificationStrategy = async (analysis: any, userInput: string, aiMessageId: string) => {
    try {
      switch (analysis.intent.scope) {
        case 'single':
          if (analysis.intent.targetPages.length === 1) {
            // 检查是否是删除整个页面的操作
            if (isDeletePageOperation(analysis, userInput)) {
              // 单页删除操作
              await handleDeletePages(
                analysis.intent.targetPages,
                analysis,
                userInput,
                aiMessageId
              )
            } else if (hasSelectedElementContext && analysis.intent.modificationType === 'content') {
              // 选中元素的快速修改
              await regenerateSinglePageDirectly(
                analysis.intent.targetPages[0],
                analysis,
                userInput,
                aiMessageId
              )
            } else {
              // 单页重新生成
              await regenerateSinglePageWithAnalysis(
                analysis.intent.targetPages[0],
                analysis,
                userInput,
                aiMessageId
              )
            }
          }
          break
          
        case 'multiple':
          await regenerateMultiplePagesWithAnalysis(
            analysis.intent.targetPages,
            analysis,
            userInput,
            aiMessageId
          )
          break
          
        case 'global':
          await regenerateAllPagesWithAnalysis(
            analysis,
            userInput,
            aiMessageId
          )
          break
          
        case 'add_new':
          await addNewSlideWithAnalysis(
            analysis,
            userInput,
            aiMessageId
          )
          break
          
        default:
          throw new Error(`未支持的修改范围: ${analysis.intent.scope}`)
      }
    } catch (error) {
      console.error('执行修改策略失败:', error)
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
          ? { ...msg, content: `❌ 执行修改失败：${error instanceof Error ? error.message : '未知错误'}`, isGenerating: false }
          : msg
      ))
    }
  }

  // 基于分析结果重新生成单页
  const regenerateSinglePageWithAnalysis = async (
    slideIndex: number, 
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    console.log(`开始基于智能分析重新生成第${slideIndex + 1}页`)
    
    // 获取当前幻灯片
    const currentSlide = slides[slideIndex]
    if (!currentSlide) {
      throw new Error(`未找到第${slideIndex + 1}页幻灯片`)
    }

    // 更新AI消息
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: `🔄 正在重新生成第${slideIndex + 1}页：「${currentSlide.title}」...` }
        : msg
    ))

    // 更新幻灯片状态
    setSlides(prev => prev.map((slide, index) => 
      index === slideIndex 
        ? { 
            ...slide, 
            isGenerating: true, 
            generationProgress: '准备重新生成...',
            viewMode: slide.userSelectedViewMode === undefined ? 'thinking' : slide.viewMode
          } 
        : slide
    ))

    try {
      // 构建增强的幻灯片信息，包含修改要求
      const enhancedSlideInfo = {
        ...currentSlide,
        modificationRequirements: {
          userInput,
          analysisResult: analysis,
          specificChanges: analysis.extractedRequirements.specificChanges,
          stylePreferences: analysis.extractedRequirements.stylePreferences,
          selectedElement: hasSelectedElementContext ? selectedElementContext : null
        }
      }

      // 获取前一页信息作为风格参考
      let previousSlideInfo = ''
      if (slideIndex > 0) {
        const prevSlide = slides[slideIndex - 1]
        if (prevSlide && prevSlide.htmlCode && !prevSlide.htmlCode.includes('生成失败')) {
          previousSlideInfo = `前一页设计参考：${prevSlide.title}\n请保持与前一页的设计风格一致性`
        }
      }

      // 第一步：重新思考设计
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { ...slide, generationProgress: '第1步：重新思考设计方案...' }
          : slide
      ))

      const thinkingResponse = await fetch('/api/generate-ppt-thinking', {
        method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
          slide: enhancedSlideInfo,
          slideIndex,
          totalSlides: slides.length,
          theme: 'auto',
          model: 'kimi-k2-0711-preview',
          provider: 'kimi',
          previousSlideInfo,
          unifiedBackground: outline?.unifiedBackground, // 传递统一背景信息
          modificationContext: {
            userRequest: userInput,
            analysisResult: analysis,
            isRegeneration: true
          }
        })
      })

      if (!thinkingResponse.ok) {
        throw new Error(`思考生成失败: ${thinkingResponse.status}`)
      }

      const thinkingReader = thinkingResponse.body?.getReader()
      if (!thinkingReader) {
        throw new Error('无法读取思考响应流')
      }

      let thinkingContent = ""
      
      try {
        while (true) {
          const { done, value } = await thinkingReader.read()
          if (done) break
          
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              if (data.type === 'content' && data.content) {
                thinkingContent += data.content
                
                // 实时更新思考内容
                setSlides(prev => prev.map((slide, index) => 
                  index === slideIndex 
                    ? { 
                        ...slide, 
                        generationProgress: `第1步：思考中... (${thinkingContent.length}字符)`,
                        realtimeThinkingContent: thinkingContent,
                        thinkingContent: thinkingContent
                      } 
                    : slide
                ))
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      } finally {
        thinkingReader.cancel()
      }

      console.log(`第${slideIndex + 1}页思考阶段完成，思考内容长度: ${thinkingContent.length}`)

      // 第二步：生成HTML代码
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { ...slide, generationProgress: '第2步：基于新思考生成HTML代码...' }
          : slide
      ))

      const htmlResponse = await fetch('/api/generate-ppt-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide: enhancedSlideInfo,
          slideIndex,
          totalSlides: slides.length,
          theme: 'auto',
          model: 'kimi-k2-0711-preview',
          provider: 'kimi',
          previousSlideInfo,
          thinkingContent,
          unifiedBackground: outline?.unifiedBackground, // 传递统一背景信息
          modificationContext: {
            userRequest: userInput,
            analysisResult: analysis,
            isRegeneration: true
          }
        })
      })

      if (!htmlResponse.ok) {
        throw new Error(`HTML生成失败: ${htmlResponse.status}`)
      }

      const htmlReader = htmlResponse.body?.getReader()
      if (!htmlReader) {
        throw new Error('无法读取HTML响应流')
      }

      let htmlContent = ""
      
      try {
        while (true) {
          const { done, value } = await htmlReader.read()
          if (done) break
          
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              if (data.type === 'content' && data.content) {
                htmlContent += data.content
                
                // 节流更新HTML内容
                setSlides(prev => prev.map((slide, index) => 
                  index === slideIndex 
                    ? { 
                        ...slide, 
                        htmlCode: htmlContent,
                        generationProgress: `第2步：生成中... (${Math.floor(htmlContent.length / 1024)}KB)`
                      } 
                    : slide
                ))
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      } finally {
        htmlReader.cancel()
      }

      // 清理和验证HTML
      let finalHtmlCode = htmlContent.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim()
      
      // 检查HTML完整性
      const isHTMLComplete = finalHtmlCode.includes('<!DOCTYPE html>') && 
                            finalHtmlCode.includes('</html>') &&
                            finalHtmlCode.trim().endsWith('</html>')
      
      if (!isHTMLComplete && finalHtmlCode.includes('<!DOCTYPE html>')) {
        if (!finalHtmlCode.includes('</body>')) {
          finalHtmlCode += '\n</body>'
        }
        if (!finalHtmlCode.includes('</html>')) {
          finalHtmlCode += '\n</html>'
        }
      }

      console.log(`第${slideIndex + 1}页重新生成完成，HTML长度: ${finalHtmlCode.length}`)
      
      // 完成状态
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { 
              ...slide, 
              htmlCode: finalHtmlCode,
              isGenerating: false,
              generationProgress: '重新生成完成',
              thinkingContent: thinkingContent,
              realtimeThinkingContent: thinkingContent
            } 
          : slide
      ))

      // 保存到数据库
      if (projectId) {
        try {
          const response = await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_slide',
              slideIndex,
                              slideData: {
                  title: currentSlide.title,
                  content: currentSlide.content,
                  htmlCode: finalHtmlCode,
                  thinkingContent: thinkingContent,
                  status: 'completed'
                }
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          console.log(`第${slideIndex + 1}页重新生成结果已保存到数据库`);
        } catch (error) {
          console.error(`保存第${slideIndex + 1}页重新生成结果失败:`, error);
          toast.error(`保存第${slideIndex + 1}页失败，修改可能在刷新后丢失`);
        }
      }

      // 更新AI消息为成功状态
      const successMessage = `**第${slideIndex + 1}页重新生成完成！**

**修改内容：** ${userInput}
**处理方式：** ${analysis.suggestedAction.description}
**修改类型：** ${analysis.intent.modificationType}

**具体变更：**
${analysis.extractedRequirements.specificChanges.map((change: string) => `• ${change}`).join('\n')}

您可以在预览中查看修改效果。如需进一步调整，请继续描述您的需求。`
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: successMessage, isGenerating: false }
          : msg
      ))
      
      // 保存成功消息到数据库
      if (projectId) {
        try {
          await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: successMessage
            }),
          });
        } catch (error) {
          console.error('保存成功消息失败:', error);
        }
      }

      toast.success(`第${slideIndex + 1}页重新生成完成！`)

    } catch (error) {
      console.error(`第${slideIndex + 1}页重新生成失败:`, error)
      
      // 更新失败状态
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { 
              ...slide, 
              isGenerating: false, 
              generationProgress: '重新生成失败'
            } 
          : slide
      ))

      const errorMessage = `❌ **第${slideIndex + 1}页重新生成失败**

**错误信息：** ${error instanceof Error ? error.message : '未知错误'}
**修改需求：** ${userInput}

请尝试重新描述您的修改需求，或者选择其他页面进行修改。`
      
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorMessage, isGenerating: false }
          : msg
      ))

      toast.error(`第${slideIndex + 1}页重新生成失败`)
    }
  }

  // 占位符函数 - 多页修改
  const regenerateMultiplePagesWithAnalysis = async (
    targetPages: number[], 
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    console.log('开始多页修改功能', { targetPages, analysis, userInput })
    
    try {
      // 更新AI消息
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `🔄 正在处理多页修改：${analysis.suggestedAction.description}` }
          : msg
      ))

      // 根据分析结果确定操作类型
      const actionType = analysis.suggestedAction.actionType
      
      if (actionType === 'regenerate_multiple_pages' && isDeletePageOperation(analysis, userInput)) {
        // 删除页面操作
        await handleDeletePages(targetPages, analysis, userInput, aiMessageId)
      } else {
        // 重新生成多个页面
        await handleRegenerateMultiplePages(targetPages, analysis, userInput, aiMessageId)
      }

    } catch (error) {
      console.error('多页修改失败:', error)
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `❌ 多页修改失败：${error instanceof Error ? error.message : '未知错误'}`, isGenerating: false }
          : msg
      ))
    }
  }

  // 删除页面处理
  const handleDeletePages = async (
    targetPages: number[], 
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    console.log('开始删除页面:', targetPages.map(p => p + 1))
    
    // 按倒序排序，从后往前删除，避免索引混乱
    const sortedPages = [...targetPages].sort((a, b) => b - a)
    
    // 更新AI消息
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: `🗑️ 正在删除第${targetPages.map(p => p + 1).join('、')}页...` }
        : msg
    ))

    // 删除指定页面
    setSlides(prev => {
      const newSlides = [...prev]
      sortedPages.forEach(pageIndex => {
        if (pageIndex >= 0 && pageIndex < newSlides.length) {
          newSlides.splice(pageIndex, 1)
        }
      })
      return newSlides
    })

    // 保存删除操作到数据库
    if (projectId) {
      try {
        await fetch(`/api/ppt-tasks/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_slides',
            slideIndices: sortedPages,
            reason: userInput
          }),
        });
        console.log('页面删除操作已保存到数据库');
      } catch (error) {
        console.error('保存删除操作失败:', error);
      }
    }

    // 更新成功消息
    const successMessage = `**页面删除完成！**

**删除页面：** 第${targetPages.map(p => p + 1).join('、')}页
**删除原因：** ${userInput}
**剩余页面：** ${slides.length - targetPages.length}页

页面已成功删除，页码已自动调整。`
    
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: successMessage, isGenerating: false }
        : msg
    ))

    // 保存成功消息到数据库
    if (projectId) {
      try {
        await fetch(`/api/ppt-tasks/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_chat_message',
            messageType: 'ai',
            content: successMessage
          }),
        });
      } catch (error) {
        console.error('保存成功消息失败:', error);
      }
    }

    toast.success(`成功删除${targetPages.length}页内容！`)
  }

  // 重新生成多个页面
  const handleRegenerateMultiplePages = async (
    targetPages: number[], 
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    console.log('开始重新生成多个页面:', targetPages.map(p => p + 1))
    
    // 更新AI消息
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: `🔄 正在重新生成第${targetPages.map(p => p + 1).join('、')}页...` }
        : msg
    ))

    // 并行处理多个页面的重新生成
    const regenerationPromises = targetPages.map(async (slideIndex) => {
      const currentSlide = slides[slideIndex]
      if (!currentSlide) {
        throw new Error(`未找到第${slideIndex + 1}页幻灯片`)
      }

      console.log(`开始重新生成第${slideIndex + 1}页: ${currentSlide.title}`)
      
      // 更新单页生成状态
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { 
              ...slide, 
              isGenerating: true, 
              generationProgress: '准备重新生成...',
              viewMode: slide.userSelectedViewMode === undefined ? 'thinking' : slide.viewMode
            } 
          : slide
      ))

      try {
        // 构建增强的幻灯片信息
        const enhancedSlideInfo = {
          ...currentSlide,
          modificationRequirements: {
            userInput,
            analysisResult: analysis,
            specificChanges: analysis.extractedRequirements.specificChanges,
            stylePreferences: analysis.extractedRequirements.stylePreferences,
            isMultiPageModification: true
          }
        }

        // 获取前一页信息作为风格参考
        let previousSlideInfo = ''
        if (slideIndex > 0) {
          const prevSlide = slides[slideIndex - 1]
          if (prevSlide && prevSlide.htmlCode && !prevSlide.htmlCode.includes('生成失败')) {
            previousSlideInfo = `前一页设计参考：${prevSlide.title}\n请保持与前一页的设计风格一致性`
          }
        }

        // 第一步：重新思考设计
        setSlides(prev => prev.map((slide, index) => 
          index === slideIndex 
            ? { ...slide, generationProgress: '第1步：重新思考设计方案...' }
            : slide
        ))

        const thinkingResponse = await fetch('/api/generate-ppt-thinking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slide: enhancedSlideInfo,
            slideIndex,
            totalSlides: slides.length,
            theme: 'auto',
            model: 'kimi-k2-0711-preview',
            provider: 'kimi',
            previousSlideInfo,
            unifiedBackground: outline?.unifiedBackground, // 传递统一背景信息
            modificationContext: {
              userRequest: userInput,
              analysisResult: analysis,
              isRegeneration: true,
              isMultiPageModification: true
            }
          })
        })

        if (!thinkingResponse.ok) {
          throw new Error(`第${slideIndex + 1}页思考生成失败: ${thinkingResponse.status}`)
        }

        const thinkingReader = thinkingResponse.body?.getReader()
        if (!thinkingReader) {
          throw new Error(`第${slideIndex + 1}页无法读取思考响应流`)
        }

        let thinkingContent = ""
        
        try {
          while (true) {
            const { done, value } = await thinkingReader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n').filter(line => line.trim())
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.type === 'content' && data.content) {
                  thinkingContent += data.content
                  
                  // 实时更新思考内容
                  setSlides(prev => prev.map((slide, index) => 
                    index === slideIndex 
                      ? { 
                          ...slide, 
                          generationProgress: `第1步：思考中... (${thinkingContent.length}字符)`,
                          realtimeThinkingContent: thinkingContent,
                          thinkingContent: thinkingContent
                        } 
                      : slide
                  ))
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        } finally {
          thinkingReader.cancel()
        }

        console.log(`第${slideIndex + 1}页思考阶段完成，思考内容长度: ${thinkingContent.length}`)

        // 第二步：生成HTML代码
        setSlides(prev => prev.map((slide, index) => 
          index === slideIndex 
            ? { ...slide, generationProgress: '第2步：基于新思考生成HTML代码...' }
            : slide
        ))

        const htmlResponse = await fetch('/api/generate-ppt-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slide: enhancedSlideInfo,
            slideIndex,
            totalSlides: slides.length,
            theme: 'auto',
            model: 'kimi-k2-0711-preview',
            provider: 'kimi',
            previousSlideInfo,
            thinkingContent,
            unifiedBackground: outline?.unifiedBackground, // 传递统一背景信息
            modificationContext: {
              userRequest: userInput,
              analysisResult: analysis,
              isRegeneration: true,
              isMultiPageModification: true
            }
          })
        })

        if (!htmlResponse.ok) {
          throw new Error(`第${slideIndex + 1}页HTML生成失败: ${htmlResponse.status}`)
        }

        const htmlReader = htmlResponse.body?.getReader()
        if (!htmlReader) {
          throw new Error(`第${slideIndex + 1}页无法读取HTML响应流`)
        }

        let htmlContent = ""
        
        try {
          while (true) {
            const { done, value } = await htmlReader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n').filter(line => line.trim())
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                if (data.type === 'content' && data.content) {
                  htmlContent += data.content
                  
                  // 节流更新HTML内容
                  setSlides(prev => prev.map((slide, index) => 
                    index === slideIndex 
                      ? { 
                          ...slide, 
                          htmlCode: htmlContent,
                          generationProgress: `第2步：生成中... (${Math.floor(htmlContent.length / 1024)}KB)`
                        } 
                      : slide
                  ))
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        } finally {
          htmlReader.cancel()
        }

        // 清理和验证HTML
        let finalHtmlCode = htmlContent.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim()
        
        // 检查HTML完整性
        const isHTMLComplete = finalHtmlCode.includes('<!DOCTYPE html>') && 
                              finalHtmlCode.includes('</html>') &&
                              finalHtmlCode.trim().endsWith('</html>')
        
        if (!isHTMLComplete && finalHtmlCode.includes('<!DOCTYPE html>')) {
          if (!finalHtmlCode.includes('</body>')) {
            finalHtmlCode += '\n</body>'
          }
          if (!finalHtmlCode.includes('</html>')) {
            finalHtmlCode += '\n</html>'
          }
        }

        console.log(`第${slideIndex + 1}页重新生成完成，HTML长度: ${finalHtmlCode.length}`)
        
        // 完成状态
        setSlides(prev => prev.map((slide, index) => 
          index === slideIndex 
            ? { 
                ...slide, 
                htmlCode: finalHtmlCode,
                isGenerating: false,
                generationProgress: '重新生成完成',
                thinkingContent: thinkingContent,
                realtimeThinkingContent: thinkingContent
              } 
            : slide
        ))

        // 保存到数据库
        if (projectId) {
          try {
            const response = await fetch(`/api/ppt-tasks/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'save_slide',
                slideIndex,
                slideData: {
                  title: currentSlide.title,
                  content: currentSlide.content,
                  htmlCode: finalHtmlCode,
                  thinkingContent: thinkingContent,
                  status: 'completed'
                }
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            console.log(`第${slideIndex + 1}页重新生成结果已保存到数据库`);
          } catch (error) {
            console.error(`保存第${slideIndex + 1}页重新生成结果失败:`, error);
            toast.error(`保存第${slideIndex + 1}页失败，修改可能在刷新后丢失`);
          }
        }

        return { slideIndex, success: true }

      } catch (error) {
        console.error(`第${slideIndex + 1}页重新生成失败:`, error)
        
        // 更新失败状态
        setSlides(prev => prev.map((slide, index) => 
          index === slideIndex 
            ? { 
                ...slide, 
                isGenerating: false, 
                generationProgress: '重新生成失败'
              } 
            : slide
        ))

        return { slideIndex, success: false, error }
      }
    })

    // 等待所有页面处理完成
    const results = await Promise.allSettled(regenerationPromises)
    
    // 统计结果
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failCount = results.length - successCount
    
    // 更新最终消息
    const finalMessage = `**多页重新生成完成！**

**修改需求：** ${userInput}
**处理页面：** 第${targetPages.map(p => p + 1).join('、')}页
**成功：** ${successCount}页
**失败：** ${failCount}页

**具体变更：**
${analysis.extractedRequirements.specificChanges.map((change: string) => `• ${change}`).join('\n')}

您可以在预览中查看修改效果。如需进一步调整，请继续描述您的需求。`
    
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: finalMessage, isGenerating: false }
        : msg
    ))
    
    // 保存成功消息到数据库
    if (projectId) {
      try {
        await fetch(`/api/ppt-tasks/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_chat_message',
            messageType: 'ai',
            content: finalMessage
          }),
        });
      } catch (error) {
        console.error('保存成功消息失败:', error);
      }
    }

    toast.success(`多页重新生成完成！成功${successCount}页，失败${failCount}页`)
  }

  // 占位符函数 - 全局修改
  const regenerateAllPagesWithAnalysis = async (
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    // TODO: 实现全局修改逻辑，可以复用现有的handleFullRegeneration
    console.log('全局修改功能', analysis)
    await handleFullRegeneration(userInput, aiMessageId)
  }

  // 占位符函数 - 添加新页面
  const addNewSlideWithAnalysis = async (
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    // TODO: 实现添加新页面逻辑
    console.log('添加新页面功能待实现', analysis)
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: '添加新页面功能正在开发中...', isGenerating: false }
        : msg
    ))
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

  const downloadPDF = async () => {
    if (slides.length === 0) return

    // 创建一个持久的加载提示
    const loadingToastId = toast.loading('正在启动PDF生成...')

    try {
      // 更新进度提示
      toast.loading(`正在处理 ${slides.length} 张幻灯片...`, { id: loadingToastId })
      
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
          toast.loading(`正在生成PDF... (${i + 1}/${slides.length})`, { id: loadingToastId })

        } catch (error) {
          console.error(`生成第${i + 1}页PDF时出错:`, error)
          toast.error(`第${i + 1}页转换失败，跳过`)
          continue
        }
      }

      // 保存PDF
      const filename = `${outline?.title || 'generated-ppt'}.pdf`
      pdf.save(filename)
      
      toast.success('PDF生成完成！', { id: loadingToastId })

    } catch (error) {
      console.error('生成PDF时出错:', error)
      toast.error('PDF生成失败，请重试', { id: loadingToastId })
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

  const downloadPPTX = async () => {
    if (slides.length === 0) {
      toast.error('没有幻灯片可以下载')
      return
    }

    // 创建一个持久的加载提示
    const loadingToastId = toast.loading('正在启动PPTX生成...')
    let progressInterval: NodeJS.Timeout | null = null
    
    try {
      // 准备发送给服务端的数据
      const requestData = {
        slides: slides.map(slide => ({
          id: slide.id,
          title: slide.title,
          content: slide.content,
          htmlCode: slide.htmlCode
        })),
        title: outline?.title || 'Generated Presentation'
      }

      // 更新进度提示
      toast.loading(`正在处理 ${slides.length} 张幻灯片...`, { id: loadingToastId })

      // 创建一个进度更新定时器
      progressInterval = setInterval(() => {
        const randomMessages = [
          '正在渲染幻灯片...',
          '正在生成高质量截图...',
          '正在创建PPTX文件...',
          '正在优化图片质量...',
          '即将完成...'
        ]
        const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)]
        toast.loading(randomMessage, { id: loadingToastId })
      }, 3000) // 每3秒更新一次提示

      // 发送请求到服务端生成PPTX
      const response = await fetch('/api/generate-pptx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      // 清除进度更新定时器
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '生成PPTX失败')
      }

      // 更新进度提示
      toast.loading('正在下载PPTX文件...', { id: loadingToastId })

      // 获取PPTX文件数据
      const blob = await response.blob()
      
      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${outline?.title || 'generated-presentation'}.pptx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // 关闭加载提示并显示成功消息
      toast.success('PPTX文件下载完成！', { id: loadingToastId })
      
    } catch (error) {
      // 确保清除定时器
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      console.error('下载PPTX时出错:', error)
      // 关闭加载提示并显示错误消息
      toast.error(error instanceof Error ? error.message : '下载PPTX失败', { id: loadingToastId })
    }
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

  // 转换中文数字为阿拉伯数字
  const convertChineseNumberToArabic = (chineseNum: string): string => {
    const numMap: { [key: string]: string } = {
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
      '六': '6', '七': '7', '八': '8', '九': '9', '十': '10'
    }
    return numMap[chineseNum] || chineseNum
  }

  // 快速修改单页（跳过思考过程，直接基于现有HTML修改）
  const regenerateSinglePageDirectly = async (
    slideIndex: number, 
    analysis: any, 
    userInput: string, 
    aiMessageId: string
  ) => {
    const currentSlide = slides[slideIndex]
    if (!currentSlide) {
      throw new Error(`未找到第${slideIndex + 1}页幻灯片`)
    }

    // 更新AI消息
    setChatMessages(prev => prev.map(msg => 
      msg.id === aiMessageId 
        ? { ...msg, content: `⚡ 正在快速修改第${slideIndex + 1}页选中元素...` }
        : msg
    ))

    // 更新幻灯片状态
    setSlides(prev => prev.map((slide, index) => 
      index === slideIndex 
        ? { 
            ...slide, 
            isGenerating: true, 
            generationProgress: '正在快速修改...',
            viewMode: slide.userSelectedViewMode === undefined ? 'render' : slide.viewMode
          } 
        : slide
    ))

    try {
      // 直接调用HTML生成API，传入现有HTML代码和修改要求
      const htmlResponse = await fetch('/api/generate-ppt-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide: {
            title: currentSlide.title,
            content: currentSlide.content,
            existingHtmlCode: currentSlide.htmlCode, // 传入现有HTML代码
            modificationRequirements: {
              userInput,
              analysisResult: analysis,
              specificChanges: analysis.extractedRequirements.specificChanges,
              selectedElement: hasSelectedElementContext ? selectedElementContext : null,
              selectedElementInfo: selectedElementInfo, // 添加详细的DOM元素信息
              isDirectModification: true // 标记为直接修改模式
            }
          },
          slideIndex,
          totalSlides: slides.length,
          theme: 'auto',
          model: 'kimi-k2-0711-preview',
          provider: 'kimi',
          thinkingContent: `基于现有HTML代码进行快速修改：${analysis.extractedRequirements.specificChanges.join(', ')}`, // 简化的思考内容
          unifiedBackground: outline?.unifiedBackground, // 传递统一背景信息
          modificationContext: {
            userRequest: userInput,
            analysisResult: analysis,
            isDirectModification: true,
            preserveLayout: true // 保持原有布局
          }
        })
      })

      if (!htmlResponse.ok) {
        throw new Error(`HTML生成失败: ${htmlResponse.status}`)
      }

      const htmlReader = htmlResponse.body?.getReader()
      if (!htmlReader) {
        throw new Error('无法读取HTML响应流')
      }

      let htmlContent = ""
      
      try {
        while (true) {
          const { done, value } = await htmlReader.read()
          if (done) break
          
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              if (data.type === 'content' && data.content) {
                htmlContent += data.content
                
                // 实时更新HTML内容
                setSlides(prev => prev.map((slide, index) => 
                  index === slideIndex 
                    ? { 
                        ...slide, 
                        generationProgress: `快速修改中... (${htmlContent.length}字符)`,
                        htmlCode: htmlContent
                      } 
                    : slide
                ))
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      } finally {
        htmlReader.cancel()
      }

      console.log(`第${slideIndex + 1}页快速修改完成，HTML长度: ${htmlContent.length}`)

      // 完成生成
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { 
              ...slide, 
          htmlCode: htmlContent,
          isGenerating: false,
              generationProgress: '',
              viewMode: slide.userSelectedViewMode === undefined ? 'render' : slide.viewMode
            } 
          : slide
      ))

      // 更新成功消息
      setChatMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `第${slideIndex + 1}页修改完成！已根据您的要求快速更新选中元素。`, isGenerating: false }
          : msg
      ))

      // 保存到数据库
      if (projectId) {
        try {
          const updateResponse = await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_slide',
              slideIndex,
              htmlCode: htmlContent,
              thinkingContent: `快速修改：${analysis.extractedRequirements.specificChanges.join(', ')}`
            }),
          });
          
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`更新幻灯片失败: HTTP ${updateResponse.status}: ${errorText}`);
          }

          // 保存AI消息
          const messageResponse = await fetch(`/api/ppt-tasks/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_chat_message',
              messageType: 'ai',
              content: `第${slideIndex + 1}页修改完成！已根据您的要求快速更新选中元素。`
            }),
          });
          
          if (!messageResponse.ok) {
            console.warn('保存AI消息失败:', await messageResponse.text());
          }
          
          console.log(`第${slideIndex + 1}页快速修改已保存到数据库`);
        } catch (error) {
          console.error('保存到数据库失败:', error);
          toast.error(`保存第${slideIndex + 1}页失败，修改可能在刷新后丢失`);
        }
      }

    } catch (error) {
      console.error(`第${slideIndex + 1}页快速修改失败:`, error)
      
      setSlides(prev => prev.map((slide, index) => 
        index === slideIndex 
          ? { 
              ...slide, 
              isGenerating: false,
              generationProgress: '',
              htmlCode: slide.htmlCode || `<div class="error">快速修改失败: ${error instanceof Error ? error.message : '未知错误'}</div>`
            } 
          : slide
      ))

      setChatMessages(prev => prev.map(msg =>
        msg.id === aiMessageId 
          ? { ...msg, content: `❌ 第${slideIndex + 1}页快速修改失败：${error instanceof Error ? error.message : '未知错误'}`, isGenerating: false }
          : msg
      ))
    }
  }

  return (
    <div className="bg-gray-900 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden" style={{width: '812px%'}}>
        {/* Left Panel - Chat & Outline */}
        <div className={`${
          previewSize === 'small' ? 'w-1/2' : 
          previewSize === 'medium' ? 'w-2/5' : 
          ' '
        } bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300`} style={{width: '-webkit-fill-available'}}>
          {/* Chat Messages */}      
          <div className="flex items-center justify-between  p-3" style={{position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1}}>
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
                    } rounded-lg px-4 py-2 relative group ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {/* 复制按钮 */}
                    <Button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      variant="ghost"
                      size="sm"
                      className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0 ${
                        message.type === 'user' 
                          ? 'hover:bg-blue-500/50 text-blue-100' 
                          : 'hover:bg-gray-600/50 text-gray-300'
                      }`}
                      title="复制消息内容"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
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

            {/* Outline Section - 作为聊天消息流的一部分，跟随对话动态显示 */}
            {outline && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold text-white ${
                    previewSize === 'small' ? 'text-base' : 'text-lg'
                  }`}>PPT大纲</h3>
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
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-white">{outline.title}</h4>
                      <span className="text-xs text-gray-400">{slides.length} 页</span>
                    </div>
                  <div className="space-y-2">
                    {slides.map((slide, index) => (
                      <div
                        key={slide.id}
                          className={`p-3 rounded-lg bg-gray-600/50 text-gray-300 border border-gray-500/30 ${
                          previewSize === 'small' ? 'p-2' : 'p-3'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium bg-blue-600 text-white px-2 py-1 rounded">
                              {index + 1}
                            </span>
                            <span className={`${
                              previewSize === 'small' ? 'text-xs' : 'text-sm'
                              } font-medium text-white truncate`} title={slide.title}>
                              {previewSize === 'small' && slide.title.length > 12 
                                ? slide.title.substring(0, 12) + '...' 
                                : slide.title}
                            </span>
                          </div>
                            <div className="flex items-center space-x-2">
                          {slide.isGenerating && (
                                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0 text-blue-400" />
                              )}
                              <span className={`text-xs px-2 py-1 rounded ${
                                slide.isGenerating 
                                  ? 'bg-yellow-600/20 text-yellow-300' 
                                  : slide.htmlCode 
                                    ? 'bg-green-600/20 text-green-300' 
                                    : 'bg-gray-600/20 text-gray-400'
                              }`}>
                                {slide.isGenerating ? '生成中' : slide.htmlCode ? '已完成' : '等待中'}
                              </span>
                        </div>
                          </div>
                          <p className={`text-xs opacity-75 mt-2 text-gray-400 ${
                          previewSize === 'small' ? 'hidden' : 'block'
                        }`}>
                          {slide.generationProgress}
                        </p>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            {/* 选中元素上下文显示 */}
            {hasSelectedElementContext && selectedElementContext && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-300 font-medium">已选中元素</span>
                  <div className="w-px h-3 bg-blue-500/30 mx-1"></div>
                  <span className="text-xs text-blue-200/80 font-mono flex-1">
                    {selectedElementContext.replace("请修改选中的元素: ", "")}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-1 h-4 w-4 p-0 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/20"
                    onClick={() => {
                      setHasSelectedElementContext(false);
                      setSelectedElementContext("");
                      setSelectedSlideId(null);
                      setSelectedSlideIndex(null);
                    }}
                    title="清除选择"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Textarea
                value={currentChatInput}
                onChange={(e) => setCurrentChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasSelectedElementContext 
                  ? "描述如何修改选中的元素... (例如：改变颜色、调整大小、修改文本等)" 
                  : "描述您想要的修改..."
                }
                className={`flex-1 border-gray-600 text-white placeholder:text-gray-400 min-h-[40px] max-h-[120px] ${
                  hasSelectedElementContext 
                    ? 'bg-blue-900/20 border-blue-600/50 focus:border-blue-400' 
                    : 'bg-gray-700 border-gray-600 focus:border-gray-500'
                }`}
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
              {isElementSelectMode && (
                <span className="ml-2 text-blue-400">
                  • 点击幻灯片中的元素来选择它们
                </span>
              )}
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
              {/* 联网搜索开关 */}
              {supportsWebSearch && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-lg border border-gray-600">
                  <label className="flex items-center space-x-2 cursor-pointer">
             
                    <span className="text-sm text-gray-300">联网搜索</span>
                  </label>
                  {isSearching && (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-blue-400">搜索中</span>
                    </div>
                  )}
                  {searchStats.searchCount > 0 && (
                    <span className="text-xs text-gray-400">
                      已搜索{searchStats.searchCount}次 ({searchStats.tokensUsed} tokens)
                    </span>
                  )}
                </div>
              )}
              
              {/* 元素选择按钮 */}
              {slides.length > 0 && (
                <Button
                  variant={isElementSelectMode ? "secondary" : "ghost"}
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('元素选择按钮被点击，当前状态:', isElementSelectMode);
                    const newState = !isElementSelectMode;
                    console.log('即将设置新状态:', newState);
                    setIsElementSelectMode(newState);
                    
                    // 如果关闭选择模式，清理相关状态
                    if (!newState) {
                      setHasSelectedElementContext(false);
                      setSelectedElementContext("");
                      setSelectedSlideId(null);
                      setSelectedSlideIndex(null);
                      setSelectedElementInfo(null);
                    }
                  }}
                  title={isElementSelectMode ? "退出元素选择模式" : "进入元素选择模式"}
                >
                  <MousePointer2 className="w-4 h-4 mr-1" />
                  <span className="text-xs">选择</span>
                </Button>
              )}
              
              {/* 下载按钮 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={slides.length === 0}
                    className="bg-white text-black hover:bg-white/90 border border-gray-700"
                    size="sm"
                  >
                    <Download className="" />
                    下载
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end"  style={{border: '1px solid white'}}>
                  <DropdownMenuItem onClick={downloadPDF} >
                    <FileText className="w-4 h-4 mr-2" />
                    下载为 PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadHTML}>
                    <Code className="w-4 h-4 mr-2" />
                    下载为 HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadPPTX}>
                    <Presentation className="w-4 h-4 mr-2" />
                    下载为 PPTX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* 分享按钮 */}
              <Button
                onClick={handleSharePPT}
                disabled={slides.length === 0 || !projectId}
                className="bg-white text-black hover:bg-white/90 border border-gray-700"
                size="sm"
              >
                <Share className="" />
                Share
              </Button>
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
                              {/* 元素选择模式指示器 */}
                              {isElementSelectMode && (
                                <div className="absolute top-2 left-2 bg-blue-600/90 text-white px-2 py-1 rounded text-xs flex items-center shadow-lg">
                                  <MousePointer2 className="w-3 h-3 mr-1" />
                                  <span>点击选择元素</span>
                                </div>
                              )}
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