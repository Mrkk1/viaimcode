import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/users';
import { generateToken } from '@/lib/auth';
import { LoginData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as LoginData;
    
    // 验证用户
    const user = await verifyUser(data);

    // 生成 token
    const token = await generateToken({
      userId: user.id,
      username: user.username
    });

    // 创建响应
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
      },
    });

    // 设置 cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      domain: process.env.NODE_ENV === 'production' ? '.weilai.ai' : undefined,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    );
  }
} 