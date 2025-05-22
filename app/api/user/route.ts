import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 