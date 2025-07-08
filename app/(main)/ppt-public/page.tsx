'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Presentation, Calendar, Eye, Heart, Search, Loader2, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface PPTProject {
  id: string;
  title: string;
  prompt: string;
  model: string;
  provider: string;
  status: string;
  totalSlides: number;
  completedSlides: number;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  isFeatured: boolean;
}

export default function PPTPublicPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<PPTProject[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<PPTProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState<'all' | 'featured'>('featured');

  useEffect(() => {
    fetchProjects();
  }, [currentTab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      if (currentTab === 'featured') {
        // 获取精选项目
        const response = await fetch('/api/ppt-public?featured=true&limit=20');
        if (response.ok) {
          const data = await response.json();
          setFeaturedProjects(data.projects);
        }
      } else {
        // 获取所有公开项目
        const response = await fetch('/api/ppt-public?limit=50');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects);
        }
      }
    } catch (error) {
      console.error('获取项目失败:', error);
      toast.error('加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPPT = (projectId: string) => {
    router.push(`/ppt-share/${projectId}`);
  };

  const filteredProjects = (currentTab === 'featured' ? featuredProjects : projects).filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN });
    } catch {
      return '未知时间';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">PPT 广场</h1>
          <p className="text-xl text-gray-400 mb-8">发现和分享精彩的 AI 生成演示文稿</p>
          
          {/* 搜索栏 */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="搜索 PPT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-1">
            <Button
              onClick={() => setCurrentTab('featured')}
              variant={currentTab === 'featured' ? 'default' : 'ghost'}
              className={`${
                currentTab === 'featured' 
                  ? 'bg-white text-black' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Star className="w-4 h-4 mr-2" />
              精选推荐
            </Button>
            <Button
              onClick={() => setCurrentTab('all')}
              variant={currentTab === 'all' ? 'default' : 'ghost'}
              className={`${
                currentTab === 'all' 
                  ? 'bg-white text-black' 
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              全部项目
            </Button>
          </div>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
            <p className="text-white">加载中...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <Presentation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? '没有找到匹配的项目' : '暂无项目'}
            </h3>
            <p className="text-gray-400">
              {searchTerm ? '尝试使用不同的搜索关键词' : '等待更多精彩的 PPT 项目'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="group relative overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10 hover:shadow-xl hover:shadow-white/5 cursor-pointer transform hover:scale-105"
                onClick={() => handleViewPPT(project.id)}
              >
                {/* 精选标识 */}
                {project.isFeatured && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-yellow-500 text-black">
                      <Star className="w-3 h-3 mr-1" />
                      精选
                    </Badge>
                  </div>
                )}

                <CardHeader className="relative z-10">
                  <CardTitle className="text-white text-lg line-clamp-2 font-medium mb-2">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-gray-300/80 line-clamp-3">
                    {project.prompt}
                  </CardDescription>
                </CardHeader>

                <CardContent className="relative z-10">
                  <div className="space-y-3">
                    {/* 项目统计 */}
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="text-gray-300 border-gray-600">
                        {project.completedSlides}/{project.totalSlides} 页
                      </Badge>
                      <div className="flex items-center space-x-3 text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{project.viewCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{project.likeCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* 创建时间和模型信息 */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                      <span className="text-gray-500">
                        {project.model}
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* 悬停效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Card>
            ))}
          </div>
        )}

        {/* 创建提示 */}
        <div className="text-center mt-16 py-8 border-t border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">想要创建自己的 PPT？</h3>
          <p className="text-gray-400 mb-6">使用 AI 快速生成专业的演示文稿</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-white text-black hover:bg-gray-200"
          >
            开始创建
          </Button>
        </div>
      </div>
    </div>
  );
} 