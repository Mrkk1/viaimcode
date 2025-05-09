"use client"

import { useState, useEffect } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { WelcomeView } from "@/components/welcome-view"
import { GenerationView } from "@/components/generation-view"
import { toast, Toaster } from "sonner"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerationView, setShowGenerationView] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel || !selectedProvider) {
      toast.error("Please enter a prompt and select a provider and model.")
      return
    }

    setIsGenerating(true)
    setGeneratedCode("")
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

      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Convert the chunk to text and add it to the received text
        const chunk = new TextDecoder().decode(value)
        receivedText += chunk

        // Remove markdown formatting if present
        let cleanedCode = receivedText

        // Remove ```html at the beginning (if present)
        cleanedCode = cleanedCode.replace(/^```html\n/, '')

        // Remove ``` at the end (if present)
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
          model={selectedModel}
          provider={selectedProvider}
          generatedCode={generatedCode}
          isGenerating={isGenerating}
          generationComplete={generationComplete}
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
        onGenerate={handleGenerate}
      />
    </>
  )
}
