import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getWebsiteById, updateWebsite } from '@/lib/storage';

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
    const website = await getWebsiteById(id);
    if (!website) {
      return new NextResponse('Website not found', { status: 404 });
    }

    // 确保只能修改自己的网站
    if (website.userId !== user.userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    const { isFeatured } = body;

    if (typeof isFeatured !== 'boolean') {
      return new NextResponse('Invalid isFeatured value', { status: 400 });
    }

    const success = await updateWebsite(id, { isFeatured });
    
    if (!success) {
      return new NextResponse('Failed to update website', { status: 500 });
    }

    return NextResponse.json({ success: true, isFeatured });
  } catch (error) {
    console.error('更新网站首页展示状态失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 