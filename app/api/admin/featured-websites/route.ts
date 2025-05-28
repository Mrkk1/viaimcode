import { NextResponse } from 'next/server';
import { getAllWebsites, updateWebsite } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

// 管理员用户ID列表（在实际项目中应该从数据库或环境变量获取）
const ADMIN_USER_IDS = [
  'e9a038af-8794-41ac-b641-90778e006000', // jappre
  '52878a06-09f4-42a5-bfd4-9c1a435b3b07', // yuweilong@vision-intelligence.tech
  // 可以添加更多管理员ID
];

// 检查是否为管理员
function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

// 获取所有网站列表（管理员专用）
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!isAdmin(user.userId)) {
      return new NextResponse('Forbidden: Admin access required', { status: 403 });
    }

    // 获取所有网站（不限制用户）
    const websites = await getAllWebsites(''); // 传空字符串获取所有网站
    return NextResponse.json(websites);
  } catch (error) {
    console.error('获取网站列表失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 设置网站Featured状态（管理员专用）
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!isAdmin(user.userId)) {
      return new NextResponse('Forbidden: Admin access required', { status: 403 });
    }

    const { websiteId, isFeatured } = await request.json();

    if (!websiteId || typeof isFeatured !== 'boolean') {
      return new NextResponse('Invalid request data', { status: 400 });
    }

    const success = await updateWebsite(websiteId, { isFeatured });
    
    if (!success) {
      return new NextResponse('Failed to update website', { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新Featured状态失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 