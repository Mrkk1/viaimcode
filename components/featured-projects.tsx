"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Eye, Calendar, User, Code } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import Image from "next/image"

interface FeaturedProject {
  id: string
  title: string
  description?: string
  thumbnail?: string
  model?: string
  provider?: string
  createdAt: string
  lastSaveTime?: string
  authorName: string
  shareUrl: string
  versionThumbnail?: string
  versionTitle?: string
}

export function FeaturedProjects() {
  const [projects, setProjects] = useState<FeaturedProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedProjects()
  }, [])

  const fetchFeaturedProjects = async () => {
    try {
      const response = await fetch('/api/featured-projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        console.error('Failed to fetch featured projects')
      }
    } catch (error) {
      console.error('Error fetching featured projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProviderBadgeColor = (provider?: string) => {
    switch (provider) {
      case 'deepseek':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'openai_compatible':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'ollama':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'lm_studio':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const handleViewProject = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            精选案例
          </h2>
          <p className="text-gray-400 text-lg">
            探索由 AI 创造的精彩网页作品
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="bg-gray-900/50 border-gray-800 animate-pulse">
              <CardHeader className="p-0">
                <div className="w-full h-48 bg-gray-800 rounded-t-lg"></div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-800 rounded mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 relative">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          项目精选
        </h2>
        <p className="text-gray-400 text-lg">
          探索由 AI 创造的精彩网页作品
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-full mb-4">
            <Code className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">暂无优秀项目</h3>
          <p className="text-gray-400">
            优秀的项目作品正在路上，敬请期待...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-300 hover:scale-105 group overflow-hidden"
            >
              <CardHeader className="p-0">
                <div className="relative w-full h-48 bg-gray-800 overflow-hidden">
                  {(project.versionThumbnail || project.thumbnail) ? (
                    <Image
                      src={project.versionThumbnail || project.thumbnail || ''}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <Code className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      className="bg-white/90 text-black hover:bg-white"
                      onClick={() => handleViewProject(project.shareUrl)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      查看
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4">
                <CardTitle className="text-white text-lg line-clamp-1 mb-2">
                  {project.versionTitle || project.title}
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm line-clamp-2 mb-3">
                  {project.description || '这是一个精彩的 AI 生成项目'}
                </CardDescription>
                
                <div className="flex items-center gap-2 mb-3">
                  {project.provider && (
                    <Badge variant="outline" className={getProviderBadgeColor(project.provider)}>
                      {project.provider.toUpperCase()}
                    </Badge>
                  )}
                  {project.model && (
                    <Badge variant="outline" className="bg-gray-700/50 text-gray-300 border-gray-600 text-xs">
                      {project.model.length > 10 ? project.model.substring(0, 10) + '...' : project.model}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{project.authorName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(project.lastSaveTime || project.createdAt), { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={() => handleViewProject(project.shareUrl)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  访问项目
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 