import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProjectById, getVersionById, deleteVersion } from '@/lib/storage';

// 删除特定版本
export async function DELETE(
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

    // 不能删除当前版本
    if (project.currentVersionId === versionId) {
      return new NextResponse('Cannot delete current version', { status: 400 });
    }

    // 删除版本
    const success = await deleteVersion(versionId);
    if (!success) {
      return new NextResponse('Failed to delete version', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('删除版本失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 