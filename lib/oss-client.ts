import OSS from 'ali-oss';
import dotenv from 'dotenv';

// 确保环境变量已加载
if (process.env.NODE_ENV !== 'production') {
  console.log('正在加载环境变量配置...');
  dotenv.config();
}

// 输出OSS配置检查日志(注意不要泄露完整的Secret)
console.log('OSS配置检查:', {
  accessKeyIdExists: !!process.env.ALICLOUD_ACCESS_KEY_ID,
  accessKeySecretExists: !!process.env.ALICLOUD_ACCESS_KEY_SECRET,
  bucket: process.env.ALICLOUD_OSS_BUCKET,
  region: process.env.ALICLOUD_OSS_REGION,
  endpoint: process.env.ALICLOUD_OSS_ENDPOINT,
  env: process.env.NODE_ENV
});

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
      console.log(`OSS客户端使用自定义endpoint: ${endpoint}`);
    } else if (region) {
      config.region = region;
      console.log(`OSS客户端使用region: ${region}`);
    }

    console.log('正在初始化OSS客户端...');
    ossClient = new OSS(config);
    console.log('OSS客户端初始化成功');
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

// 上传文件到OSS
export const uploadToOss = async (file: Buffer, fileName: string) => {
  console.log(`准备上传文件到OSS: ${fileName}, 大小: ${file.length}字节`);
  const client = getOssClient();
  if (!client) {
    console.error('OSS客户端未初始化，无法上传文件');
    throw new Error('OSS客户端未初始化');
  }

  try {
    console.log('开始上传文件到OSS...');
    const result = await client.put(fileName, file);
    console.log('文件上传成功, 返回结果:', result.url ? '获得URL' : '无URL');
    // 使用类型断言访问options属性
    const options = client as any;
    const finalUrl = result.url || `https://${options.options.bucket}.${options.options.endpoint}/${fileName}`;
    console.log('最终OSS文件URL:', finalUrl);
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