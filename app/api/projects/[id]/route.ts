import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProjectById, updateProject, deleteProject } from '@/lib/storage';

// 获取项目详情
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

    return NextResponse.json(project);
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 更新项目
export async function PUT(
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
    const success = await updateProject(id, body);

    if (!success) {
      return new NextResponse('Failed to update project', { status: 500 });
    }

    const updatedProject = await getProjectById(id);
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('更新项目失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 删除项目
export async function DELETE(
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

    const success = await deleteProject(id);
    if (!success) {
      return new NextResponse('Failed to delete project', { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('删除项目失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 