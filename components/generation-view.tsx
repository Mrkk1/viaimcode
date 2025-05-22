"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { debounce } from "lodash"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
// Import only the icons that are actually used
import { Laptop, Smartphone, Tablet, Copy, Download, RefreshCw, Loader2, Save, ArrowRight, Share2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CodeEditor } from "@/components/code-editor"
import { WorkSteps } from "@/components/work-steps"
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
}

const SaveDialog = ({ isOpen, onClose, onSave }: SaveDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    onSave(title, description);
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存网页</DialogTitle>
          <DialogDescription>
            输入网页的标题和描述以保存
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
  const [originalCode, setOriginalCode] = useState(generatedCode) // Stores the original code
  const [hasChanges, setHasChanges] = useState(false) // Tracks if changes have been made
  const [previewKey, setPreviewKey] = useState(0) // For manually refreshing the preview
  const [previewContent, setPreviewContent] = useState("") // For debounced preview content
  const [showSaveDialog, setShowSaveDialog] = useState(false) // For the save dialog
  const [newPrompt, setNewPrompt] = useState("") // Für das neue Prompt-Eingabefeld
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Previous preview content for transition effect
  const prevContentRef = useRef<string>("");

  // Function to prepare HTML content with dark mode styles
  const prepareHtmlContent = (code: string): string => {
    // Add a dark mode default style and viewport meta tag
    const headContent = `
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
        }
        /* Smooth transition for body background */
        body {
          transition: background-color 0.2s ease;
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
            ${code}
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
    }
  }, [generatedCode, debouncedUpdatePreview])

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

  // Function to save changes
  const saveChanges = () => {
    setOriginalCode(editedCode)
    setHasChanges(false)
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
    // 检查是否需要重新保存
    const currentContent = editedCode || generatedCode;
    const shouldResave = !shareUrl || prompt !== lastSavedPrompt || currentContent !== lastSavedContent;

    if (shouldResave) {
      // 如果需要重新保存，打开保存对话框
      setShowSaveDialog(true);
      return;
    }

    try {
      const url = shareUrl;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast.success('分享链接已复制');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
          toast.success('分享链接已复制');
        } catch (err) {
          console.error('复制失败:', err);
          toast.error('复制失败，请手动复制链接');
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动复制链接');
    }
  };

  // 添加状态来跟踪最后保存的内容
  const [lastSavedPrompt, setLastSavedPrompt] = useState(prompt);
  const [lastSavedContent, setLastSavedContent] = useState('');

  // 修改保存函数，更新最后保存的内容
  const handleSaveWebsite = async (title: string, description: string) => {
    try {
      const currentContent = editedCode || generatedCode;
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
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
      // 更新最后保存的内容状态
      setLastSavedPrompt(prompt);
      setLastSavedContent(currentContent);
      toast.success('保存成功！');
      
      // 自动执行分享操作
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(fullUrl);
          toast.success('分享链接已复制到剪贴板');
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = fullUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          try {
            document.execCommand('copy');
            textArea.remove();
            toast.success('分享链接已复制到剪贴板');
          } catch (err) {
            console.error('复制失败:', err);
            toast.error('复制失败，请手动复制链接');
          }
        }
      } catch (err) {
        console.error('复制失败:', err);
        toast.error('复制失败，请手动复制链接');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败，请重试');
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header - Kompakter gestaltet */}
      <header className="border-b border-gray-800 py-2 px-4">
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
              onClick={downloadCode}
            >
              <Download className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 h-8"
              disabled={!generatedCode || isGenerating}
              onClick={copyShareUrl}
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
      <div className="flex flex-1 overflow-hidden">
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
                              setShowSaveDialog(true);
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
                </div>
              </div>

              <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
                <div
                  className={`bg-gray-900 rounded-md border border-gray-800 overflow-hidden transition-all duration-300 flex items-center justify-center ${
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
                                setShowSaveDialog(true);
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
                  </div>
                </div>

                <div className="flex-1 p-3 flex items-center justify-center overflow-hidden">
                  <div
                    className={`bg-gray-900 rounded-md border border-gray-800 overflow-hidden transition-all duration-300 flex items-center justify-center ${
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
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveWebsite}
      />
    </div>
  )
}
