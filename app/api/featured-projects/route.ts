import { NextResponse } from 'next/server';
import { getFeaturedProjects } from '@/lib/storage';

// 获取优秀项目列表（公开接口，不需要登录）
export async function GET() {
  try {
    const featuredProjects = await getFeaturedProjects();
    return NextResponse.json(featuredProjects);
  } catch (error) {
    console.error('获取优秀项目失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 