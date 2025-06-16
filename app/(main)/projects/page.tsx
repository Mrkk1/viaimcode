"use client";

import { useState, useEffect } from "react";
import { redirect } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, Clock, Code, Edit, Trash2, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { LoadingScreen } from '@/components/loading-screen';
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

interface Project {
  id: string;
  title: string;
  description?: string;
  prompt?: string;
  model?: string;
  provider?: string;
  thumbnail?: string;
  status?: 'active' | 'archived' | 'deleted';
  isPublic?: boolean;
  lastSaveTime?: string;
  createdAt?: string;
  updatedAt?: string;
  currentVersionId?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchProjects();
  }, []);

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
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        toast.error('Failed to get project list');
      }
    } catch (error) {
      console.error('Failed to get project list:', error);
      toast.error('Failed to get project list');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Project deleted successfully');
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        toast.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleteProjectId(null);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || "");
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
        }),
      });

      if (response.ok) {
        const updatedProject = await response.json();
        setProjects(projects.map(p => 
          p.id === updatedProject.id ? updatedProject : p
        ));
        toast.success('Project updated successfully');
        setEditingProject(null);
      } else {
        toast.error('Failed to update project');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
    } finally {
      setIsUpdating(false);
    }
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

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 " style={{'--tw-gradient-to': '#091d4a'} as React.CSSProperties}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0  from-purple-900/20 via-transparent to-transparent" />
      
      <div className="relative z-10 container mx-auto px-4">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Projects</h1>
            <p className="text-gray-400">Manage and view all your AI projects</p>
          </div>
          <Link href="/">
            <Button className="bg-white text-black hover:bg-gray-200">
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </Link>
        </div>

        {/* 项目列表 */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
              <Code className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
            <p className="text-gray-400 mb-6">Click the button above to create your first AI project</p>
            <Link href="/">
              <Button className="bg-white text-black hover:bg-gray-200">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {projects.map((project) => (
              <Card key={project.id} className="group relative overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10 hover:shadow-xl hover:shadow-white/5">
                {/* 毛玻璃背景装饰 */}
                <div className="absolute inset-0 bg-gradient-to-br  via-transparent   transition-opacity duration-300" />
                
                <CardHeader className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg line-clamp-1 font-medium">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-gray-300/80 mt-1 line-clamp-2">
                        {project.description || project.prompt || 'No description'}
                      </CardDescription>
                    </div>
               
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-2">
                    {/* 模型和提供商信息 */}
                    <div className="flex items-center gap-2">
                      {project.provider && (
                        <Badge variant="outline" className={`backdrop-blur-sm border-white/20 ${getProviderBadgeColor(project.provider)}`}>
                          {project.provider.toUpperCase()}
                        </Badge>
                      )}
                      {project.model && (
                        <Badge variant="outline" className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/15">
                          {project.model}
                        </Badge>
                      )}
                    </div>
                    
                    {/* 时间信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-300/70">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created {project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: enUS }) : 'Unknown'}</span>
                      </div>
                      {project.lastSaveTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Updated {formatDistanceToNow(new Date(project.lastSaveTime), { addSuffix: true, locale: enUS })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="relative z-10 flex justify-between">
                  <div className="flex gap-2">
                    <Link href={`/project/${project.id}`}>
                      <Button variant="outline" size="sm" className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20 hover:text-white hover:border-white/30 transition-all duration-200">
                        <Rocket className="w-4 h-4 mr-1" />
                        Enter
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20 hover:text-white hover:border-white/30 transition-all duration-200"
                      onClick={() => handleEditProject(project)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-300/80 hover:text-red-200 hover:bg-red-500/20 backdrop-blur-sm transition-all duration-200"
                    onClick={() => setDeleteProjectId(project.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="backdrop-blur-md bg-black/80 border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Project</DialogTitle>
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
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                placeholder="Enter project description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingProject(null)}
              className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProject}
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
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent className="backdrop-blur-md bg-black/80 border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300/80">
              This action will permanently delete this project and all its versions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="backdrop-blur-sm bg-white/10 text-gray-200 border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/80 text-white hover:bg-red-500 backdrop-blur-sm"
              onClick={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 