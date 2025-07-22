/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用standalone构建（用于Docker）
  output: 'standalone',
  
  // 禁用分享页面的根布局继承
  layoutSegments: {
    share: {
      inheritParentLayout: false
    }
  },
  
  // 启用流式响应
  experimental: {
    serverActions: true,
    serverComponents: true,
    typedRoutes: true,
    // 启用新的 params 行为
    serverComponentsExternalPackages: ['@prisma/client', 'mysql2', 'canvas']
  },
  
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
  }
}

module.exports = nextConfig; 