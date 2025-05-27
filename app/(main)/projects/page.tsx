"use client";

import { useState, useEffect } from "react";
import { redirect } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, Clock, Code, Edit, Trash2, Eye } from "lucide-react";
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
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'openai_compatible':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'ollama':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'lm_studio':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  return (
    <div className=" bg-black">
      <div className="container mx-auto px-4 py-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg line-clamp-1">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-1 line-clamp-2">
                        {project.description || project.prompt || 'No description'}
                      </CardDescription>
                    </div>
                    {/* {project.status === 'active' && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 ml-2">
                        Active
                      </Badge>
                    )} */}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* 模型和提供商信息 */}
                    <div className="flex items-center gap-2">
                      {project.provider && (
                        <Badge variant="outline" className={getProviderBadgeColor(project.provider)}>
                          {project.provider.toUpperCase()}
                        </Badge>
                      )}
                      {project.model && (
                        <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                          {project.model}
                        </Badge>
                      )}
                    </div>
                    
                    {/* 时间信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <Link href={`/project/${project.id}`}>
                      <Button variant="outline" size="sm" className="text-gray-300 border-gray-700 hover:bg-gray-800  hover:text-white">
                        <Eye className="w-4 h-4 mr-1" />
                        Enter
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white"
                      onClick={() => handleEditProject(project)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
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
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify project name and description
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-300">
                Project Name
              </Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter project name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-300">
                Project Description
              </Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                placeholder="Enter project description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingProject(null)}
              className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
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
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Delete Project</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action will permanently delete this project and all its versions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
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