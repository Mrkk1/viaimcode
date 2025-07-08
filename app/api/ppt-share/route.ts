import { NextRequest, NextResponse } from 'next/server';
import { pptDb } from '@/lib/ppt-db';
import { getCurrentUser } from '@/lib/auth';

// 分享PPT项目
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { projectId, isPublic = true } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }

    // 验证项目存在且属于当前用户
    const project = await pptDb.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    if (project.userId !== user.userId) {
      return NextResponse.json({ error: '无权限操作此项目' }, { status: 403 });
    }

    // 更新项目的公开状态
    await pptDb.updateProjectPublicStatus(projectId, isPublic);

    // 生成分享链接
    const shareUrl = `/ppt-share/${projectId}`;
    const fullShareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${shareUrl}`;

    return NextResponse.json({
      success: true,
      shareUrl: fullShareUrl,
      isPublic
    });
  } catch (error) {
    console.error('分享PPT失败:', error);
    return NextResponse.json({ error: '分享失败' }, { status: 500 });
  }
}

// 获取分享信息
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }

    const project = await pptDb.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    // 检查项目是否公开
    if (!project.isPublic) {
      return NextResponse.json({ error: '项目未公开' }, { status: 403 });
    }

    const shareUrl = `/ppt-share/${projectId}`;
    const fullShareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${shareUrl}`;

    return NextResponse.json({
      success: true,
      shareUrl: fullShareUrl,
      isPublic: project.isPublic,
      project: {
        id: project.id,
        title: project.title,
        createdAt: project.createdAt,
        totalSlides: project.totalSlides,
        completedSlides: project.completedSlides,
        status: project.status
      }
    });
  } catch (error) {
    console.error('获取分享信息失败:', error);
    return NextResponse.json({ error: '获取分享信息失败' }, { status: 500 });
  }
} 