"use client"

import { useState, useEffect, useRef } from "react"
// Import only the icons that are actually used
import { Loader2, Brain, ChevronDown, Code } from "lucide-react"

interface ThinkingIndicatorProps {
  thinkingOutput: string
  isThinking: boolean
  mode?: "thinking" | "coding"  // 新增模式参数
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export function ThinkingIndicator({
  thinkingOutput,
  isThinking,
  mode = "thinking",  // 默认为thinking模式
  position = "top-left"
}: ThinkingIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  // Automatically scroll to the end of the thinking output
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      dropdownRef.current.scrollTop = dropdownRef.current.scrollHeight
    }
  }, [isOpen, thinkingOutput])

  if (!thinkingOutput && !isThinking) return null

  // Format the thinking output for better readability
  const formattedThinking = thinkingOutput
    .split('\n')
    .map((line, index) => <div key={index} className="py-0.5">{line}</div>)

  // Determine dropdown position based on the position prop
  let dropdownPosition = "left-0 top-full"
  if (position === "top-right") dropdownPosition = "right-0 top-full"
  if (position === "bottom-left") dropdownPosition = "left-0 bottom-full"
  if (position === "bottom-right") dropdownPosition = "right-0 bottom-full"

  // Animation for the dots
  const [dots, setDots] = useState("")

  // Animated dots for "Thinking..." or "Coding..."
  useEffect(() => {
    if (!isThinking) return

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "") return "."
        if (prev === ".") return ".."
        if (prev === "..") return "..."
        return ""
      })
    }, 500) // Change every 500ms

    return () => clearInterval(interval)
  }, [isThinking])

  // Status for finished state
  const [hasFinished, setHasFinished] = useState(false)

  useEffect(() => {
    if (isThinking) {
      setHasFinished(false)
    } else if (thinkingOutput && !hasFinished) {
      // When the process is complete, set hasFinished to true
      setHasFinished(true)
    }
  }, [isThinking, thinkingOutput, hasFinished])

  // 根据模式确定显示文本和图标
  const getDisplayText = () => {
    if (isThinking) {
      return mode === "coding" ? `Coding${dots}` : `Thinking${dots}`
    }
    if (hasFinished) {
      return mode === "coding" ? "Code generated" : "Finished thinking"
    }
    return mode === "coding" ? "Coding" : "Thinking"
  }

  const getIcon = () => {
    if (isThinking) {
      return <Loader2 className="w-3 h-3 animate-spin" />
    }
    if (mode === "coding") {
      return <Code className="w-3 h-3 text-green-400" />
    }
    return <Brain className="w-3 h-3 text-green-400" />
  }

  const getProcessTitle = () => {
    return mode === "coding" ? "CODING PROCESS:" : "THINKING PROCESS:"
  }

  return (
    <div className="relative" ref={indicatorRef}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${isOpen ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-3 h-3 flex items-center justify-center">
          {getIcon()}
        </div>
        <span className="min-w-[90px] transition-all duration-300">
          {hasFinished ? (
            <span className="text-green-400 transition-all duration-300">{getDisplayText()}</span>
          ) : (
            getDisplayText()
          )}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute ${dropdownPosition} mt-1 p-3 bg-gray-900 border border-gray-800 rounded-md z-50 max-h-[300px] w-[400px] overflow-y-auto`}
        >
          <h4 className="text-xs font-medium text-gray-400 mb-2">{getProcessTitle()}</h4>
          <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
            {formattedThinking.length > 0 ? (
              formattedThinking
            ) : (
              <div className="text-gray-500 italic">
                {mode === "coding" ? "Waiting for coding output..." : "Waiting for thinking output..."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
