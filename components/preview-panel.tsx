'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Laptop, Smartphone, Tablet, RefreshCw, MousePointer2, History, Loader2 } from "lucide-react"
import { CodeEditor } from "@/components/code-editor"

interface PreviewPanelProps {
  isChatMode: boolean
  previewMode: 'render' | 'code'
  setPreviewMode: React.Dispatch<React.SetStateAction<'render' | 'code'>>
  generationComplete: boolean
  isElementSelectMode: boolean
  setIsElementSelectMode: React.Dispatch<React.SetStateAction<boolean>>
  viewportSize: string
  setViewportSize: React.Dispatch<React.SetStateAction<string>>
  showHistory: boolean
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>
  versionHistoryLength: number
  refreshPreview: () => void
  originalCode: string
  editedCode: string
  isEditable: boolean
  isGenerating: boolean
  iframeRef: React.RefObject<HTMLIFrameElement>
  previewKey: number
  previewContent: string
  children?: React.ReactNode
}

export function PreviewPanel({
  isChatMode,
  previewMode,
  setPreviewMode,
  generationComplete,
  isElementSelectMode,
  setIsElementSelectMode,
  viewportSize,
  setViewportSize,
  showHistory,
  setShowHistory,
  versionHistoryLength,
  refreshPreview,
  originalCode,
  editedCode,
  isEditable,
  isGenerating,
  iframeRef,
  previewKey,
  previewContent,
  children
}: PreviewPanelProps) {
  return (
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
          <Button
            variant={showHistory ? "secondary" : "ghost"}
            size="sm"
            className="h-7 ml-2 px-2 flex items-center gap-1"
            onClick={() => setShowHistory(!showHistory)}
            title={showHistory ? "隐藏历史版本" : "显示历史版本"}
          >
            <History className="w-4 h-4" />
            <span className="text-xs">{versionHistoryLength}</span>
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
      {children}
    </div>
  )
} 