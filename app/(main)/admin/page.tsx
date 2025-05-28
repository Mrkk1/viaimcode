"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, User, Calendar, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // 每页显示12个项目

  useEffect(() => {
    const loadWebsites = async () => {
      try {
        const response = await fetch('/api/admin/featured-websites');
        
        if (response.status === 403) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to load websites');
        }
        
        const data = await response.json();
        setWebsites(data);
        setIsAdmin(true);
      } catch (error) {
        console.error('Failed to load websites:', error);
        toast.error('Failed to load websites');
      } finally {
        setIsLoading(false);
      }
    };

    loadWebsites();
  }, []);

  const handleToggleFeatured = async (websiteId: string, currentStatus: boolean) => {
    setUpdatingIds(prev => new Set(prev).add(websiteId));
    
    try {
      const response = await fetch('/api/admin/featured-websites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteId,
          isFeatured: !currentStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update featured status');
      }

      // Update local state
      setWebsites(prev => 
        prev.map(website => 
          website.id === websiteId 
            ? { ...website, isFeatured: !currentStatus }
            : website
        )
      );

      toast.success(
        !currentStatus 
          ? 'Added to homepage featured' 
          : 'Removed from homepage featured'
      );
    } catch (error) {
      console.error('Failed to update featured status:', error);
      toast.error('Failed to update featured status');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(websiteId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to access this page.</p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 过滤网站列表
  const filteredWebsites = websites.filter(website => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      website.title.toLowerCase().includes(searchLower) ||
      website.description.toLowerCase().includes(searchLower) ||
      (website.authorName && website.authorName.toLowerCase().includes(searchLower))
    );
  });

  // 分页逻辑
  const totalPages = Math.ceil(filteredWebsites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWebsites = filteredWebsites.slice(startIndex, endIndex);

  const featuredCount = websites.filter(w => w.isFeatured).length;
  const filteredFeaturedCount = filteredWebsites.filter(w => w.isFeatured).length;

  // 搜索时重置到第一页
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // 分页控制函数
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-400">Manage featured websites on the homepage</p>
          
          {/* 搜索框 */}
          <div className="mt-6 mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by title, description, or author..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              Total: {websites.length}
            </Badge>
            <Badge variant="outline" className="border-yellow-500 text-yellow-400">
              Featured: {featuredCount}
            </Badge>
            {searchTerm && (
              <>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  Filtered: {filteredWebsites.length}
                </Badge>
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  Featured in Results: {filteredFeaturedCount}
                </Badge>
              </>
            )}
            {filteredWebsites.length > itemsPerPage && (
              <Badge variant="outline" className="border-gray-500 text-gray-400">
                Page {currentPage} of {totalPages}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentWebsites.map((website) => (
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

        {websites.length > 0 && filteredWebsites.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg mb-2">No results found</p>
            <p className="text-gray-500 text-sm">
              Try adjusting your search terms or{' '}
              <button 
                onClick={() => handleSearchChange('')}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                clear the search
              </button>
            </p>
          </div>
        )}

        {/* 分页控件 */}
        {filteredWebsites.length > itemsPerPage && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 页面信息 */}
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredWebsites.length)} of {filteredWebsites.length} results
              {searchTerm && ` for "${searchTerm}"`}
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {/* 页码按钮 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className={`w-8 h-8 p-0 ${
                        currentPage === pageNum
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 