import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger';
import { SocialMediaScraper } from '../services/scraper';
import { BundleManager } from '../services/bundler';
import { ScrapeRequest, ScrapeProgress, ApiResponse, BundleManifest } from '../types';

const router = Router();

// In-memory progress tracking
const scrapeJobs = new Map<string, ScrapeProgress>();

// POST /api/scrape — Start a scrape job
router.post('/', async (req: Request, res: Response) => {
  try {
    const { urls, maxSizeGB = 5, platforms } = req.body as ScrapeRequest;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({
        success: false,
        error: 'URLs array is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const bundleId = `bundle_${Date.now()}`;
    const baseDir = path.join(process.cwd(), 'bundles', bundleId);

    // Initialize progress
    scrapeJobs.set(bundleId, {
      bundleId,
      progress: 0,
      status: 'starting',
      downloadedBytes: 0,
      totalFiles: 0,
    });

    // Start scraping in background
    res.json({
      success: true,
      data: {
        bundleId,
        message: 'Scraping started',
        urls,
        targetSizeGB: maxSizeGB,
      },
      timestamp: new Date().toISOString(),
    });

    // Async scrape
    const scraper = new SocialMediaScraper(baseDir, maxSizeGB, (downloaded, total, current) => {
      const progress = total > 0 ? Math.min(downloaded / total, 1) : 0;
      scrapeJobs.set(bundleId, {
        bundleId,
        progress,
        status: `Downloading: ${path.basename(current || '')}`,
        downloadedBytes: downloaded,
        totalFiles: 0,
      });
    });

    const result = await scraper.scrapeUrls(urls);

    // Update progress
    scrapeJobs.set(bundleId, {
      bundleId,
      progress: 1,
      status: 'building bundle...',
      downloadedBytes: result.bytes,
      totalFiles: result.files,
    });

    // Build the bundle
    const bundleManager = new BundleManager();
    const manifest = await bundleManager.createBundle(baseDir, bundleId);

    // Compress for mobile download
    await bundleManager.compressBundle(bundleId);

    // Mark complete
    scrapeJobs.set(bundleId, {
      bundleId,
      progress: 1,
      status: 'ready',
      downloadedBytes: result.bytes,
      totalFiles: result.files,
    });

    logger.info(`Scrape complete: ${bundleId}`);
  } catch (err) {
    logger.error(`Scrape job failed: ${(err as Error).message}`);
  }
});

// GET /api/scrape/:bundleId/progress — Get job progress
router.get('/:bundleId/progress', (req: Request, res: Response) => {
  const progress = scrapeJobs.get(req.params.bundleId);
  if (!progress) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    success: true,
    data: progress,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/scrape/platforms — List supported platforms
router.get('/platforms', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      platforms: [
        { id: 'instagram', name: 'Instagram', icon: '📸', enabled: true },
        { id: 'twitter', name: 'Twitter / X', icon: '🐦', enabled: true },
        { id: 'reddit', name: 'Reddit', icon: '🤖', enabled: true },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', enabled: true },
        { id: 'facebook', name: 'Facebook', icon: '📘', enabled: true },
        { id: 'youtube', name: 'YouTube', icon: '▶️', enabled: true },
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', enabled: true },
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;