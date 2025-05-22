import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadImage } from './image-upload';

/**
 * 将Base64格式的图片保存到本地文件系统或阿里云OSS
 * @param base64Data Base64格式的图片数据
 * @param timestamp 可选的时间戳，用于文件名
 * @returns 保存后的图片相对路径或完整URL
 */
export async function saveBase64Image(base64Data: string, timestamp?: number): Promise<string> {
  try {
    // 确保base64数据是有效的
    if (!base64Data) {
      throw new Error('无效的图片数据');
    }

    // 生成唯一文件名
    const filename = timestamp 
      ? `image-${timestamp}-${uuidv4().substring(0, 8)}.jpg` 
      : `${uuidv4()}.jpg`;
      
    // 使用新的图片上传服务
    const imageUrl = await uploadImage(base64Data, filename);
    console.log('图片已上传:', imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('保存Base64图片失败:', error);
    throw new Error('保存图片失败');
  }
}

// 删除图片文件
export async function deleteImage(imagePath: string): Promise<void> {
  if (!imagePath) return;
  
  // 如果是OSS URL，不需要在本地删除
  if (imagePath.startsWith('http')) {
    console.log('OSS图片不需要本地删除:', imagePath);
    // 注意：如果需要删除OSS中的图片，可以在这里调用OSS的删除API
    return;
  }
  
  const fullPath = path.join(process.cwd(), 'public', imagePath);
  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log('本地图片已删除:', fullPath);
    } else {
      console.log('要删除的本地图片不存在:', fullPath);
    }
  } catch (error) {
    console.error('删除图片时发生错误:', error);
  }
} 