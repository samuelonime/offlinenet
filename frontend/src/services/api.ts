import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { BundleManifest, ScrapeRequest, ScrapeJob, ApiResponse, Platform } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error(`[API] Error ${error.response.status}:`, error.response.data);
        } else if (error.request) {
          console.error('[API] No response received:', error.message);
        } else {
          console.error('[API] Request error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  // Bundle management
  async getBundles(): Promise<BundleManifest[]> {
    const response = await this.client.get<ApiResponse<BundleManifest[]>>('/bundles');
    return response.data.data || [];
  }

  async getBundle(name: string): Promise<BundleManifest | null> {
    try {
      const response = await this.client.get<ApiResponse<BundleManifest>>(`/bundles/${name}`);
      return response.data.data || null;
    } catch {
      return null;
    }
  }

  async deleteBundle(name: string): Promise<boolean> {
    try {
      await this.client.delete(`/bundles/${name}`);
      return true;
    } catch {
      return false;
    }
  }

  async downloadBundleUrl(name: string): Promise<string> {
    return `${API_BASE_URL}/bundles/${name}/download`;
  }

  // Scraping
  async startScrape(request: ScrapeRequest): Promise<{ bundleId: string } | null> {
    try {
      const response = await this.client.post<ApiResponse<{ bundleId: string }>>('/scrape', request);
      return response.data.data || null;
    } catch {
      return null;
    }
  }

  async getScrapeProgress(bundleId: string): Promise<ScrapeJob | null> {
    try {
      const response = await this.client.get<ApiResponse<ScrapeJob>>(`/scrape/${bundleId}/progress`);
      return response.data.data || null;
    } catch {
      return null;
    }
  }

  async getPlatforms(): Promise<Platform[]> {
    try {
      const response = await this.client.get<ApiResponse<{ platforms: Platform[] }>>('/scrape/platforms');
      return response.data.data?.platforms || [];
    } catch {
      return [];
    }
  }

  // Serving (for direct bundle access on backend)
  async getBundleContentUrl(bundleName: string, path?: string): Promise<string> {
    return `${API_BASE_URL}/serve/${bundleName}${path ? '/' + path : ''}`;
  }

  // Custom request
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;