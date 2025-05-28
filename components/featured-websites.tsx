"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Image from 'next/image'
import Link from 'next/link'

interface FeaturedWebsite {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  createdAt: string
  authorName?: string
}

export function FeaturedWebsites() {
  const [websites, setWebsites] = useState<FeaturedWebsite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedWebsites = async () => {
      try {
        const response = await fetch('/api/featured-websites')
        if (response.ok) {
          const data = await response.json()
          setWebsites(data)
        }
      } catch (error) {
        console.error('Failed to fetch featured websites:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedWebsites()
  }, [])

  if (isLoading) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Featured Websites
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover amazing websites created by our community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-800/50 rounded-xl h-48 mb-4"></div>
                <div className="bg-gray-800/50 rounded h-4 mb-2"></div>
                <div className="bg-gray-800/50 rounded h-3 w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (websites.length === 0) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Featured Websites
          </h2>
          <p className="text-gray-400 text-lg">
            No featured websites yet. Be the first to create something amazing!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-16 px-4 relative z-10 " >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Featured Websites
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Discover amazing websites created by our community
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {websites.map((website) => (
            <Link 
              key={website.id}
              href={`/share/${website.id}`} 
              target="_blank"
              className="block"
            >
              <Card 
                className="group bg-gray-900/80 border-2 border-gray-700/60 hover:border-blue-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 overflow-hidden cursor-pointer"
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
                </div>
                
                <CardContent className="p-3">
                  <h3 className="font-semibold text-white mb-2 line-clamp-1 group-hover:text-blue-400 transition-colors">
                    {website.title || 'Untitled Website'}
                  </h3>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                    {website.description || 'No description available'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        {websites.length >= 12 && (
          <div className="text-center mt-12">
            <p className="text-gray-400">
              Want to see your website featured here? 
              <Link href="/login" className="text-blue-400 hover:text-blue-300 ml-1 font-medium">
                Sign up and start creating!
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 