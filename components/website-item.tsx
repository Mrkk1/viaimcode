"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trash2, ExternalLink, Copy, Loader2, Image as ImageIcon, Edit } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WebsiteItemProps {
  website: {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    thumbnailUrl?: string;
    isFeatured?: boolean;
  };
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, data: { title: string; description: string }) => Promise<void>;
}

// 提取缩略图组件以便于维护
const ThumbnailImage = memo(({ url, title, onError }: { url?: string; title: string; onError: () => void }) => {
  if (!url) return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center p-4">
        <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
        <p className="text-sm text-gray-400 font-medium mb-1 line-clamp-1">{title || 'Untitled Website'}</p>
        <p className="text-xs text-gray-600 line-clamp-2">{title ? '' : 'No description'}</p>
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
  onUpdate,
  isDeleting, 
  setShowDeleteDialog,
  setShowEditDialog
}: { 
  websiteId: string; 
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, data: { title: string; description: string }) => Promise<void>;
  isDeleting: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  setShowEditDialog: (show: boolean) => void;
}) => {
  const [isCopying, setIsCopying] = useState(false);
  
  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/share/${websiteId}`;
    setIsCopying(true);
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
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
        toast.success('Link copied to clipboard');
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr);
        toast.error('Copy failed, please copy the link manually');
      }
    } finally {
      setIsCopying(false);
    }
  }, [websiteId]);



  return (
    <div className="flex flex-row gap-2 justify-between pt-2 border-t border-gray-800/50">
      <Button
        variant="ghost"
        size="sm"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md h-8 px-3 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5"
        onClick={() => setShowEditDialog(true)}
      >
        <Edit className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Edit</span>
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
            <span className="text-xs font-medium">Copy</span>
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
          aria-label="Delete website"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-xs font-medium">Delete</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

export const WebsiteItem = memo(function WebsiteItem({ website, onDelete, onUpdate }: WebsiteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState(website.title);
  const [editDescription, setEditDescription] = useState(website.description);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(website.id);
      toast.success('Successfully deleted');
    } catch (error) {
      toast.error('Failed to delete, please try again');
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [onDelete, website.id]);

  const handleUpdate = useCallback(async () => {
    if (!onUpdate) return;
    setIsUpdating(true);
    try {
      await onUpdate(website.id, {
        title: editTitle,
        description: editDescription
      });
      toast.success('Successfully updated');
      setShowEditDialog(false);
    } catch (error) {
      toast.error('Failed to update, please try again');
      console.error('Update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [onUpdate, website.id, editTitle, editDescription]);

  const handleImageError = useCallback(() => setImageError(true), []);

  const formattedDate = formatDistanceToNow(new Date(website.createdAt), { 
    addSuffix: true, 
    locale: enUS 
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
                {website.title || 'Untitled Website'}
              </h2>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                {website.description || 'No description'}
              </p>
              <p className="text-xs text-gray-500 flex items-center">
                <span className="inline-block w-1 h-1 rounded-full bg-gray-600 mr-2"></span>
                Created {formattedDate}
              </p>
            </div>
            
            <ActionButtons 
              websiteId={website.id} 
              onDelete={onDelete}
              onUpdate={onUpdate}
              isDeleting={isDeleting} 
              setShowDeleteDialog={setShowDeleteDialog}
              setShowEditDialog={setShowEditDialog}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border border-gray-800/50 rounded-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100 text-lg">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{website.title || 'Untitled Website'}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-600/80 text-white border-0"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border border-gray-800/50 rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-100 text-lg">Edit Website Information</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify website title and description
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-300">
                Title
              </Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-gray-800 border-gray-700 text-gray-100"
                placeholder="Enter website title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-gray-800 border-gray-700 text-gray-100 min-h-[100px]"
                placeholder="Enter website description"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || !editTitle.trim()}
              className="bg-blue-500/80 hover:bg-blue-600/80 text-white"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}); 