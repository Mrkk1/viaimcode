import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllWebsites } from '@/lib/storage';

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

    const { websites, total } = await getAllWebsites(user.userId, page, pageSize, searchTerm);
    
    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      websites,
      pagination: {
        currentPage: page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('获取网站列表失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 