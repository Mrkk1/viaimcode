import { getPool } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface PPTProject {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  model: string;
  provider: string;
  status: 'pending' | 'generating_outline' | 'generating_slides' | 'completed' | 'failed';
  progress: number;
  totalSlides: number;
  completedSlides: number;
  errorMessage?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  deletedAt?: Date;
  isFeatured: boolean;
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
}

export interface PPTOutline {
  id: string;
  projectId: string;
  title: string;
  content: string; // JSON string
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PPTSlide {
  id: string;
  projectId: string;
  slideIndex: number;
  title: string;
  content: string;
  htmlCode?: string;
  thinkingContent?: string;
  status: 'pending' | 'thinking' | 'generating' | 'completed' | 'failed';
  progress: string;
  thumbnailUrl?: string;
  currentVersionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PPTSlideVersion {
  id: string;
  slideId: string;
  projectId: string;
  slideIndex: number;
  title: string;
  content: string;
  htmlCode?: string;
  thinkingContent?: string;
  changeDescription?: string;
  versionNumber: number;
  status: 'pending' | 'thinking' | 'generating' | 'completed' | 'failed';
  progress: string;
  thumbnailUrl?: string;
  createdBy: string;
  createdAt: Date;
}

export interface PPTChatMessage {
  id: string;
  projectId: string;
  messageType: 'user' | 'ai' | 'system';
  content: string;
  isGenerating: boolean;
  relatedSlideId?: string;
  relatedVersionId?: string;
  createdAt: Date;
}

export class PPTDatabase {
  private pool = getPool();

  // 创建PPT项目
  async createProject(data: {
    userId: string;
    title: string;
    prompt: string;
    model: string;
    provider: string;
  }): Promise<string> {
    const projectId = uuidv4();
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(
        `INSERT INTO ppt_projects (id, userId, title, prompt, model, provider, status, progress, totalSlides, completedSlides)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 0, 0)`,
        [projectId, data.userId, data.title, data.prompt, data.model, data.provider]
      );
      
      return projectId;
    } finally {
      connection.release();
    }
  }

  // 更新项目状态
  async updateProjectStatus(projectId: string, status: PPTProject['status'], progress?: number, errorMessage?: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const updates: string[] = ['status = ?'];
      const values: any[] = [status];

      if (progress !== undefined) {
        updates.push('progress = ?');
        values.push(progress);
      }

      if (errorMessage !== undefined) {
        updates.push('errorMessage = ?');
        values.push(errorMessage);
      }

      if (status === 'completed') {
        updates.push('completedAt = NOW()');
      }

      values.push(projectId);

      await connection.execute(
        `UPDATE ppt_projects SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } finally {
      connection.release();
    }
  }

  // 更新项目幻灯片数量
  async updateProjectSlideCount(projectId: string, totalSlides: number, completedSlides?: number): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const updates: string[] = ['totalSlides = ?'];
      const values: any[] = [totalSlides];

      if (completedSlides !== undefined) {
        updates.push('completedSlides = ?');
        values.push(completedSlides);
      }

      values.push(projectId);

      await connection.execute(
        `UPDATE ppt_projects SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } finally {
      connection.release();
    }
  }

  // 获取项目信息（排除已删除的项目）
  async getProject(projectId: string): Promise<PPTProject | null> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ppt_projects WHERE id = ? AND deletedAt IS NULL',
        [projectId]
      );
      
