import { getPool } from './db';
import { User, LoginData, RegisterData } from './types';
import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { hashPassword, verifyPassword } from './crypto';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// 创建用户
export async function createUser(data: RegisterData): Promise<User> {
  const pool = getPool();
  const id = uuidv4();
  const hashedPassword = await hashPassword(data.password);

  try {
    await pool.execute(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [id, data.username, hashedPassword]
    );

    return {
      id,
      username: data.username,
      createdAt: new Date()
    };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('用户名已存在');
    }
    throw error;
  }
}

// 验证用户登录
export async function verifyUser(data: LoginData): Promise<User> {
  const pool = getPool();
  
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ?',
    [data.username]
  );

  const users = rows as User[];
  const user = users[0];

  if (!user || !user.password) {
    throw new Error('用户名或密码错误');
  }

  const isValid = await verifyPassword(data.password, user.password);
  if (!isValid) {
    throw new Error('用户名或密码错误');
  }

  // 不返回密码
  delete user.password;
  return user;
}

// 生成 JWT token
export async function generateToken(payload: { userId: string; username: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

// 验证 JWT token
export async function verifyToken(token: string): Promise<{ userId: string; username: string }> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as { userId: string; username: string };
  } catch {
    throw new Error('Invalid token');
  }
}

// 从 cookie 获取当前用户
export async function getCurrentUser(): Promise<{ userId: string; username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token.value);
  } catch {
    return null;
  }
}

// 获取用户信息
export async function getUserById(id: string): Promise<User | null> {
  const pool = getPool();
  
  const [rows] = await pool.execute(
    'SELECT id, username, createdAt FROM users WHERE id = ?',
    [id]
  );

  const users = rows as User[];
  return users[0] || null;
} 