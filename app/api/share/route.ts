import { NextRequest, NextResponse } from 'next/server';
import { saveWebsite } from '@/lib/storage';
import { saveBase64Image } from '@/lib/image-utils';
import { getCurrentUser } from '@/lib/auth';
import { SharedWebsite } from '@/lib/types';
import { uploadImage } from '@/lib/image-upload';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Please login first' },
        { status: 401 }
      );
    }

    const { title, description, htmlContent, prompt, imageData, timestamp, useExistingImage } = await request.json();
    
    // Validate required fields
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'Website content cannot be empty' },
        { status: 400 }
      );
    }
    
    console.log('Received image data, timestamp:', timestamp, 'length:', imageData ? imageData.length : 0, 'useExistingImage:', useExistingImage);
    
    // Save image and get relative path
    let thumbnailUrl = '';
    let savedWebsite: any;
    
    try {
      if (useExistingImage && imageData && imageData.startsWith('http')) {
        // 如果是现有的URL，直接使用
        thumbnailUrl = imageData;
        console.log('Using existing image URL:', thumbnailUrl);
        
        // 保存网站
        savedWebsite = await saveWebsite({
          userId: user.userId,
          title: title || 'Untitled Website',
          description: description || 'No description',
          htmlContent,
          prompt: prompt || '',
          thumbnailUrl,
        }, user.userId);
        
      } else if (imageData && imageData.length > 1000) {
        // 只有在是base64数据时才上传
        const filename = `image-${timestamp || Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
        
        // 先保存网站数据以获取ID
        savedWebsite = await saveWebsite({
          userId: user.userId,
          title: title || 'Untitled Website',
          description: description || 'No description',
          htmlContent,
          prompt: prompt || '',
          thumbnailUrl: '', // 临时为空
        }, user.userId);
        
        // 使用用户ID和网站ID作为目录结构
        thumbnailUrl = await uploadImage(imageData, filename, true, {
          userId: user.userId,
          taskId: savedWebsite.id,
          subFolder: 'thumbnails'
        });
        
        // 更新网站的缩略图URL
        savedWebsite = await saveWebsite({
          ...savedWebsite,
          thumbnailUrl,
        }, user.userId);

      } else {
        console.error('Invalid image data');
        
        // 如果没有图片，直接保存网站
        savedWebsite = await saveWebsite({
          userId: user.userId,
          title: title || 'Untitled Website',
          description: description || 'No description',
          htmlContent,
          prompt: prompt || '',
          thumbnailUrl: '',
        }, user.userId);
      }
    } catch (imageError) {
      console.error('Failed to save image:', imageError);
      
      // 即使图片保存失败，也保存网站
      savedWebsite = await saveWebsite({
        userId: user.userId,
        title: title || 'Untitled Website',
        description: description || 'No description',
        htmlContent,
        prompt: prompt || '',
        thumbnailUrl: '',
      }, user.userId);
    }
    
    console.log('Website saved, ID:', savedWebsite.id, 'Preview URL:', thumbnailUrl);
    
    return NextResponse.json({
      success: true,
      id: savedWebsite.id,
      shareUrl: `/share/${savedWebsite.id}`,
      thumbnailUrl: thumbnailUrl,
    });
    
  } catch (error) {
    console.error('Error saving website:', error);
    return NextResponse.json(
      { error: 'Failed to save website' },
      { status: 500 }
    );
  }
} 