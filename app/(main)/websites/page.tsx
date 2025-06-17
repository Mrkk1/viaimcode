"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { WebsiteItem } from '@/components/website-item';
import { WebsitesLayout } from '@/components/websites-layout';
import { Plus, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/loading-screen';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface User {
  userId: string;
  username: string;
}

interface Website {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  isFeatured?: boolean;
  thumbnailUrl?: string;
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(debouncedSearchTerm);
      setCurrentPage(1); // 重置页码
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchWebsites();
    }
  }, [user, currentPage, searchTerm]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        redirect('/login');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      redirect('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebsites = async () => {
    try {
      if (initialLoading) {
        setInitialLoading(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/websites?page=${currentPage}&pageSize=${itemsPerPage}&search=${searchTerm}`
      );
      if (response.ok) {
        const data = await response.json();
        setWebsites(data.websites);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } else {
        toast.error('Failed to get website list');
      }
    } catch (error) {
      console.error('Failed to get website list:', error);
      toast.error('Failed to get website list');
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      // Update list
      setWebsites(websites.filter(website => website.id !== id));
      setTotalItems(prev => prev - 1);
      toast.success('Website deleted successfully');
    } catch (error) {
      console.error('Failed to delete website:', error);
      toast.error('Failed to delete website');
    }
  };

  const handleUpdate = async (id: string, data: { title: string; description: string }) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      // Update list
      setWebsites(websites.map(website => 
        website.id === id 
          ? { ...website, ...data }
          : website
      ));
      toast.success('Website updated successfully');
    } catch (error) {
      console.error('Failed to update website:', error);
      toast.error('Failed to update website');
    }
  };

  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedSearchTerm(e.target.value);
  };

  // 处理页码变化
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (!user && !isLoading) {
    redirect('/login');
  }

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <WebsitesLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Website Plaza</h1>
        <div className="flex gap-4 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Input
              type="text"
              placeholder="Search websites..."
              value={debouncedSearchTerm}
              onChange={handleSearchChange}
              className="max-w-md pr-8"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <Button asChild className="whitespace-nowrap">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Create
            </Link>
          </Button>
        </div>
      </div>
      
      <div className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : ''}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {websites.length > 0 ? (
            websites.map((website) => (
              <div key={website.id} className="flex justify-center" style={{width: '100%'}}>
                <WebsiteItem 
                  website={website} 
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg col-span-full">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm ? 'No websites found matching your search' : 'No saved websites'}
              </p>
              <Button asChild>
                <Link href="/" className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create now
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                  className={currentPage === page 
                    ? "bg-white text-black hover:bg-gray-200"
                    : "backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"}
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </WebsitesLayout>
  );
} 