import { v4 as uuidv4 } from 'uuid';
import { SharedWebsite } from './types';
import { getPool } from './db';
import { deleteImage } from './image-utils';

// Get all saved websites
export async function getAllWebsites(userId: string): Promise<SharedWebsite[]> {
  const pool = getPool();
  try {
    let query: string;
    let params: any[];
    
    if (userId === '') {
      // 管理员模式：获取所有网站，包含用户信息
      query = `SELECT w.*, u.username as authorName 
               FROM websites w 
               JOIN users u ON w.userId = u.id 
               ORDER BY w.createdAt DESC`;
      params = [];
    } else {
      // 普通用户模式：只获取自己的网站
      query = 'SELECT * FROM websites WHERE userId = ? ORDER BY createdAt DESC';
      params = [userId];
    }
    
    const [rows] = await pool.query(query, params);
    return rows as SharedWebsite[];
  } catch (error) {
    console.error('Error fetching websites:', error);
    return [];
  }
}

// Get specific website by ID
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

// Save new website
export async function saveWebsite(
  websiteData: Omit<SharedWebsite, 'id' | 'createdAt'>,
  userId: string
): Promise<SharedWebsite> {
  const pool = getPool();
  const id = uuidv4();
  
  try {
    const { title, description, htmlContent, prompt, thumbnailUrl, isFeatured } = websiteData;
    
    await pool.execute(
      'INSERT INTO websites (id, userId, title, description, htmlContent, prompt, thumbnailUrl, isFeatured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, title, description, htmlContent, prompt, thumbnailUrl || null, isFeatured ? 1 : 0]
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

// Update website
export async function updateWebsite(
  id: string,
  updates: { title?: string; description?: string; isFeatured?: boolean; thumbnailUrl?: string }
): Promise<boolean> {
  const pool = getPool();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    
    if (updates.isFeatured !== undefined) {
      fields.push('isFeatured = ?');
      values.push(updates.isFeatured ? 1 : 0);
    }
    
    if (updates.thumbnailUrl !== undefined) {
      fields.push('thumbnailUrl = ?');
      values.push(updates.thumbnailUrl);
    }
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE websites SET ${fields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, values);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Failed to update website:', error);
    return false;
  }
}

// Delete website
export async function deleteWebsite(id: string): Promise<boolean> {
  const pool = getPool();
  try {
    // First get website info to delete image
    const website = await getWebsiteById(id);
    if (website?.thumbnailUrl) {
      await deleteImage(website.thumbnailUrl);
    }

    const [result] = await pool.execute('DELETE FROM websites WHERE id = ?', [id]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Failed to delete website:', error);
    return false;
  }
}

// Get featured websites for homepage display
export async function getFeaturedWebsites(limit: number = 12): Promise<SharedWebsite[]> {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT w.*, u.username as authorName 
       FROM websites w 
       JOIN users u ON w.userId = u.id 
       WHERE w.isFeatured = 1 
       ORDER BY w.createdAt DESC 
       LIMIT ?`,
      [limit]
    );
    return rows as SharedWebsite[];
  } catch (error) {
    console.error('Error fetching featured websites:', error);
    return [];
  }
}

// ========== Project Related Functions ==========

// Project interface definition
export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  prompt?: string;
  currentVersionId?: string;
  model?: string;
  provider?: string;
  thumbnail?: string;
  status?: 'active' | 'archived' | 'deleted';
  isPublic?: boolean;
  lastSaveTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Version interface definition
export interface Version {
  id: string;
  projectId: string;
  creatorId: string;
  originalVersionId?: string;
  code: string;
  thumbnail?: string;
  type: 'ai' | 'manual';
  title?: string;
  description?: string;
  size?: number;
  isPublished?: boolean;
  shareUrl?: string;
  createdAt?: Date;
}

// Create new project
export async function createProject(
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<Project> {
  const pool = getPool();
  const id = uuidv4();
  
  try {
    const { title, description, prompt, model, provider, thumbnail } = projectData;
    
    await pool.execute(
      `INSERT INTO projects (id, userId, title, description, prompt, model, provider, thumbnail) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, description || null, prompt || null, model || null, provider || null, thumbnail || null]
    );
    
    const savedProject = await getProjectById(id);
    if (!savedProject) {
      throw new Error('Failed to create project');
    }
    
    return savedProject;
  } catch (error) {
    console.error('Failed to create project:', error);
    throw error;
  }
}

