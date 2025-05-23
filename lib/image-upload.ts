import { generateUniqueFileName, uploadToOss } from './oss-client';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

// Local temporary save directory for development environment
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await mkdirAsync(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists or failed to create
    console.error('Failed to create upload directory:', error);
  }
};

// Upload image to OSS or local (for development environment)
export const uploadImage = async (
  imageData: Buffer | string, 
  originalName: string = 'image.png',
  useOss: boolean = process.env.NODE_ENV === 'production'
): Promise<string> => {
  try {
    console.log(`Start processing image upload: file name=${originalName}, use OSS=${useOss}, environment=${process.env.NODE_ENV}`);
    
    let buffer: Buffer;

    // If input is a Base64 string, convert to Buffer
    if (typeof imageData === 'string') {
      console.log('Converting Base64 string to Buffer...');
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(imageData, 'base64');
      }
      console.log(`Base64 conversion completed, image size: ${buffer.length} bytes`);
    } else {
      buffer = imageData;
      console.log(`Using Buffer directly, image size: ${buffer.length} bytes`);
    }

    // Generate file name
    const fileName = generateUniqueFileName(originalName);
    console.log(`Generated unique file name: ${fileName}`);

    // Production environment or forced: Use Aliyun OSS
    if (useOss) {
      console.log('Using Aliyun OSS to store image...');
      const ossUrl = await uploadToOss(buffer, fileName);
      console.log(`Image uploaded to OSS: ${ossUrl}`);
      return ossUrl;
    } 
    // Development environment: Save to local
    else {
      console.log('Using local file system to store image...');
      await ensureUploadDir();
      const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
      await writeFileAsync(filePath, buffer);
      const relativePath = `/uploads/${path.basename(fileName)}`;
      console.log(`Image saved to local: ${relativePath}`);
      
      // Return relative URL path
      return relativePath;
    }
  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Get image (for reading from local or remote)
export const getImage = async (imagePath: string): Promise<Buffer | null> => {
  try {
    // If it's a complete URL, return null (client will directly access URL)
    if (imagePath.startsWith('http')) {
      console.log(`Image path is URL, client will directly access: ${imagePath}`);
      return null;
    }

    // Read from local file
    console.log(`Reading image from local: ${imagePath}`);
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    const buffer = await readFileAsync(fullPath);
    console.log(`Successfully read local image, size: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('Failed to get image:', error);
    return null;
  }
}; 