      const projects = rows as any[];
      return projects.length > 0 ? projects[0] : null;
    } finally {
      connection.release();
    }
  }

  // 获取用户的所有项目（排除已删除的项目）
  async getUserProjects(userId: string, limit: number = 20, offset: number = 0): Promise<PPTProject[]> {
    const connection = await this.pool.getConnection();
    
    try {
      // 确保limit和offset是整数
      const limitInt = parseInt(limit.toString());
      const offsetInt = parseInt(offset.toString());
      
      const [rows] = await connection.execute(
        `SELECT * FROM ppt_projects WHERE userId = ? AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT ${limitInt} OFFSET ${offsetInt}`,
        [userId]
      );
      
      return rows as PPTProject[];
    } finally {
      connection.release();
    }
  }

  // 获取精选项目（PPT广场）
  async getFeaturedProjects(limit: number = 20, offset: number = 0): Promise<PPTProject[]> {
    const connection = await this.pool.getConnection();
    
    try {
      // 确保limit和offset是整数
      const limitInt = parseInt(limit.toString());
      const offsetInt = parseInt(offset.toString());
      
      const [rows] = await connection.execute(
        `SELECT * FROM ppt_projects WHERE isFeatured = 1 AND status = 'completed' AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
      );
      
      return rows as PPTProject[];
    } finally {
      connection.release();
    }
  }

  // 获取公开项目
  async getPublicProjects(limit: number = 20, offset: number = 0): Promise<PPTProject[]> {
    const connection = await this.pool.getConnection();
    
    try {
      // 确保limit和offset是整数
      const limitInt = parseInt(limit.toString());
      const offsetInt = parseInt(offset.toString());
      
      const [rows] = await connection.execute(
        `SELECT * FROM ppt_projects WHERE isPublic = 1 AND status = 'completed' AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
      );
      
      return rows as PPTProject[];
    } finally {
      connection.release();
    }
  }

  // 保存大纲
  async saveOutline(projectId: string, title: string, content: any): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const outlineId = uuidv4();
      await connection.execute(
        'INSERT INTO ppt_outlines (id, projectId, title, content) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)',
        [outlineId, projectId, title, JSON.stringify(content)]
      );
    } finally {
      connection.release();
    }
  }

  // 获取大纲
  async getOutline(projectId: string): Promise<PPTOutline | null> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ppt_outlines WHERE projectId = ?',
        [projectId]
      );
      
      const outlines = rows as any[];
      return outlines.length > 0 ? outlines[0] : null;
    } finally {
      connection.release();
    }
  }

  // 创建幻灯片
  async createSlides(projectId: string, slides: Array<{
    slideIndex: number;
    title: string;
    content: string;
  }>): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 删除已存在的幻灯片
      await connection.execute('DELETE FROM ppt_slides WHERE projectId = ?', [projectId]);
      
      // 插入新的幻灯片
      for (const slide of slides) {
        const slideId = uuidv4();
        await connection.execute(
          'INSERT INTO ppt_slides (id, projectId, slideIndex, title, content, status, progress) VALUES (?, ?, ?, ?, ?, "pending", "准备生成...")',
          [slideId, projectId, slide.slideIndex, slide.title, slide.content]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 更新幻灯片状态
  async updateSlideStatus(projectId: string, slideIndex: number, status: PPTSlide['status'], progress?: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const updates: string[] = ['status = ?'];
      const values: any[] = [status];

      if (progress !== undefined) {
        updates.push('progress = ?');
        values.push(progress);
      }

      values.push(projectId, slideIndex);

      await connection.execute(
        `UPDATE ppt_slides SET ${updates.join(', ')} WHERE projectId = ? AND slideIndex = ?`,
        values
      );
    } finally {
      connection.release();
    }
  }

  // 更新幻灯片内容
  async updateSlideContent(projectId: string, slideIndex: number, data: {
    htmlCode?: string;
    thinkingContent?: string;
    status?: PPTSlide['status'];
    progress?: string;
  }): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.htmlCode !== undefined) {
        updates.push('htmlCode = ?');
        values.push(data.htmlCode);
      }

      if (data.thinkingContent !== undefined) {
        updates.push('thinkingContent = ?');
        values.push(data.thinkingContent);
      }

      if (data.status !== undefined) {
        updates.push('status = ?');
        values.push(data.status);
      }

      if (data.progress !== undefined) {
        updates.push('progress = ?');
        values.push(data.progress);
      }

      if (updates.length === 0) return;

      values.push(projectId, slideIndex);

      await connection.execute(
        `UPDATE ppt_slides SET ${updates.join(', ')} WHERE projectId = ? AND slideIndex = ?`,
        values
      );
    } finally {
      connection.release();
    }
  }

  // 获取项目的所有幻灯片
  async getSlides(projectId: string): Promise<PPTSlide[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ppt_slides WHERE projectId = ? ORDER BY slideIndex',
        [projectId]
      );
      
      return rows as PPTSlide[];
    } finally {
      connection.release();
    }
  }

  // 创建幻灯片版本
  async createSlideVersion(data: {
    slideId: string;
    projectId: string;
    slideIndex: number;
    title: string;
    content: string;
    htmlCode?: string;
    thinkingContent?: string;
    changeDescription?: string;
    createdBy: string;
  }): Promise<string> {
    const connection = await this.pool.getConnection();
    
    try {
      // 获取下一个版本号
      const [versionRows] = await connection.execute(
        'SELECT MAX(versionNumber) as maxVersion FROM ppt_slide_versions WHERE slideId = ?',
        [data.slideId]
      );
      
      const maxVersion = (versionRows as any[])[0]?.maxVersion || 0;
      const versionNumber = maxVersion + 1;
      
      const versionId = uuidv4();
      await connection.execute(
        `INSERT INTO ppt_slide_versions (
          id, slideId, projectId, slideIndex, title, content, htmlCode, thinkingContent, 
          changeDescription, versionNumber, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId, data.slideId, data.projectId, data.slideIndex, data.title, 
          data.content, data.htmlCode, data.thinkingContent, data.changeDescription, 
          versionNumber, data.createdBy
        ]
      );
      
      // 更新幻灯片的当前版本ID
      await connection.execute(
        'UPDATE ppt_slides SET currentVersionId = ? WHERE id = ?',
        [versionId, data.slideId]
      );
      
      return versionId;
    } finally {
      connection.release();
    }
  }

  // 获取幻灯片的版本历史
  async getSlideVersions(slideId: string): Promise<PPTSlideVersion[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ppt_slide_versions WHERE slideId = ? ORDER BY versionNumber DESC',
        [slideId]
      );
      
      return rows as PPTSlideVersion[];
    } finally {
      connection.release();
    }
  }

  // 添加聊天消息
  async addChatMessage(projectId: string, messageType: 'user' | 'ai' | 'system', content: string, isGenerating: boolean = false, relatedSlideId?: string, relatedVersionId?: string): Promise<string> {
    console.log('DB: 开始添加聊天消息', {
      projectId,
      messageType,
      contentLength: content.length,
      isGenerating,
      relatedSlideId,
      relatedVersionId
    });

    const connection = await this.pool.getConnection();
    
    try {
      const messageId = uuidv4();
      console.log('DB: 执行INSERT语句', {
        messageId,
        projectId,
        messageType,
        contentLength: content.length
      });

      const result = await connection.execute(
        'INSERT INTO ppt_chat_messages (id, projectId, messageType, content, isGenerating, relatedSlideId, relatedVersionId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [messageId, projectId, messageType, content, isGenerating, relatedSlideId || null, relatedVersionId || null]
      );
      
      console.log('DB: 聊天消息插入成功', {
        messageId,
        affectedRows: (result as any).affectedRows,
        insertId: (result as any).insertId
      });
      
      return messageId;
    } catch (error) {
      console.error('DB: 插入聊天消息失败', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        messageType,
        contentLength: content.length
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  // 更新聊天消息
  async updateChatMessage(messageId: string, content: string, isGenerating: boolean = false): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE ppt_chat_messages SET content = ?, isGenerating = ? WHERE id = ?',
        [content, isGenerating, messageId]
      );
    } finally {
      connection.release();
    }
  }

  // 获取项目的聊天消息
  async getChatMessages(projectId: string): Promise<PPTChatMessage[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM ppt_chat_messages WHERE projectId = ? ORDER BY createdAt',
        [projectId]
      );
      
      return rows as PPTChatMessage[];
    } finally {
      connection.release();
    }
  }

  // 获取项目的完整数据（优化版：使用单个连接）
  async getProjectWithDetails(projectId: string): Promise<{
    project: PPTProject | null;
    outline: PPTOutline | null;
    slides: PPTSlide[];
    chatMessages: PPTChatMessage[];
  }> {
    const connection = await this.pool.getConnection();
    
    try {
      // 使用单个连接并行执行所有查询
      const [
        [projectRows],
        [outlineRows], 
        [slideRows],
        [messageRows]
      ] = await Promise.all([
        connection.execute('SELECT * FROM ppt_projects WHERE id = ? AND deletedAt IS NULL', [projectId]),
        connection.execute('SELECT * FROM ppt_outlines WHERE projectId = ?', [projectId]),
        connection.execute('SELECT * FROM ppt_slides WHERE projectId = ? ORDER BY slideIndex', [projectId]),
        connection.execute('SELECT * FROM ppt_chat_messages WHERE projectId = ? ORDER BY createdAt', [projectId])
      ]);

      const projects = projectRows as PPTProject[];
      const outlines = outlineRows as PPTOutline[];
      const slides = slideRows as PPTSlide[];
      const messages = messageRows as PPTChatMessage[];

      return {
        project: projects.length > 0 ? projects[0] : null,
        outline: outlines.length > 0 ? outlines[0] : null,
        slides,
        chatMessages: messages
      };
    } finally {
      connection.release();
    }
  }

  // 设置项目为精选
  async setProjectFeatured(projectId: string, isFeatured: boolean): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE ppt_projects SET isFeatured = ? WHERE id = ?',
        [isFeatured, projectId]
      );
    } finally {
      connection.release();
    }
  }

  // 更新项目公开状态
  async updateProjectPublicStatus(projectId: string, isPublic: boolean): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE ppt_projects SET isPublic = ? WHERE id = ?',
        [isPublic, projectId]
      );
    } finally {
      connection.release();
    }
  }

  // 增加项目查看次数
  async incrementViewCount(projectId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE ppt_projects SET viewCount = viewCount + 1 WHERE id = ?',
        [projectId]
      );
    } finally {
      connection.release();
    }
  }

  // 用户点赞/取消点赞项目
  async toggleProjectLike(userId: string, projectId: string): Promise<boolean> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 检查是否已经点赞
      const [existingLikes] = await connection.execute(
        'SELECT id FROM ppt_user_likes WHERE userId = ? AND projectId = ?',
        [userId, projectId]
      );
      
      const isLiked = (existingLikes as any[]).length > 0;
      
      if (isLiked) {
        // 取消点赞
        await connection.execute(
          'DELETE FROM ppt_user_likes WHERE userId = ? AND projectId = ?',
          [userId, projectId]
        );
        await connection.execute(
          'UPDATE ppt_projects SET likeCount = likeCount - 1 WHERE id = ?',
          [projectId]
        );
      } else {
        // 添加点赞
        const likeId = uuidv4();
        await connection.execute(
          'INSERT INTO ppt_user_likes (id, userId, projectId) VALUES (?, ?, ?)',
          [likeId, userId, projectId]
        );
        await connection.execute(
          'UPDATE ppt_projects SET likeCount = likeCount + 1 WHERE id = ?',
          [projectId]
        );
      }
      
      await connection.commit();
      return !isLiked; // 返回新的点赞状态
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 更新项目基本信息
  async updateProjectInfo(projectId: string, title?: string, prompt?: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }

      if (prompt !== undefined) {
        updates.push('prompt = ?');
        values.push(prompt);
      }

      if (updates.length > 0) {
        updates.push('updatedAt = NOW()');
        values.push(projectId);

        await connection.execute(
          `UPDATE ppt_projects SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
    } finally {
      connection.release();
    }
  }

  // 删除指定索引的幻灯片
  async deleteSlideByIndex(projectId: string, slideIndex: number): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 删除指定索引的幻灯片
      await connection.execute(
        'DELETE FROM ppt_slides WHERE projectId = ? AND slideIndex = ?',
        [projectId, slideIndex]
      );
      
      // 重新排序后续幻灯片的索引（将所有大于删除索引的幻灯片索引减1）
      await connection.execute(
        'UPDATE ppt_slides SET slideIndex = slideIndex - 1 WHERE projectId = ? AND slideIndex > ?',
        [projectId, slideIndex]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 保存幻灯片（简化版，用于前端生成）
  async saveSlide(projectId: string, slideIndex: number, slideData: {
    title: string;
    content: string;
    htmlCode?: string;
    thinkingContent?: string;
    status: 'pending' | 'thinking' | 'generating' | 'completed' | 'failed';
    errorMessage?: string;
  }): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      // 检查幻灯片是否已存在
      const [existingSlides] = await connection.execute(
        'SELECT id FROM ppt_slides WHERE projectId = ? AND slideIndex = ?',
        [projectId, slideIndex]
      );

      if ((existingSlides as any[]).length > 0) {
        // 更新现有幻灯片
        await connection.execute(
          `UPDATE ppt_slides SET 
            title = ?, content = ?, htmlCode = ?, thinkingContent = ?, 
            status = ?, progress = ?, updatedAt = NOW()
           WHERE projectId = ? AND slideIndex = ?`,
          [
            slideData.title, slideData.content, slideData.htmlCode || null, 
            slideData.thinkingContent || null, slideData.status, 
            slideData.status === 'completed' ? '生成完成' : 
            slideData.status === 'failed' ? `❌ ${slideData.errorMessage || '生成失败'}` : '生成中...',
            projectId, slideIndex
          ]
        );
      } else {
        // 创建新幻灯片
        const slideId = uuidv4();
        await connection.execute(
          `INSERT INTO ppt_slides (
            id, projectId, slideIndex, title, content, htmlCode, thinkingContent, 
            status, progress
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            slideId, projectId, slideIndex, slideData.title, slideData.content,
            slideData.htmlCode || null, slideData.thinkingContent || null,
            slideData.status,
            slideData.status === 'completed' ? '生成完成' : 
            slideData.status === 'failed' ? `❌ ${slideData.errorMessage || '生成失败'}` : '生成中...'
          ]
        );
      }

      // 更新项目的完成幻灯片数量
      if (slideData.status === 'completed') {
        await connection.execute(
          `UPDATE ppt_projects SET 
            completedSlides = (
              SELECT COUNT(*) FROM ppt_slides 
              WHERE projectId = ? AND status = 'completed'
            ),
            updatedAt = NOW()
           WHERE id = ?`,
          [projectId, projectId]
        );
      }
    } finally {
      connection.release();
    }
  }

  // 伪删除项目（软删除，性能更好）
  async deleteProject(projectId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      // 只需要更新一个字段，性能极快
      await connection.execute(
        'UPDATE ppt_projects SET deletedAt = NOW() WHERE id = ?',
        [projectId]
      );
    } finally {
      connection.release();
    }
  }

  // 真实删除项目及其相关数据（用于后台清理任务）
  async hardDeleteProject(projectId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 使用并行删除提高性能
      const deleteOperations = [
        // 删除聊天消息
        connection.execute('DELETE FROM ppt_chat_messages WHERE projectId = ?', [projectId]),
        // 删除幻灯片版本
        connection.execute('DELETE FROM ppt_slide_versions WHERE projectId = ?', [projectId]),
        // 删除幻灯片
        connection.execute('DELETE FROM ppt_slides WHERE projectId = ?', [projectId]),
        // 删除大纲
        connection.execute('DELETE FROM ppt_outlines WHERE projectId = ?', [projectId]),
        // 删除用户点赞记录
        connection.execute('DELETE FROM ppt_user_likes WHERE projectId = ?', [projectId])
      ];

      // 并行执行所有删除操作
      await Promise.all(deleteOperations);

      // 最后删除项目主记录
      await connection.execute('DELETE FROM ppt_projects WHERE id = ?', [projectId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 恢复已删除的项目
  async restoreProject(projectId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.execute(
        'UPDATE ppt_projects SET deletedAt = NULL WHERE id = ?',
        [projectId]
      );
    } finally {
      connection.release();
    }
  }

  // 获取已删除的项目（用于回收站功能）
  async getDeletedProjects(userId: string, limit: number = 20, offset: number = 0): Promise<PPTProject[]> {
    const connection = await this.pool.getConnection();
    
    try {
      const limitInt = parseInt(limit.toString());
      const offsetInt = parseInt(offset.toString());
      
      const [rows] = await connection.execute(
        `SELECT * FROM ppt_projects WHERE userId = ? AND deletedAt IS NOT NULL ORDER BY deletedAt DESC LIMIT ${limitInt} OFFSET ${offsetInt}`,
        [userId]
      );
      
      return rows as PPTProject[];
    } finally {
      connection.release();
    }
  }

  // 批量清理超过30天的已删除项目
  async cleanupOldDeletedProjects(): Promise<number> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 获取超过30天的已删除项目
      const [deletedProjects] = await connection.execute(
        'SELECT id FROM ppt_projects WHERE deletedAt IS NOT NULL AND deletedAt < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );

      const projectIds = (deletedProjects as any[]).map(p => p.id);
      
      if (projectIds.length === 0) {
        await connection.commit();
        return 0;
      }

      // 批量真实删除
      const placeholders = projectIds.map(() => '?').join(',');
      
      await Promise.all([
        connection.execute(`DELETE FROM ppt_chat_messages WHERE projectId IN (${placeholders})`, projectIds),
        connection.execute(`DELETE FROM ppt_slide_versions WHERE projectId IN (${placeholders})`, projectIds),
        connection.execute(`DELETE FROM ppt_slides WHERE projectId IN (${placeholders})`, projectIds),
        connection.execute(`DELETE FROM ppt_outlines WHERE projectId IN (${placeholders})`, projectIds),
        connection.execute(`DELETE FROM ppt_user_likes WHERE projectId IN (${placeholders})`, projectIds)
      ]);

      await connection.execute(`DELETE FROM ppt_projects WHERE id IN (${placeholders})`, projectIds);

      await connection.commit();
      return projectIds.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

// 导出单例实例
export const pptDb = new PPTDatabase(); 