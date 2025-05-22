import { generateUniqueFileName, uploadToOss } from './oss-client';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

// 本地临时保存目录，用于开发环境
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 确保上传目录存在
const ensureUploadDir = async () => {
  try {
    await mkdirAsync(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // 目录已存在或创建失败
    console.error('创建上传目录失败:', error);
  }
};

// 上传图片到OSS或本地（开发环境）
export const uploadImage = async (
  imageData: Buffer | string, 
  originalName: string = 'image.png',
  useOss: boolean = process.env.NODE_ENV === 'production'
): Promise<string> => {
  try {
    console.log(`开始处理图片上传: 文件名=${originalName}, 使用OSS=${useOss}, 环境=${process.env.NODE_ENV}`);
    
    let buffer: Buffer;

    // 如果输入是Base64字符串，转换为Buffer
    if (typeof imageData === 'string') {
      console.log('转换Base64字符串为Buffer...');
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(imageData, 'base64');
      }
      console.log(`Base64转换完成，图片大小: ${buffer.length}字节`);
    } else {
      buffer = imageData;
      console.log(`直接使用Buffer，图片大小: ${buffer.length}字节`);
    }

    // 生成文件名
    const fileName = generateUniqueFileName(originalName);
    console.log(`生成唯一文件名: ${fileName}`);

    // 生产环境或强制指定: 使用阿里云OSS
    if (useOss) {
      console.log('使用阿里云OSS存储图片...');
      const ossUrl = await uploadToOss(buffer, fileName);
      console.log(`图片已上传到OSS: ${ossUrl}`);
      return ossUrl;
    } 
    // 开发环境: 保存到本地
    else {
      console.log('使用本地文件系统存储图片...');
      await ensureUploadDir();
      const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
      await writeFileAsync(filePath, buffer);
      const relativePath = `/uploads/${path.basename(fileName)}`;
      console.log(`图片已保存到本地: ${relativePath}`);
      
      // 返回相对URL路径
      return relativePath;
    }
  } catch (error) {
    console.error('图片上传失败:', error);
    throw new Error(`图片上传失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 获取图片（用于从本地读取或远程获取）
export const getImage = async (imagePath: string): Promise<Buffer | null> => {
  try {
    // 如果是完整的URL，直接返回null（客户端会直接访问URL）
    if (imagePath.startsWith('http')) {
      console.log(`图片路径是URL，客户端将直接访问: ${imagePath}`);
      return null;
    }

    // 从本地读取文件
    console.log(`从本地读取图片: ${imagePath}`);
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    const buffer = await readFileAsync(fullPath);
    console.log(`成功读取本地图片，大小: ${buffer.length}字节`);
    return buffer;
  } catch (error) {
    console.error('获取图片失败:', error);
    return null;
  }
}; 