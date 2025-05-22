import { notFound } from 'next/navigation';
import { getWebsiteById } from '@/lib/storage';

// 不使用 extends PageProps，直接定义参数类型
export default async function SharePage(args: any) {
  const { params } = args as any;

  const website = await getWebsiteById(params.id as string);

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