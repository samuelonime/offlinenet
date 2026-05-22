import { bundleManager } from './bundleManager';
import { LOCAL_SERVER_PORT } from '../utils/constants';

// This simulates the in-app local HTTP server
// On a real device, we intercept WebView requests to serve from local bundles

export class OfflineProxyServer {
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = LOCAL_SERVER_PORT) {
    this.port = port;
  }

  async start(): Promise<boolean> {
    try {
      // In a production app, you'd start a lightweight HTTP server here
      // using something like `react-native-http-bridge` or a local socket
      // For now, we rely on WebView's shouldInterceptRequest to handle routing
      this.isRunning = true;
      console.log(`[ProxyServer] Running on port ${this.port}`);
      return true;
    } catch (error) {
      console.error('[ProxyServer] Failed to start:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[ProxyServer] Stopped');
  }

  getPort(): number {
    return this.port;
  }

  getStatus(): boolean {
    return this.isRunning;
  }

  // Resolve a URL request against the local bundle
  async resolveRequest(url: string): Promise<{
    content: string | null;
    mimeType: string;
    encoding: string;
  } | null> {
    try {
      const activeBundlePath = await bundleManager.getActiveBundlePath();
      if (!activeBundlePath) return null;

      // Parse the URL to get the relative path within the bundle
      const parsedUrl = new URL(url);
      let relativePath = parsedUrl.pathname;

      // Remove leading slash
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
      }

      // Default to index.html
      if (!relativePath || relativePath === '') {
        relativePath = 'index.html';
      }

      // Try to find the file in the bundle
      const bundleName = activeBundlePath.split('/').pop() || '';
      const fileExists = await bundleManager.fileExists(bundleName, relativePath);

      if (fileExists) {
        const ext = relativePath.split('.').pop()?.toLowerCase() || 'html';
        const mimeType = this.getMimeType(ext);

        // For text-based files, read as UTF-8
        if (['html', 'htm', 'js', 'css', 'json', 'xml', 'txt', 'svg'].includes(ext)) {
          const content = await bundleManager.readFile(bundleName, relativePath);
          return { content, mimeType, encoding: 'UTF-8' };
        }

        // For binary files, read as base64
        const content = await bundleManager.readFileBase64(bundleName, relativePath);
        return { content, mimeType, encoding: 'base64' };
      }

      // If it's a directory, try index.html
      const indexPath = `${relativePath}/index.html`;
      const indexExists = await bundleManager.fileExists(bundleName, indexPath);
      if (indexExists) {
        const content = await bundleManager.readFile(bundleName, indexPath);
        return { content, mimeType: 'text/html', encoding: 'UTF-8' };
      }

      return null;
    } catch (error) {
      console.error('[ProxyServer] Resolve error:', error);
      return null;
    }
  }

  private getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      html: 'text/html',
      htm: 'text/html',
      js: 'application/javascript',
      css: 'text/css',
      json: 'application/json',
      xml: 'application/xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      ico: 'image/x-icon',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      pdf: 'application/pdf',
      txt: 'text/plain',
      jsx: 'application/javascript',
      ts: 'application/javascript',
      tsx: 'application/javascript',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}

export const proxyServer = new OfflineProxyServer();
export default proxyServer;