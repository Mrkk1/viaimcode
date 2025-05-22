// Override Next.js types that are causing issues
import { Metadata } from 'next';

declare module 'next' {
  interface PageProps {
    params?: Record<string, string>;
    searchParams?: Record<string, string | string[]>;
  }
}

// Add any other type overrides as needed 