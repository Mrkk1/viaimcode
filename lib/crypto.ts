// 使用 Web Crypto API 进行密码哈希
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

// 验证密码
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
} 