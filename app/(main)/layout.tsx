import { NavBar } from "@/components/nav-bar"
import { getCurrentUser } from "@/lib/auth"
import { Toaster } from "@/components/ui/sonner"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser();

  return (
    <>
      <NavBar user={user} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Toaster />
    </>
  )
} 