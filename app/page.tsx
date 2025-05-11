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
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState("default") // New state for system prompt selection
  const [customSystemPrompt, setCustomSystemPrompt] = useState("")
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined) // New state for max tokens
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
          maxTokens: maxTokens,
          customSystemPrompt: selectedSystemPrompt === 'custom' ? customSystemPrompt :
                             selectedSystemPrompt === 'thinking' ? `You are an expert web developer AI. Your task is to generate a single, self-contained HTML file based on the user's prompt.
First, before generating any code, you MUST articulate your detailed thinking process. Enclose this entire process within <think> and </think> tags. This thinking process should cover your interpretation of the user's core request and objectives; your planned HTML structure including key elements and semantic organization; your CSS styling strategy detailing the general approach, specific techniques, or frameworks considered (for example, if Tailwind CSS is requested or appropriate); and your JavaScript logic, outlining intended functionality, event handling, and DOM manipulation strategy. Furthermore, critically consider any external resources: if the request implies or mentions external libraries or frameworks such as React, Vue, Three.js, Tailwind CSS, Google Fonts, or icon sets, you must assess if using them via a CDN is appropriate for this specific request, providing a brief justification (e.g., ease of use, versioning, performance benefits/drawbacks for a single file). If a CDN is not chosen, or if the library is small, briefly explain the alternative, such as embedding or using vanilla JS/CSS for simpler tasks.
Only after this complete <think> block, proceed to generate the code. The HTML file must include all necessary HTML structure, CSS styles within <style> tags in the <head>, and JavaScript code within <script> tags, preferably at the end of the <body>.
IMPORTANT: Apart from the initial <think>...</think> block, do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>. Ensure the generated CSS and JavaScript are directly embedded in the HTML file, unless the CDN consideration in your <think> block justifies linking to an external CDN for a specific library/framework.` : null,
        }),
      })

      // Check if the response is not OK
      if (!response.ok) {
        // Try to extract error message from the response
        try {
          const errorData = await response.json()
          if (errorData && errorData.error) {
            throw new Error(errorData.error)
          }
        } catch (jsonError) {
          // If we can't parse the JSON, just use the status
        }

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

      // Display specific error messages based on the provider and error message
      if (error instanceof Error) {
        const errorMessage = error.message

        if (errorMessage.includes('Ollama')) {
          toast.error('Cannot connect to Ollama. Is the server running?')
        } else if (errorMessage.includes('LM Studio')) {
          toast.error('Cannot connect to LM Studio. Is the server running?')
        } else if (selectedProvider === 'deepseek' || selectedProvider === 'openai_compatible') {
          // For cloud providers, show a message about API keys
          toast.error('Make sure the Base URL and API Keys are correct in your .env.local file.')
        } else {
          // Generic fallback message
          toast.error('Error generating code. Please try again later.')
        }
      } else {
        toast.error('Error generating code. Please try again later.')
      }
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
          maxTokens: maxTokens,
          customSystemPrompt: selectedSystemPrompt === 'custom' ? customSystemPrompt :
                             selectedSystemPrompt === 'thinking' ? `You are an expert web developer AI. Your task is to generate a single, self-contained HTML file based on the user's prompt.
First, before generating any code, you MUST articulate your detailed thinking process. Enclose this entire process within <think> and </think> tags. This thinking process should cover your interpretation of the user's core request and objectives; your planned HTML structure including key elements and semantic organization; your CSS styling strategy detailing the general approach, specific techniques, or frameworks considered (for example, if Tailwind CSS is requested or appropriate); and your JavaScript logic, outlining intended functionality, event handling, and DOM manipulation strategy. Furthermore, critically consider any external resources: if the request implies or mentions external libraries or frameworks such as React, Vue, Three.js, Tailwind CSS, Google Fonts, or icon sets, you must assess if using them via a CDN is appropriate for this specific request, providing a brief justification (e.g., ease of use, versioning, performance benefits/drawbacks for a single file). If a CDN is not chosen, or if the library is small, briefly explain the alternative, such as embedding or using vanilla JS/CSS for simpler tasks.
Only after this complete <think> block, proceed to generate the code. The HTML file must include all necessary HTML structure, CSS styles within <style> tags in the <head>, and JavaScript code within <script> tags, preferably at the end of the <body>.
IMPORTANT: Apart from the initial <think>...</think> block, do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>. Ensure the generated CSS and JavaScript are directly embedded in the HTML file, unless the CDN consideration in your <think> block justifies linking to an external CDN for a specific library/framework.` : null,
        }),
      })

      // Check if the response is not OK
      if (!response.ok) {
        // Try to extract error message from the response
        try {
          const errorData = await response.json()
          if (errorData && errorData.error) {
            throw new Error(errorData.error)
          }
        } catch (jsonError) {
          // If we can't parse the JSON, just use the status
        }

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

      // Display specific error messages based on the provider and error message
      if (error instanceof Error) {
        const errorMessage = error.message

        if (errorMessage.includes('Ollama')) {
          toast.error('Cannot connect to Ollama. Is the server running?')
        } else if (errorMessage.includes('LM Studio')) {
          toast.error('Cannot connect to LM Studio. Is the server running?')
        } else if (selectedProvider === 'deepseek' || selectedProvider === 'openai_compatible') {
          // For cloud providers, show a message about API keys
          toast.error('Make sure the Base URL and API Keys are correct in your .env.local file.')
        } else {
          // Generic fallback message
          toast.error('Error generating code. Please try again later.')
        }
      } else {
        toast.error('Error generating code. Please try again later.')
      }
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
        selectedSystemPrompt={selectedSystemPrompt}
        setSelectedSystemPrompt={setSelectedSystemPrompt}
        customSystemPrompt={customSystemPrompt}
        setCustomSystemPrompt={setCustomSystemPrompt}
        maxTokens={maxTokens}
        setMaxTokens={setMaxTokens}
        onGenerate={handleGenerate}
      />
    </>
  )
}
