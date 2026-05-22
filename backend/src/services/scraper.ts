import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/logger';
import { hashUrl, sanitizeFilename, getMimeType } from '../utils/helpers';
import { PlatformPost } from '../types';

export class SocialMediaScraper {
  private downloadDir: string;
  private totalDownloaded: number = 0;
  private maxBytes: number;
  private onProgress?: (downloaded: number, total: number, current: string) => void;

  constructor(
    baseDir: string,
    maxSizeGB: number = 5,
    onProgress?: (downloaded: number, total: number, current: string) => void
  ) {
    this.downloadDir = baseDir;
    this.maxBytes = maxSizeGB * 1024 * 1024 * 1024;
    this.onProgress = onProgress;
    fs.ensureDirSync(this.downloadDir);
    fs.ensureDirSync(path.join(this.downloadDir, 'assets'));
    fs.ensureDirSync(path.join(this.downloadDir, 'feeds'));
    fs.ensureDirSync(path.join(this.downloadDir, 'pages'));
    fs.ensureDirSync(path.join(this.downloadDir, 'api'));
  }

  async scrapeUrls(urls: string[]): Promise<{ files: number; bytes: number }> {
    let fileCount = 0;

    for (const url of urls) {
      if (this.totalDownloaded >= this.maxBytes) {
        logger.info(`Reached max bundle size of ${this.maxBytes} bytes`);
        break;
      }

      try {
        const result = await this.downloadPage(url);
        fileCount += result.files;
        this.totalDownloaded += result.bytes;

        if (this.onProgress) {
          this.onProgress(this.totalDownloaded, this.maxBytes, url);
        }

        // Small delay to be polite
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        logger.warn(`Failed to scrape ${url}: ${(err as Error).message}`);
      }
    }

    return { files: fileCount, bytes: this.totalDownloaded };
  }

  private async downloadPage(url: string): Promise<{ files: number; bytes: number }> {
    try {
      logger.info(`Scraping: ${url}`);
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        responseType: 'text',
        maxRedirects: 5,
      });

      const html = response.data;
      const $ = cheerio.load(html);
      let fileCount = 0;
      let byteCount = 0;

      // Save the HTML page
      const pageFilename = sanitizeFilename(url) + '.html';
      const pagePath = path.join(this.downloadDir, 'pages', pageFilename);
      await fs.writeFile(pagePath, html);
      fileCount++;
      byteCount += Buffer.byteLength(html, 'utf8');

      // Download linked assets (images, CSS, JS)
      const assetUrls: string[] = [];
      $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) assetUrls.push(src);
      });
      $('link[rel="stylesheet"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http')) assetUrls.push(href);
      });
      $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) assetUrls.push(src);
      });
      $('video source').each((_, el) => {
        const src = $(el).attr('src');
        if (src && src.startsWith('http')) assetUrls.push(src);
      });

      // Deduplicate
      const uniqueUrls = [...new Set(assetUrls)];

      for (const assetUrl of uniqueUrls) {
        if (this.totalDownloaded + byteCount >= this.maxBytes) break;

        try {
          const result = await this.downloadAsset(assetUrl);
          fileCount += result.files;
          byteCount += result.bytes;
        } catch {
          // Skip failed assets silently
        }
      }

      // Extract and save social media feed data if applicable
      await this.extractSocialData(url, $);

      return { files: fileCount, bytes: byteCount };
    } catch (err) {
      throw new Error(`Failed to scrape ${url}: ${(err as Error).message}`);
    }
  }

  private async downloadAsset(
    url: string
  ): Promise<{ files: number; bytes: number }> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const ext = path.extname(url) || '.bin';
      const filename = hashUrl(url) + ext;
      const filepath = path.join(this.downloadDir, 'assets', filename…);
      await fs.writeFile(filepath, response.data);

      return { files: 1, bytes: response.data.byteLength };
    } catch {
      throw new Error('Asset download failed');
    }
  }

  private async extractSocialData(url: string, $: cheerio.CheerioAPI): Promise<void> {
    const platform = this.detectPlatform(url);
    if (!platform) return;

    const posts: PlatformPost[] = [];

    // Generic social media extraction
    $('article, .post, .tweet, .feed-item').each((_, el) => {
      const text =
        $(el).find('p, .content, .tweet-text').first().text().trim() || '';
      const username =
        $(el)
          .find('.username, .author, [data-testid="User-Name"]')
          .first()
          .text()
          .trim() || 'unknown';
      const imgUrl =
        $(el).find('img').first().attr('src') || '';
      const likesText =
        $(el)
          .find('.likes, .heart-count, [data-testid="like"]')
          .first()
          .text()
          .trim() || '0';
      const likes = parseInt(likesText.replace(/,/g, '')) || 0;

      if (text || imgUrl) {
        posts.push({
          id: hashUrl(url + '_' + posts.length),
          platform,
          username,
          text: text.substring(0, 500),
          imageUrl: imgUrl,
          likes,
          comments: 0,
          timestamp: new Date().toISOString(),
        });
      }
    });

    if (posts.length > 0) {
      const feedData: FeedResponse = {
        platform,
        date: new Date().toISOString(),
        posts,
      };

      // Also save feed as JSON
      const feedPath = path.join(
        this.downloadDir,
        'feeds',
        `${platform}_${Date.now()}.json`
      );
      await fs.writeJson(feedPath, feedData);
      logger.info(`Extracted ${posts.length} posts from ${platform}`);
    }
  }

  private detectPlatform(url: string): string | null {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('instagram')) return 'instagram';
    if (hostname.includes('x.com') || hostname.includes('twitter')) return 'twitter';
    if (hostname.includes('reddit')) return 'reddit';
    if (hostname.includes('tiktok')) return 'tiktok';
    if (hostname.includes('facebook') || hostname.includes('fb.com')) return 'facebook';
    if (hostname.includes('linkedin')) return 'linkedin';
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'youtube';
    return null;
  }

  getStats() {
    return {
      downloadedBytes: this.totalDownloaded,
      maxBytes: this.maxBytes,
      progress: Math.min(this.totalDownloaded / this.maxBytes, 1),
      downloadDir: this.downloadDir,
    };
  }
}

// Re-export FeedResponse for use in other files
import { FeedResponse } from '../types';