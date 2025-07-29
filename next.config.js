/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用standalone构建（用于Docker）
  output: 'standalone',
  
  // 启用流式响应
  experimental: {
    typedRoutes: true,
  },
  
  // 外部包配置 - 基于 urllib PR #457 的修复思路
  serverExternalPackages: [
    '@prisma/client', 
    'mysql2', 
    'canvas',
    // 避免 vm2 安全漏洞相关的包
    'vm2', 
    'degenerator', 
    'pac-resolver',
    'pac-proxy-agent',
    'proxy-agent'
  ],
  
  // 配置图片处理
  images: {
    unoptimized: true, // 禁用图片优化，支持所有域名
  },
  
  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 构建时忽略的错误
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },

  // Webpack 配置 - 基于 urllib 避免 vm2 依赖的策略
  webpack: (config, { isServer }) => {
    // 为所有有安全问题的模块添加 fallback
    config.resolve.fallback = {
      ...config.resolve.fallback,
      // 核心安全问题模块
      'vm2': false,
      'coffee-script': false,
      'degenerator': false,
      // 代理相关模块 (参考 urllib PR #457)
      'pac-resolver': false,
      'pac-proxy-agent': false,
      'proxy-agent': false,
    };

    // 服务器端外部化这些模块
    if (isServer) {
      config.externals = config.externals || [];
      
      // 添加条件外部化，只在模块存在时才外部化
      const problematicModules = [
        'vm2',
        'coffee-script', 
        'degenerator',
        'pac-resolver',
        'pac-proxy-agent',
        'proxy-agent'
      ];
      
      problematicModules.forEach(module => {
        config.externals.push(({ request }, callback) => {
          if (request === module) {
            return callback(null, `commonjs ${module}`);
          }
          callback();
        });
      });
    }

    return config;
  }
}

module.exports = nextConfig; 