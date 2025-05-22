import LoginForm from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">登录</h2>
          <p className="mt-2 text-sm text-gray-400">
            登录后即可使用 AI 生成网页
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
} 