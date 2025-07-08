import { NextRequest, NextResponse } from 'next/server';
import { pptDb } from '@/lib/ppt-db';
import { getCurrentUser } from '@/lib/auth';

// 创建PPT生成任务并开始后台生成
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { title, prompt, model, provider } = await request.json();

    if (!title || !prompt || !model || !provider) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 创建项目
    const projectId = await pptDb.createProject({
      userId: user.userId,
      title,
      prompt,
      model,
      provider
    });

    // 添加初始聊天消息
    await pptDb.addChatMessage(projectId, 'user', prompt);

    // 启动后台生成任务（异步）
    generatePPTInBackground(projectId, prompt, model, provider);

    return NextResponse.json({ projectId });
  } catch (error) {
    console.error('创建PPT生成任务失败:', error);
    return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
  }
}

// 后台生成PPT的函数
async function generatePPTInBackground(projectId: string, prompt: string, model: string, provider: string) {
  try {
    // 更新项目状态为生成大纲
    await pptDb.updateProjectStatus(projectId, 'generating_outline', 10);
    
    // 添加AI思考消息
    const thinkingMsgId = await pptDb.addChatMessage(projectId, 'ai', '开始思考PPT结构...', true);

    // 第一步：生成大纲
    console.log(`任务 ${projectId} - 开始生成大纲`);
    
    // 使用内部API调用，不需要完整URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const outlineResponse = await fetch(`${baseUrl}/api/generate-ppt-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, provider }),
    });

    if (!outlineResponse.ok) {
      const errorText = await outlineResponse.text();
      console.error('大纲生成API错误:', outlineResponse.status, errorText);
      throw new Error(`大纲生成失败: ${outlineResponse.status} - ${errorText}`);
    }

    const reader = outlineResponse.body?.getReader();
    if (!reader) {
      throw new Error('无法读取大纲生成流');
    }

    let receivedContent = "";
    let thinkingContent = "";
    let outlineContent = "";

    // 处理流式大纲生成
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'content' && data.content) {
            receivedContent += data.content;
            
            // 检查思考标签
            const thinkingStartIndex = receivedContent.indexOf("<think>");
            const thinkingEndIndex = receivedContent.indexOf("</think>");
            
            if (thinkingStartIndex !== -1 && thinkingEndIndex !== -1) {
              thinkingContent = receivedContent.substring(thinkingStartIndex + 7, thinkingEndIndex);
              outlineContent = receivedContent.substring(thinkingEndIndex + 8);
              
              // 更新思考消息
              await pptDb.updateChatMessage(thinkingMsgId, `思考过程：\n${thinkingContent}`, false);
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 解析大纲
    let outlineData: { outline: any };
    try {
      const jsonMatch = outlineContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0]
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/,(\s*[}\]])/g, '$1')
          .trim();
        
        const parsedOutline = JSON.parse(jsonString);
        outlineData = { outline: parsedOutline };
      } else {
        throw new Error('无法解析大纲JSON');
      }
    } catch (e) {
      console.error('大纲解析失败:', e);
      // 使用默认大纲
      outlineData = {
        outline: {
          title: prompt.substring(0, 50),
          slides: [
            { title: "标题页", content: "介绍", keyPoints: ["概述"] },
            { title: "内容页", content: "主要内容", keyPoints: ["要点1", "要点2"] },
            { title: "总结页", content: "总结", keyPoints: ["结论"] }
          ]
        }
      };
    }

    // 保存大纲
    await pptDb.saveOutline(projectId, outlineData.outline.title, outlineData.outline);
    
    // 添加大纲完成消息
    await pptDb.addChatMessage(projectId, 'ai', `✅ PPT大纲生成完成！\n\n**${outlineData.outline.title}**\n\n共${outlineData.outline.slides.length}页幻灯片：\n${outlineData.outline.slides.map((slide: any, index: number) => `${index + 1}. ${slide.title}`).join('\n')}`);

    // 更新任务状态为生成幻灯片
    await pptDb.updateProjectStatus(projectId, 'generating_slides', 30);
    await pptDb.updateProjectSlideCount(projectId, outlineData.outline.slides.length, 0);

    // 创建幻灯片记录
    const slideData = outlineData.outline.slides.map((slide: any, index: number) => ({
      slideIndex: index,
      title: slide.title,
      content: slide.content
    }));
    await pptDb.createSlides(projectId, slideData);

    // 第二步：逐一生成幻灯片
    console.log(`任务 ${projectId} - 开始生成${outlineData.outline.slides.length}页幻灯片`);
    
    for (let index = 0; index < outlineData.outline.slides.length; index++) {
      const slide = outlineData.outline.slides[index];
      
      try {
        console.log(`任务 ${projectId} - 开始生成第${index + 1}页: ${slide.title}`);
        
        // 更新幻灯片状态
        await pptDb.updateSlideStatus(projectId, index, 'thinking', `第1步：开始思考设计方案...`);
        
        // 获取前一页信息作为风格参考
        let previousSlideInfo = '';
        if (index > 0) {
          const prevSlides = await pptDb.getSlides(projectId);
          const prevSlide = prevSlides.find(s => s.slideIndex === index - 1);
          if (prevSlide && prevSlide.htmlCode) {
            previousSlideInfo = `前一页设计参考：${prevSlide.title}`;
          }
        }

        // 生成思考内容
        const thinkingResponse = await fetch(`${baseUrl}/api/generate-ppt-thinking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slide: slide,
            slideIndex: index,
            totalSlides: outlineData.outline.slides.length,
            theme: 'auto',
            model,
            provider,
            previousSlideInfo
          }),
        });

        if (!thinkingResponse.ok) {
          throw new Error(`思考生成失败: ${thinkingResponse.statusText}`);
        }

        const thinkingReader = thinkingResponse.body?.getReader();
        if (!thinkingReader) {
          throw new Error('无法读取思考生成流');
        }

        let thinkingContent = "";
        
        // 处理思考流
        while (true) {
          const { done, value } = await thinkingReader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'content' && data.content) {
                thinkingContent += data.content;
                
                // 实时更新思考内容
                await pptDb.updateSlideContent(projectId, index, {
                  thinkingContent: thinkingContent,
                  progress: `第1步：思考中... (${thinkingContent.length}字符)`
                });
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }

        // 更新思考完成状态
        await pptDb.updateSlideContent(projectId, index, {
          thinkingContent: thinkingContent,
          status: 'generating',
          progress: '第2步：基于思考结果生成HTML代码...'
        });

        // 生成HTML代码
        const htmlResponse = await fetch(`${baseUrl}/api/generate-ppt-html`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slide: slide,
            slideIndex: index,
            totalSlides: outlineData.outline.slides.length,
            theme: 'auto',
            model,
            provider,
            previousSlideInfo,
            thinkingContent
          }),
        });

        if (!htmlResponse.ok) {
          throw new Error(`HTML生成失败: ${htmlResponse.statusText}`);
        }

        const htmlReader = htmlResponse.body?.getReader();
        if (!htmlReader) {
          throw new Error('无法读取HTML生成流');
        }

        let htmlContent = "";
        
        // 处理HTML流
        while (true) {
          const { done, value } = await htmlReader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'content' && data.content) {
                htmlContent += data.content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }

        // 清理HTML代码
        let finalHtmlCode = htmlContent.replace(/```html\s*/g, '').replace(/```\s*/g, '').trim();
        
        // 检查HTML完整性
        const isHTMLComplete = finalHtmlCode.includes('<!DOCTYPE html>') && 
                              finalHtmlCode.includes('</html>') &&
                              finalHtmlCode.trim().endsWith('</html>');
        
        if (!isHTMLComplete) {
          if (finalHtmlCode.includes('<!DOCTYPE html>') && !finalHtmlCode.includes('</html>')) {
            if (!finalHtmlCode.includes('</body>')) {
              finalHtmlCode += '\n</body>';
            }
            if (!finalHtmlCode.includes('</html>')) {
              finalHtmlCode += '\n</html>';
            }
          }
        }

        // 更新幻灯片完成状态
        await pptDb.updateSlideContent(projectId, index, {
          htmlCode: finalHtmlCode,
          status: 'completed',
          progress: '✅ 生成完成'
        });

        // 更新任务进度
        const completedSlides = index + 1;
        const progress = 30 + Math.floor((completedSlides / outlineData.outline.slides.length) * 60);
        await pptDb.updateProjectSlideCount(projectId, outlineData.outline.slides.length, completedSlides);
        await pptDb.updateProjectStatus(projectId, 'generating_slides', progress);

        console.log(`任务 ${projectId} - 第${index + 1}页生成完成`);

      } catch (error) {
        console.error(`任务 ${projectId} - 第${index + 1}页生成失败:`, error);
        
        // 更新幻灯片失败状态
        await pptDb.updateSlideContent(projectId, index, {
          status: 'failed',
          progress: '❌ 生成失败'
        });
      }
    }

    // 任务完成
    await pptDb.updateProjectStatus(projectId, 'completed', 100);
    await pptDb.addChatMessage(projectId, 'ai', `🎉 PPT全部生成完成！\n\n您可以在右侧预览所有幻灯片，或点击下载按钮保存为HTML文件。`);

    console.log(`任务 ${projectId} - 全部生成完成`);

  } catch (error) {
    console.error(`任务 ${projectId} 生成失败:`, error);
    
    // 更新任务失败状态
    await pptDb.updateProjectStatus(projectId, 'failed', 0, error instanceof Error ? error.message : '未知错误');
    await pptDb.addChatMessage(projectId, 'ai', `❌ PPT生成过程中出现错误\n\n错误信息：${error}\n\n请检查网络连接或稍后重试。`);
  }
} 