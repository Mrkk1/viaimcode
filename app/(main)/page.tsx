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
      <div className=" bg-black">
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
        )}
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
    <div className=" bg-black">
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
    </div>
  )
}
