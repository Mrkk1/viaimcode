"use client";

interface WebsitesLayoutProps {
  children: React.ReactNode;
}

export function WebsitesLayout({ children }: WebsitesLayoutProps) {
  return (
    <div className="container mx-auto py-8" >
      {children}
    </div>
  );
} 