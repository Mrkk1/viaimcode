import { NextRequest, NextResponse } from 'next/server';
import { pptDb } from '@/lib/ppt-db';
import { getCurrentUser } from '@/lib/auth';

// 创建PPT任务
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

    const projectId = await pptDb.createProject({
      userId: user.userId,
      title,
      prompt,
      model,
      provider
    });

    return NextResponse.json({ projectId });
  } catch (error) {
    console.error('创建PPT任务失败:', error);
    return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
  }
}

// 获取用户的PPT任务列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const tasks = await pptDb.getUserProjects(user.userId, limit, offset);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('获取PPT任务失败:', error);
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 });
  }
} 