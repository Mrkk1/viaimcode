"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { debounce } from "lodash"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Type, Palette, Layout, Move, RefreshCw, Image, Upload, Link, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

interface VisualEditorProps {
  selectedElement: HTMLElement | null
  onStyleChange: (property: string, value: string) => void
  onRefreshPreview?: () => void
}

interface StyleProperty {
  property: string
  value: string
  label: string
  type: 'text' | 'number' | 'select' | 'color' | 'slider' | 'image' | 'textarea'
  options?: string[]
  min?: number
  max?: number
  step?: number
  unit?: string
}

export function VisualEditor({ selectedElement, onStyleChange, onRefreshPreview }: VisualEditorProps) {
  const [currentStyles, setCurrentStyles] = useState<Record<string, string>>({})
  const [isImageElement, setIsImageElement] = useState(false)
  const [hasTextContent, setHasTextContent] = useState(false)
  const [currentImageSrc, setCurrentImageSrc] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>('url')
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('text')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastColorValueRef = useRef<Record<string, string>>({}) // 存储最后选择的颜色值

  // 检查元素是否适合文本编辑
  const checkIfElementHasTextContent = (element: HTMLElement): boolean => {
    if (!element) return false;
    
    // 图片元素不需要文本编辑
    if (element.tagName.toLowerCase() === 'img') return false;
    
    // 检查是否有子元素（排除文本节点）
    const childElements = Array.from(element.children);
    
    // 如果没有子元素，可以编辑文本
    if (childElements.length === 0) {
      return true;
    }
    
    // 如果只有文本节点和少量简单的内联元素（如 span, strong, em），也可以编辑
    const allowedInlineElements = ['span', 'strong', 'em', 'b', 'i', 'u', 'small', 'mark'];
    const hasOnlyInlineElements = childElements.every(child => 
      allowedInlineElements.includes(child.tagName.toLowerCase())
    );
    
    // 如果只有允许的内联元素且数量不超过3个，可以编辑
    if (hasOnlyInlineElements && childElements.length <= 3) {
      return true;
    }
    
    return false;
  };

  // 获取元素的当前样式
  useEffect(() => {
    if (selectedElement) {
      console.log('获取选中元素的样式:', selectedElement);
      
      // 检查是否为图片元素
      const isImg = selectedElement.tagName.toLowerCase() === 'img';
      setIsImageElement(isImg);
      
      // 检查是否适合文本编辑
      const canEditText = checkIfElementHasTextContent(selectedElement);
      setHasTextContent(canEditText);
      console.log('元素是否适合文本编辑:', canEditText);
      
      // 根据元素类型自动切换到对应的首选选项卡
      if (isImg) {
        setActiveTab('image'); // 图片元素默认显示图片选项卡
        console.log('切换到图片选项卡');
      } else if (canEditText) {
        setActiveTab('text'); // 可编辑文本的元素默认显示文本选项卡
        console.log('切换到文本选项卡');
      } else {
        // 如果当前选中的是文本选项卡，但新元素不支持文本编辑，则切换到字体选项卡
        if (activeTab === 'text' || activeTab === 'image') {
          setActiveTab('typography');
          console.log('元素不支持文本编辑，自动切换到字体选项卡');
        } else {
          setActiveTab('typography'); // 其他元素默认显示字体选项卡
          console.log('切换到字体选项卡');
        }
      }
      
      // 如果是图片元素，获取当前的src
      if (isImg) {
        const imgElement = selectedElement as HTMLImageElement;
        // 优先获取实际的src属性，然后是DOM中的src
        const currentSrc = imgElement.getAttribute('src') || imgElement.src || '';
        console.log('检测到图片元素，当前src:', currentSrc);
        console.log('DOM src:', imgElement.src);
        console.log('属性 src:', imgElement.getAttribute('src'));
        
        // 只有当src真正不同时才更新状态，避免不必要的重置
        if (currentSrc !== currentImageSrc) {
          setCurrentImageSrc(currentSrc);
          setImageUrl(currentSrc);
          console.log('更新图片状态，新src:', currentSrc);
        } else {
          console.log('图片src未变化，保持当前状态');
        }
      } else {
        // 只有当从图片元素切换到非图片元素时才清空图片状态
        if (isImageElement) {
          setCurrentImageSrc('');
          setImageUrl('');
          console.log('从图片元素切换到非图片元素，清空图片状态');
        }
      }
      
      // 清空之前的颜色值缓存，避免影响新元素
      lastColorValueRef.current = {};
      
      const computedStyles = window.getComputedStyle(selectedElement);
      
      // 辅助函数：将RGB颜色转换为十六进制
      const rgbToHex = (rgb: string): string => {
        if (rgb.startsWith('#')) return rgb;
        if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';
        
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        return '#000000';
      };
      
      // 辅助函数：处理背景颜色
      const processBackgroundColor = (bgColor: string): string => {
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          return 'transparent';
        }
        return rgbToHex(bgColor);
      };
      
      // 辅助函数：提取数值
      const extractNumericValue = (value: string, defaultValue: number = 0): number => {
        const match = value.match(/^([\d.]+)/);
        return match ? parseFloat(match[1]) : defaultValue;
      };
      
      const styles = {
        fontSize: computedStyles.fontSize,
        fontFamily: computedStyles.fontFamily.replace(/"/g, ''),
        fontWeight: computedStyles.fontWeight,
        color: rgbToHex(computedStyles.color),
        backgroundColor: processBackgroundColor(computedStyles.backgroundColor),
        padding: computedStyles.padding,
        margin: computedStyles.margin,
        borderRadius: computedStyles.borderRadius,
        border: computedStyles.border,
        width: computedStyles.width,
        height: computedStyles.height,
        display: computedStyles.display,
        textAlign: computedStyles.textAlign,
        lineHeight: computedStyles.lineHeight,
      };
      
      // 初始化颜色值缓存，避免首次点击时的值不匹配
      lastColorValueRef.current = {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      };
      
      console.log('解析后的样式:', styles);
      setCurrentStyles(styles);
    } else {
      // 如果没有选中元素，清空所有状态
      setCurrentStyles({});
      setIsImageElement(false);
      setHasTextContent(false);
      setCurrentImageSrc('');
      setImageUrl('');
      lastColorValueRef.current = {};
    }
  }, [selectedElement])

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('请选择有效的图片文件');
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('图片上传失败');
      }
      
      const data = await response.json();
      const newImageSrc = data.url;
      
      // 更新图片src
      handleImageSrcChange(newImageSrc);
      setImageUrl(newImageSrc);
      
      toast.success('图片上传成功');
    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error('图片上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // 处理图片src变更
  const handleImageSrcChange = (newSrc: string) => {
    if (!selectedElement || !isImageElement) return;
    
    console.log('更新图片src:', newSrc);
    
    // 直接更新DOM中的图片src
    const imgElement = selectedElement as HTMLImageElement;
    imgElement.src = newSrc;
    
    // 更新本地状态 - 确保所有相关状态都更新
    setCurrentImageSrc(newSrc);
    setImageUrl(newSrc); // 确保输入框也显示新的URL
    
    // 通过onStyleChange更新代码中的src属性
    // 这里我们需要特殊处理，因为src不是CSS属性
    // 我们可以使用一个特殊的属性名来标识这是图片src的更新
    onStyleChange('src', newSrc);
  };

  // 优化的DOM更新函数
  const updateElementStyle = useCallback((property: string, value: string) => {
    if (!selectedElement) return;
    
    // 取消之前的动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // 使用requestAnimationFrame优化DOM操作
    animationFrameRef.current = requestAnimationFrame(() => {
      selectedElement.style.setProperty(property, value, 'important');
    });
  }, [selectedElement]);

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 图片相关属性（仅在选择图片元素时显示）
  const imageProperties: StyleProperty[] = isImageElement ? [
    {
      property: 'src',
      value: currentImageSrc || (selectedElement ? (selectedElement as HTMLImageElement).getAttribute('src') || (selectedElement as HTMLImageElement).src || '' : ''),
      label: 'Image source',
      type: 'image'
    }
  ] : [];

  // 文本相关属性
  const textProperties: StyleProperty[] = [
    {
      property: 'textContent',
      value: selectedElement?.textContent || '',
      label: 'Text content',
      type: 'textarea'
    },
    {
      property: 'innerHTML',
      value: selectedElement?.innerHTML || '',
      label: 'HTML content',
      type: 'textarea'
    }
  ]

  // 字体相关属性
  const fontProperties: StyleProperty[] = [
    {
      property: 'fontSize',
      value: currentStyles.fontSize || '16px',
      label: 'Font size',
      type: 'slider',
      min: 8,
      max: 72,
      step: 1,
      unit: 'px'
    },
    {
      property: 'fontFamily',
      value: currentStyles.fontFamily || 'inherit',
      label: 'Font family',
      type: 'select',
      options: [
        'inherit',
        'Arial, sans-serif',
        'Helvetica, sans-serif',
        '"Times New Roman", serif',
        'Georgia, serif',
        '"Courier New", monospace',
        'Verdana, sans-serif',
        '"Microsoft YaHei", sans-serif',
        '"PingFang SC", sans-serif'
      ]
    },
    {
      property: 'fontWeight',
      value: currentStyles.fontWeight || 'normal',
      label: 'Font weight',
      type: 'select',
      options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']
    },
    {
      property: 'textAlign',
      value: currentStyles.textAlign || 'left',
      label: 'Text align',
      type: 'select',
      options: ['left', 'center', 'right', 'justify']
    },
    {
      property: 'lineHeight',
      value: currentStyles.lineHeight || '1.5',
      label: 'Line height',
      type: 'slider',
      min: 0.8,
      max: 3,
      step: 0.1,
      unit: ''
    }
  ]

  // 颜色相关属性
  const colorProperties: StyleProperty[] = [
    {
      property: 'color',
      value: currentStyles.color || '#000000',
      label: 'Text color',
      type: 'color'
    },
    {
      property: 'backgroundColor',
      value: currentStyles.backgroundColor || 'transparent',
      label: 'Background color',
      type: 'color'
    }
  ]

  // 布局相关属性
  const layoutProperties: StyleProperty[] = [
    {
      property: 'display',
      value: currentStyles.display || 'block',
      label: 'Display',
      type: 'select',
      options: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none']
    },
    {
      property: 'width',
      value: currentStyles.width || 'auto',
      label: 'Width',
      type: 'text'
    },
    {
      property: 'height',
      value: currentStyles.height || 'auto',
      label: 'Height',
      type: 'text'
    }
  ]

  // 间距相关属性
  const spacingProperties: StyleProperty[] = [
    {
      property: 'padding',
      value: currentStyles.padding || '0px',
      label: 'Padding',
      type: 'text'
    },
    {
      property: 'margin',
      value: currentStyles.margin || '0px',
      label: 'Margin',
      type: 'text'
    },
    {
      property: 'borderRadius',
      value: currentStyles.borderRadius || '0px',
      label: 'Border radius',
      type: 'slider',
      min: 0,
      max: 50,
      step: 1,
      unit: 'px'
    }
  ]

  const handleStyleChange = (property: string, value: string) => {
    console.log('Visual editor style change:', property, value);
    
    // 在应用新样式前，先移除相关的 Tailwind CSS 类
    removeTailwindClasses(property);
    
    // 立即更新本地状态（用于UI显示）
    setCurrentStyles(prev => ({ ...prev, [property]: value }))
    
    // 转换为正确的CSS属性名格式（kebab-case）
    const cssProperty = camelToKebab(property);
    
    // 立即调用父组件的样式变更（用于DOM预览），使用正确的CSS属性名
    onStyleChange(cssProperty, value)
  }

  // 用于颜色预览（拖动时完全不处理）
  const handleColorPreview = (property: string, value: string) => {
    // 存储最后选择的颜色值
    lastColorValueRef.current[property] = value;
    console.log('颜色拖动中（不处理）:', property, value);
  }

  // 用于颜色确认处理
  const handleColorConfirm = (property: string, value: string) => {
    console.log('颜色确认变更:', property, value);
    
    // 在应用新样式前，先移除相关的 Tailwind CSS 类
    removeTailwindClasses(property);
    
    // 更新本地状态
    setCurrentStyles(prev => ({ ...prev, [property]: value }));
    
    // 转换为正确的CSS属性名格式（kebab-case）
    const cssProperty = camelToKebab(property);
    
    // 调用父组件的样式变更（这会更新代码）
    onStyleChange(cssProperty, value);
  }

  // 标准化颜色值用于比较
  const normalizeColor = (color: string): string => {
    if (!color) return '#000000';
    if (color === 'transparent') return 'transparent';
    if (color.startsWith('#')) return color.toLowerCase();
    
    // 处理RGB格式
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    return color.toLowerCase();
  };

  // Tailwind CSS 类名映射表
  const tailwindClassMappings = {
    fontSize: [
      'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 
      'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'
    ],
    fontWeight: [
      'font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 
      'font-semibold', 'font-bold', 'font-extrabold', 'font-black'
    ],
    textAlign: [
      'text-left', 'text-center', 'text-right', 'text-justify'
    ],
    color: [
      // 文字颜色类
      'text-black', 'text-white', 'text-gray-50', 'text-gray-100', 'text-gray-200', 
      'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 
      'text-gray-800', 'text-gray-900', 'text-red-50', 'text-red-100', 'text-red-200', 
      'text-red-300', 'text-red-400', 'text-red-500', 'text-red-600', 'text-red-700', 
      'text-red-800', 'text-red-900', 'text-blue-50', 'text-blue-100', 'text-blue-200', 
      'text-blue-300', 'text-blue-400', 'text-blue-500', 'text-blue-600', 'text-blue-700', 
      'text-blue-800', 'text-blue-900', 'text-green-50', 'text-green-100', 'text-green-200', 
      'text-green-300', 'text-green-400', 'text-green-500', 'text-green-600', 'text-green-700', 
      'text-green-800', 'text-green-900', 'text-yellow-50', 'text-yellow-100', 'text-yellow-200', 
      'text-yellow-300', 'text-yellow-400', 'text-yellow-500', 'text-yellow-600', 'text-yellow-700', 
      'text-yellow-800', 'text-yellow-900', 'text-purple-50', 'text-purple-100', 'text-purple-200', 
      'text-purple-300', 'text-purple-400', 'text-purple-500', 'text-purple-600', 'text-purple-700', 
      'text-purple-800', 'text-purple-900', 'text-pink-50', 'text-pink-100', 'text-pink-200', 
      'text-pink-300', 'text-pink-400', 'text-pink-500', 'text-pink-600', 'text-pink-700', 
      'text-pink-800', 'text-pink-900', 'text-indigo-50', 'text-indigo-100', 'text-indigo-200', 
      'text-indigo-300', 'text-indigo-400', 'text-indigo-500', 'text-indigo-600', 'text-indigo-700', 
      'text-indigo-800', 'text-indigo-900'
    ],
    backgroundColor: [
      // 背景颜色类
      'bg-black', 'bg-white', 'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 
      'bg-gray-300', 'bg-gray-400', 'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 
      'bg-gray-800', 'bg-gray-900', 'bg-red-50', 'bg-red-100', 'bg-red-200', 
      'bg-red-300', 'bg-red-400', 'bg-red-500', 'bg-red-600', 'bg-red-700', 
      'bg-red-800', 'bg-red-900', 'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 
      'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 
      'bg-blue-800', 'bg-blue-900', 'bg-green-50', 'bg-green-100', 'bg-green-200', 
      'bg-green-300', 'bg-green-400', 'bg-green-500', 'bg-green-600', 'bg-green-700', 
      'bg-green-800', 'bg-green-900', 'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-200', 
      'bg-yellow-300', 'bg-yellow-400', 'bg-yellow-500', 'bg-yellow-600', 'bg-yellow-700', 
      'bg-yellow-800', 'bg-yellow-900', 'bg-purple-50', 'bg-purple-100', 'bg-purple-200', 
      'bg-purple-300', 'bg-purple-400', 'bg-purple-500', 'bg-purple-600', 'bg-purple-700', 
      'bg-purple-800', 'bg-purple-900', 'bg-pink-50', 'bg-pink-100', 'bg-pink-200', 
      'bg-pink-300', 'bg-pink-400', 'bg-pink-500', 'bg-pink-600', 'bg-pink-700', 
      'bg-pink-800', 'bg-pink-900', 'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-200', 
      'bg-indigo-300', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600', 'bg-indigo-700', 
      'bg-indigo-800', 'bg-indigo-900', 'bg-transparent'
    ],
    padding: [
      'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16', 'p-20', 'p-24',
      'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8', 'px-10', 'px-12', 'px-16', 'px-20', 'px-24',
      'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8', 'py-10', 'py-12', 'py-16', 'py-20', 'py-24',
      'pt-0', 'pt-1', 'pt-2', 'pt-3', 'pt-4', 'pt-5', 'pt-6', 'pt-8', 'pt-10', 'pt-12', 'pt-16', 'pt-20', 'pt-24',
      'pb-0', 'pb-1', 'pb-2', 'pb-3', 'pb-4', 'pb-5', 'pb-6', 'pb-8', 'pb-10', 'pb-12', 'pb-16', 'pb-20', 'pb-24',
      'pl-0', 'pl-1', 'pl-2', 'pl-3', 'pl-4', 'pl-5', 'pl-6', 'pl-8', 'pl-10', 'pl-12', 'pl-16', 'pl-20', 'pl-24',
      'pr-0', 'pr-1', 'pr-2', 'pr-3', 'pr-4', 'pr-5', 'pr-6', 'pr-8', 'pr-10', 'pr-12', 'pr-16', 'pr-20', 'pr-24'
    ],
    margin: [
      'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-8', 'm-10', 'm-12', 'm-16', 'm-20', 'm-24',
      'mx-0', 'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-5', 'mx-6', 'mx-8', 'mx-10', 'mx-12', 'mx-16', 'mx-20', 'mx-24',
      'my-0', 'my-1', 'my-2', 'my-3', 'my-4', 'my-5', 'my-6', 'my-8', 'my-10', 'my-12', 'my-16', 'my-20', 'my-24',
      'mt-0', 'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5', 'mt-6', 'mt-8', 'mt-10', 'mt-12', 'mt-16', 'mt-20', 'mt-24',
      'mb-0', 'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-5', 'mb-6', 'mb-8', 'mb-10', 'mb-12', 'mb-16', 'mb-20', 'mb-24',
      'ml-0', 'ml-1', 'ml-2', 'ml-3', 'ml-4', 'ml-5', 'ml-6', 'ml-8', 'ml-10', 'ml-12', 'ml-16', 'ml-20', 'ml-24',
      'mr-0', 'mr-1', 'mr-2', 'mr-3', 'mr-4', 'mr-5', 'mr-6', 'mr-8', 'mr-10', 'mr-12', 'mr-16', 'mr-20', 'mr-24'
    ],
    borderRadius: [
      'rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'
    ],
    display: [
      'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden'
    ]
  };

  // 移除相关的 Tailwind CSS 类
  const removeTailwindClasses = (property: string) => {
    if (!selectedElement) return;
    
    const classesToRemove = tailwindClassMappings[property as keyof typeof tailwindClassMappings] || [];
    const currentClasses = selectedElement.className.split(' ');
    
    // 过滤掉相关的 Tailwind 类
    const filteredClasses = currentClasses.filter(cls => !classesToRemove.includes(cls));
    
    // 更新元素的 class 属性
    selectedElement.className = filteredClasses.join(' ').trim();
    
    console.log(`移除了 ${property} 相关的 Tailwind 类:`, classesToRemove.filter(cls => currentClasses.includes(cls)));
  };

  // 将 camelCase 转换为 kebab-case
  const camelToKebab = (str: string): string => {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  };

  // 用于滑块的预览处理（拖动时的临时预览）
  const handleSliderPreview = (property: string, value: string) => {
    // 更新本地状态
    setCurrentStyles(prev => ({ ...prev, [property]: value }));
    
    // 使用优化的DOM更新进行实时预览（不更新代码）
    updateElementStyle(property, value);
  }

  // 用于滑块的确认处理（拖动结束时）
  const handleSliderCommit = (property: string, value: string) => {
    console.log('滑块确认变更:', property, value);
    
    // 在应用新样式前，先移除相关的 Tailwind CSS 类
    removeTailwindClasses(property);
    
    // 更新本地状态
    setCurrentStyles(prev => ({ ...prev, [property]: value }));
    
    // 转换为正确的CSS属性名格式（kebab-case）
    const cssProperty = camelToKebab(property);
    
    // 调用父组件的样式变更（这会更新代码）
    onStyleChange(cssProperty, value);
  }

  // 处理文本内容变更
  const handleTextContentChange = (property: string, value: string) => {
    if (!selectedElement) return;
    
    console.log('更新文本内容:', property, value);
    
    if (property === 'textContent') {
      // 更新纯文本内容
      selectedElement.textContent = value;
    } else if (property === 'innerHTML') {
      // 更新HTML内容
      selectedElement.innerHTML = value;
    }
    
    // 通过onStyleChange更新代码中的内容
    onStyleChange(property, value);
  };

  const renderProperty = (prop: StyleProperty) => {
    const { property, value, label, type, options, min, max, step, unit } = prop

    switch (type) {
      case 'text':
        return (
          <div key={property} className="space-y-2">
            <Label htmlFor={property} className="text-xs text-gray-300">{label}</Label>
            <Input
              id={property}
              value={value}
              onChange={(e) => handleStyleChange(property, e.target.value)}
              className="h-8 text-xs bg-gray-800 border-gray-700"
            />
          </div>
        )

      case 'select':
        return (
          <div key={property} className="space-y-2">
            <Label htmlFor={property} className="text-xs text-gray-300">{label}</Label>
            <Select value={value} onValueChange={(val) => handleStyleChange(property, val)}>
              <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'color':
        // 处理颜色值，确保颜色选择器能正确显示
        // 对于透明颜色，显示白色作为默认值，但实际值保持transparent
        const colorValue = value === 'transparent' ? '#ffffff' : (value.startsWith('#') ? value : '#000000');
        const displayValue = value === 'transparent' ? 'transparent' : value;
        
        return (
          <div key={property} className="space-y-2">
            <Label htmlFor={property} className="text-xs text-gray-300">{label}</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colorValue}
                onChange={(e) => handleColorPreview(property, e.target.value)}
                onBlur={(e) => {
                  console.log('颜色选择器失去焦点');
                  const finalColor = lastColorValueRef.current[property] || (e.target as HTMLInputElement).value;
                  console.log('使用的最终颜色:', finalColor);
                  // 只有当颜色真正改变时才触发更新
                  if (normalizeColor(finalColor) !== normalizeColor(value)) {
                    handleColorConfirm(property, finalColor);
                  }
                }}
                onMouseUp={(e) => {
                  console.log('颜色选择器鼠标松开');
                  const finalColor = lastColorValueRef.current[property] || (e.target as HTMLInputElement).value;
                  console.log('使用的最终颜色:', finalColor);
                  // 只有当颜色真正改变时才触发更新
                  if (normalizeColor(finalColor) !== normalizeColor(value)) {
                    handleColorConfirm(property, finalColor);
                  }
                }}
                className="w-8 h-8 rounded border border-gray-700 bg-gray-800"
                title="选择颜色后松开鼠标或点击其他地方确认"
              />
              <Input
                value={displayValue}
                onChange={(e) => handleColorConfirm(property, e.target.value)}
                className="h-8 text-xs bg-gray-800 border-gray-700 flex-1"
                placeholder="如: #ff0000 或 transparent"
              />
            </div>
          </div>
        )

      case 'slider':
        // 从CSS值中提取数值（去除单位）
        const extractNumber = (cssValue: string): number => {
          if (!cssValue) return min || 0;
          const match = cssValue.match(/^([\d.]+)/);
          return match ? parseFloat(match[1]) : (min || 0);
        };
        
        const numericValue = extractNumber(value);
        return (
          <div key={property} className="space-y-2">
            <Label htmlFor={property} className="text-xs text-gray-300">
              {label}: {numericValue}{unit}
            </Label>
            <Slider
              value={[numericValue]}
              onValueChange={(values) => {
                const newValue = `${values[0]}${unit}`;
                handleSliderPreview(property, newValue);
              }}
              onValueCommit={(values) => {
                const newValue = `${values[0]}${unit}`;
                console.log(`滑块确认 ${property}:`, newValue);
                handleSliderCommit(property, newValue);
              }}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
          </div>
        )

      case 'image':
        return (
          <div key={property} className="space-y-3">
            <Label htmlFor={property} className="text-xs text-gray-300">{label}</Label>
            
            {/* 当前图片预览 */}
            {value && (
              <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                <img 
                  src={value} 
                  alt="Current" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling!.textContent = '图片加载失败';
                  }}
                />
              </div>
            )}
            
            {/* 模式切换按钮 */}
            <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
              <Button
                variant={imageUploadMode === 'url' ? 'default' : 'ghost'}
                size="sm"
                className={`flex-1 h-7 text-xs transition-all ${
                  imageUploadMode === 'url' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setImageUploadMode('url')}
              >
                <Link className="w-3 h-3 mr-1" />
                URL
              </Button>
              <Button
                variant={imageUploadMode === 'upload' ? 'default' : 'ghost'}
                size="sm"
                className={`flex-1 h-7 text-xs transition-all ${
                  imageUploadMode === 'upload' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => setImageUploadMode('upload')}
              >
                <Upload className="w-3 h-3 mr-1" />
                Local
              </Button>
            </div>
            
            {/* URL输入模式 */}
            {imageUploadMode === 'url' && (
              <div className="space-y-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="h-8 text-xs bg-gray-800 border-gray-700"
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    if (imageUrl.trim()) {
                      handleImageSrcChange(imageUrl.trim());
                    }
                  }}
                  disabled={!imageUrl.trim()}
                >
                  Apply URL
                </Button>
              </div>
            )}
            
            {/* 文件上传模式 */}
            {imageUploadMode === 'upload' && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-1" />
                      Select file
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div key={property} className="space-y-2">
            <Label htmlFor={property} className="text-xs text-gray-300">{label}</Label>
            <textarea
              value={value}
              onChange={(e) => handleTextContentChange(property, e.target.value)}
              className="w-full h-24 text-xs bg-gray-800 border border-gray-700 rounded p-2 text-white resize-none"
              placeholder={property === 'textContent' ? 'Enter text content...' : 'Enter HTML content...'}
            />
          </div>
        )

      default:
        return null
    }
  }

  if (!selectedElement) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="text-center">
          <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Please select an element in the preview to start editing</p>
          <p className="text-xs mt-1">Click the refresh button to refresh the preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">visual editor
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Selected element: {selectedElement.tagName.toLowerCase()}
              {selectedElement.className && ` .${selectedElement.className.split(' ')[0]}`}
            </p>
          </div>
          {onRefreshPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-gray-400 hover:text-gray-300"
              onClick={onRefreshPreview}
              title="Refresh preview"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              <span className="text-xs">Refresh</span>
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${
              isImageElement && hasTextContent ? 'grid-cols-6' : 
              isImageElement || hasTextContent ? 'grid-cols-5' : 
              'grid-cols-4'
            } bg-gray-800`}>
              {/* 图片选项卡 - 仅在选择图片元素时显示，位置在最左边 */}
              {isImageElement && (
                <TabsTrigger value="image" className="text-xs">
                  <Image className="w-3 h-3 mr-1" />
                  Image
                </TabsTrigger>
              )}
              {/* 文本选项卡 - 仅在元素适合文本编辑时显示 */}
              {hasTextContent && (
                <TabsTrigger value="text" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Text
                </TabsTrigger>
              )}
              <TabsTrigger value="typography" className="text-xs">
                <Type className="w-3 h-3 mr-1" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="colors" className="text-xs">
                <Palette className="w-3 h-3 mr-1" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="layout" className="text-xs">
                <Layout className="w-3 h-3 mr-1" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="spacing" className="text-xs">
                <Move className="w-3 h-3 mr-1" />
                Spacing
              </TabsTrigger>
            </TabsList>
            
            {/* 图片选项卡内容 - 仅在选择图片元素时显示 */}
            {isImageElement && (
              <TabsContent value="image" className="mt-4 space-y-4">
                {imageProperties.map(renderProperty)}
              </TabsContent>
            )}
            
            {/* 文本选项卡内容 - 仅在元素适合文本编辑时显示 */}
            {hasTextContent && (
              <TabsContent value="text" className="mt-4 space-y-4">
                {textProperties.map(renderProperty)}
              </TabsContent>
            )}
            
            <TabsContent value="typography" className="mt-4 space-y-4">
              {fontProperties.map(renderProperty)}
            </TabsContent>
            
            <TabsContent value="colors" className="mt-4 space-y-4">
              {colorProperties.map(renderProperty)}
            </TabsContent>
            
            <TabsContent value="layout" className="mt-4 space-y-4">
              {layoutProperties.map(renderProperty)}
            </TabsContent>
            
            <TabsContent value="spacing" className="mt-4 space-y-4">
              {spacingProperties.map(renderProperty)}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
} 