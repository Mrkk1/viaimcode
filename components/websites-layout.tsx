"use client";

import { Toaster } from '@/components/ui/sonner';

interface WebsitesLayoutProps {
  children: React.ReactNode;
}

export function WebsitesLayout({ children }: WebsitesLayoutProps) {
  return (
    <div className="container mx-auto py-8" style={{ marginTop: '61px' }}>
      <Toaster />
      {children}
    </div>
  );
} 