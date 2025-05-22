import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllWebsites } from '@/lib/storage';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const websites = await getAllWebsites(user.userId);
    return NextResponse.json(websites);
  } catch (error) {
    console.error('获取网站列表失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 