"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trash2, ExternalLink, Copy, Loader2, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WebsiteItemProps {
  website: {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    thumbnailUrl?: string;
  };
  onDelete?: (id: string) => Promise<void>;
}

export function WebsiteItem({ website, onDelete }: WebsiteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (website.thumbnailUrl) {
      const url = website.thumbnailUrl.startsWith('http') 
        ? website.thumbnailUrl 
        : `${window.location.origin}${website.thumbnailUrl}`;
      setImageUrl(url);
    } else {
      setImageUrl(null);
    }
  }, [website.thumbnailUrl]);

  const handleCopyLink = async () => {
    const url = window.location.origin + `/share/${website.id}`;
    setIsCopying(true);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast.success('链接已复制到剪贴板');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
          toast.success('链接已复制到剪贴板');
        } catch (err) {
          console.error('复制失败:', err);
          toast.error('复制失败，请手动复制链接');
        }
      }
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动复制链接');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(website.id);
      toast.success('删除成功');
    } catch (error) {
      toast.error('删除失败，请重试');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="group relative border border-gray-800/30 rounded-xl overflow-hidden transition-all duration-300 bg-gray-900/90 hover:bg-gray-800/90 backdrop-blur-sm hover:shadow-lg hover:shadow-gray-900/20">
        <div className="w-full aspect-video relative bg-gray-950">
          <Link href={`/share/${website.id}`} target="_blank" className="block w-full h-full">
            {imageUrl && !imageError && !imageLoaded && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
              </div>
            )}
            
            {imageUrl && !imageError ? (
              <Image
                src={imageUrl}
                alt={website.title}
                fill
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center p-4">
                  <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                  <p className="text-sm text-gray-400 font-medium mb-1 line-clamp-1">{website.title || '未命名网站'}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{website.description || '无描述'}</p>
                </div>
              </div>
            )}
          </Link>
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium mb-2 truncate text-gray-100 group-hover:text-blue-400 transition-colors">
                {website.title}
              </h2>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                {website.description}
              </p>
              <p className="text-xs text-gray-500 flex items-center">
                <span className="inline-block w-1 h-1 rounded-full bg-gray-600 mr-2"></span>
                创建于 {formatDistanceToNow(new Date(website.createdAt), { addSuffix: true, locale: zhCN })}
              </p>
            </div>
            
            <div className="flex flex-row gap-2 justify-start pt-2 border-t border-gray-800/50">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300"
              >
                <Link 
                  href={`/share/${website.id}`} 
                  target="_blank"
                  className="flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">查看</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
                onClick={handleCopyLink}
                disabled={isCopying}
              >
                {isCopying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span className="text-xs font-medium">复制</span>
                  </>
                )}
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-xs font-medium">删除</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border border-gray-800/50 rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              你确定要删除这个网页吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-0">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-600/80 text-white border-0"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 