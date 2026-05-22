import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger';
import { BundleManager } from '../services/bundler';
import { ApiResponse, BundleManifest } from '../types';

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), 'uploads') });
const bundleManager = new BundleManager();

// GET /api/bundles — List all bundles
router.get('/', async (req: Request, res: Response) => {
  try {
    const bundles = await bundleManager.listBundles();
    const response: ApiResponse<BundleManifest[]> = {
      success: true,
      data: bundles,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

// GET /api/bundles/:name — Get bundle details
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const bundle = await bundleManager.getBundle(req.params.name);
    if (!bundle) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Bundle not found',
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
      return;
    }
    const response: ApiResponse<BundleManifest> = {
      success: true,
      data: bundle,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

// DELETE /api/bundles/:name — Delete a bundle
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    await bundleManager.deleteBundle(req.params.name);
    const response: ApiResponse<{ deleted: string }> = {
      success: true,
      data: { deleted: req.params.name },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
});

// POST /api/bundles/upload — Upload a pre-built bundle zip
router.post(
  '/upload',
  upload.single('bundle'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const filePath = req.file.path;
      const bundlesDir = path.join(process.cwd(), 'bundles');
      const extractDir = path.join(
        bundlesDir,
        req.file.originalname.replace('.zip', '')
      );

      await fs.ensureDir(extractDir);

      // Extract zip
      const extractZip = (await import('extract-zip')).default;
      await extractZip(filePath, { dir: extractDir });

      // Clean up uploaded zip
      await fs.remove(filePath);

      // Read the manifest
      const manifestPath = path.join(extractDir, 'manifest.json');
      let manifest: BundleManifest | null = null;
      if (await fs.pathExists(manifestPath)) {
        manifest = await fs.readJson(manifestPath);
      }

      const response: ApiResponse<{ manifest: BundleManifest | null; path: string }> = {
        success: true,
        data: { manifest, path: extractDir },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (err) {
      const response: ApiResponse<never> = {
        success: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
);

// GET /api/bundles/:name/download — Download bundle as zip
router.get('/:name/download', async (req: Request, res: Response) => {
  try {
    const zipPath = await bundleManager.getBundleZipPath(req.params.name);
    if (!zipPath) {
      res.status(404).json({
        success: false,
        error: 'Bundle not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const fileName = path.basename(zipPath);
    res.download(zipPath, fileName);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;