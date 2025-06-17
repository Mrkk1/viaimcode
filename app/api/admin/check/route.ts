import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// 管理员用户ID列表（与featured-websites路由保持一致）
const ADMIN_USER_IDS = [
  'e9a038af-8794-41ac-b641-90778e006000', // jappre
  '52878a06-09f4-42a5-bfd4-9c1a435b3b07', // yuweilong@vision-intelligence.tech
  // 可以添加更多管理员ID
];

// 检查是否为管理员
function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!isAdmin(user.userId)) {
      return new NextResponse('Forbidden: Admin access required', { status: 403 });
    }

    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error('检查管理员权限失败:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 