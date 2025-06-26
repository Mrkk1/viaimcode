"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Clock, Calendar, Code, Download, Share2, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";
import { GenerationView, HistoryVersion } from "@/components/generation-view";

interface Project {
  id: string;
  title: string;
  description?: string;
  prompt?: string;
  model?: string;
  provider?: string;
  thumbnail?: string;
  status?: 'active' | 'archived' | 'deleted';
  isPublic?: boolean;
  lastSaveTime?: string;
  createdAt?: string;
  updatedAt?: string;
  currentVersionId?: string;
}

interface Version {
  id: string;
  projectId: string;
  code: string;
  thumbnail?: string;
  type: 'ai' | 'manual';
  title?: string;
  description?: string;
  size?: number;
  isPublished?: boolean;
  shareUrl?: string;
  createdAt?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [thinkingOutput, setThinkingOutput] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    fetchUser();
    if (projectId) {
      fetchProjectAndVersions();
    }
  }, [projectId]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to get user information:', error);
      router.push('/login');
    }
  };

  const fetchProjectAndVersions = async () => {
    try {
      // Get project information first
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData);
        
        // Then get version information
        const versionsResponse = await fetch(`/api/projects/${projectId}/versions`);
        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          setVersions(versionsData);
          
          // Set current version
          if (projectData.currentVersionId) {
            const currentIndex = versionsData.findIndex((v: Version) => v.id === projectData.currentVersionId);
            if (currentIndex !== -1) {
              setCurrentVersion(versionsData[currentIndex]);
              setCurrentVersionIndex(currentIndex);
            } else if (versionsData.length > 0) {
              setCurrentVersion(versionsData[0]);
              setCurrentVersionIndex(0);
            }
          } else if (versionsData.length > 0) {
            setCurrentVersion(versionsData[0]);
            setCurrentVersionIndex(0);
          }
        } else {
          toast.error('Failed to get version list');
        }
      } else if (projectResponse.status === 404) {
        toast.error('Project does not exist');
        router.push('/projects');
      } else {
        toast.error('Failed to get project information');
      }
    } catch (error) {
      console.error('Failed to get project information:', error);
      toast.error('Failed to get project information');
    } finally {
      setLoading(false);
    }
  };

  // 将版本数据转换为HistoryVersion格式
  const convertToHistoryVersions = (): HistoryVersion[] => {
    return versions.map(version => ({
      id: version.id,
      timestamp: version.createdAt ? new Date(version.createdAt) : new Date(),
      thumbnail: version.thumbnail || '',
      code: version.code,
      title: version.title,
      isPublished: version.isPublished,
      shareUrl: version.shareUrl,
      type: version.type
    }));
  };

  const handleRegenerateWithNewPrompt = async (newPrompt: string) => {
    if (!newPrompt.trim() || !currentVersion || !user || !project) {
      toast.error('Unable to regenerate: missing requirements');
      return;
    }

    try {
      // 设置生成状态
      setIsGenerating(true);
      setGeneratedCode(""); // 清空当前生成的代码
      setThinkingOutput("");
      setIsThinking(false);
      
      toast.info('Starting code generation...');
      
      // 更新当前prompt状态，这样PREVIOUS PROMPT会显示最新的prompt
      setCurrentPrompt(newPrompt);
      
      // 调用生成API
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `基于以下现有代码，按照新的要求进行修改：

现有代码：
${currentVersion.code}

新的要求：
${newPrompt}

请保持代码结构的完整性，只修改必要的部分。返回完整的修改后的代码。`,
          model: project.model || 'claude-3-5-sonnet-20241022',
          provider: project.provider || 'anthropic',
          maxTokens: 8000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response stream');
      }

      let receivedText = "";
      let thinkingText = "";
      let isInThinkingBlock = false;
      
      // 读取流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        receivedText += chunk;

        let cleanedCode = receivedText;

        // 处理thinking标签
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

        // 实时更新生成的代码
        setGeneratedCode(cleanedCode);
      }
      
      // 移除版本创建逻辑，让 generation-view.tsx 统一管理
      // 版本创建现在由 GenerationView 组件的 useEffect 处理
      
      // 刷新页面数据（在版本创建后由 GenerationView 触发）
      // await fetchProjectAndVersions();
      
      toast.success('Code generation completed!');
      
    } catch (error) {
      console.error('Error in regeneration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate code');
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-gray-400">Loading project information...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className=" bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Project does not exist</p>
          <Button onClick={() => router.push('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Project information header */}
      <div className="border-b border-gray-800 bg-gray-900/50  top-0 left-0 right-0 relative" >
        <div className="container mx-auto px-4 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/projects')}
                className="text-gray-400 hover:text-white hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1 text-xs" />
                Back
              </Button>
              <div className="flex  " style={{padding: '15px 5px'}}>
                <h1 className="text-xl font-bold text-white mr-1 text-ellipsis overflow-hidden whitespace-nowrap max-w-[500px]">{project.title}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    {project.provider && (
                      <Badge variant="outline" className="text-xs">
                        {project.provider.toUpperCase()}
                      </Badge>
                    )}
                    {project.model && (
                      <Badge variant="outline" className="text-xs">
                        {project.model}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: enUS }) : 'Unknown'}</span>
                    </div>
                    {project.lastSaveTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Updated {formatDistanceToNow(new Date(project.lastSaveTime), { addSuffix: true, locale: enUS })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-800 text-gray-300">
                <History className="w-3 h-3 mr-1" />
                {versions.length} Versions
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      {currentVersion ? (
        <GenerationView
          prompt={currentPrompt}
          setPrompt={setCurrentPrompt}
          model={project.model || 'claude-3-5-sonnet-20241022'}
          provider={project.provider || 'anthropic'}
          generatedCode={generatedCode}
          isGenerating={isGenerating}
          generationComplete={!isGenerating}
          onRegenerateWithNewPrompt={handleRegenerateWithNewPrompt}
          thinkingOutput={thinkingOutput}
          isThinking={isThinking}
          projectId={projectId}
          initialVersions={convertToHistoryVersions()}
          onVersionCreated={fetchProjectAndVersions}
        />
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <Code className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">This project has no versions yet</p>
            <p className="text-gray-500 text-sm mt-2">Start generating code to create your first version</p>
          </div>
        </div>
      )}
    </div>
  );
} 