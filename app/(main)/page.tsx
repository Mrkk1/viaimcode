"use client"

import { useState, useEffect } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { WelcomeView } from "@/components/welcome-view"
import { GenerationView } from "@/components/generation-view"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { toast } from "sonner"
import { getCurrentUser } from "@/lib/auth"
import Link from "next/link"
import { IncrementalEditor } from "@/components/incremental-editor"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { HistoryVersion } from "@/components/generation-view"
import { FeaturedWebsites } from "@/components/featured-websites"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerationView, setShowGenerationView] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState("default")
  const [customSystemPrompt, setCustomSystemPrompt] = useState("")
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined)
  const [generatedCode, setGeneratedCode] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [thinkingOutput, setThinkingOutput] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null)
  const [continuationAttempts, setContinuationAttempts] = useState(0)
  const MAX_CONTINUATION_ATTEMPTS = 3
  const [useIncrementalMode, setUseIncrementalMode] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [versionHistory, setVersionHistory] = useState<HistoryVersion[]>([])

  // 检查生成的代码是否完整
  const isCodeComplete = (code: string) => {
    const cleanCode = code.trim();
    return cleanCode.startsWith("<!DOCTYPE html>") && 
           cleanCode.endsWith("</html>") &&
           cleanCode.includes("<head>") &&
           cleanCode.includes("</body>");
  };

  // 处理代码生成
  const generateCode = async (currentPrompt: string, existingCode: string = "") => {
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: existingCode ? `继续生成之前未完成的代码。之前的代码是：${existingCode}` : currentPrompt,
          model: selectedModel,
          provider: selectedProvider,
          maxTokens,
          customSystemPrompt: selectedSystemPrompt === 'custom' ? customSystemPrompt :
            selectedSystemPrompt === 'thinking' ? `You are an expert web developer AI specializing in modern, beautiful web interfaces. Your task is to generate complete, production-ready HTML code using Tailwind CSS.

First, before writing any code, you MUST articulate your detailed thinking process. Enclose this entire process within <think> and </think> tags. This thinking process should cover:
1. Your interpretation of the user's requirements
2. Planned HTML structure and semantic elements
3. Tailwind CSS classes for styling and layout
4. Color scheme and design system choices
5. JavaScript functionality and interactivity
6. Responsive design strategy (mobile-first approach)
7. Accessibility considerations

After the <think> block, generate a complete HTML file with these requirements:

MANDATORY INCLUSIONS:
1. Include Tailwind CSS via CDN in the <head>:
   <script src="https://cdn.tailwindcss.com"></script>
2. Use semantic HTML5 elements (header, nav, main, section, article, footer, etc.)
3. Implement a mobile-first responsive design using Tailwind's responsive prefixes (sm:, md:, lg:, xl:)
4. Use modern Tailwind utility classes for all styling - NO custom CSS unless absolutely necessary

DESIGN REQUIREMENTS:
1. Create a visually appealing, modern design with:
   - Proper spacing using Tailwind's spacing scale (p-4, m-8, gap-6, etc.)
   - Beautiful typography (text-xl, font-semibold, leading-relaxed, etc.)
   - Smooth transitions (transition-all, duration-300, ease-in-out)
   - Hover effects on interactive elements (hover:scale-105, hover:bg-opacity-90, etc.)
   - Focus states for accessibility (focus:outline-none, focus:ring-2, etc.)
2. Use a cohesive color scheme with Tailwind's color palette
3. Include subtle shadows and rounded corners where appropriate (shadow-lg, rounded-xl)
4. Ensure proper contrast ratios for text readability

INTERACTIVITY:
1. Add smooth animations and micro-interactions where appropriate
2. Include proper ARIA labels for accessibility
3. Make forms and buttons fully interactive with proper states



IMPORTANT: Apart from the initial <think>...</think> block, do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>.` : null,
        }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            throw new Error(errorData.error);
          }
        } catch (jsonError) {
          // If we can't parse the JSON, just use the status
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream could not be read');
      }

      let receivedText = existingCode;
      let thinkingText = "";
      let isInThinkingBlock = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = new TextDecoder().decode(value);
        receivedText += chunk;

        let cleanedCode = receivedText;

        const thinkingStartIndex = cleanedCode.indexOf("<think>");
        const thinkingEndIndex = cleanedCode.indexOf("</think>");

        if (thinkingStartIndex !== -1) {
          if (!isInThinkingBlock) {
            setIsThinking(true);
          }

          isInThinkingBlock = true;

          if (thinkingEndIndex !== -1) {
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7, thinkingEndIndex);
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex) +
                         cleanedCode.substring(thinkingEndIndex + 8);
            isInThinkingBlock = false;
            setIsThinking(false);
          } else {
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7);
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex);
          }

          setThinkingOutput(thinkingText);
        }

        setGeneratedCode(cleanedCode);
      }

      // 检查代码是否完整
      if (!isCodeComplete(receivedText) && continuationAttempts < MAX_CONTINUATION_ATTEMPTS) {
        setContinuationAttempts(prev => prev + 1);
        await generateCode(currentPrompt, receivedText);
        return;
      }

      setGenerationComplete(true);
      setContinuationAttempts(0);
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error(error instanceof Error ? error.message : '生成代码时出错');
      setGenerationComplete(true);
      setContinuationAttempts(0);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGenerationComplete(false);
    setGeneratedCode("");
    setThinkingOutput("");
    setShowGenerationView(true);
    setContinuationAttempts(0);

    // 如果用户已登录，创建新项目
    if (user) {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''), // 使用prompt的前100个字符作为标题
            description: prompt,
            prompt: prompt,
            model: selectedModel,
            provider: selectedProvider,
          }),
        });

        if (response.ok) {
          const project = await response.json();
          setCurrentProjectId(project.id);
          console.log('项目创建成功，ID:', project.id);
        } else {
          console.error('创建项目失败');
        }
      } catch (error) {
        console.error('创建项目时出错:', error);
      }
    }

    await generateCode(prompt);
  };

  const handleRegenerateWithNewPrompt = async (newPrompt: string) => {
    if (!newPrompt.trim()) return;

    setIsGenerating(true);
    setGenerationComplete(false);
    setThinkingOutput("");
    setContinuationAttempts(0);

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `基于以下现有代码，按照新的要求进行修改：

现有代码：
${generatedCode}

新的要求：
${newPrompt}

请保持代码结构的完整性，只修改必要的部分。返回完整的修改后的代码。`,
          model: selectedModel,
          provider: selectedProvider,
          maxTokens,
          customSystemPrompt: selectedSystemPrompt === 'custom' ? customSystemPrompt :
            selectedSystemPrompt === 'thinking' ? `You are an expert web developer AI specializing in modern, beautiful web interfaces. Your task is to modify the existing HTML code based on the user's new requirements while maintaining the Tailwind CSS design system.

First, before modifying any code, you MUST articulate your detailed thinking process. Enclose this entire process within <think> and </think> tags. This thinking process should cover:
1. Your interpretation of the user's new requirements
2. Analysis of the existing code structure and Tailwind classes
3. Planned modifications and their visual impact
4. Strategy for maintaining design consistency
5. Any new Tailwind utilities needed
6. Responsive design considerations for the changes

When modifying the code:
1. Preserve the existing Tailwind CSS setup and design system
2. Use Tailwind utility classes for all new styling
3. Maintain responsive breakpoints and mobile-first approach
4. Keep the same color scheme unless specifically asked to change it
5. Ensure new elements follow the existing design patterns
6. Add smooth transitions for any new interactive elements
7. Maintain accessibility standards with proper ARIA labels



IMPORTANT: Apart from the initial <think>...</think> block, do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>.` : null,
        }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            throw new Error(errorData.error);
          }
        } catch (jsonError) {
          // If we can't parse the JSON, just use the status
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream could not be read');
      }

      let receivedText = "";
      let thinkingText = "";
      let isInThinkingBlock = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = new TextDecoder().decode(value);
        receivedText += chunk;

        let cleanedCode = receivedText;

        const thinkingStartIndex = cleanedCode.indexOf("<think>");
        const thinkingEndIndex = cleanedCode.indexOf("</think>");

        if (thinkingStartIndex !== -1) {
          if (!isInThinkingBlock) {
            setIsThinking(true);
          }

          isInThinkingBlock = true;

          if (thinkingEndIndex !== -1) {
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7, thinkingEndIndex);
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex) +
                         cleanedCode.substring(thinkingEndIndex + 8);
            isInThinkingBlock = false;
            setIsThinking(false);
          } else {
            thinkingText = cleanedCode.substring(thinkingStartIndex + 7);
            cleanedCode = cleanedCode.substring(0, thinkingStartIndex);
          }

          setThinkingOutput(thinkingText);
        }

        setGeneratedCode(cleanedCode);
      }

      // 检查代码是否完整
      if (!isCodeComplete(receivedText) && continuationAttempts < MAX_CONTINUATION_ATTEMPTS) {
        setContinuationAttempts(prev => prev + 1);
        // 在继续生成时，保持修改上下文
        await handleRegenerateWithNewPrompt(newPrompt);
        return;
      }

      setGenerationComplete(true);
      setContinuationAttempts(0);
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error(error instanceof Error ? error.message : '生成代码时出错');
      setGenerationComplete(true);
      setContinuationAttempts(0);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
    }
  };

  useEffect(() => {
    // 获取用户信息
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    fetchUser();

    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1250)

    return () => clearTimeout(timer)
  }, [])

  // 加载项目版本历史
  useEffect(() => {
    const loadVersionHistory = async () => {
      if (currentProjectId && user) {
        try {
          const response = await fetch(`/api/projects/${currentProjectId}/versions`);
          if (response.ok) {
            const versions = await response.json();
            // 转换为HistoryVersion格式
            const historyVersions: HistoryVersion[] = versions.map((v: any) => ({
              id: v.id,
              timestamp: new Date(v.createdAt),
              thumbnail: v.thumbnail || '',
              code: v.code,
              title: v.title,
              isPublished: v.isPublished,
              shareUrl: v.shareUrl,
              type: v.type
            }));
            setVersionHistory(historyVersions);
          }
        } catch (error) {
          console.error('加载版本历史失败:', error);
        }
      }
    };

    loadVersionHistory();
  }, [currentProjectId, user]);

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black relative">
        {/* Global animated background */}
        <div className="fixed inset-0 w-full h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 z-0 animate-pulse-slow"></div>
        <div className="absolute inset-0 w-full min-h-full bg-gradient-to-br from-black via-gray-900 to-gray-950 z-0 animate-pulse-slow"></div>
        
        <div className="relative z-10">
          {showGenerationView ? (
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
              projectId={currentProjectId}
              initialVersions={versionHistory}
            />
          ) : (
            <>
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
              
              {/* Featured Websites Section */}
              <FeaturedWebsites />

              {/* Connect Section */}
              <div className="relative z-10 w-full flex flex-col items-center text-gray-400 py-8 bg-transparent">
                <div className="mb-2 flex items-center gap-2">
                  Connect with us:
                  <a
                    href="https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=ea1g8b57-cf04-483b-a6cc-39132c555ad2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition font-medium flex items-center gap-1 ml-2"
                  >
                    <svg
                      className="icon selected"
                      viewBox="0 0 1024 1024"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      fill="#bfbfbf"
                    >
                      <path d="M42.666667 384.512l13.952 13.994667a1260.373333 1260.373333 0 0 0 318.037333 226.218666l7.552 3.712 4.693333 2.304 0.725334 0.341334 3.413333 1.664 8.618667 4.053333 8.149333 3.754667 6.101333 2.858666 6.272 2.901334 6.186667 2.773333 6.656 2.986667 7.765333 3.370666 7.765334 3.2 9.472 3.925334 7.850666 3.2 11.946667 4.821333 11.434667 4.48 4.693333 1.792 3.626667 1.365333c5.290667 2.048 10.325333 3.925333 15.445333 5.717334l7.082667 2.56 10.624 3.754666 8.746666 2.986667c2.048 0.768 3.626667 1.28 7.296 2.474667l3.626667 1.194666 2.389333 0.768c6.485333 2.133333 9.386667 3.114667 13.184 4.266667 5.290667 1.706667 10.88 3.413333 16.554667 5.12a347.306667 347.306667 0 0 1 10.752 3.114667l22.826667 6.357333 3.285333 0.853333 3.242667 0.853334 2.048 0.512c5.12 1.28 10.666667 2.432 16.213333 3.413333a270.848 270.848 0 0 0 66.816 3.584c7.68-0.597333 14.72-1.365333 21.333333-2.389333a235.52 235.52 0 0 0 28.928-6.229334l8.405334-2.602666a565.333333 565.333333 0 0 1-397.312 162.645333 560.426667 560.426667 0 0 1-312.661334-94.378667 30.634667 30.634667 0 0 1-13.482666-25.472v-30.72L42.666667 384.512z m927.658666-13.568l11.008 3.882667-9.216 11.52a357.205333 357.205333 0 0 0-41.173333 68.010666l-0.469333 0.981334-50.944 101.461333-5.674667 11.264c-6.016 11.392-13.226667 22.613333-21.248 33.152a212.224 212.224 0 0 1-29.269333 31.061333 192.298667 192.298667 0 0 1-19.114667 14.421334l-0.426667 0.256-3.072 2.048-2.944 1.877333a198.741333 198.741333 0 0 1-75.434666 27.648 211.2 211.2 0 0 1-57.514667 1.28 253.994667 253.994667 0 0 1-16.128-2.261333 317.994667 317.994667 0 0 1-13.482667-2.858667l-3.157333-0.853333-0.554667-0.128-3.626666-0.981334c-10.794667-2.901333-21.589333-5.973333-32.384-9.130666l-7.978667-2.474667c-4.053333-1.194667-4.053333-1.194667-7.893333-2.432l-6.4-2.048-4.096-1.322667-2.346667-0.768-2.432-0.810666-3.968-1.28-6.314667-2.133334-8.234666-2.816-4.693334-1.621333-4.266666-1.536-1.28-0.426667-7.04-2.602666a373.930667 373.930667 0 0 0-7.253334-2.688l-4.864-1.792-2.261333-0.853334-2.986667-1.109333-1.749333-0.682667-3.456-1.28a884.48 884.48 0 0 1-11.093333-4.352l-11.818667-4.736-7.552-3.114666-9.514667-3.925334-6.997333-2.986666 18.261333-11.904c24.490667-16.64 47.786667-35.114667 69.674667-55.210667l4.266667-3.968 3.925333-3.626667 2.986667-2.986666a174.933333 174.933333 0 0 0 5.205333-5.034667l2.986667-2.858667 10.368-10.24 13.824-13.738666 11.861333-11.776 11.093333-10.965334 11.648-11.477333 10.666667-10.581333 14.848-14.634667 4.394667-4.138667 2.048-1.92 1.706666-1.578666c9.557333-8.874667 19.754667-17.066667 30.378667-24.490667 7.466667-5.333333 14.762667-10.069333 22.186667-14.464a327.082667 327.082667 0 0 1 64.853333-28.842667 315.690667 315.690667 0 0 1 194.133333 1.578667zM616.704 128a30.933333 30.933333 0 0 1 24.064 11.52l11.392 14.634667a563.754667 563.754667 0 0 1 84.906667 163.584l4.778666 15.616-0.512 0.213333a348.672 348.672 0 0 0-13.568 5.546667l-13.312 6.101333c-9.216 4.608-17.792 9.216-26.026666 14.037333-14.933333 8.96-29.013333 18.688-42.496 29.312-7.04 5.802667-12.629333 10.581333-17.834667 15.36a248.746667 248.746667 0 0 0-9.514667 9.002667l-14.677333 14.421333-10.709333 10.581334-11.648 11.52-11.093334 10.965333-11.946666 11.818667-13.738667 13.397333-1.152 1.109333-10.368-17.578666a1273.898667 1273.898667 0 0 0-296.576-337.109334L231.466667 128h385.28z" />
                    </svg>
                    Lark
                  </a>
                </div>
              </div>
            </>
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
        `}</style>
      </div>
    )
  }

  if (showGenerationView) {
    return (
      <div className=" bg-background">
        <div className="  ">
          
          {isThinking && thinkingOutput && (
            <ThinkingIndicator thinkingOutput={thinkingOutput} isThinking={isThinking} />
          )}
          
          {useIncrementalMode && generationComplete ? (
            <IncrementalEditor
              initialCode={generatedCode}
              model={selectedModel}
              provider={selectedProvider}
              onCodeUpdate={setGeneratedCode}
              maxTokens={maxTokens}
            />
          ) : (
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
              projectId={currentProjectId}
              initialVersions={versionHistory}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className=" bg-black relative">
      {/* Global animated background */}
      <div className="fixed inset-0 w-full h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 z-0 animate-pulse-slow"></div>
      <div className="absolute inset-0 w-full min-h-full bg-gradient-to-br from-black via-gray-900 to-gray-950 z-0 animate-pulse-slow"></div>
      <div className="relative z-10">
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
        
          {/* Featured Websites Section */}
          <FeaturedWebsites />

      </div>
    </div>
  )
}
