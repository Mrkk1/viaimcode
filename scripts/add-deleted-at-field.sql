-- 添加伪删除字段到PPT项目表
-- 这个迁移脚本将为现有的ppt_projects表添加deletedAt字段

-- 添加deletedAt字段
ALTER TABLE ppt_projects 
ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL 
COMMENT '软删除时间戳，NULL表示未删除';

-- 添加索引优化查询性能
CREATE INDEX idx_ppt_projects_deleted_at ON ppt_projects(deletedAt);
CREATE INDEX idx_ppt_projects_user_deleted ON ppt_projects(userId, deletedAt);

-- 添加注释
ALTER TABLE ppt_projects 
COMMENT = 'PPT项目表，支持软删除功能';

-- 显示表结构验证
DESCRIBE ppt_projects; 