import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// OSS配置 - 这些应该从环境变量中获取
const OSS_CONFIG = {
  region: process.env.ALICLOUD_OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALICLOUD_OSS_BUCKET || '',
  endpoint: process.env.ALICLOUD_OSS_ENDPOINT || 'oss-cn-shanghai.aliyuncs.com',
}

// 支持的图片格式
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// 使用阿里云OSS SDK上传
async function uploadToOSS(file: File, fileName: string): Promise<string> {
  try {
    console.log('开始OSS上传流程...');
    console.log('OSS配置检查:', {
      hasAccessKeyId: !!OSS_CONFIG.accessKeyId,
      hasBucket: !!OSS_CONFIG.bucket,
      region: OSS_CONFIG.region,
      bucket: OSS_CONFIG.bucket,
      endpoint: OSS_CONFIG.endpoint
    });
    
    // 如果没有配置OSS，使用本地存储作为备选
    if (!OSS_CONFIG.accessKeyId || !OSS_CONFIG.bucket) {
      console.log('OSS未配置，使用本地存储');
      console.log('缺少配置项:', {
        accessKeyId: !OSS_CONFIG.accessKeyId ? '缺少' : '已配置',
        bucket: !OSS_CONFIG.bucket ? '缺少' : '已配置'
      });
      return await uploadToLocal(file, fileName);
    }

    // 动态导入阿里云OSS SDK
    let OSS;
    try {
      OSS = require('ali-oss');
      console.log('ali-oss SDK加载成功');
    } catch (error) {
      console.log('ali-oss SDK未安装，使用本地存储');
      console.error('SDK加载错误:', error);
      return await uploadToLocal(file, fileName);
    }

    console.log('创建OSS客户端...');
    // 创建OSS客户端
    const client = new OSS({
      region: OSS_CONFIG.region,
      accessKeyId: OSS_CONFIG.accessKeyId,
      accessKeySecret: OSS_CONFIG.accessKeySecret,
      bucket: OSS_CONFIG.bucket,
    });

    // 生成对象键（文件路径）
    const objectKey = `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;
    console.log('生成对象键:', objectKey);
    
    // 将File转换为Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('文件转换为Buffer，大小:', buffer.length);
    
    console.log('开始上传到OSS...');
    // 上传到OSS
    const result = await client.put(objectKey, buffer, {
      headers: {
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=31536000', // 缓存一年
      },
    });
    
    console.log('OSS上传成功:', result.url);
    console.log('OSS上传结果详情:', result);
    return result.url;
    
  } catch (error: any) {
    console.error('OSS上传失败，详细错误:', error);
    console.error('错误堆栈:', error?.stack);
    // 如果OSS上传失败，回退到本地存储
    console.log('回退到本地存储...');
    return await uploadToLocal(file, fileName);
  }
}

// 本地存储备选方案
async function uploadToLocal(file: File, fileName: string): Promise<string> {
  const fs = require('fs').promises;
  const path = require('path');
  
  // 创建上传目录
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
  
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在
  }
  
  // 保存文件
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  
  // 返回可访问的URL
  return `/uploads/images/${fileName}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '没有找到图片文件' },
        { status: 400 }
      );
    }
    
    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的图片格式，请上传 JPEG、PNG、GIF 或 WebP 格式的图片' },
        { status: 400 }
      );
    }
    
    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '图片文件过大，请上传小于10MB的图片' },
        { status: 400 }
      );
    }
    
    // 生成唯一文件名
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // 上传到OSS或本地存储
    const imageUrl = await uploadToOSS(file, fileName);
    
    return NextResponse.json({
      success: true,
      url: imageUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    });
    
  } catch (error) {
    console.error('图片上传失败:', error);
    return NextResponse.json(
      { error: '图片上传失败，请重试' },
      { status: 500 }
    );
  }
} 