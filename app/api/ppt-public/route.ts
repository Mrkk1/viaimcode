import { NextRequest, NextResponse } from 'next/server';
import { pptDb } from '@/lib/ppt-db';

// 获取公开的PPT项目列表
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const featured = url.searchParams.get('featured') === 'true';

    let projects;
    if (featured) {
      // 获取精选项目
      projects = await pptDb.getFeaturedProjects(limit, offset);
    } else {
      // 获取所有公开项目
      projects = await pptDb.getPublicProjects(limit, offset);
    }

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        limit,
        offset,
        hasMore: projects.length === limit
      }
    });
  } catch (error) {
    console.error('获取公开PPT项目失败:', error);
    return NextResponse.json({ error: '获取项目列表失败' }, { status: 500 });
  }
} 