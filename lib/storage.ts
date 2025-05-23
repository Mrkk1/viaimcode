import { v4 as uuidv4 } from 'uuid';
import { SharedWebsite } from './types';
import { getPool } from './db';
import { deleteImage } from './image-utils';

// 获取所有保存的网站
export async function getAllWebsites(userId: string): Promise<SharedWebsite[]> {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM websites WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    return rows as SharedWebsite[];
  } catch (error) {
    console.error('Error fetching websites:', error);
    return [];
  }
}

// 根据 ID 获取特定网站
export async function getWebsiteById(id: string): Promise<SharedWebsite | null> {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM websites WHERE id = ?', [id]);
    const websites = rows as SharedWebsite[];
    return websites[0] || null;
  } catch (error) {
    console.error('Error fetching website:', error);
    return null;
  }
}

// 保存新网站
export async function saveWebsite(
  websiteData: Omit<SharedWebsite, 'id' | 'createdAt'>,
  userId: string
): Promise<SharedWebsite> {
  const pool = getPool();
  const id = uuidv4();
  
  try {
    const { title, description, htmlContent, prompt, thumbnailUrl } = websiteData;
    
    await pool.execute(
      'INSERT INTO websites (id, userId, title, description, htmlContent, prompt, thumbnailUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, userId, title, description, htmlContent, prompt, thumbnailUrl || null]
    );
    
    const savedWebsite = await getWebsiteById(id);
    if (!savedWebsite) {
      throw new Error('Failed to save website');
    }
    
    return savedWebsite;
  } catch (error) {
    console.error('Failed to save website:', error);
    throw error;
  }
}

// 删除网站
export async function deleteWebsite(id: string): Promise<boolean> {
  const pool = getPool();
  try {
    // 先获取网站信息，以便删除图片
    const website = await getWebsiteById(id);
    if (website?.thumbnailUrl) {
      await deleteImage(website.thumbnailUrl);
    }

    const [result] = await pool.execute('DELETE FROM websites WHERE id = ?', [id]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('删除网页失败:', error);
    return false;
  }
} 