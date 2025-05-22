import { NextRequest, NextResponse } from 'next/server';
import { saveWebsite } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { SharedWebsite } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { title, description, htmlContent, prompt } = await request.json();
    
    // 验证必要字段
    if (!htmlContent) {
      return NextResponse.json(
        { error: '网页内容不能为空' },
        { status: 400 }
      );
    }
    
    // 保存网页
    const savedWebsite = await saveWebsite({
      userId: user.userId, // 包含 userId 在 websiteData 中
      title: title || '未命名网站',
      description: description || '无描述',
      htmlContent,
      prompt: prompt || ''
    }, user.userId);
    
    // 返回保存结果，包含用于分享的 ID
    return NextResponse.json({
      success: true,
      id: savedWebsite.id,
      shareUrl: `/share/${savedWebsite.id}`,
    });
    
  } catch (error) {
    console.error('保存网页时出错:', error);
    return NextResponse.json(
      { error: '保存网页失败' },
      { status: 500 }
    );
  }
} 