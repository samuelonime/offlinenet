export interface BundleConfig {
  name: string;
  version: string;
  created: string;
  totalSizeBytes: number;
  fileCount: number;
  platforms: string[];
  targetSizeGB: number;
  urls: string[];
}

export interface BundleManifest {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  sizeBytes: number;
  fileCount: number;
  platforms: string[];
  contentSummary: Record<string, number>;
  status: 'building' | 'ready' | 'failed';
}

export interface ScrapeRequest {
  urls: string[];
  maxSizeGB: number;
  platforms?: string[];
}

export interface ScrapeProgress {
  bundleId: string;
  progress: number;
  status: string;
  downloadedBytes: number;
  totalFiles: number;
}

export interface PlatformPost {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  text?: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export interface FeedResponse {
  platform: string;
  date: string;
  posts: PlatformPost[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}