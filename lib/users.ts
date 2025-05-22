import { getPool } from './db';
import { User, LoginData, RegisterData } from './types';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword } from './crypto';

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