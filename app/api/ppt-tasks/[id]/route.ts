import { NextRequest, NextResponse } from 'next/server';
import { pptDb } from '@/lib/ppt-db';
import { getCurrentUser } from '@/lib/auth';

// 获取单个PPT任务详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id } = await params;
    const projectData = await pptDb.getProjectWithDetails(id);

    if (!projectData.project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    // 检查权限：只有项目所有者可以查看
    if (projectData.project.userId !== user.userId) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 为了保持前端兼容性，将project重命名为task
    const responseData = {
      task: projectData.project,
      outline: projectData.outline,
      slides: projectData.slides,
      chatMessages: projectData.chatMessages
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('获取PPT任务详情失败:', error);
    return NextResponse.json({ error: '获取任务详情失败' }, { status: 500 });
  }
}

// 更新PPT任务状态或信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, status, progress, errorMessage, isFeatured, title, prompt, outline, slideIndex, slideData, messageType, content } = body;

    // 获取项目信息检查权限
    const project = await pptDb.getProject(id);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    if (project.userId !== user.userId) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 根据action执行不同操作
    switch (action) {
      case 'update_info':
        // 更新项目基本信息
        if (title !== undefined || prompt !== undefined) {
          await pptDb.updateProjectInfo(id, title, prompt);
        }
        break;

      case 'save_outline':
        // 保存大纲
        if (outline) {
          await pptDb.saveOutline(id, outline.title || '未命名PPT', outline);
        }
        break;

      case 'save_slide':
        // 保存幻灯片
        if (slideIndex !== undefined && slideData) {
          await pptDb.saveSlide(id, slideIndex, slideData);
        }
        break;

      case 'add_chat_message':
        // 添加聊天消息
        console.log('API: 处理add_chat_message请求', {
          projectId: id,
          messageType,
          contentLength: content?.length,
          contentPreview: content?.substring(0, 100) + (content?.length > 100 ? '...' : '')
        });
        
        if (messageType && content) {
          const messageId = await pptDb.addChatMessage(id, messageType, content);
          console.log('API: 聊天消息添加成功', { messageId });
        } else {
          console.error('API: 缺少必要参数', { messageType, hasContent: !!content });
          return NextResponse.json({ error: '缺少必要参数: messageType 或 content' }, { status: 400 });
        }
        break;

      case 'complete_project':
        // 完成项目
        await pptDb.updateProjectStatus(id, 'completed', 100);
        break;

      default:
        // 兼容旧的更新方式
        // 更新项目状态
        if (status !== undefined) {
          await pptDb.updateProjectStatus(id, status, progress, errorMessage);
        }

        // 更新精选状态（可能需要管理员权限）
        if (isFeatured !== undefined) {
          await pptDb.setProjectFeatured(id, isFeatured);
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新PPT任务失败:', error);
    return NextResponse.json({ error: '更新任务失败' }, { status: 500 });
  }
}

// 删除PPT项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id } = await params;

    // 获取项目信息检查权限
    const project = await pptDb.getProject(id);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    if (project.userId !== user.userId) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 检查项目大小，决定是否使用后台删除
    const projectDetails = await pptDb.getProjectWithDetails(id);
    const slideCount = projectDetails.slides.length;
    const messageCount = projectDetails.chatMessages.length;
    
    // 如果项目较大（超过20页或100条消息），先返回成功响应，然后后台删除
    if (slideCount > 20 || messageCount > 100) {
      // 立即返回成功，避免前端等待
      const deleteResponse = NextResponse.json({ success: true, message: '大型项目正在后台删除中...' });
      
      // 后台异步删除
      setImmediate(async () => {
        try {
          await pptDb.deleteProject(id);
          console.log(`大型项目 ${id} 删除完成`);
        } catch (error) {
          console.error(`后台删除项目 ${id} 失败:`, error);
        }
      });
      
      return deleteResponse;
    }

    // 小型项目直接删除
    await pptDb.deleteProject(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除PPT项目失败:', error);
    return NextResponse.json({ error: '删除项目失败' }, { status: 500 });
  }
} 