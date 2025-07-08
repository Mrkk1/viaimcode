import { notFound } from 'next/navigation';
import { pptDb } from '@/lib/ppt-db';
import PPTShareClient from './client';

export default async function PPTSharePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // 获取项目详情
    const projectData = await pptDb.getProjectWithDetails(id);
    
    if (!projectData.project) {
      notFound();
    }

    // 检查项目是否公开
    if (!projectData.project.isPublic) {
      notFound();
    }

    // 增加查看次数
    await pptDb.incrementViewCount(id);

    return (
      <PPTShareClient 
        project={projectData.project}
        outline={projectData.outline}
        slides={projectData.slides}
        chatMessages={projectData.chatMessages}
      />
    );
  } catch (error) {
    console.error('Error in PPTSharePage:', error);
    notFound();
  }
} 