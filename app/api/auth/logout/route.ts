import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: '登出成功' });
  
  // 使用与登录时相同的 cookie 配置
  response.cookies.delete({
    name: 'token',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.weilai.ai' : undefined
  });
  
  return response;
} 