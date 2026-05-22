import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger';
import { getMimeType } from '../utils/helpers';

const router = Router();

// GET /api/serve/:bundleName/* — Serve files from a bundle
router.get('/:bundleName/*', async (req: Request, res: Response) => {
  try {
    const { bundleName } = req.params;
    const filePath = req.params[0] || 'index.html';

    const bundlesDir = path.join(process.cwd(), 'bundles');
    const bundleDir = path.join(bundlesDir, bundleName);
    const fullPath = path.join(bundleDir, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(bundleDir)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!(await fs.pathExists(fullPath))) {
      // Try index.html in directory
      const indexPath = path.join(fullPath, 'index.html');
      if (await fs.pathExists(indexPath)) {
        const content = await fs.readFile(indexPath);
        res.set('Content-Type', 'text/html');
        res.send(content);
        return;
      }

      res.status(404).json({
        success: false,
        error: 'File not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      // Serve directory listing or index
      const indexPath = path.join(fullPath, 'index.html');
      if (await fs.pathExists(indexPath)) {
        const content = await fs.readFile(indexPath);
        res.set('Content-Type', 'text/html');
        res.send(content);
        return;
      }
      res.status(404).json({
        success: false,
        error: 'No index file in directory',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = getMimeType(fullPath);

    const content = await fs.readFile(fullPath);
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(content);
  } catch (err) {
    logger.error(`Serve error: ${(err as Error).message}`);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/serve/:bundleName — Serve index of bundle
router.get('/:bundleName', async (req: Request, res: Response) => {
  try {
    const { bundleName } = req.params;
    const bundlesDir = path.join(process.cwd(), 'bundles');
    const bundleDir = path.join(bundlesDir, bundleName);
    const indexPath = path.join(bundleDir, 'index.html');

    if (await fs.pathExists(indexPath)) {
      const content = await fs.readFile(indexPath);
      res.set('Content-Type', 'text/html');
      res.send(content);
      return;
    }

    // Generate a bundle index page
    const manifestPath = path.join(bundleDir, 'manifest.json');
    let manifest = {};
    if (await fs.pathExists(manifestPath)) {
      manifest = await fs.readJson(manifestPath);
    }

    const html = generateBundleIndex(bundleName, manifest);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

function generateBundleIndex(bundleName: string, manifest: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OfflineNet — ${bundleName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 40px 20px;
      text-align: center;
      border-bottom: 1px solid #1a1a2e;
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { color: #888; font-size: 14px; }
    .status-bar {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding: 12px;
      background: #111;
      border-bottom: 1px solid #222;
      font-size: 13px;
      color: #00ff88;
    }
    .content { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      border: 1px solid #222;
      transition: transform 0.2s;
    }
    .card:hover { transform: translateY(-2px); border-color: #333; }
    .card h3 { margin-bottom: 8px; color: #00ff88; }
    .card p { color: #888; font-size: 13px; }
    .card .meta { display: flex; gap: 12px; margin-top: 12px; font-size: 12px; color: #555; }
    .platform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
    .platform-btn {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .platform-btn:hover { background: #222; border-color: #00ff88; }
    .platform-btn .icon { font-size: 32px; display: block; margin-bottom: 8px; }
    .footer { text-align: center; padding: 40px; color: #444; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📡 OfflineNet</h1>
    <p>Browsing from local bundle: <strong>${bundleName}</strong></p>
  </div>
  <div class="status-bar">
    <span>📶 Mode: OFFLINE</span>
    <span>📦 ${manifest.sizeBytes ? (manifest.sizeBytes / 1e9).toFixed(1) + ' GB' : 'N/A'}</span>
    <span>✅ Connected to local cache</span>
  </div>
  <div class="content">
    <div class="card">
      <h3>📊 Bundle Info</h3>
      <p>${manifest.fileCount || 0} files cached</p>
      <p>${manifest.platforms ? manifest.platforms.join(', ') : 'General web'} content</p>
      <div class="meta">
        <span>Created: ${manifest.createdAt ? new Date(manifest.createdAt).toLocaleDateString() : 'N/A'}</span>
      </div>
    </div>

    <h2 style="margin:24px 0 12px;font-size:18px;">🌐 Browse Platforms</h2>
    <div class="platform-grid">
      <div class="platform-btn" onclick="window.location.href='feeds/'">
        <span class="icon">📸</span>
        Feed Data
      </div>
      <div class="platform-btn" onclick="window.location.href='pages/'">
        <span class="icon">📄</span>
        Pages
      </div>
      <div class="platform-btn" onclick="window.location.href='assets/'">
        <span class="icon">🖼️</span>
        Media
      </div>
      <div class="platform-btn" onclick="window.location.href='api/'">
        <span class="icon">⚙️</span>
        API Mocks
      </div>
    </div>

    <div class="card" style="border-color:#333;background:#111;">
      <h3>🔌 No Internet Required</h3>
      <p>All content is served from your local device storage.</p>
      <p style="margin-top:8px;color:#555;">Disconnect WiFi and this still works.</p>
    </div>
  </div>
  <div class="footer">
    OfflineNet v1.0 • Data bundle loaded from local storage
  </div>
</body>
</html>`;
}

export default router;