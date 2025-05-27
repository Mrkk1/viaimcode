"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { WebsiteItem } from '@/components/website-item';
import { WebsitesLayout } from '@/components/websites-layout';
import { Plus, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/loading-screen';

interface User {
  userId: string;
  username: string;
}

interface Website {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Get user info
        const userResponse = await fetch('/api/user');
        if (!userResponse.ok) {
          if (userResponse.status === 401) {
            redirect('/login');
            return;
          }
          throw new Error('Failed to get user info');
        }
        const userData = await userResponse.json();
        setUser(userData);

        // Get website list
        const websitesResponse = await fetch('/api/websites');
        if (!websitesResponse.ok) {
          throw new Error('Failed to get website list');
        }
        const websitesData = await websitesResponse.json();
        setWebsites(websitesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      // Update list
      setWebsites(websites.filter(website => website.id !== id));
    } catch (error) {
      throw error;
    }
  };

  const handleUpdate = async (id: string, data: { title: string; description: string }) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      // Update list
      setWebsites(websites.map(website => 
        website.id === id 
          ? { ...website, ...data }
          : website
      ));
    } catch (error) {
      throw error;
    }
  };

  if (!user && !isLoading) {
    redirect('/login');
  }

  return (
    <WebsitesLayout>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold">Website Plaza
            </h1>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/" className="flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Create
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3  gap-6">
            {websites.length > 0 ? (
              websites.map((website) => (
                <div key={website.id} className="flex justify-center" style={{width: '100%'}}>
                  <WebsiteItem 
                    website={website} 
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg col-span-full">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No saved websites
                </p>
                <Button asChild>
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create now
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </WebsitesLayout>
  );
} 