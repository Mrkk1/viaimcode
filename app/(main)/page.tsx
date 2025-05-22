"use client"

import { useState, useEffect } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { WelcomeView } from "@/components/welcome-view"
import { GenerationView } from "@/components/generation-view"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { toast, Toaster } from "sonner"
import { getCurrentUser } from "@/lib/auth"
import Link from "next/link"

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
            selectedSystemPrompt === 'thinking' ? `You are an expert web developer AI. Your task is to generate complete, production-ready HTML code based on the user's requirements.

First, before writing any code, you MUST articulate your detailed thinking process. Enclose this entire process within <think> and </think> tags. This thinking process should cover:
1. Your interpretation of the user's requirements
2. Planned HTML structure and components
3. CSS styling approach
4. Any JavaScript functionality needed
5. Considerations for responsiveness and browser compatibility

Only after this complete <think> block, proceed to output the code. The code MUST be complete and self-contained.
IMPORTANT: Apart from the initial <think>...</think> block, do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>. Ensure the generated CSS and JavaScript are directly embedded in the HTML file, unless the CDN consideration in your <think> block justifies linking to an external CDN for a specific library/framework.` : null,
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
            selectedSystemPrompt === 'thinking' ? `You are an expert web developer AI. Your task is to modify the existing HTML code based on the user's new requirements.

First, before modifying any code, you MUST articulate your detailed thinking process. Enclose this entire process within <think> and </think> tags. This thinking process should cover:
1. Your interpretation of the user's new requirements
2. Analysis of the existing code structure
3. Planned modifications and their impact
4. Strategy for maintaining consistency with the existing code

Only after this complete <think> block, proceed to output the modified code. Keep the existing code structure intact and only modify the necessary parts.
IMPORTANT: Apart from the initial <think>...</think> block, do NOT use markdown formatting. Do NOT wrap the code in \`\`\`html and \`\`\` tags. Do NOT output any text or explanation before or after the HTML code. Only output the raw HTML code itself, starting with <!DOCTYPE html> and ending with </html>.` : null,
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

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return (
      <div className="min-h-[100vh] bg-black">
        <Toaster position="top-right" />
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
      <div className="min-h-[100vh] bg-black">
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
      </div>
    )
  }

  return (
    <div className="min-h-[100vh] bg-black">
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
    </div>
  )
}
