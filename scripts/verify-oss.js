/**
 * 验证阿里云OSS配置的脚本
 * 使用方法: node scripts/verify-oss.js
 */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 检查OSS配置
const checkOssConfig = () => {
  console.log('验证阿里云OSS配置...');

  const requiredEnvVars = [
    'ALICLOUD_ACCESS_KEY_ID',
    'ALICLOUD_ACCESS_KEY_SECRET',
    'ALICLOUD_OSS_BUCKET',
  ];

  const optionalEnvVars = [
    'ALICLOUD_OSS_REGION',
    'ALICLOUD_OSS_ENDPOINT'
  ];

  // 检查必要配置项
  let missingVars = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ 错误: 缺少必要的环境变量:');
    missingVars.forEach(envVar => console.error(`  - ${envVar}`));
    return false;
  }

  // 检查可选配置项
  const hasRegion = !!process.env.ALICLOUD_OSS_REGION;
  const hasEndpoint = !!process.env.ALICLOUD_OSS_ENDPOINT;

  if (!hasRegion && !hasEndpoint) {
    console.error('❌ 错误: 必须指定ALICLOUD_OSS_REGION或ALICLOUD_OSS_ENDPOINT其中之一');
    return false;
  }

  // 输出验证结果
  console.log('✅ 阿里云OSS配置验证通过:');
  console.log(`  - AccessKey ID: ${process.env.ALICLOUD_ACCESS_KEY_ID.substring(0, 3)}...`);
  console.log(`  - Bucket: ${process.env.ALICLOUD_OSS_BUCKET}`);
  if (hasRegion) console.log(`  - Region: ${process.env.ALICLOUD_OSS_REGION}`);
  if (hasEndpoint) console.log(`  - Endpoint: ${process.env.ALICLOUD_OSS_ENDPOINT}`);

  // 检查.env文件是否存在
  const envLocalExists = fs.existsSync(path.resolve(process.cwd(), '.env.local'));
  if (!envLocalExists) {
    console.warn('⚠️ 警告: 未找到.env.local文件，环境变量可能来自系统环境');
  } else {
    console.log('✅ 已找到.env.local文件');
  }

  return true;
};

// 尝试初始化OSS客户端
const initOssClient = async () => {
  try {
    // 尝试动态引入ali-oss
    const OSS = require('ali-oss');
    
    const config = {
      accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET,
      bucket: process.env.ALICLOUD_OSS_BUCKET,
    };

    if (process.env.ALICLOUD_OSS_ENDPOINT) {
      config.endpoint = process.env.ALICLOUD_OSS_ENDPOINT;
    } else if (process.env.ALICLOUD_OSS_REGION) {
      config.region = process.env.ALICLOUD_OSS_REGION;
    }

    console.log('正在初始化OSS客户端...');
    const client = new OSS(config);

    // 测试列出文件
    console.log('正在列出Bucket中的文件...');
    const result = await client.list({
      'max-keys': 5
    });

    if (result.objects && result.objects.length > 0) {
      console.log(`✅ 成功: 已列出${result.objects.length}个文件:`);
      result.objects.forEach(obj => {
        console.log(`  - ${obj.name} (${Math.round(obj.size / 1024)}KB)`);
      });
    } else {
      console.log('✅ 成功: Bucket为空或没有权限列出文件');
    }

    return true;
  } catch (error) {
    console.error('❌ OSS客户端初始化或测试失败:', error.message);
    return false;
  }
};

// 主函数
const main = async () => {
  console.log('=== 阿里云OSS配置验证工具 ===');
  
  const configValid = checkOssConfig();
  if (!configValid) {
    console.error('配置验证失败，请检查环境变量');
    process.exit(1);
  }

  const clientValid = await initOssClient();
  if (!clientValid) {
    console.error('OSS客户端测试失败，请检查连接');
    process.exit(1);
  }

  console.log('✅ 阿里云OSS配置有效且连接正常');
};

main().catch(err => {
  console.error('验证过程中发生错误:', err);
  process.exit(1);
}); 