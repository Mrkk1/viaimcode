import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createProject, getUserProjects } from '@/lib/storage';

// 获取用户的所有项目
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');
    const searchTerm = searchParams.get('search') || '';

    const { projects, total } = await getUserProjects(user.userId, page, pageSize, searchTerm);
    
    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      projects,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 创建新项目
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { title, description, prompt, model, provider, thumbnail } = body;

    if (!title) {
      return new NextResponse('Title is required', { status: 400 });
    }

    const project = await createProject(
      {
        title,
        description,
        prompt,
        model,
        provider,
        thumbnail,
        userId: user.userId
      },
      user.userId
    );

    return NextResponse.json(project);
  } catch (error) {
    console.error('创建项目失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 