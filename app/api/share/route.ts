import { NextRequest, NextResponse } from 'next/server';
import { saveWebsite } from '@/lib/storage';
import { saveBase64Image } from '@/lib/image-utils';
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

    const { title, description, htmlContent, prompt, imageData, timestamp } = await request.json();
    
    // 验证必要字段
    if (!htmlContent) {
      return NextResponse.json(
        { error: '网页内容不能为空' },
        { status: 400 }
      );
    }
    
    console.log('收到图片数据，时间戳:', timestamp, '长度:', imageData ? imageData.length : 0);
    
    // 保存图片并获取相对路径
    let thumbnailUrl = '';
    try {
      // 确保我们总是使用新传入的图片数据，而不是重用旧的
      if (imageData && imageData.length > 1000) {
        // 使用时间戳作为文件名的一部分，确保唯一性
        thumbnailUrl = await saveBase64Image(imageData, timestamp);
        console.log('新图片已保存到:', thumbnailUrl);
      } else {
        console.error('无效的图片数据');
      }
    } catch (imageError) {
      console.error('保存图片失败:', imageError);
    }
    
    // 保存网站数据
    const savedWebsite = await saveWebsite({
      userId: user.userId,
      title: title || '未命名网站',
      description: description || '无描述',
      htmlContent,
      prompt: prompt || '',
      thumbnailUrl,
    }, user.userId);
    
    console.log('网站已保存，ID:', savedWebsite.id, '预览图URL:', thumbnailUrl);
    
    // 返回保存结果，包含用于分享的 ID 和图片 URL
    return NextResponse.json({
      success: true,
      id: savedWebsite.id,
      shareUrl: `/share/${savedWebsite.id}`,
      thumbnailUrl: thumbnailUrl,
    });
    
  } catch (error) {
    console.error('保存网页时出错:', error);
    return NextResponse.json(
      { error: '保存网页失败' },
      { status: 500 }
    );
  }
} 