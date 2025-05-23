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

    const { title, description, htmlContent, prompt, imageData, timestamp } = await request.json();
    
    // Validate required fields
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'Website content cannot be empty' },
        { status: 400 }
      );
    }
    
    console.log('Received image data, timestamp:', timestamp, 'length:', imageData ? imageData.length : 0);
    
    // Save image and get relative path
    let thumbnailUrl = '';
    try {
      if (imageData && imageData.length > 1000) {
        const filename = `image-${timestamp || Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
        
        thumbnailUrl = await uploadImage(imageData, filename, true);
        console.log('Image uploaded to OSS:', thumbnailUrl);
      } else {
        console.error('Invalid image data');
      }
    } catch (imageError) {
      console.error('Failed to save image:', imageError);
    }
    
    // Save website data
    const savedWebsite = await saveWebsite({
      userId: user.userId,
      title: title || 'Untitled Website',
      description: description || 'No description',
      htmlContent,
      prompt: prompt || '',
      thumbnailUrl,
    }, user.userId);
    
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