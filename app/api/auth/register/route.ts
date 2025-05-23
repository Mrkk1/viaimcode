import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { RegisterData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as RegisterData;
    
    // 验证密码
    if (data.password !== data.confirmPassword) {
      return NextResponse.json(
        { message: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // 创建用户
    const user = await createUser(data);

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
} 