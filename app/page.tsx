"use client"

import { useState, useEffect } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { WelcomeView } from "@/components/welcome-view"
import { GenerationView } from "@/components/generation-view"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { toast, Toaster } from "sonner"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerationView, setShowGenerationView] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [customSystemPrompt, setCustomSystemPrompt] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [thinkingOutput, setThinkingOutput] = useState("") // For thinking model support
  const [isThinking, setIsThinking] = useState(false) // Separate state for thinking status

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1250)

    return () => clearTimeout(timer)
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel || !selectedProvider) {
      toast.error("Please enter a prompt and select a provider and model.")
      return
    }

    setIsGenerating(true)
    setGeneratedCode("")
    setThinkingOutput("")
    setIsThinking(false)
    setGenerationComplete(false)
    setShowGenerationView(true)

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          provider: selectedProvider,
          customSystemPrompt: customSystemPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Process the stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Stream could not be read')
      }

      let receivedText = ""
      let thinkingText = ""
      let isInThinkingBlock = false

      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Convert the chunk to text and add it to the received text
        const chunk = new TextDecoder().decode(value)
        receivedText += chunk

        // Process thinking tokens
        let cleanedCode = receivedText

        // Check for thinking blocks
        const thinkingStartIndex = cleanedCode.indexOf("<think>")
        const thinkingEndIndex = cleanedCode.indexOf("</think>")

        if (thinkingStartIndex !== -1) {
          // Set thinking state to true when we first see <think>
          if (!isInThinkingBlock) {
            setIsThinking(true)
          }

          isInThinkingBlock = true

          // Extract thinking content
          if (thinkingEndIndex !== -1) {
            // Complete thinking block
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7, thinkingEndIndex)

            // Remove thinking block from code
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex) +
                          cleanedCode.substring(thinkingEndIndex + 8)

            isInThinkingBlock = false

            // Set thinking state to false when we see </think>
            setIsThinking(false)
          } else {
            // Partial thinking block
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7)

            // Remove partial thinking block from code
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex)
          }

          setThinkingOutput(thinkingText)
        } else if (isInThinkingBlock && thinkingEndIndex !== -1) {
          // End of thinking block found
          thinkingText = cleanedCode.substring(0, thinkingEndIndex)

          // Remove thinking block from code
          cleanedCode = cleanedCode.substring(thinkingEndIndex + 8)

          isInThinkingBlock = false

          // Set thinking state to false when we see </think>
          setIsThinking(false)

          setThinkingOutput(thinkingText)
        }

        // Remove markdown formatting if present
        cleanedCode = cleanedCode.replace(/^```html\n/, '')
        cleanedCode = cleanedCode.replace(/```$/, '')

        setGeneratedCode(cleanedCode)
      }

      setGenerationComplete(true)
    } catch (error) {
      console.error('Error generating code:', error)
      toast.error('Error generating code. Please try again later.')
    } finally {
      setIsGenerating(false)
    }
  }

  // New function for regenerating with a new prompt
  const handleRegenerateWithNewPrompt = async (newPrompt: string) => {
    if (!newPrompt.trim() || !selectedModel || !selectedProvider) {
      toast.error("Please enter a prompt and select a provider and model.")
      return
    }

    // Update the prompt state
    setPrompt(newPrompt)
    setIsGenerating(true)
    setGeneratedCode("")
    setThinkingOutput("")
    setIsThinking(false)
    setGenerationComplete(false)

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: newPrompt,
          model: selectedModel,
          provider: selectedProvider,
          customSystemPrompt: customSystemPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Process the stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Stream could not be read')
      }

      let receivedText = ""
      let thinkingText = ""
      let isInThinkingBlock = false

      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Convert the chunk to text and add it to the received text
        const chunk = new TextDecoder().decode(value)
        receivedText += chunk

        // Process thinking tokens
        let cleanedCode = receivedText

        // Check for thinking blocks
        const thinkingStartIndex = cleanedCode.indexOf("<think>")
        const thinkingEndIndex = cleanedCode.indexOf("</think>")

        if (thinkingStartIndex !== -1) {
          // Set thinking state to true when we first see <think>
          if (!isInThinkingBlock) {
            setIsThinking(true)
          }

          isInThinkingBlock = true

          // Extract thinking content
          if (thinkingEndIndex !== -1) {
            // Complete thinking block
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7, thinkingEndIndex)

            // Remove thinking block from code
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex) +
                          cleanedCode.substring(thinkingEndIndex + 8)

            isInThinkingBlock = false

            // Set thinking state to false when we see </think>
            setIsThinking(false)
          } else {
            // Partial thinking block
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7)

            // Remove partial thinking block from code
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex)
          }

          setThinkingOutput(thinkingText)
        } else if (isInThinkingBlock && thinkingEndIndex !== -1) {
          // End of thinking block found
          thinkingText = cleanedCode.substring(0, thinkingEndIndex)

          // Remove thinking block from code
          cleanedCode = cleanedCode.substring(thinkingEndIndex + 8)

          isInThinkingBlock = false

          // Set thinking state to false when we see </think>
          setIsThinking(false)

          setThinkingOutput(thinkingText)
        }

        // Remove markdown formatting if present
        cleanedCode = cleanedCode.replace(/^```html\n/, '')
        cleanedCode = cleanedCode.replace(/```$/, '')

        setGeneratedCode(cleanedCode)
      }

      setGenerationComplete(true)
    } catch (error) {
      console.error('Error generating code:', error)
      toast.error('Error generating code. Please try again later.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (showGenerationView) {
    return (
      <>
        <Toaster position="top-right" />

        <GenerationView
          prompt={prompt}
          setPrompt={setPrompt}
          model={selectedModel}
          provider={selectedProvider}
          generatedCode={generatedCode}
          isGenerating={isGenerating}
          generationComplete={generationComplete}
          onRegenerateWithNewPrompt={handleRegenerateWithNewPrompt}
          thinkingOutput={thinkingOutput}
          isThinking={isThinking}
        />
      </>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <WelcomeView
        prompt={prompt}
        setPrompt={setPrompt}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        customSystemPrompt={customSystemPrompt}
        setCustomSystemPrompt={setCustomSystemPrompt}
        onGenerate={handleGenerate}
      />
    </>
  )
}
