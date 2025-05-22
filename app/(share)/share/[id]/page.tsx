import { notFound } from 'next/navigation';
import { getWebsiteById } from '@/lib/storage';
import ClientGame from './client';

// 这是服务器端组件
export default async function SharePage({
  params,
}: {
  params: { id: string }
}) {
  try {
    const website = await getWebsiteById(params.id);

    if (!website) {
      notFound();
    }

    return <ClientGame htmlContent={website.htmlContent} />;
  } catch (error) {
    console.error('Error in SharePage:', error);
    notFound();
  }
}