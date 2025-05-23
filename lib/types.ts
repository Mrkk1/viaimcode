// Define shared website data model
export interface SharedWebsite {
  id: string;        // Unique identifier for sharing link
  userId: string;    // Creator ID
  title: string;     // Website title
  description: string; // Website description
  htmlContent: string; // Complete HTML content
  prompt: string;    // Prompt used to generate the website
  createdAt: Date;   // Creation time
  thumbnailUrl: string; // Website preview image URL
}

// Define user model
export interface User {
  id: string;
  username: string;
  password?: string; // Only used when creating/verifying, not returned to frontend
  createdAt: Date;
}

// Login request data
export interface LoginData {
  username: string;
  password: string;
}

// Register request data
export interface RegisterData extends LoginData {
  confirmPassword: string;
} 