// Get project by ID
export async function getProjectById(id: string): Promise<Project | null> {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    const projects = rows as Project[];
    return projects[0] || null;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

// Get all user projects
export async function getUserProjects(userId: string): Promise<Project[]> {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM projects WHERE userId = ? AND status != ? ORDER BY updatedAt DESC',
      [userId, 'deleted']
    );
    return rows as Project[];
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
}

// Update project
export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> {
  const pool = getPool();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, values);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error updating project:', error);
    return false;
  }
}

// Create new version
export async function createVersion(
  versionData: Omit<Version, 'id' | 'createdAt'>,
  creatorId: string
): Promise<Version> {
  const pool = getPool();
  const id = uuidv4();
  
  try {
    const { projectId, code, thumbnail, type, title, description, originalVersionId } = versionData;
    const size = Buffer.byteLength(code, 'utf8');
    
    await pool.execute(
      `INSERT INTO versions (id, projectId, creatorId, originalVersionId, code, thumbnail, type, title, description, size) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectId, creatorId, originalVersionId || null, code, thumbnail || null, type, title || null, description || null, size]
    );
    
    // Update project's current version ID and last save time
    await pool.execute(
      'UPDATE projects SET currentVersionId = ?, lastSaveTime = CURRENT_TIMESTAMP WHERE id = ?',
      [id, projectId]
    );
    
    const savedVersion = await getVersionById(id);
    if (!savedVersion) {
      throw new Error('Failed to create version');
    }
    
    return savedVersion;
  } catch (error) {
    console.error('Failed to create version:', error);
    throw error;
  }
}

// Get version by ID
export async function getVersionById(id: string): Promise<Version | null> {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT * FROM versions WHERE id = ?', [id]);
    const versions = rows as Version[];
    return versions[0] || null;
  } catch (error) {
    console.error('Error fetching version:', error);
    return null;
  }
}

// Get all project versions
export async function getProjectVersions(projectId: string): Promise<Version[]> {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM versions WHERE projectId = ? ORDER BY createdAt ASC',
      [projectId]
    );
    return rows as Version[];
  } catch (error) {
    console.error('Error fetching project versions:', error);
    return [];
  }
}

// Update version publish status
export async function updateVersionPublishStatus(
  id: string,
  updates: { isPublished?: boolean; shareUrl?: string }
): Promise<boolean> {
  const pool = getPool();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.isPublished !== undefined) {
      fields.push('isPublished = ?');
      values.push(updates.isPublished ? 1 : 0);
    }
    
    if (updates.shareUrl !== undefined) {
      fields.push('shareUrl = ?');
      values.push(updates.shareUrl);
    }
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const query = `UPDATE versions SET ${fields.join(', ')} WHERE id = ?`;
    
    const [result] = await pool.execute(query, values);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Failed to update version publish status:', error);
    return false;
  }
}

// Delete version
export async function deleteVersion(id: string): Promise<boolean> {
  const pool = getPool();
  try {
    // First get version info to delete thumbnail
    const version = await getVersionById(id);
    if (version?.thumbnail) {
      try {
        await deleteImage(version.thumbnail);
      } catch (error) {
        console.error('Failed to delete version thumbnail:', error);
        // Continue deleting version record
      }
    }

    const [result] = await pool.execute('DELETE FROM versions WHERE id = ?', [id]);
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Failed to delete version:', error);
    return false;
  }
}

// Delete project (soft delete)
export async function deleteProject(id: string): Promise<boolean> {
  const pool = getPool();
  try {
    const [result] = await pool.execute(
      'UPDATE projects SET status = ? WHERE id = ?',
      ['deleted', id]
    );
    return (result as any).affectedRows > 0;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// 获取优秀项目列表（公开项目且有已发布版本）
export async function getFeaturedProjects(): Promise<any[]> {
  const pool = getPool();
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.thumbnail,
        p.model,
        p.provider,
        p.createdAt,
        p.lastSaveTime,
        u.username as authorName,
        v.shareUrl,
        v.thumbnail as versionThumbnail,
        v.title as versionTitle
      FROM projects p
      JOIN users u ON p.userId = u.id
      JOIN versions v ON p.currentVersionId = v.id
      WHERE p.isPublic = 1 
        AND p.status = 'active' 
        AND v.isPublished = 1
        AND v.shareUrl IS NOT NULL
      ORDER BY p.lastSaveTime DESC
      LIMIT 12
    `);
    
    return rows as any[];
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    return [];
  }
} 