import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { RegisterData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as RegisterData;
    
    // 验证密码
    if (data.password !== data.confirmPassword) {
      return NextResponse.json(
        { message: '两次输入的密码不一致' },
        { status: 400 }
      );
    }

    // 创建用户
    const user = await createUser(data);

    return NextResponse.json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '注册失败' },
      { status: 500 }
    );
  }
} 