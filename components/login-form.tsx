"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "登录失败");
      }

      toast.success("登录成功");
      
      // 获取来源页面，如果没有则跳转到首页
      const from = searchParams.get("from") || "/";
      router.push(from);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="请输入用户名"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="请输入密码"
          required
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "登录中..." : "登录"}
      </Button>
      <div className="text-center text-sm">
        <span className="text-gray-400">还没有账号？</span>
        {" "}
        <Link
          href="/register"
          className="text-blue-500 hover:text-blue-400"
        >
          立即注册
        </Link>
      </div>
    </form>
  );
} 