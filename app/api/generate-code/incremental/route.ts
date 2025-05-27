import { NextRequest } from 'next/server';
import { LLMProvider } from '@/lib/providers/config';
import { createProviderClient } from '@/lib/providers/provider';
import { getCurrentUser } from '@/lib/auth';
import { IncrementalUpdateManager, CodeFragment } from '@/lib/providers/incremental';

// 创建一个扩展的 TransformStream 类型
interface ExtendedTransformStream extends TransformStream<Uint8Array, Uint8Array> {
  contentBuffer?: string;
  originalTransform?: any;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户是否登录
    const user = await getCurrentUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: '请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 解析请求数据
    const { 
      currentCode, 
      modificationPrompt, 
      fragmentId, 
      model, 
      provider: providerParam, 
      maxTokens,
      useDiffMode = true // 默认启用差异化更新
    } = await request.json();

    console.log('Request parameters:', { 
      useDiffMode, 
      fragmentId,
      modelLength: model?.length,
      promptLength: modificationPrompt?.length,
      currentCodeLength: currentCode?.length
    });

    // 验证必要的参数
    if (!currentCode || !modificationPrompt) {
      return new Response(
        JSON.stringify({ error: '当前代码和修改请求都是必需的' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 如果没有指定fragmentId，则使用增量更新管理器分析需要修改的片段
    let updateManager: IncrementalUpdateManager;
    let updatePrompts: Array<{ fragmentId: string; prompt: string }> = [];
    
    try {
      updateManager = new IncrementalUpdateManager(currentCode, useDiffMode);
      
      if (fragmentId) {
        // 如果指定了fragmentId，只更新该片段
        const fragment = updateManager.getFragment(fragmentId);
        if (!fragment) {
          return new Response(
            JSON.stringify({ error: `未找到ID为${fragmentId}的代码片段` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        const allFragments = updateManager.getAllFragments();
        const prompt = fragment ? `根据以下要求，只修改指定代码片段：
用户需求: ${modificationPrompt}

当前${fragment.type}代码:
${fragment.content}` : modificationPrompt;
        
        updatePrompts = [{ fragmentId, prompt }];
      } else {
        // 否则分析需要修改哪些片段
        updatePrompts = updateManager.generateUpdatePrompts(modificationPrompt);
      }
    } catch (error) {
      console.error('Error parsing HTML or generating update prompts:', error);
      // 如果解析失败，退回到完整更新
      return new Response(
        JSON.stringify({ 
          error: '无法解析代码或生成增量更新，请尝试完整更新',
          shouldFallbackToFullUpdate: true 
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 确定要使用的提供者
    let provider: LLMProvider;

    if (providerParam && Object.values(LLMProvider).includes(providerParam as LLMProvider)) {
      provider = providerParam as LLMProvider;
    } else {
      // 使用环境变量中的默认提供者或回退到DeepSeek
      provider = (process.env.DEFAULT_PROVIDER as LLMProvider) || LLMProvider.DEEPSEEK;
    }

    // 创建提供者客户端
    const providerClient = createProviderClient(provider);

    // 如果只需要更新一个片段，直接生成并返回
    if (updatePrompts.length === 1) {
      const { fragmentId, prompt } = updatePrompts[0];
      const fragment = updateManager.getFragment(fragmentId);
      
      if (!fragment) {
        return new Response(
          JSON.stringify({ error: `无法找到ID为${fragmentId}的代码片段` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 根据片段类型生成特定的系统提示
      let systemPrompt = "";
      switch (fragment.type) {
        case 'css':
          systemPrompt = useDiffMode 
            ? "你是CSS代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。"
            : "你是一位CSS专家。根据用户请求，只修改CSS代码。不要包含任何解释、注释或markdown格式。只返回完整的、修改后的CSS代码。";
          break;
        case 'js':
          systemPrompt = useDiffMode
            ? "你是JavaScript代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。"
            : "你是一位JavaScript专家。根据用户请求，只修改JavaScript代码。不要包含任何解释、注释或markdown格式。只返回完整的、修改后的JavaScript代码。";
          break;
        case 'html':
          systemPrompt = useDiffMode
            ? "你是HTML代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。保留所有class和id。"
            : "你是一位HTML专家。根据用户请求，只修改HTML结构。保留所有类名和ID以确保CSS和JavaScript的正常工作。不要修改<style>和<script>标签的内容，保持它们为空。不要包含任何解释、注释或markdown格式。只返回完整的、修改后的HTML代码。";
          break;
        default:
          systemPrompt = useDiffMode
            ? "你是代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。"
            : "根据用户请求，修改提供的代码。只返回修改后的代码，不要包含任何解释、注释或markdown格式。";
      }
      
      console.log('Using system prompt:', systemPrompt.substring(0, 100) + '...');

      // 准备请求参数
      const requestData = {
        currentCode: currentCode,
        modificationPrompt,
        fragmentId: fragmentId,
        model,
        provider,
        maxTokens,
        useDiffMode
      };

      // 生成代码
      const stream = await providerClient.generateCode(prompt, model, systemPrompt, maxTokens ? parseInt(maxTokens.toString(), 10) : undefined);
      
      // 创建一个转换流，用于处理生成的代码片段
      const textEncoder = new TextEncoder();
      const transformStream = new TransformStream({
        start(controller) {
          controller.enqueue(textEncoder.encode(JSON.stringify({
            fragmentId,
            type: 'start',
            content: ''
          }) + '\n'));
        },
        transform(chunk, controller) {
          const content = new TextDecoder().decode(chunk);
          controller.enqueue(textEncoder.encode(JSON.stringify({
            fragmentId,
            type: 'chunk',
            content
          }) + '\n'));
        },
        flush(controller) {
          controller.enqueue(textEncoder.encode(JSON.stringify({
            fragmentId,
            type: 'end',
            content: ''
          }) + '\n'));
        }
      });
      
      // 存储累积的内容
      let accumulatedContent = '';
      
      // 读取原始流并处理
      const reader = stream.getReader();
      const processedStream = new ReadableStream({
        async start(controller) {
          // 发送开始信号
          controller.enqueue(textEncoder.encode(JSON.stringify({
            fragmentId,
            type: 'start',
            content: ''
          }) + '\n'));
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;
              
              // 解码并累积内容
              const content = new TextDecoder().decode(value);
              accumulatedContent += content;
              
              // 添加调试日志，查看模型返回内容
              if (content.includes('CHANGE:') || content.includes('DELETE:') || content.includes('INSERT AFTER')) {
                console.log('Found diff instruction in model response:', content.substring(0, 100) + '...');
              }
              
              // 发送chunk
              controller.enqueue(textEncoder.encode(JSON.stringify({
                fragmentId,
                type: 'chunk',
                content
              }) + '\n'));
            }
            
            // 完整的累积内容样本（限制长度）
            console.log('Accumulated content sample:', accumulatedContent.substring(0, 300) + '...');
            
            // 如果启用了差异化模式且有累积内容
            if (useDiffMode && accumulatedContent && fragment) {
              try {
                console.log('Processing accumulated content with diff mode');
                
                // 检查模型响应是否符合差异化格式
                const hasDiffFormat = 
                  accumulatedContent.includes('CHANGE:') || 
                  accumulatedContent.includes('DELETE:') || 
                  accumulatedContent.includes('INSERT AFTER');
                
                if (!hasDiffFormat) {
                  console.log('模型未返回差异化格式，尝试处理完整代码');
                }
                
                // 处理差异化更新
                const processedContent = updateManager.processFragmentUpdate(fragmentId, accumulatedContent);
                
                // 检查处理前后的内容是否发生变化
                const changeOccurred = processedContent !== fragment.content;
                console.log(`内容是否发生变化: ${changeOccurred}`);
                
                if (changeOccurred) {
                  // 发送处理后的内容
                  controller.enqueue(textEncoder.encode(JSON.stringify({
                    fragmentId,
                    type: 'processed',
                    content: processedContent
                  }) + '\n'));
                  
                  // 更新片段内容
                  updateManager.updateFragment(fragmentId, processedContent);
                } else {
                  console.log('处理后内容未变化，可能模型返回格式有问题');
                }
              } catch (error) {
                console.error('Error processing diff update:', error);
              }
            }
            
            // 发送结束信号
            controller.enqueue(textEncoder.encode(JSON.stringify({
              fragmentId,
              type: 'end',
              content: ''
            }) + '\n'));
            
            controller.close();
          } catch (error) {
            console.error('Error processing stream:', error);
            controller.error(error);
          }
        }
      });

      return new Response(processedStream, {
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
        },
      });
    } else if (updatePrompts.length > 1) {
      // 如果需要更新多个片段，创建一个异步生成器处理多个片段的更新
      const textEncoder = new TextEncoder();
      
      const multipleFragmentsStream = new ReadableStream({
        async start(controller) {
          // 依次处理每个片段
          for (const { fragmentId, prompt } of updatePrompts) {
            try {
              const fragment = updateManager.getFragment(fragmentId);
              if (!fragment) continue;
              
              // 准备请求参数
              const requestData = {
                currentCode: currentCode,
                modificationPrompt,
                fragmentId: fragmentId,
                model,
                provider,
                maxTokens,
                useDiffMode
              };
              
              // 根据片段类型生成特定的系统提示
              let systemPrompt = "";
              switch (fragment.type) {
                case 'css':
                  systemPrompt = useDiffMode 
                    ? "你是CSS代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。"
                    : "你是一位CSS专家。根据用户请求，只修改CSS代码。不要包含任何解释、注释或markdown格式。只返回完整的、修改后的CSS代码。";
                  break;
                case 'js':
                  systemPrompt = useDiffMode
                    ? "你是JavaScript代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。"
                    : "你是一位JavaScript专家。根据用户请求，只修改JavaScript代码。不要包含任何解释、注释或markdown格式。只返回完整的、修改后的JavaScript代码。";
                  break;
                case 'html':
                  systemPrompt = useDiffMode
                    ? "你是HTML代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。保留所有class和id。"
                    : "你是一位HTML专家。根据用户请求，只修改HTML结构。保留所有类名和ID以确保CSS和JavaScript的正常工作。不要修改<style>和<script>标签的内容，保持它们为空。不要包含任何解释、注释或markdown格式。只返回完整的、修改后的HTML代码。";
                  break;
                default:
                  systemPrompt = useDiffMode
                    ? "你是代码编辑器。只输出差异化变更指令，格式为'CHANGE: 行号-行号 替换为:' 或 'DELETE: 行号-行号' 或 'INSERT AFTER 行号:'。不返回完整代码，不做解释，不使用代码块格式。"
                    : "根据用户请求，修改提供的代码。只返回修改后的代码，不要包含任何解释、注释或markdown格式。";
              }
              
              // 通知开始处理该片段
              controller.enqueue(textEncoder.encode(JSON.stringify({
                fragmentId,
                type: 'start',
                content: ''
              }) + '\n'));
              
              // 生成代码
              const stream = await providerClient.generateCode(
                prompt, 
                model, 
                systemPrompt, 
                maxTokens ? parseInt(maxTokens.toString(), 10) : undefined
              );
              
              const reader = stream.getReader();
              let accumulatedContent = '';
              
              // 读取流中的内容
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const content = new TextDecoder().decode(value);
                accumulatedContent += content;
                
                // 发送片段内容
                controller.enqueue(textEncoder.encode(JSON.stringify({
                  fragmentId,
                  type: 'chunk',
                  content
                }) + '\n'));
              }
              
              // 处理差异化更新
              let finalContent = accumulatedContent;
              if (fragment && useDiffMode) {
                try {
                  console.log(`Processing fragment ${fragmentId} with diff mode`);
                  finalContent = updateManager.processFragmentUpdate(fragmentId, accumulatedContent);
                  
                  // 发送处理后的完整内容
                  controller.enqueue(textEncoder.encode(JSON.stringify({
                    fragmentId,
                    type: 'processed',
                    content: finalContent
                  }) + '\n'));
                } catch (error) {
                  console.error('Error processing diff update:', error);
                }
              }
              
              // 通知该片段处理完成
              controller.enqueue(textEncoder.encode(JSON.stringify({
                fragmentId,
                type: 'end',
                content: ''
              }) + '\n'));
              
              // 更新片段内容
              updateManager.updateFragment(fragmentId, finalContent);
            } catch (error) {
              console.error(`Error processing fragment ${fragmentId}:`, error);
              // 发送错误信息
              controller.enqueue(textEncoder.encode(JSON.stringify({
                fragmentId,
                type: 'error',
                content: error instanceof Error ? error.message : '处理代码片段时出错'
              }) + '\n'));
            }
          }
          
          // 所有片段都处理完成后，发送完整的HTML
          const fullHtml = updateManager.getFullHTML();
          controller.enqueue(textEncoder.encode(JSON.stringify({
            fragmentId: 'full-html',
            type: 'complete',
            content: fullHtml
          }) + '\n'));
          
          controller.close();
        }
      });
      
      return new Response(multipleFragmentsStream, {
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      // 如果没有可更新的片段，返回错误
      return new Response(
        JSON.stringify({ error: '无法确定要更新的代码片段' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in incremental code generation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '增量代码生成时发生错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 