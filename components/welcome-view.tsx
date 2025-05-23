"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Import only the icons that are actually used
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ProviderSelector } from "@/components/provider-selector"
import dynamic from 'next/dynamic'

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
  onGenerate
}: WelcomeViewProps) {
  const [titleClass, setTitleClass] = useState("pre-animation")
  const [models, setModels] = useState<Model[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      <PixelAnimation />
      
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
            disabled={!prompt.trim() || (!isLoggedIn && !selectedModel)}
            className="absolute bottom-4 right-4 bg-gray-900/90 hover:bg-gray-800 text-white font-medium tracking-wider py-3 px-12 text-base rounded-md transition-all duration-300 border border-gray-800 hover:border-gray-700 focus:border-white focus:ring-white"
          >
            {isLoggedIn ? 'GENERATE' : 'LOGIN TO GENERATE'}
          </Button>
        </div>

        {isLoggedIn && (
          <>
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
              <div className="w-full mb-4">
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

            <div className="w-full mb-8">
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
          </>
        )}

  
      </div>
            {/* Connect Section */}
            <div className="absolute bottom-0 mt-12 w-full flex flex-col items-center text-gray-400">
              <div className="mb-2 flex items-center gap-2">
                Connect with us:
                <a
                  href="https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=ea1g8b57-cf04-483b-a6cc-39132c555ad2" // 请替换为你的飞书群/个人链接
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition font-medium flex items-center gap-1 ml-2"
                >
                  {/* 官方 Lark Logo SVG */}
                  <svg
                    className="icon selected"
                    viewBox="0 0 1024 1024"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="#bfbfbf"
                  >
                    <path d="M42.666667 384.512l13.952 13.994667a1260.373333 1260.373333 0 0 0 318.037333 226.218666l7.552 3.712 4.693333 2.304 0.725334 0.341334 3.413333 1.664 8.618667 4.053333 8.149333 3.754667 6.101333 2.858666 6.272 2.901334 6.186667 2.773333 6.656 2.986667 7.765333 3.370666 7.765334 3.2 9.472 3.925334 7.850666 3.2 11.946667 4.821333 11.434667 4.48 4.693333 1.792 3.626667 1.365333c5.290667 2.048 10.325333 3.925333 15.445333 5.717334l7.082667 2.56 10.624 3.754666 8.746666 2.986667c2.048 0.768 3.626667 1.28 7.296 2.474667l3.626667 1.194666 2.389333 0.768c6.485333 2.133333 9.386667 3.114667 13.184 4.266667 5.290667 1.706667 10.88 3.413333 16.554667 5.12a347.306667 347.306667 0 0 1 10.752 3.114667l22.826667 6.357333 3.285333 0.853333 3.242667 0.853334 2.048 0.512c5.12 1.28 10.666667 2.432 16.213333 3.413333a270.848 270.848 0 0 0 66.816 3.584c7.68-0.597333 14.72-1.365333 21.333333-2.389333a235.52 235.52 0 0 0 28.928-6.229334l8.405334-2.602666a565.333333 565.333333 0 0 1-397.312 162.645333 560.426667 560.426667 0 0 1-312.661334-94.378667 30.634667 30.634667 0 0 1-13.482666-25.472v-30.72L42.666667 384.512z m927.658666-13.568l11.008 3.882667-9.216 11.52a357.205333 357.205333 0 0 0-41.173333 68.010666l-0.469333 0.981334-50.944 101.461333-5.674667 11.264c-6.016 11.392-13.226667 22.613333-21.248 33.152a212.224 212.224 0 0 1-29.269333 31.061333 192.298667 192.298667 0 0 1-19.114667 14.421334l-0.426667 0.256-3.072 2.048-2.944 1.877333a198.741333 198.741333 0 0 1-75.434666 27.648 211.2 211.2 0 0 1-57.514667 1.28 253.994667 253.994667 0 0 1-16.128-2.261333 317.994667 317.994667 0 0 1-13.482667-2.858667l-3.157333-0.853333-0.554667-0.128-3.626666-0.981334c-10.794667-2.901333-21.589333-5.973333-32.384-9.130666l-7.978667-2.474667c-4.053333-1.194667-4.053333-1.194667-7.893333-2.432l-6.4-2.048-4.096-1.322667-2.346667-0.768-2.432-0.810666-3.968-1.28-6.314667-2.133334-8.234666-2.816-4.693334-1.621333-4.266666-1.536-1.28-0.426667-7.04-2.602666a373.930667 373.930667 0 0 0-7.253334-2.688l-4.864-1.792-2.261333-0.853334-2.986667-1.109333-1.749333-0.682667-3.456-1.28a884.48 884.48 0 0 1-11.093333-4.352l-11.818667-4.736-7.552-3.114666-9.514667-3.925334-6.997333-2.986666 18.261333-11.904c24.490667-16.64 47.786667-35.114667 69.674667-55.210667l4.266667-3.968 3.925333-3.626667 2.986667-2.986666a174.933333 174.933333 0 0 0 5.205333-5.034667l2.986667-2.858667 10.368-10.24 13.824-13.738666 11.861333-11.776 11.093333-10.965334 11.648-11.477333 10.666667-10.581333 14.848-14.634667 4.394667-4.138667 2.048-1.92 1.706666-1.578666c9.557333-8.874667 19.754667-17.066667 30.378667-24.490667 7.466667-5.333333 14.762667-10.069333 22.186667-14.464a327.082667 327.082667 0 0 1 64.853333-28.842667 315.690667 315.690667 0 0 1 194.133333 1.578667zM616.704 128a30.933333 30.933333 0 0 1 24.064 11.52l11.392 14.634667a563.754667 563.754667 0 0 1 84.906667 163.584l4.778666 15.616-0.512 0.213333a348.672 348.672 0 0 0-13.568 5.546667l-13.312 6.101333c-9.216 4.608-17.792 9.216-26.026666 14.037333-14.933333 8.96-29.013333 18.688-42.496 29.312-7.04 5.802667-12.629333 10.581333-17.834667 15.36a248.746667 248.746667 0 0 0-9.514667 9.002667l-14.677333 14.421333-10.709333 10.581334-11.648 11.52-11.093334 10.965333-11.946666 11.818667-13.738667 13.397333-1.152 1.109333-10.368-17.578666a1273.898667 1273.898667 0 0 0-296.576-337.109334L231.466667 128h385.28z" />
                  </svg>
                  Lark
                </a>
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
