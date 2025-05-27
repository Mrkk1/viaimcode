import { NavBar } from "@/components/nav-bar"
import { getCurrentUser } from "@/lib/auth"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser();

  return (
    <>
      <NavBar user={user} />
      <main className=" ">
        {children}
      </main>
    </>
  )
} 