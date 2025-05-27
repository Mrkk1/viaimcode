import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProjectById, getProjectVersions, createVersion } from '@/lib/storage';
import { uploadImage } from '@/lib/image-upload';

// 获取项目的所有版本
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    // 验证项目所有权
    if (project.userId !== user.userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const versions = await getProjectVersions(id);
    return NextResponse.json(versions);
  } catch (error) {
    console.error('获取版本列表失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 创建新版本
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    // 验证项目所有权
    if (project.userId !== user.userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    const { code, thumbnail, type, title, description, originalVersionId } = body;

    if (!code || !type) {
      return new NextResponse('Code and type are required', { status: 400 });
    }

    // 如果有缩略图数据，先上传到云存储
    let thumbnailUrl = '';
    if (thumbnail && thumbnail.length > 1000) {
      try {
        const filename = `version-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
        // 使用结构化的目录：/users/{userId}/{projectId}/versions/
        thumbnailUrl = await uploadImage(thumbnail, filename, true, {
          userId: user.userId,
          taskId: id, // 使用项目ID作为任务ID
          subFolder: 'versions'
        });

      } catch (error) {
        console.error('上传缩略图失败:', error);
        // 继续创建版本，即使缩略图上传失败
      }
    }

    const version = await createVersion(
      {
        projectId: id,
        code,
        thumbnail: thumbnailUrl, // 使用上传后的URL而不是base64数据
        type,
        title,
        description,
        originalVersionId,
        creatorId: user.userId
      },
      user.userId
    );

    return NextResponse.json(version);
  } catch (error) {
    console.error('创建版本失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 