"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, User, Calendar, ExternalLink, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Website {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  thumbnailUrl?: string;
  isFeatured?: boolean;
  authorName?: string;
}

export default function AdminPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');

  // 检查管理员权限
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin/check');
        if (response.ok) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(debouncedSearchTerm);
      setCurrentPage(1); // 重置页码
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearchTerm]);

  // 加载数据
  useEffect(() => {
    const loadWebsites = async () => {
      if (!isAdmin) return; // 如果不是管理员，不加载数据

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/admin/featured-websites?page=${currentPage}&pageSize=${itemsPerPage}&search=${searchTerm}&featured=${featuredFilter}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to load websites');
        }
        
        const data = await response.json();
        setWebsites(data.websites);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } catch (error) {
        console.error('Failed to load websites:', error);
        toast.error('Failed to load websites');
      } finally {
        setIsLoading(false);
      }
    };

    loadWebsites();
  }, [currentPage, itemsPerPage, searchTerm, featuredFilter, isAdmin]);

  const handleToggleFeatured = async (websiteId: string, currentFeatured: boolean) => {
    try {
      setUpdatingIds(prev => new Set(prev).add(websiteId));
      
      const response = await fetch('/api/admin/featured-websites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          isFeatured: !currentFeatured,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update featured status');
      }

      setWebsites(websites.map(website => 
        website.id === websiteId 
          ? { ...website, isFeatured: !currentFeatured }
          : website
      ));

      toast.success(`Website ${!currentFeatured ? 'featured' : 'unfeatured'} successfully`);
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
      toast.error('Failed to update featured status');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(websiteId);
        return newSet;
      });
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

  // 处理筛选变化
  const handleFeaturedFilterChange = (value: string) => {
    setFeaturedFilter(value);
    setCurrentPage(1); // 重置页码
  };

  // 显示加载状态
  if (isAdmin === null || (isAdmin && isLoading && !websites.length)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // 显示无权限状态
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-4">You don't have permission to access this page.</p>
          <Button asChild variant="outline" className="bg-gray-900 border-gray-700 hover:bg-gray-800">
            <Link href="/">
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-400">Manage featured websites on the homepage</p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-4">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search websites..."
                value={debouncedSearchTerm}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>
            
            <Select
              value={featuredFilter}
              onValueChange={handleFeaturedFilterChange}
            >
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="all">All Websites</SelectItem>
                <SelectItem value="featured">Featured Only</SelectItem>
                <SelectItem value="unfeatured">Unfeatured Only</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-sm text-gray-400 whitespace-nowrap">
              Total: {totalItems} websites
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <Card key={index} className="bg-gray-900/80 border-gray-700/60 animate-pulse">
                <div className="aspect-video bg-gray-800"></div>
                <CardContent className="p-4">
                  <div className="h-6 bg-gray-800 rounded mb-3"></div>
                  <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {websites.map((website) => (
                <Card 
                  key={website.id} 
                  className={`group bg-gray-900/80 border-2 transition-all duration-300 hover:shadow-lg overflow-hidden ${
                    website.isFeatured 
                      ? 'border-yellow-500/60 hover:border-yellow-400/80 hover:shadow-yellow-500/20' 
                      : 'border-gray-700/60 hover:border-blue-500/60 hover:shadow-blue-500/20'
                  }`}
                >
                  <div className="aspect-video relative bg-gray-950 overflow-hidden">
                    {website.thumbnailUrl ? (
                      <Image
                        src={website.thumbnailUrl}
                        alt={website.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                        <div className="text-center p-4">
                          <ExternalLink className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm text-gray-500 font-medium">
                            {website.title || 'Untitled Website'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {website.isFeatured && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-yellow-500/90 text-yellow-900 border-0">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-1">
                      {website.title || 'Untitled Website'}
                    </h3>
                    
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                      {website.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      {website.authorName && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{website.authorName}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(website.createdAt), { 
                            addSuffix: true, 
                            locale: enUS 
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <Link href={`/share/${website.id}`} target="_blank">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Link>
                      </Button>
                      
                      <Button
                        variant={website.isFeatured ? "default" : "outline"}
                        size="sm"
                        className={`flex-1 ${
                          website.isFeatured 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900' 
                            : 'border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-yellow-900'
                        }`}
                        onClick={() => handleToggleFeatured(website.id, website.isFeatured || false)}
                        disabled={updatingIds.has(website.id)}
                      >
                        {updatingIds.has(website.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Star className={`w-3 h-3 mr-1 ${website.isFeatured ? 'fill-current' : ''}`} />
                        )}
                        {website.isFeatured ? 'Unfeature' : 'Feature'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {websites.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No websites found</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="bg-gray-900 border-gray-700 hover:bg-gray-800"
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
                        : "bg-gray-900 border-gray-700 hover:bg-gray-800"}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="bg-gray-900 border-gray-700 hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 