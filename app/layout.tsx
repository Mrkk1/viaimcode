import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { NavBar } from "@/components/nav-bar"
import { getCurrentUser } from "@/lib/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ViaimCode",
  description: "使用 AI 生成网页 | AI Website Generator",
}

// 检查是否是share路由
function isShareRoute(pathname: string) {
  return pathname.startsWith('/share/');
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 获取当前用户
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN" className={inter.className}>
      <body>
        {children}
      </body>
    </html>
  )
}
