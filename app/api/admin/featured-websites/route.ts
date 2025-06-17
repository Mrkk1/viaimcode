import { NextResponse } from 'next/server';
import { getAllWebsites, updateWebsite } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { getPool } from '@/lib/db';

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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');
    const searchTerm = searchParams.get('search') || '';
    const featured = searchParams.get('featured') || 'all';

    // 构建SQL查询条件
    let whereClause = '';
    const params: any[] = [];

    // 添加搜索条件
    if (searchTerm) {
      whereClause = 'WHERE (w.title LIKE ? OR w.description LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    // 添加Featured筛选条件
    if (featured !== 'all') {
      whereClause = whereClause 
        ? `${whereClause} AND w.isFeatured = ?` 
        : 'WHERE w.isFeatured = ?';
      params.push(featured === 'featured' ? 1 : 0);
    }

    // 添加分页参数
    params.push(pageSize, (page - 1) * pageSize);

    // 执行查询
    const pool = getPool();
    const query = `
      SELECT SQL_CALC_FOUND_ROWS
        w.id, w.userId, w.title, w.description, 
        w.thumbnailUrl, w.isFeatured, w.createdAt,
        u.username as authorName 
      FROM websites w
      JOIN users u ON w.userId = u.id 
      ${whereClause}
      ORDER BY w.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query('SELECT FOUND_ROWS() as total');
    const total = (countRows as any)[0].total;

    return NextResponse.json({
      websites: rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
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