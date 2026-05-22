import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { formatBytes } from '../utils/helpers';
import { BundleManifest } from '../types';

export class BundleManager {
  private bundlesDir: string;

  constructor(baseDir: string = path.join(process.cwd(), 'bundles')) {
    this.bundlesDir = baseDir;
    fs.ensureDirSync(this.bundlesDir);
  }

  async createBundle(
    sourceDir: string,
    targetName?: string
  ): Promise<BundleManifest> {
    const bundleId = uuidv4();
    const name = targetName || `bundle_${new Date().toISOString().split('T')[0]}`;
    const bundleDir = path.join(this.bundlesDir, name);
    
    // Copy scraped content to bundle directory
    logger.info(`Creating bundle: ${name} at ${bundleDir}`);
    await fs.ensureDir(bundleDir);
    await fs.copy(sourceDir, bundleDir, {
      overwrite: true,
      errorOnExist: false,
    });

    // Count files and calculate size
    const files = await this.getFileStats(bundleDir);
    const totalSizeBytes = files.reduce((sum, f) => sum + f.size, 0anos);
    const fileCount = files.length;

    // Generate manifest
    const manifest: BundleManifest = {
      id: bundleId,
      name,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      sizeBytes: totalSizeBytes,
      fileCount,
      platforms: await this.detectPlatforms(bundleDir),
      contentSummary: await this.summarizeContent(bundleDir),
      status: 'ready',
    };

    // Write manifest to bundle
    await fs.writeJson(path.join(bundleDir, 'manifest.json'), manifest, {
      spaces: 2,
    });

    logger.info(
      `Bundle created: ${name} (${formatBytes(totalSizeBytes)}, ${fileCount} files)`
    );

    return manifest;
  }

  async compressBundle(name: string): Promise<string> {
    const bundleDir = path.join(this.bundlesDir, name);
    const zipPath = path.join(this.bundlesDir, `${name}.zip`);

    if (!(await fs.pathExists(bundleDir))) {
      throw new Error(`Bundle "${name}" not found`);
    }

    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => {
        logger.info(
          `Compressed ${name}: ${formatBytes(archive.pointer())}`
        );
        resolve(zipPath);
      });

      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(bundleDir, false);
      archive.finalize();
    });
  }

  async listBundles(): Promise<BundleManifest[]> {
    const entries = await fs.readdir(this.bundlesDir);
    const bundles: BundleManifest[] = [];

    for (const entry of entries) {
      const manifestPath = path.join(this.bundlesDir, entry, 'manifest.json');
      if (await fs.pathExists(manifestPath)) {
        try {
          const manifest = await fs.readJson(manifestPath);
          bundles.push(manifest);
        } catch {
          // Skip invalid manifests
        }
      }
    }

    return bundles.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getBundle(name: string): Promise<BundleManifest | null> {
    const manifestPath = path.join(this.bundlesDir, name, 'manifest.json');
    if (await fs.pathExists(manifestPath)) {
      return fs.readJson(manifestPath);
    }
    return null;
  }

  async deleteBundle(name: string): Promise<void> {
    const bundleDir = path.join(this.bundlesDir, name);
    const zipPath = path.join(this.bundlesDir, `${name}.zip`);

    await fs.remove(bundleDir);
    if (await fs.pathExists(zipPath)) {
      await fs.remove(zipPath);
    }
    logger.info(`Deleted bundle: ${name}`);
  }

  async getBundleZipPath(name: string): Promise<string | null> {
    const zipPath = path.join(this.bundlesDir, `${name}.zip`);
    if (await fs.pathExists(zipPath)) {
      return zipPath;
    }
    // If no zip but directory exists, create zip on demand
    const bundleDir = path.join(this.bundlesDir, name);
    if (await fs.pathExists(bundleDir)) {
      return this.compressBundle(name);
    }
    return null;
  }

  private async getFileStats(
    dir: string
  ): Promise<{ path: string; size: number }[]> {
    const files: { path: string; size: number }[] = [];

    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          files.push({ path: fullPath, size: stat.size });
        }
      }
    }

    await walk(dir);
    return files;
  }

  private async detectPlatforms(dir: string): Promise<string[]> {
    const platforms = new Set<string>();
    const feedsDir = path.join(dir, 'feeds');

    if (await fs.pathExists(feedsDir)) {
      const files = await fs.readdir(feedsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const platform = file.split('_')[0];
          platforms.add(platform);
        }
      }
    }

    return Array.from(platforms);
  }

  private async summarizeContent(
    dir: string
  ): Promise<Record<string, number>> {
    const summary: Record<string, number> = {};

    // Count files by type
    const files = await this.getFileStats(dir);
    for (const file of files) {
      const ext = path.extname(file.path).toLowerCase();
      const category =
        {
          '.html': 'pages',
          '.json': 'feeds',
          '.jpg': 'images',
          '.jpeg': 'images',
          '.png': 'images',
          '.gif': 'images',
          '.webp': 'images',
          '.mp4': 'videos',
          '.webm': 'videos',
          '.js': 'scripts',
          '.css': 'styles',
        }[ext] || 'other';

      summary[category] = (summary[category] || 0) + 1;
    }

    return summary;
  }
}