import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 将Base64格式的图片保存到本地文件系统
 * @param base64Data Base64格式的图片数据
 * @param timestamp 可选的时间戳，用于文件名
 * @returns 保存后的图片相对路径
 */
export async function saveBase64Image(base64Data: string, timestamp?: number): Promise<string> {
  try {
    // 确保base64数据是有效的
    let base64Image = base64Data;
    if (base64Data.startsWith('data:image')) {
      // 如果包含数据类型前缀，去除前缀
      base64Image = base64Data.split(',')[1];
    }

    // 生成唯一文件名
    const filename = timestamp 
      ? `image-${timestamp}-${uuidv4().substring(0, 8)}.jpg` 
      : `${uuidv4()}.jpg`;
      
    // 确保thumbnails目录存在
    const thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }

    // 图片保存路径
    const imagePath = path.join(thumbnailsDir, filename);

    // 将Base64转换为二进制并保存到文件
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);

    // 返回相对路径，用于在前端访问
    return `/thumbnails/${filename}`;
  } catch (error) {
    console.error('保存Base64图片失败:', error);
    throw new Error('保存图片失败');
  }
}

// 删除图片文件
export async function deleteImage(relativePath: string): Promise<void> {
  if (!relativePath) return;
  
  const fullPath = path.join(process.cwd(), 'public', relativePath);
  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log('图片已删除:', fullPath);
    } else {
      console.log('要删除的图片不存在:', fullPath);
    }
  } catch (error) {
    console.error('删除图片时发生错误:', error);
  }
} 