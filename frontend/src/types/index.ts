// Bundle Types
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

export interface BundleDownload {
  bundleId: string;
  name: string;
  progress: number;
  status: 'downloading' | 'extracting' | 'ready' | 'failed';
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

export interface ScrapeJob {
  bundleId: string;
  progress: number;
  status: string;
  downloadedBytes: number;
  totalFiles: number;
}

// App State
export interface AppState {
  bundles: BundleManifest[];
  activeBundle: BundleManifest | null;
  activeDownloads: Record<string, BundleDownload>;
  isOnline: boolean;
  localServerPort: number | null;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export interface BundleCardProps {
  bundle: BundleManifest;
  onLoad: (bundle: BundleManifest) => void;
  onDelete: (bundle: BundleManifest) => void;
}

export interface DownloadProgressProps {
  download: BundleDownload;
}

export interface ScrapeRequest {
  urls: string[];
  maxSizeGB: number;
  platforms?: string[];
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}