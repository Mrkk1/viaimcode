"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trash2, ExternalLink, Copy, Loader2, Image as ImageIcon } from 'lucide-react';
import { useState, memo, useCallback } from 'react';
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

// 提取缩略图组件以便于维护
const ThumbnailImage = memo(({ url, title, onError }: { url?: string; title: string; onError: () => void }) => {
  if (!url) return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center p-4">
        <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
        <p className="text-sm text-gray-400 font-medium mb-1 line-clamp-1">{title || '未命名网站'}</p>
        <p className="text-xs text-gray-600 line-clamp-2">{title ? '' : '无描述'}</p>
      </div>
    </div>
  );
  
  return (
    <Image
      src={url}
      alt={title}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover transition-transform duration-700 group-hover:scale-110"
      onError={onError}
      loading="lazy"
    />
  );
});

ThumbnailImage.displayName = 'ThumbnailImage';

// 提取操作按钮组件
const ActionButtons = memo(({ 
  websiteId, 
  onDelete, 
  isDeleting, 
  setShowDeleteDialog 
}: { 
  websiteId: string; 
  onDelete?: (id: string) => Promise<void>;
  isDeleting: boolean;
  setShowDeleteDialog: (show: boolean) => void;
}) => {
  const [isCopying, setIsCopying] = useState(false);
  
  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/share/${websiteId}`;
    setIsCopying(true);
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制到剪贴板');
    } catch (err) {
      // 回退机制
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        toast.success('链接已复制到剪贴板');
      } catch (fallbackErr) {
        console.error('复制失败:', fallbackErr);
        toast.error('复制失败，请手动复制链接');
      }
    } finally {
      setIsCopying(false);
    }
  }, [websiteId]);

  return (
    <div className="flex flex-row gap-2 justify-between pt-2 border-t border-gray-800/50">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md h-8 px-3 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5"
      >
        <Link 
          href={`/share/${websiteId}`} 
          target="_blank"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">查看</span>
        </Link>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md h-8 px-3 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
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
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          aria-label="删除网站"
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
  );
});

ActionButtons.displayName = 'ActionButtons';

export const WebsiteItem = memo(function WebsiteItem({ website, onDelete }: WebsiteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(website.id);
      toast.success('删除成功');
    } catch (error) {
      toast.error('删除失败，请重试');
      console.error('删除失败:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [onDelete, website.id]);

  const handleImageError = useCallback(() => setImageError(true), []);

  const formattedDate = formatDistanceToNow(new Date(website.createdAt), { 
    addSuffix: true, 
    locale: zhCN 
  });

  return (
    <>
      <div 
        className="group relative border border-gray-800/30 rounded-xl overflow-hidden transition-all duration-300 
                 bg-gray-900/90 hover:bg-gray-800/90 backdrop-blur-sm hover:shadow-lg hover:shadow-gray-900/20"
        style={{width: '100%'}}
      >
        {/* 预览图区域 */}
        <div className="w-full aspect-video relative bg-gray-950">
          <Link href={`/share/${website.id}`} target="_blank" className="block w-full h-full">
            <ThumbnailImage 
              url={imageError ? undefined : website.thumbnailUrl} 
              title={website.title} 
              onError={handleImageError} 
            />
          </Link>
        </div>
        
        <div className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium mb-2 truncate text-gray-100 group-hover:text-blue-400 transition-colors">
                {website.title || '未命名网站'}
              </h2>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                {website.description || '无描述'}
              </p>
              <p className="text-xs text-gray-500 flex items-center">
                <span className="inline-block w-1 h-1 rounded-full bg-gray-600 mr-2"></span>
                创建于 {formattedDate}
              </p>
            </div>
            
            <ActionButtons 
              websiteId={website.id} 
              onDelete={onDelete} 
              isDeleting={isDeleting} 
              setShowDeleteDialog={setShowDeleteDialog} 
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border border-gray-800/50 rounded-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100 text-lg">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              你确定要删除"{website.title || '未命名网站'}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-0">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-600/80 text-white border-0"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {isDeleting ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}); 