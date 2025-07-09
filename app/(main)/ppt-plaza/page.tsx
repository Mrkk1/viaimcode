'use client';

import { useEffect, useState, } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Presentation, Calendar, User, Eye, Loader2, RefreshCw, Trash2, Edit3, MoreVertical, Plus, Clock, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

interface PPTProject {
  id: string;
  title: string;
  prompt: string;
  model: string;
  provider: string;
  status: string;
  progress: number;
  totalSlides: number;
  completedSlides: number;
  createdAt: string;
  completedAt?: string;
  viewCount: number;
  likeCount: number;
}

export default function PPTPlazaPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<PPTProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<PPTProject | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingProjects, setDeletingProjects] = useState<Set<string>>(new Set());
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<PPTProject | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(debouncedSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        const response = await fetch('/api/ppt-tasks');
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('请先登录');
          }
          throw new Error('获取PPT项目失败');
        }

        const data = await response.json();
        setProjects(data.tasks);
      } catch (err) {
        console.error('获取用户PPT项目失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProjects();
  }, []);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 关闭对话框
      if (e.key === 'Escape') {
        if (deleteConfirmProject) {
          setDeleteConfirmProject(null);
        }
        if (isEditDialogOpen) {
          setIsEditDialogOpen(false);
        }
      }
      
      // Ctrl/Cmd + R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmProject, isEditDialogOpen]);

  const handleViewPPT = (projectId: string) => {
    router.push(`/ppt/${projectId}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/ppt-tasks');
      if (!response.ok) {
        throw new Error('Refresh failed');
      }
      const data = await response.json();
      setProjects(data.tasks);
      toast.success('Refresh successfully');
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDeleteProject = (project: PPTProject) => {
    setDeleteConfirmProject(project);
  };

  const handleDeleteProject = async (projectId: string) => {
    // 立即标记为删除中状态，提供即时反馈
    setDeletingProjects(prev => new Set(prev).add(projectId));
    
    // 乐观更新：立即从UI中移除项目
    const originalProjects = projects;
    setProjects(prev => prev.filter(p => p.id !== projectId));
    
    // 关闭确认对话框
    setDeleteConfirmProject(null);
    
    // 显示删除进度提示
    const deleteToast = toast.loading('Deleting project...');

    try {
      const response = await fetch(`/api/ppt-tasks/${projectId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      // 删除成功
      toast.success('Project deleted successfully', { id: deleteToast });
    } catch (err) {
      console.error('Delete project failed:', err);
      
      // 删除失败，恢复项目列表
      setProjects(originalProjects);
      toast.error('Delete project failed, please try again', { id: deleteToast });
    } finally {
      // 清除删除中状态
      setDeletingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  const handleEditProject = (project: PPTProject) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditPrompt(project.prompt);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProject || !editTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/ppt-tasks/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_info',
          title: editTitle.trim(),
          prompt: editPrompt.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      // 更新本地状态
      setProjects(prev => prev.map(p => 
        p.id === editingProject.id 
          ? { ...p, title: editTitle.trim(), prompt: editPrompt.trim() }
          : p
      ));

      setIsEditDialogOpen(false);
      setEditingProject(null);
      toast.success('Project information updated successfully');
    } catch (err) {
      console.error('Update project failed:', err);
      toast.error('Update project failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProviderBadgeColor = (provider?: string) => {
    switch (provider) {
      case 'deepseek':
        return 'bg-blue-400/20 text-blue-200 border-blue-400/30 hover:bg-blue-400/30';
      case 'openai_compatible':
        return 'bg-green-400/20 text-green-200 border-green-400/30 hover:bg-green-400/30';
      case 'ollama':
        return 'bg-purple-400/20 text-purple-200 border-purple-400/30 hover:bg-purple-400/30';
      case 'lm_studio':
        return 'bg-orange-400/20 text-orange-200 border-orange-400/30 hover:bg-orange-400/30';
      default:
        return 'bg-gray-400/20 text-gray-200 border-gray-400/30 hover:bg-gray-400/30';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/20 text-green-200 border-green-400/30 hover:bg-green-400/30';
      case 'generating':
        return 'bg-yellow-400/20 text-yellow-200 border-yellow-400/30 hover:bg-yellow-400/30';
      case 'failed':
        return 'bg-red-400/20 text-red-200 border-red-400/30 hover:bg-red-400/30';
      case 'pending':
        return 'bg-gray-400/20 text-gray-200 border-gray-400/30 hover:bg-gray-400/30';
      default:
        return 'bg-gray-400/20 text-gray-200 border-gray-400/30 hover:bg-gray-400/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'generating':
        return '生成中';
      case 'failed':
        return '失败';
      case 'pending':
        return '待处理';
      default:
        return status;
    }
  };

  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedSearchTerm(e.target.value);
  };

  // 过滤项目
  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center" style={{'--tw-gradient-to': '#091d4a'} as React.CSSProperties}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Loading PPT Projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center" style={{'--tw-gradient-to': '#091d4a'} as React.CSSProperties}>
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} variant="outline" className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900" style={{'--tw-gradient-to': '#091d4a'} as React.CSSProperties}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 from-purple-900/20 via-transparent to-transparent" />
      
      <div className="relative z-10 container mx-auto px-4">
        {/* 页面标题和操作 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My PPT Projects</h1>
            <p className="text-gray-400">Manage and view your AI generated PPT projects</p>
          </div>
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Input
                type="text"
                placeholder="Search PPT projects..."
                value={debouncedSearchTerm}
                onChange={handleSearchChange}
                className="max-w-md pr-8 backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          
            <Button 
              onClick={() => router.push('/?mode=ppt')}
              className="bg-white text-black hover:bg-gray-200 whitespace-nowrap"
            >
              <Plus className="" />
              Create New PPT
            </Button>
          </div>
        </div>

        {/* 项目列表 */}
        <div className={loading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : ''}>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
                <Presentation className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'No matching PPT projects found' : 'No PPT projects found'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 'Try using different search keywords' : 'Start creating your first AI generated PPT'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => router.push('/?mode=ppt')}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <Plus className=" " />
                  Create New PPT
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {filteredProjects.map((project) => (
                <Card   onClick={() => handleViewPPT(project.id)}  key={project.id} className="group relative overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10 hover:shadow-xl hover:shadow-white/5 cursor-pointer">
                  {/* 毛玻璃背景装饰 */}
                  <div className="absolute inset-0 bg-gradient-to-br via-transparent transition-opacity duration-300" />
                  
                  <CardHeader className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg line-clamp-1 font-medium mb-1">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="text-gray-300/80 mt-1 line-clamp-2">
                          {project.prompt}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="backdrop-blur-md bg-black/80 border border-white/20">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProject(project);
                            }}
                            className="text-gray-300 hover:text-white hover:bg-white/10"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Info
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteProject(project);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            disabled={deletingProjects.has(project.id)}
                          >
                            {deletingProjects.has(project.id) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Project
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative z-10" >
                    <div className="space-y-3">
                      {/* 状态和进度 */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`backdrop-blur-sm border-white/20 ${getStatusBadgeColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </Badge>
                        {project.status === 'generating' && project.totalSlides > 0 && (
                          <span className="text-xs text-gray-300">
                            {project.completedSlides || 0}/{project.totalSlides} slides
                          </span>
                        )}
                      </div>

                      {/* 进度条 */}
                      {project.status === 'generating' && project.totalSlides > 0 && (
                        <div className="w-full bg-gray-700/50 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((project.completedSlides || 0) / project.totalSlides) * 100}%` }}
                          />
                        </div>
                      )}

                    
                      
                      {/* 时间和统计信息 */}
                      <div className="flex items-center gap-4 text-xs text-gray-300/70">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>创建于 {formatDate(project.createdAt)}</span>
                        </div>
                   
                      </div>
                    </div>
                  </CardContent>
                  
                
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="backdrop-blur-md bg-black/80 border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Edit PPT Project</DialogTitle>
            <DialogDescription className="text-gray-300/80">
              Modify project name and description
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-200">
                Project Name
              </Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                placeholder="Enter project name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-200">
                Project Description
              </Label>
              <Textarea
                id="description"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                placeholder="Enter project description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isUpdating || !editTitle.trim()}
              className="bg-white text-black hover:bg-gray-200"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteConfirmProject} onOpenChange={() => setDeleteConfirmProject(null)}>
        <AlertDialogContent className="backdrop-blur-md bg-black/80 border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300/80">
              Are you sure you want to delete the project <span className="font-semibold text-white">"{deleteConfirmProject?.title}"</span> ?
              <br />
              <span className="text-red-400 text-sm mt-2 block">
                This action will permanently delete the project and all related data (outline, slides, chat history, etc.), and cannot be recovered.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeleteConfirmProject(null)}
              className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmProject && handleDeleteProject(deleteConfirmProject.id)}
              className="bg-red-500/80 text-white hover:bg-red-500 backdrop-blur-sm"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 