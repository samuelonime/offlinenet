import crypto from 'crypto';

export function generateId(): string {
  return crypto.randomUUID();
}

export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function estimateTimeRemaining(
  downloaded: number,
  total: number,
  elapsedMs: number
): string {
  if (downloaded === 0) return 'calculating...';
  const rate = downloaded / (elapsedMs / 1000);
  const remaining = (total - downloaded) / rate;
  const mins = Math.ceil(remaining / 60);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins} minutes`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function sanitizeFilename(url: string): string {
  return url
    .replace(/https?:\/\//, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 200);
}

export function getMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || '';
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
    wav: 'audio/wav',
    pdf: 'application/pdf',
    zip: 'application/zip',
    txt: 'text/plain',
  };
  return mimeMap[ext] || 'application/octet-stream';
}