import { getWebsiteById } from '@/lib/storage';
import { notFound } from 'next/navigation';

interface SharePageProps {
  params: {
    id: string;
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const website = await getWebsiteById(params.id);
  
  if (!website) {
    notFound();
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: website.htmlContent }}
      suppressHydrationWarning
      className="min-h-screen w-full"
    />
  );
} 