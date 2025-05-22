import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// 需要登录才能访问的路由
const protectedRoutes = [
  '/websites',
];

// 公开路由
const publicRoutes = [
  '/login',
  '/register',
];

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// 验证 JWT token
async function verifyAuth(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { userId: string; username: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 跳过静态资源和API路由
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // 验证用户状态
  const user = token ? await verifyAuth(token) : null;

  // 处理公开路由（登录、注册）
  if (isPublicRoute) {
    // 如果用户已登录且尝试访问登录/注册页面，重定向到首页
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 处理受保护路由
  if (isProtectedRoute) {
    // 如果用户未登录或token无效，重定向到登录页
    if (!user) {
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 处理首页
  if (pathname === '/') {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路由:
     * - `/`
     * - `/websites` 和其子路由
     * - `/login`
     * - `/register`
     */
    '/',
    '/websites/:path*',
    '/login',
    '/register',
  ],
}; 