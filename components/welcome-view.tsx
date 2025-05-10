"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
// Import only the icons that are actually used
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ProviderSelector } from "@/components/provider-selector"

interface Model {
  id: string
  name: string
}

interface WelcomeViewProps {
  prompt: string
  setPrompt: (value: string) => void
  selectedModel: string
  setSelectedModel: (value: string) => void
  selectedProvider: string
  setSelectedProvider: (value: string) => void
  selectedSystemPrompt: string
  setSelectedSystemPrompt: (value: string) => void
  customSystemPrompt: string
  setCustomSystemPrompt: (value: string) => void
  onGenerate: () => void
}

export function WelcomeView({
  prompt,
  setPrompt,
  selectedModel,
  setSelectedModel,
  selectedProvider,
  setSelectedProvider,
  selectedSystemPrompt,
  setSelectedSystemPrompt,
  customSystemPrompt,
  setCustomSystemPrompt,
  onGenerate
}: WelcomeViewProps) {
  const [titleClass, setTitleClass] = useState("pre-animation")
  const [models, setModels] = useState<Model[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  useEffect(() => {
    // Add typing animation class after component mounts
    const timer = setTimeout(() => {
      setTitleClass("typing-animation")
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Load available models when the component mounts or when the provider changes
    const fetchModels = async () => {
      if (!selectedProvider) return;

      setIsLoadingModels(true)
      setSelectedModel("") // Reset the selected model when the provider changes
      setModels([]) // Clear previous models when changing provider

      try {
        const response = await fetch(`/api/get-models?provider=${selectedProvider}`)

        // Parse the JSON response first to get any error message
        const data = await response.json()

        if (!response.ok) {
          // If the response contains an error message, use it
          if (data && data.error) {
            throw new Error(data.error)
          } else {
            throw new Error('Error fetching models')
          }
        }

        setModels(data)

        // Automatically select the first model if available
        if (data.length > 0) {
          setSelectedModel(data[0].id)
        }
      } catch (error) {
        console.error('Error fetching models:', error)

        // Ensure models are cleared when there's an error
        setModels([])
        setSelectedModel("")

        // Display specific error messages based on the provider and error message
        if (error instanceof Error) {
          const errorMessage = error.message

          if (errorMessage.includes('Ollama')) {
            toast.error('Cannot connect to Ollama. Is the server running?')
          } else if (errorMessage.includes('LM Studio')) {
            toast.error('Cannot connect to LM Studio. Is the server running?')
          } else if (selectedProvider === 'deepseek' || selectedProvider === 'openai_compatible') {
            toast.error('Make sure the Base URL and API Keys are correct in your .env.local file.')
          } else {
            toast.error('Models could not be loaded. Please try again later.')
          }
        } else {
          toast.error('Models could not be loaded. Please try again later.')
        }
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchModels()
  }, [selectedProvider, setSelectedModel])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-0 animate-pulse-slow"></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center">
        <h1
          className={`text-4xl md:text-6xl font-bold tracking-wider text-white mb-12 ${titleClass}`}
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          WHAT ARE WE BUILDING?
        </h1>

        <div className="relative w-full mb-6">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the website you want to create..."
            className="min-h-[150px] w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white placeholder:text-gray-500 pr-[120px] transition-all duration-300"
          />
          <Button
            onClick={onGenerate}
            disabled={!prompt.trim() || !selectedModel}
            className="absolute bottom-4 right-4 bg-gray-900/90 hover:bg-gray-800 text-white font-medium tracking-wider py-3 px-12 text-base rounded-md transition-all duration-300 border border-gray-800 hover:border-gray-700 focus:border-white focus:ring-white"
          >
            GENERATE
          </Button>
        </div>

        <ProviderSelector
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          onProviderChange={() => {}}
        />

        <div className="w-full mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">SELECT MODEL</label>
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedProvider || isLoadingModels}>
            <SelectTrigger className="w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white">
              <SelectValue placeholder={selectedProvider ? "Choose a model..." : "Select a provider first"} />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Loading models...</span>
                </div>
              ) : models.length > 0 ? (
                // Use index + ID as key to avoid duplicates
                models.map((model, index) => (
                  <SelectItem key={`${index}-${model.id}`} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-400">
                  {selectedProvider ? "No models available" : "Select a provider first"}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">SYSTEM PROMPTS</label>
          <Select value={selectedSystemPrompt} onValueChange={setSelectedSystemPrompt}>
            <SelectTrigger className="w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white">
              <SelectValue placeholder="Choose a system prompt..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              <SelectItem value="default">
                <div className="flex flex-col">
                  <span>Default</span>
                  <span className="text-xs text-gray-400">Standard code generation</span>
                </div>
              </SelectItem>
              <SelectItem value="thinking">
                <div className="flex flex-col">
                  <span>Thinking</span>
                  <span className="text-xs text-gray-400">Makes non thinking models think</span>
                </div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex flex-col">
                  <span>Custom System Prompt</span>
                  <span className="text-xs text-gray-400">Specify a custom System Prompt</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedSystemPrompt === 'custom' && (
          <div className="w-full mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">CUSTOM SYSTEM PROMPT</label>
            <Textarea
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="Enter a custom system prompt to override the default..."
              className="min-h-[100px] w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white placeholder:text-gray-500 transition-all duration-300"
            />
            <p className="mt-1 text-xs text-gray-400">
              Your custom prompt will be used for this generation and subsequent regenerations.
            </p>
          </div>
        )}


      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.6;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }

        .pre-animation {
          overflow: hidden;
          white-space: nowrap;
          width: 0;
          border-right: 4px solid transparent;
        }

        .typing-animation {
          overflow: hidden;
          white-space: nowrap;
          border-right: 4px solid #fff;
          animation:
            typing 1.75s steps(40, end),
            blink-caret 0.75s step-end infinite;
        }

        @keyframes blink-caret {
          from, to { border-color: transparent }
          50% { border-color: #fff }
        }
      `}</style>
    </div>
  )
}
