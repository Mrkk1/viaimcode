"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Import only the icons that are actually used
import { Loader2, Settings, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { ProviderSelector } from "@/components/provider-selector"
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

// 动态导入 PixelAnimation 组件
const PixelAnimation = dynamic(
  () => import('@/components/pixel-animation').then(mod => mod.default),
  { ssr: false }
);

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
  maxTokens: number | undefined
  setMaxTokens: (value: number | undefined) => void
  onGenerate: () => void
  onGeneratePPT?: () => void
  initialMode?: 'website' | 'ppt'
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
  maxTokens,
  setMaxTokens,
  onGenerate,
  onGeneratePPT,
  initialMode = 'website'
}: WelcomeViewProps) {
  const [titleClass, setTitleClass] = useState("pre-animation")
  const [models, setModels] = useState<Model[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'website' | 'ppt'>(initialMode)
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Add typing animation class after component mounts
    const timer = setTimeout(() => {
      setTitleClass("typing-animation")
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // 检查用户登录状态
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          setIsLoggedIn(true)
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.error('Error checking login status:', error)
        setIsLoggedIn(false)
      }
    }

    checkLoginStatus()
  }, [])

  useEffect(() => {
    // 如果未登录，不加载模型列表
    if (!isLoggedIn) {
      return;
    }

    // Load available models when the component mounts or when the provider changes
    const fetchModels = async () => {
      if (!selectedProvider) return;

      setIsLoadingModels(true);

      try {
        const response = await fetch(`/api/get-models?provider=${selectedProvider}`);
        const data = await response.json();

        if (!response.ok) {
          if (data && data.error) {
            throw new Error(data.error);
          } else {
            throw new Error('Error fetching models');
          }
        }

        // 批量更新状态
        const updates = () => {
          setModels(data);
          setSelectedModel(data.length > 0 ? data[0].id : "");
        };
        updates();

      } catch (error) {
        console.error('Error fetching models:', error);
        
        // 批量更新状态
        const updates = () => {
          setModels([]);
          setSelectedModel("");
        };
        updates();

        // Display specific error messages based on the provider and error message
        if (error instanceof Error) {
          const errorMessage = error.message;

          if (errorMessage.includes('Ollama')) {
            toast.error('Cannot connect to Ollama. Is the server running?');
          } else if (errorMessage.includes('LM Studio')) {
            toast.error('Cannot connect to LM Studio. Is the server running?');
          } else if (selectedProvider === 'deepseek' || selectedProvider === 'openai_compatible') {
            toast.error('Make sure the Base URL and API Keys are correct in your .env.local file.');
          } else {
            toast.error('Models could not be loaded. Please try again later.');
          }
        } else {
          toast.error('Models could not be loaded. Please try again later.');
        }
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [selectedProvider, setSelectedModel, isLoggedIn]);

  const handleButtonClick = () => {
    if (isGenerating) {
      return
    }
    
    if (isLoggedIn) {
      setIsGenerating(true)
      if (selectedMode === 'ppt' && onGeneratePPT) {
        onGeneratePPT()
      } else {
        onGenerate()
      }
      setTimeout(() => setIsGenerating(false), 1000)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-[70vh]  bg-transparent relative">
      <PixelAnimation />

      {/* Main Content Section */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 min-h-[70vh] ">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <h1
          className={`text-4xl md:text-6xl font-bold tracking-wider text-white mb-8 ${titleClass}`}
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          WHAT ARE WE BUILDING?
        </h1>


     

        <div className="relative w-full mb-6">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={selectedMode === 'website' 
              ? "Describe the website you want to create..." 
              : "Describe the PPT content or upload a document to convert..."
            }
            className="min-h-[150px] w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white placeholder:text-gray-500 pr-[120px] transition-all duration-300"
          />
          <Button
            onClick={handleButtonClick}
            disabled={(!prompt.trim() && isLoggedIn) || isGenerating}
            className={`absolute bottom-4 right-4 font-medium tracking-wider py-3 px-12 text-base rounded-md transition-all duration-300 border focus:border-white focus:ring-white ${
              selectedMode === 'ppt'
                ? 'bg-gray-900/90 hover:bg-gray-800 text-white border-gray-800 hover:border-gray-700'
                : 'bg-gray-900/90 hover:bg-gray-800 text-white border-gray-800 hover:border-gray-700'
            } ${isGenerating ? 'opacity-75 cursor-not-allowed' : 'border-white'}`}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>GENERATING...</span>
              </div>
            ) : (
              isLoggedIn 
                ? (selectedMode === 'ppt' ? 'GENERATE PPT' : 'GENERATE Web') 
                : 'LOGIN TO GENERATE'
            )}
          </Button>
        </div>
   {/* Mode Selection */}
   <div className="flex gap-4 mb-6 flex-row justify-start w-full">
          <Button
            onClick={() => setSelectedMode('website')}
            className={`px-6 py-3 font-medium tracking-wider transition-all duration-300 ${
              selectedMode === 'website'
                ? 'bg-white  text-black border-gray-700'
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border-gray-700'
            } border rounded-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className=" " viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Web
          </Button>
          <Button
            onClick={() => setSelectedMode('ppt')}
            className={`px-6 py-3 font-medium tracking-wider transition-all duration-300 ${
              selectedMode === 'ppt'
                ? 'bg-white  text-black border-gray-700'
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border-gray-700'
            } border rounded-md`}
          >
       <svg
         viewBox="0 0 1024 1024"
         version="1.1"
         xmlns="http://www.w3.org/2000/svg"
         p-id="6755"
         width="48"
         height="48"
       >
         <path
           d="M144 80v80h640v487.632L568.24 864H224V528H144v416h457.488L864 680.656V80H144z m48 320h39.52c98.4 0 89.872-160 4.592-160H144v208h48v-48z m0-112h31.36c33.984 0 37.2 64-3.312 64H192v-64z m432 160V288h48v-48H512v48h48v160h64zM428.848 240H336v208h48v-48h40.272c41.824 0 71.424-32.128 71.424-79.968 0-28.208-17.344-80.032-66.848-80.032z m-16.064 112H384v-64h32.096c34 0 37.2 64-3.312 64zM480 800h80V640h160v-80H480v240z"
           fill={selectedMode === 'ppt' ? "#565D64" : "#e9ecef"}
           p-id="6756"
         ></path>
       </svg>
       PPT
          </Button>
        </div>
        {isLoggedIn && (
          <>
            {/* Settings Toggle Button */}
            {/* <div className="w-full mb-4">
              <Button
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Advanced Settings</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} />
              </Button>
            </div> */}

            {/* Collapsible Settings Section */}
            <div className={`w-full space-y-4 overflow-hidden transition-all duration-300 ${showSettings ? 'max-h-[1000px] opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
              <ProviderSelector
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                onProviderChange={() => {}}
              />

              <div className="w-full">
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

              <div className="w-full">
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
                <div className="w-full">
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

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-300 mb-2">MAX OUTPUT TOKENS</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={maxTokens || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue === '') {
                        setMaxTokens(undefined);
                      } else {
                        const parsed = parseInt(newValue, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          setMaxTokens(parsed);
                        }
                      }
                    }}
                    placeholder="Default (model dependent)"
                    className="w-full bg-gray-900/80 border-gray-800 focus:border-white focus:ring-white text-white placeholder:text-gray-500 transition-all duration-300"
                    min="100"
                    step="100"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setMaxTokens(undefined)}
                    className="border-gray-800 hover:bg-gray-800 text-gray-300"
                  >
                    Reset
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Set the maximum number of tokens for the model output. Higher values allow for longer code generation but may take more time. Leave empty to use the model's default.
                </p>
              </div>
            </div>
          </>
        )}
        
        </div>
        
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
