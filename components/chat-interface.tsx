'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Trash2, Send, X, MousePointer2 } from "lucide-react"

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isGenerating?: boolean
}

interface ChatInterfaceProps {
  chatMessages: ChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  currentChatInput: string
  setCurrentChatInput: React.Dispatch<React.SetStateAction<string>>
  onSendMessage: () => void
  isGenerating: boolean
  prompt?: string
  hasSelectedElementContext?: boolean
  selectedElementContext?: string
  onClearSelectedElement?: () => void
}

export function ChatInterface({
  chatMessages,
  setChatMessages,
  currentChatInput,
  setCurrentChatInput,
  onSendMessage,
  isGenerating,
  prompt,
  hasSelectedElementContext = false,
  selectedElementContext = "",
  onClearSelectedElement
}: ChatInterfaceProps) {
  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentChatInput(e.target.value);
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
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
                  onClick={onClearSelectedElement}
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
              onClick={onSendMessage}
              disabled={!currentChatInput.trim() || isGenerating}
            >
              <Send className={`h-3 w-3 ${currentChatInput.trim() ? 'text-white' : 'text-gray-400'}`} />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          
          {prompt && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-400">LAST CONTEXT:</h4>
              <ScrollArea className="h-12 w-full rounded-md border border-gray-800 bg-gray-900/30 p-2 mt-1">
                <p className="text-xs text-gray-400">{prompt}</p>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 