"use client"

import { useState, useEffect, memo } from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Undo2, Clock, Loader2, Trash2 } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Image from "next/image"

export interface HistoryVersion {
  id: string
  timestamp: Date
  thumbnail: string
  code: string
  title?: string
  isPublished?: boolean
  shareUrl?: string
  type?: 'ai' | 'manual'
}

interface EditHistoryProps {
  versions: HistoryVersion[]
  onSelectVersion: (version: HistoryVersion) => void
  onDeleteVersion?: (versionId: string) => void
  currentVersionId?: string
  isVisible: boolean
}

// 提取缩略图组件，处理加载状态和错误情况
const ThumbnailImage = memo(({ 
  src, 
  alt, 
  isActive 
}: { 
  src: string; 
  alt: string; 
  isActive: boolean 
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <div className={`relative w-full aspect-video h-[120px] rounded-md overflow-hidden border-2 transition-all duration-200 ${
      isActive ? 'border-blue-500 shadow-md shadow-blue-900/30' : 'border-gray-800'
    }`}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
          <div className="text-sm text-gray-500">Load failed</div>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          sizes="240px"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
        />
      )}
    </div>
  )
})

ThumbnailImage.displayName = 'ThumbnailImage'

export const EditHistory = memo(function EditHistory({ 
  versions, 
  onSelectVersion,
  onDeleteVersion,
  currentVersionId,
  isVisible 
}: EditHistoryProps) {
  // 自动滚动到最新版本
  useEffect(() => {
    if (isVisible && versions.length > 0) {
      const currentEl = document.getElementById(`history-item-${currentVersionId}`)
      if (currentEl) {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [isVisible, versions, currentVersionId])

  if (!isVisible) return null

  return (
    <div className="border-t border-gray-800 bg-gray-900/40 pt-3 pb-2">
      <div className="flex items-center justify-between px-3 mb-2">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2 text-gray-500" />
          <span className="text-xs font-medium text-gray-400">Edit History</span>
        </div>
        
        {versions.length > 0 && (
          <div className="text-xs text-gray-500">
            {versions.length} Versions
          </div>
        )}
      </div>
      
      <ScrollArea className=" px-3">
        <div className="flex flex-nowrap gap-4 pr-4 pb-2 min-w-full overflow-x-auto">
          {versions.length === 0 ? (
            <div className="w-full py-6 text-center text-sm text-gray-500">
              No history versions
            </div>
          ) : (
            versions.map((version) => (
              <TooltipProvider key={version.id} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative group flex-shrink-0 w-[240px]">
                      <Button
                        id={`history-item-${version.id}`}
                        variant="ghost"
                        className={`p-0 h-auto w-full rounded-md overflow-hidden hover:bg-transparent ${
                          version.id === currentVersionId ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        onClick={() => {
                          if (version.id !== currentVersionId) {
                            onSelectVersion(version)
                          }
                        }}
                        disabled={version.id === currentVersionId}
                      >
                        <div className="w-full flex flex-col gap-1">
                          <ThumbnailImage
                            src={version.thumbnail}
                            alt={version.title || `Version ${version.id}`}
                            isActive={version.id === currentVersionId}
                          />
                          <div className="w-full flex items-center justify-between px-1 pt-1">
                            <div className="flex items-center gap-1">
                              {/* 显示版本类型标签 */}
                              {version.type && (
                                <span className={`text-[10px] px-1 py-0.5 rounded ${
                                  version.type === 'ai' 
                                    ? 'bg-purple-900/30 text-purple-400' 
                                    : 'bg-green-900/30 text-green-400'
                                }`}>
                                  {version.type === 'ai' ? 'AI Generated' : 'Manual'}
                                </span>
                              )}
                              
                              <span className="text-xs text-gray-500 ml-1">
                                {formatDistanceToNow(new Date(version.timestamp), { 
                                  addSuffix: true, 
                                  locale: zhCN 
                                }).replace(/about /, '')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {version.isPublished ? (
                                <span className="bg-blue-900/30 text-blue-400 text-[10px] px-1 py-0.5 rounded">Published</span>
                              ) : (
                                <span className="bg-gray-900/30 text-gray-400 text-[10px] px-1 py-0.5 rounded">Unpublished</span>
                              )}
                            
                              
                              {version.id !== currentVersionId && (
                                <Undo2 className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                      
                      {/* 删除按钮 */}
                      {onDeleteVersion && (
                        <button 
                          className="absolute top-2 right-2 bg-black/60 text-red-400 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this version?')) {
                              onDeleteVersion(version.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-800 border-gray-700">
                    <p className="text-xs">
                      {version.title || `Version ${version.id.substring(0, 8)}`}
                      <br />
                      <span className="text-gray-400">
                        {formatDistanceToNow(new Date(version.timestamp), { 
                          addSuffix: true, 
                          locale: zhCN 
                        })}
                      </span>
                      {version.type && (
                        <span className={`ml-1 ${version.type === 'ai' ? 'text-purple-400' : 'text-green-400'}`}>
                          • {version.type === 'ai' ? 'AI Generated' : 'Manual'}
                        </span>
                      )}
                      {version.isPublished && (
                        <span className="ml-1 text-blue-400">• Published</span>
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}) 