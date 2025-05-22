/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用分享页面的根布局继承
  layoutSegments: {
    share: {
      inheritParentLayout: false
    }
  }
}

export default nextConfig; 