import { SharedWebsite } from './types';

// 简单的内存缓存实现
class Cache {
  private cache: Map<string, any>;
  private ttl: Map<string, number>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) { // 默认缓存时间1分钟
    this.cache = new Map();
    this.ttl = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: any, ttl: number = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  get(key: string): any {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  delete(key: string) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}

// 创建缓存实例
export const websiteCache = new Cache(60000); // 1分钟缓存

// 生成缓存key
export function generateCacheKey(userId: string, page: number, pageSize: number, searchTerm: string): string {
  return `websites:${userId}:${page}:${pageSize}:${searchTerm}`;
}

// 缓存网站数据
export function cacheWebsites(
  key: string, 
  data: { websites: SharedWebsite[], total: number }
) {
  websiteCache.set(key, data);
}

// 获取缓存的网站数据
export function getCachedWebsites(key: string): { websites: SharedWebsite[], total: number } | null {
  return websiteCache.get(key);
}

// 清除特定用户的缓存
export function clearUserCache(userId: string) {
  // 由于我们使用简单的内存缓存，这里简单地清除所有缓存
  websiteCache.clear();
} 