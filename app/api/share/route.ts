import { NextRequest, NextResponse } from 'next/server';
import { saveWebsite, updateWebsite } from '@/lib/storage';
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
        
      } else if (imageData && imageData.length > 1000) {
        // 先上传图片，再保存网站
        const filename = `image-${timestamp || Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
        
        console.log('Uploading image first...');
        thumbnailUrl = await uploadImage(imageData, filename, true, {
          userId: user.userId,
          taskId: 'temp', // 临时使用，因为还没有网站ID
          subFolder: 'thumbnails'
        });
        console.log('Image uploaded successfully:', thumbnailUrl);
        
      } else {
        console.log('No valid image data provided');
      }
      
      // 保存网站（包含缩略图URL）
      savedWebsite = await saveWebsite({
        userId: user.userId,
        title: title || 'Untitled Website',
        description: description || 'No description',
        htmlContent,
        prompt: prompt || '',
        thumbnailUrl: thumbnailUrl || '',
        isFeatured: false, // 新发布的网站默认不设为精选
      }, user.userId);
      
      console.log('Website saved successfully with thumbnail:', savedWebsite.id);
      
    } catch (imageError) {
      console.error('Failed to save image:', imageError);
    
      // 即使图片保存失败，也保存网站（但不包含缩略图）
      savedWebsite = await saveWebsite({
        userId: user.userId,
        title: title || 'Untitled Website',
        description: description || 'No description',
        htmlContent,
        prompt: prompt || '',
        thumbnailUrl: '',
        isFeatured: false, // 新发布的网站默认不设为精选
      }, user.userId);
      
      console.log('Website saved without thumbnail due to image error');
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