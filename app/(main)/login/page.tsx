'use client';

import LoginForm from '@/components/login-form';
import dynamic from 'next/dynamic';

// 动态导入 PixelAnimation 组件
const PixelAnimation = dynamic(
  () => import('@/components/pixel-animation').then(mod => mod.default),
  { ssr: false }
);

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-61px)]  flex items-center justify-center bg-gray-900">
      <PixelAnimation />
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800/80 rounded-lg shadow-lg backdrop-blur-sm relative z-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Login</h2>
          <p className="mt-2 text-sm text-gray-400">
            Login to use ViaimCode to generate websites
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
} 