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
                    <span>Web Projects</span>
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
                {/* <Link
                  href="/ppt-public"
                  className="relative px-4 py-2 text-sm font-medium text-gray-300 rounded-md transition-all duration-200 hover:text-white hover:bg-gray-800/50 group bg-gray-800/30"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span>PPT Plaza</span>
                  </span>
                  <span className="absolute inset-0 transform scale-x-0 origin-left bg-gradient-to-r from-gray-700/50 to-transparent rounded-md transition-transform group-hover:scale-x-100 duration-200" />
                </Link> */}
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
          <div className="flex items-center space-x-1">
            <a
              href="https://github.com/Mrkk1/viaimcode"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="GitHub"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="inline-block align-middle"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/>
              </svg>
            </a>
          </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 