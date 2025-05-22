/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverRuntimeConfig: {
    port: 3011
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    appDir: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
}

export default nextConfig
