import OSS from 'ali-oss';
import dotenv from 'dotenv';

// 确保环境变量已加载
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// 阿里云OSS配置
let ossClient: OSS | null = null;

export const initOssClient = () => {
  try {
    // 确保环境变量已设置
    const accessKeyId = process.env.ALICLOUD_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALICLOUD_ACCESS_KEY_SECRET;
    const bucket = process.env.ALICLOUD_OSS_BUCKET;
    const region = process.env.ALICLOUD_OSS_REGION;
    const endpoint = process.env.ALICLOUD_OSS_ENDPOINT;

    if (!accessKeyId || !accessKeySecret || !bucket || !(region || endpoint)) {
      console.error('阿里云OSS配置缺失，请检查环境变量');
      return null;
    }

    // 创建OSS客户端实例
    const config: OSS.Options = {
      accessKeyId,
      accessKeySecret,
      bucket,
      secure: true, // 使用HTTPS
    };

    // 使用region或自定义endpoint
    if (endpoint) {
      config.endpoint = endpoint;
    } else if (region) {
      config.region = region;
    }

    ossClient = new OSS(config);
    return ossClient;
  } catch (error) {
    console.error('初始化阿里云OSS客户端失败:', error);
    return null;
  }
};

// 获取OSS客户端实例
export const getOssClient = () => {
  if (!ossClient) {
    return initOssClient();
  }
  return ossClient;
};

// 生成唯一的文件名
export const generateUniqueFileName = (originalName: string) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'png';
  return `images/${timestamp}-${randomString}.${extension}`;
};

// 生成带有用户ID和任务ID的文件路径
export const generateStructuredFileName = (
  userId: string, 
  taskId: string, 
  originalName: string,
  subFolder?: string
) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'png';
  
  // 构建目录路径：/userId/taskId/[subFolder]/filename
  const pathParts = ['users', userId, taskId];
  if (subFolder) {
    pathParts.push(subFolder);
  }
  
  const fileName = `${timestamp}-${randomString}.${extension}`;
  return `${pathParts.join('/')}/${fileName}`;
};

// 上传文件到OSS
export const uploadToOss = async (file: Buffer, fileName: string) => {
  const client = getOssClient();
  if (!client) {
    throw new Error('OSS客户端未初始化');
  }

  try {
    const result = await client.put(fileName, file);
    // 使用类型断言访问options属性
    const options = client as any;
    const finalUrl = result.url || `https://${options.options.bucket}.${options.options.endpoint}/${fileName}`;
    return finalUrl;
  } catch (error) {
    console.error('上传到OSS失败:', error);
    throw error;
  }
};

// 获取文件的公共访问URL
export const getOssFileUrl = (fileName: string) => {
  const client = getOssClient();
  if (!client) {
    throw new Error('OSS客户端未初始化');
  }
  
  // 签名URL有效期(秒)
  const expireTime = 60 * 60 * 24 * 7; // 7天
  return client.signatureUrl(fileName, { expires: expireTime });
}; 