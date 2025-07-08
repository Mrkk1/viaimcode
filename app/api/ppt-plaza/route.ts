import { NextRequest, NextResponse } from 'next/server';
import { pptDb } from '@/lib/ppt-db';

// 获取PPT广场的精选任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const projects = await pptDb.getFeaturedProjects(limit, offset);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('获取PPT广场失败:', error);
    return NextResponse.json({ error: '获取PPT广场失败' }, { status: 500 });
  }
} 