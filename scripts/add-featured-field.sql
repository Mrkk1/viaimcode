-- 为websites表添加isFeatured字段，用于判断是否发布到首页
USE localsite_ai;

-- 添加isFeatured字段
ALTER TABLE websites 
ADD COLUMN isFeatured TINYINT(1) DEFAULT 0 COMMENT '是否发布到首页展示 (0=否, 1=是)';

-- 添加索引以提高查询性能
CREATE INDEX idx_websites_isFeatured ON websites(isFeatured);

-- 显示表结构确认修改
DESCRIBE websites; 