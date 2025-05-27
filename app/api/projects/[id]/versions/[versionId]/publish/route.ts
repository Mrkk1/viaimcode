import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProjectById, getVersionById, updateVersionPublishStatus } from '@/lib/storage';

// 更新版本的发布状态
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id, versionId } = await params;
    
    // 验证项目存在
    const project = await getProjectById(id);
    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    // 验证项目所有权
    if (project.userId !== user.userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 验证版本存在
    const version = await getVersionById(versionId);
    if (!version) {
      return new NextResponse('Version not found', { status: 404 });
    }

    // 确保版本属于该项目
    if (version.projectId !== id) {
      return new NextResponse('Version does not belong to this project', { status: 400 });
    }

    const body = await request.json();
    const { isPublished, shareUrl } = body;

    // 更新版本的发布状态
    const success = await updateVersionPublishStatus(versionId, {
      isPublished,
      shareUrl
    });

    if (!success) {
      return new NextResponse('Failed to update version', { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新版本发布状态失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 