import { notFound } from 'next/navigation';
import { getWebsiteById } from '@/lib/storage';
import ClientGame from './client';

// 使用 any 类型来解决类型检查问题
export default async function SharePage({ params }: any) {
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