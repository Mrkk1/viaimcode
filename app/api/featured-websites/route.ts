import { NextResponse } from 'next/server';
import { getFeaturedWebsites } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    
    const featuredWebsites = await getFeaturedWebsites(limit);
    return NextResponse.json(featuredWebsites);
  } catch (error) {
    console.error('获取首页展示网站失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 