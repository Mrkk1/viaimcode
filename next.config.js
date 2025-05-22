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
  }
}

export default nextConfig; 