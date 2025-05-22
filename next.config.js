/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
  // 配置图片处理
  images: {
    unoptimized: true, // 禁用图片优化，支持所有域名
  }
}

export default nextConfig; 