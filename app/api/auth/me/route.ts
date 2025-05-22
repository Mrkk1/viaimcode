import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(null);
    }

    const user = await verifyToken(token);
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(null);
  }
} 