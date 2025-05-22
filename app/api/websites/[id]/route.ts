import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteWebsite, getWebsiteById } from '@/lib/storage';

export async function DELETE(
  request: Request,
  args: any
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const website = await getWebsiteById(args.params.id);
    if (!website) {
      return new NextResponse('Not found', { status: 404 });
    }

    // 确保只能删除自己的网站
    if (website.userId !== user.userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await deleteWebsite(args.params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('删除网站失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 