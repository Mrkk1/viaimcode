import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor } from '@/components/code-editor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Undo2, Code, FileCode, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CodeFragment, IncrementalUpdateManager } from '@/lib/providers/incremental';
import { Switch } from '@/components/ui/switch';

interface IncrementalEditorProps {
  initialCode: string;
  model: string;
  provider?: string;
  onCodeUpdate: (newCode: string) => void;
  maxTokens?: number;
}

export function IncrementalEditor({
  initialCode,
  model,
  provider = 'deepseek',
  onCodeUpdate,
  maxTokens
}: IncrementalEditorProps) {
  // 状态管理
  const [fullCode, setFullCode] = useState(initialCode);
  const [selectedTab, setSelectedTab] = useState<string>('full');
  const [codeFragments, setCodeFragments] = useState<CodeFragment[]>([]);
  const [selectedFragmentId, setSelectedFragmentId] = useState<string | null>(null);
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fragmentProgress, setFragmentProgress] = useState<Record<string, { status: 'pending' | 'generating' | 'complete' | 'error', content: string }>>({});
  const [useDiffMode, setUseDiffMode] = useState(true); // 默认启用差异化更新模式
  
  // 更新管理器实例
  const updateManagerRef = useRef<IncrementalUpdateManager | null>(null);
  
  // 初始化代码片段
  useEffect(() => {
    try {
      const manager = new IncrementalUpdateManager(initialCode, useDiffMode);
      updateManagerRef.current = manager;
      const fragments = manager.getAllFragments();
      setCodeFragments(fragments);
      
      // 默认选择HTML结构片段
      const htmlFragment = fragments.find(f => f.id === 'html-structure');
      if (htmlFragment) {
        setSelectedFragmentId(htmlFragment.id);
      } else if (fragments.length > 0) {
        setSelectedFragmentId(fragments[0].id);
      }
    } catch (error) {
      console.error('Error parsing HTML:', error);
      setError('无法解析HTML代码，请检查代码格式是否正确。');
    }
  }, [initialCode]);
  
  // 当差异化模式更改时更新管理器配置
  useEffect(() => {
    if (updateManagerRef.current) {
      updateManagerRef.current.setUseDiffUpdates(useDiffMode);
    }
  }, [useDiffMode]);
  
  // 更新全部代码
  const updateFullCode = (newCode: string) => {
    setFullCode(newCode);
    onCodeUpdate(newCode);
    
    // 重新解析代码片段
    try {
      const manager = new IncrementalUpdateManager(newCode);
      updateManagerRef.current = manager;
      setCodeFragments(manager.getAllFragments());
    } catch (error) {
      console.error('Error parsing HTML after update:', error);
    }
  };
  
  // 更新单个片段
  const updateFragment = (fragmentId: string, newContent: string) => {
    if (!updateManagerRef.current) return;
    
    try {
      updateManagerRef.current.updateFragment(fragmentId, newContent);
      const newFullCode = updateManagerRef.current.getFullHTML();
      const newFragments = updateManagerRef.current.getAllFragments();
      
      setFullCode(newFullCode);
      setCodeFragments(newFragments);
      onCodeUpdate(newFullCode);
    } catch (error) {
      console.error('Error updating fragment:', error);
      toast.error('更新代码片段失败');
    }
  };
  
  // 撤销修改
  const handleUndo = () => {
    if (!updateManagerRef.current) return;
    
    const success = updateManagerRef.current.undo();
    if (success) {
      const newFullCode = updateManagerRef.current.getFullHTML();
      const newFragments = updateManagerRef.current.getAllFragments();
      
      setFullCode(newFullCode);
      setCodeFragments(newFragments);
      onCodeUpdate(newFullCode);
      toast.success('已撤销上一次修改');
    } else {
      toast.error('没有可撤销的修改');
    }
  };
  
  // 获取当前选中的片段
  const getSelectedFragment = () => {
    return selectedFragmentId 
      ? codeFragments.find(f => f.id === selectedFragmentId) 
      : null;
  };
  
  // 处理代码片段的手动编辑
  const handleFragmentEdit = (value: string) => {
    if (!selectedFragmentId) return;
    updateFragment(selectedFragmentId, value);
  };
  
  // 处理AI生成的增量更新
  const handleIncrementalGeneration = async () => {
    if (!modificationPrompt.trim() || !model || !updateManagerRef.current) {
      toast.error('请输入修改要求并确保已选择模型');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    // 初始化进度状态
    const initialProgress: Record<string, { status: 'pending' | 'generating' | 'complete' | 'error', content: string }> = {};
    
    try {
      // 确定要更新的片段ID
      const targetId = selectedTab === 'full' ? null : selectedFragmentId;
      
      // 设置进度状态
      if (targetId) {
        initialProgress[targetId] = { status: 'pending', content: '' };
      } else {
        // 使用更新管理器分析需要更新的片段
        const updatePrompts = updateManagerRef.current.generateUpdatePrompts(modificationPrompt);
        updatePrompts.forEach(({ fragmentId }) => {
          initialProgress[fragmentId] = { status: 'pending', content: '' };
        });
      }
      
      setFragmentProgress(initialProgress);
      
      // 准备请求参数
      const requestData = {
        currentCode: fullCode,
        modificationPrompt,
        fragmentId: targetId, // 如果为null，API会自动决定需要修改哪些片段
        model,
        provider,
        maxTokens,
        useDiffMode // 传递差异化更新模式设置
      };
      
      // 发送请求
      const response = await fetch('/api/generate-code/incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        // 尝试解析错误信息
        const errorData = await response.json();
        if (errorData.shouldFallbackToFullUpdate) {
          // 如果需要回退到完整更新，提示用户
          toast.error('无法进行增量更新，正在回退到完整更新...');
          
          // 回退到完整更新的逻辑可以在这里实现
          // 例如调用原来的代码生成接口
          await handleFullGeneration();
          return;
        }
        throw new Error(errorData.error || `HTTP错误: ${response.status}`);
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      // 更新进度的函数
      const updateProgressForFragment = (
        fragmentId: string, 
        status: 'pending' | 'generating' | 'complete' | 'error', 
        content: string = ''
      ) => {
        setFragmentProgress(prev => ({
          ...prev,
          [fragmentId]: {
            status,
            content: prev[fragmentId] ? prev[fragmentId].content + content : content
          }
        }));
      };
      
      // 读取流
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析数据块
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const { fragmentId, type, content } = data;
            
            // 获取片段类型对应的图标
            const progress = fragmentProgress[fragmentId] || { status: 'pending', content: '' };
            
            // 如果是差异化模式并且有"processed"类型的数据
            if (type === 'processed' && useDiffMode) {
              // 使用处理后的内容更新片段
              if (updateManagerRef.current) {
                updateManagerRef.current.updateFragment(fragmentId, content);
                // 更新完整代码
                const newFullCode = updateManagerRef.current.getFullHTML();
                setFullCode(newFullCode);
                onCodeUpdate(newFullCode);
              }
            }
            
            switch (type) {
              case 'start':
                updateProgressForFragment(fragmentId, 'generating');
                break;
              
              case 'chunk':
                updateProgressForFragment(fragmentId, 'generating', content);
                break;
              
              case 'end':
                // 片段生成完成，应用更新
                const fragmentContent = fragmentProgress[fragmentId]?.content || '';
                if (fragmentContent && updateManagerRef.current) {
                  updateManagerRef.current.updateFragment(fragmentId, fragmentContent);
                }
                updateProgressForFragment(fragmentId, 'complete');
                break;
              
              case 'error':
                updateProgressForFragment(fragmentId, 'error');
                setError(`片段 ${fragmentId} 生成失败: ${content}`);
                break;
              
              case 'complete':
                // 所有片段都处理完成，更新完整代码
                if (content) {
                  updateFullCode(content);
                  toast.success('代码已成功更新');
                }
                break;
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e, line);
          }
        }
      }
    } catch (error) {
      console.error('Error in incremental generation:', error);
      setError(error instanceof Error ? error.message : '生成代码时出错');
      toast.error('生成代码失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 处理完整代码生成（回退方案）
  const handleFullGeneration = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `基于以下现有代码，按照新的要求进行修改：

现有代码：
${fullCode}

新的要求：
${modificationPrompt}

请保持代码结构的完整性，只修改必要的部分。返回完整的修改后的代码。`,
          model,
          provider,
          maxTokens
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      let generatedCode = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        generatedCode += chunk;
      }
      
      // 更新代码
      updateFullCode(generatedCode);
      toast.success('代码已成功更新');
    } catch (error) {
      console.error('Error in full generation:', error);
      setError(error instanceof Error ? error.message : '生成代码时出错');
      toast.error('生成代码失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 获取片段类型对应的图标
  const getFragmentTypeIcon = (type: string) => {
    switch (type) {
      case 'html':
        return <File className="w-4 h-4" />;
      case 'css':
        return <FileCode className="w-4 h-4" />;
      case 'js':
        return <Code className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };
  
  // 获取片段类型对应的语言（用于代码编辑器）
  const getLanguageForType = (type: string) => {
    switch (type) {
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'javascript';
      default:
        return 'html';
    }
  };
  
  // 渲染片段列表
  const renderFragmentsList = () => {
    return (
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-medium">代码片段</h3>
        <div className="flex flex-wrap gap-2">
          {codeFragments.map(fragment => (
            <Badge
              key={fragment.id}
              variant={selectedFragmentId === fragment.id ? "default" : "outline"}
              className="cursor-pointer flex items-center gap-1"
              onClick={() => {
                setSelectedFragmentId(fragment.id);
                setSelectedTab('fragment');
              }}
            >
              {getFragmentTypeIcon(fragment.type)}
              <span>{fragment.id}</span>
            </Badge>
          ))}
        </div>
      </div>
    );
  };
  
  // 渲染代码编辑区域
  return (
    <div className="flex flex-col h-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* 片段列表 */}
      {renderFragmentsList()}
      
      {/* 代码编辑器 */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="flex-1 flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="full">完整代码</TabsTrigger>
            <TabsTrigger value="fragment" disabled={!selectedFragmentId}>单个片段</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Switch 
                id="diff-mode" 
                checked={useDiffMode}
                onCheckedChange={setUseDiffMode}
                disabled={isGenerating}
              />
              <label htmlFor="diff-mode" className="text-xs text-muted-foreground cursor-pointer">
                差异化更新模式
              </label>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={isGenerating}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              撤销
            </Button>
          </div>
        </div>
        
        <TabsContent value="full" className="flex-1 flex flex-col">
          <CodeEditor
            code={fullCode}
            onChange={updateFullCode}
            isEditable={true}
          />
        </TabsContent>
        
        <TabsContent value="fragment" className="flex-1 flex flex-col">
          {selectedFragmentId && getSelectedFragment() ? (
            <CodeEditor
              code={getSelectedFragment()?.content || ''}
              onChange={handleFragmentEdit}
              isEditable={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">请选择一个代码片段</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* 修改请求输入区 */}
      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">修改请求</h3>
          <Textarea
            placeholder="请输入你想要进行的修改描述..."
            value={modificationPrompt}
            onChange={e => setModificationPrompt(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={isGenerating}
          />
        </div>
        
        <Button 
          onClick={handleIncrementalGeneration}
          disabled={isGenerating || !modificationPrompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              生成修改
            </>
          )}
        </Button>
      </div>
      
      {/* 生成进度显示 */}
      {isGenerating && Object.keys(fragmentProgress).length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">生成进度</h3>
          <ScrollArea className="h-24 border rounded-md p-2">
            {Object.entries(fragmentProgress).map(([id, { status, content }]) => (
              <div key={id} className="mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{id}</Badge>
                  {status === 'pending' && <span className="text-xs text-muted-foreground">等待中</span>}
                  {status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {status === 'complete' && <span className="text-xs text-green-500">完成</span>}
                  {status === 'error' && <span className="text-xs text-red-500">错误</span>}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
} 