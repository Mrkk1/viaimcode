"use client";

import { useState, useEffect } from "react";
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
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");

  // 处理登录成功后的操作
  useEffect(() => {
    if (loginSuccess && redirectTo) {
      toast.success("Login successful");
      window.location.href = redirectTo;
    }
  }, [loginSuccess, redirectTo, router]);

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
        throw new Error(error.message || "Login failed");
      }

      // 设置登录成功状态和重定向地址
      const from = searchParams?.get("from") || "/";
      setRedirectTo(from);
      setLoginSuccess(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
      setLoginSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="Enter your username"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Login"}
      </Button>
      <div className="text-center text-sm">
        <span className="text-gray-400">Don't have an account?</span>
        {" "}
        <Link
          href="/register"
          className="text-blue-500 hover:text-blue-400"
        >
          Register now
        </Link>
      </div>
    </form>
  );
} 