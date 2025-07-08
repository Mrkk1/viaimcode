"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NavBarProps {
  user: { userId: string; username: string } | null;
}

export function NavBar({ user }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 检查当前是否在登录或注册页面
  const isAuthPage = pathname === '/login' || pathname === '/register';

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      toast.success("Logged out successfully");
      
      window.location.href = '/login';
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-900" style={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 100 }}>
      <div className="container mx-auto px-4 py-3" style={{maxWidth: '100vw'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-white font-bold text-lg">
              ViaimCode
              <span className="inline-flex ml-2 items-center px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full group-hover:bg-gray-600 group-hover:text-white transition-colors">
                Beta
              </span>
            </Link>
            {user && !isAuthPage && (
              <>
              <Link
                href="/websites"
                className="relative px-4 py-2 text-sm font-medium text-gray-300 rounded-md transition-all duration-200 hover:text-white hover:bg-gray-800/50 group bg-gray-800/30"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>Website Plaza</span>
                </span>
                <span className="absolute inset-0 transform scale-x-0 origin-left bg-gradient-to-r from-gray-700/50 to-transparent rounded-md transition-transform group-hover:scale-x-100 duration-200" />
              </Link>
                <Link
                  href="/projects"
                  className="relative px-4 py-2 text-sm font-medium text-gray-300 rounded-md transition-all duration-200 hover:text-white hover:bg-gray-800/50 group bg-gray-800/30"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span>Projects</span>
                  </span>
                  <span className="absolute inset-0 transform scale-x-0 origin-left bg-gradient-to-r from-gray-700/50 to-transparent rounded-md transition-transform group-hover:scale-x-100 duration-200" />
                </Link>
                <Link
                  href="/ppt-plaza"
                  className="relative px-4 py-2 text-sm font-medium text-gray-300 rounded-md transition-all duration-200 hover:text-white hover:bg-gray-800/50 group bg-gray-800/30"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span>PPT Projects</span>
                  </span>
                  <span className="absolute inset-0 transform scale-x-0 origin-left bg-gradient-to-r from-gray-700/50 to-transparent rounded-md transition-transform group-hover:scale-x-100 duration-200" />
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              !isAuthPage && (
                <>
                  <span className="text-gray-300">
                    {user.username}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              )
            ) : (
              !isAuthPage && (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="outline" size="sm">
                      Register
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 