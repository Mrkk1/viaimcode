"use client"

import { useState, useEffect, useRef } from "react"
// Import only the icons that are actually used
import { Loader2, Brain, ChevronDown } from "lucide-react"

interface ThinkingIndicatorProps {
  thinkingOutput: string
  isThinking: boolean
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export function ThinkingIndicator({
  thinkingOutput,
  isThinking,
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

  // Animated dots for "Thinking..."
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

  // Status for "Finished thinking"
  const [hasFinished, setHasFinished] = useState(false)

  useEffect(() => {
    if (isThinking) {
      setHasFinished(false)
    } else if (thinkingOutput && !hasFinished) {
      // When the thinking process is complete, set hasFinished to true
      setHasFinished(true)
    }
  }, [isThinking, thinkingOutput, hasFinished])

  return (
    <div className="relative" ref={indicatorRef}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${isOpen ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isThinking ? (
          <div className="w-3 h-3 flex items-center justify-center">
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        ) : (
          <Brain className="w-3 h-3 text-green-400" />
        )}
        <span className="min-w-[90px] transition-all duration-300">
          {isThinking ? `Thinking${dots}` :
           hasFinished ? (
             <span className="text-green-400 transition-all duration-300">Finished thinking</span>
           ) : "Thinking"}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute ${dropdownPosition} mt-1 p-3 bg-gray-900 border border-gray-800 rounded-md z-50 max-h-[300px] w-[400px] overflow-y-auto`}
        >
          <h4 className="text-xs font-medium text-gray-400 mb-2">THINKING PROCESS:</h4>
          <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
            {formattedThinking.length > 0 ? (
              formattedThinking
            ) : (
              <div className="text-gray-500 italic">Waiting for thinking output...</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
