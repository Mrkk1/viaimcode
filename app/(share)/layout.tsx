import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "分享的网页 - ViaimCode",
  description: "使用 AI 生成的网页",
  metadataBase: null as any
}

// 确保这是一个独立的根布局
export const dynamic = 'force-static'

// 禁用布局继承
export const revalidate = 0

// 使用特殊的模板标记
export default function Template({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      {children}
      <Toaster />
    </div>
  )
} 