import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BundleManifest, BundleDownload } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

class BundleManagerService {
  private bundleDir: string;

  constructor() {
    this.bundleDir = `${RNFS.DocumentDirectoryPath}/bundles`;
  }

  async init(): Promise<void> {
    const exists = await RNFS.exists(this.bundleDir);
    if (!exists) {
      await RNFS.mkdir(this.bundleDir);
    }
  }

  async downloadBundle(
    name: string,
    downloadUrl: string,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<BundleManifest | null> {
    try {
      await this.init();

      const zipPath = `${this.bundleDir}/${name}.zip`;
      const extractPath = `${this.bundleDir}/${name}`;

      // Download zip
      const result = RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: zipPath,
        progress: (res) => {
          if (onProgress) {
            onProgress(res.bytesWritten, res.contentLength);
          }
        },
        progressDivider: 5,
      });

      const downloadResult = await result.promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error(`Download failed with status ${downloadResult.statusCode}`);
      }

      // Extract zip
      await unzip(zipPath, extractPath);

      // Read manifest
      const manifestPath = `${extractPath}/manifest.json`;
      const manifestExists = await RNFS.exists(manifestPath);

      if (manifestExists) {
        const manifestJson = await RNFS.readFile(manifestPath, 'utf8');
        const manifest: BundleManifest = JSON.parse(manifestJson);
        return manifest;
      }

      // Clean up zip
      await RNFS.unlink(zipPath);

      return null;
    } catch (error) {
      console.error('Bundle download failed:', error);
      throw error;
    }
  }

  async getLocalBundles(): Promise<BundleManifest[]> {
    try {
      await this.init();
      const items = await RNFS.readDir(this.bundleDir);
      const bundles: BundleManifest[] = [];

      for (const item of items) {
        if (item.isDirectory()) {
          const manifestPath = `${item.path}/manifest.json`;
          const exists = await RNFS.exists(manifestPath);
          if (exists) {
            try {
              const content = await RNFS.readFile(manifestPath, 'utf8');
              const manifest: BundleManifest = JSON.parse(content);
              bundles.push(manifest);
            } catch {
              // Skip invalid manifests
            }
          }
        }
      }

      return bundles.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to list local bundles:', error);
      return [];
    }
  }

  async getActiveBundlePath(): Promise<string | null> {
    try {
      const activeBundleJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_BUNDLE);
      if (!activeBundleJson) return null;

      const activeBundle = JSON.parse(activeBundleJson) as BundleManifest;
      const bundlePath = `${this.bundleDir}/${activeBundle.name}`;

      const exists = await RNFS.exists(bundlePath);
      return exists ? bundlePath : null;
    } catch {
      return null;
    }
  }

  async deleteBundle(name: string): Promise<void> {
    try {
      const bundlePath = `${this.bundleDir}/${name}`;
      const zipPath = `${this.bundleDir}/${name}.zip`;

      const bundleExists = await RNFS.exists(bundlePath);
      const zipExists = await RNFS.exists(zipPath);

      if (bundleExists) {
        await RNFS.unlink(bundlePath);
      }
      if (zipExists) {
        await RNFS.unlink(zipPath);
      }
    } catch (error) {
      console.error(`Failed to delete bundle ${name}:`, error);
      throw error;
    }
  }

  async getBundleSize(name: string): Promise<number> {
    try {
      const bundlePath = `${this.bundleDir}/${name}`;
      const exists = await RNFS.exists(bundlePath);
      if (!exists) return 0;

      const stat = await RNFS.stat(bundlePath);
      return Number(stat.size);
    } catch {
      return 0;
    }
  }

  async getTotalStorageUsed(): Promise<number> {
    try {
      await this.init();
      const items = await RNFS.readDir(this.bundleDir);
      let totalSize = 0;

      for (const item of items) {
        if (item.isDirectory()) {
          const files = await RNFS.readDir(item.path);
          for (const file of files) {
            totalSize += Number(file.size);
          }
        } else if (item.isFile()) {
          totalSize += Number(item.size);
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  async fileExists(bundleName: string, relativePath: string): Promise<boolean> {
    const filePath = `${this.bundleDir}/${bundleName}/${relativePath}`;
    return RNFS.exists(filePath);
  }

  async readFile(bundleName: string, relativePath: string): Promise<string> {
    const filePath = `${this.bundleDir}/${bundleName}/${relativePath}`;
    return RNFS.readFile(filePath, 'utf8');
  }

  async readFileBase64(bundleName: string, relativePath: string): Promise<string> {
    const filePath = `${this.bundleDir}/${bundleName}/${relativePath}`;
    return RNFS.readFile(filePath, 'base64');
  }

  getBundleDirectory(): string {
    return this.bundleDir;
  }
}

export const bundleManager = new BundleManagerService();
export default bundleManager;