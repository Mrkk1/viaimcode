"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { WebsiteItem } from '@/components/website-item';
import { WebsitesLayout } from '@/components/websites-layout';
import { Plus, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface User {
  userId: string;
  username: string;
}

interface Website {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  thumbnailUrl?: string;
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 获取用户信息
        const userResponse = await fetch('/api/user');
        if (!userResponse.ok) {
          if (userResponse.status === 401) {
            redirect('/login');
            return;
          }
          throw new Error('获取用户信息失败');
        }
        const userData = await userResponse.json();
        setUser(userData);

        // 获取网站列表
        const websitesResponse = await fetch('/api/websites');
        if (!websitesResponse.ok) {
          throw new Error('获取网站列表失败');
        }
        const websitesData = await websitesResponse.json();
        setWebsites(websitesData);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 更新列表
      setWebsites(websites.filter(website => website.id !== id));
    } catch (error) {
      throw error;
    }
  };

  if (!user && !isLoading) {
    redirect('/login');
  }

  return (
    <WebsitesLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">我的网站</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/" className="flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            创建新网页
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      ) : websites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => (
            <WebsiteItem 
              key={website.id} 
              website={website} 
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            还没有保存的网页
          </p>
          <Button asChild>
            <Link href="/" className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              立即创建
            </Link>
          </Button>
        </div>
      )}
    </WebsitesLayout>
  );
} 