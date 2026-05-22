import { Platform } from '../types';

export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001/api'  // Android emulator -> host machine
  : 'http://localhost:3001/api';

export const LOCAL_SERVER_PORT = 8080;

export const DEFAULT_BUNDLE_SIZE_GB = 5;

export const COLORS = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surface2: '#222222',
  primary: '#00ff88',
  primaryDark: '#00cc6a',
  danger: '#ff4444',
  warning: '#ffaa00',
  text: '#ffffff',
  textSecondary: '#888888',
  textTertiary: '#555555',
  border: '#333333',
  borderLight: '#222222',
};

export const SUPPORTED_PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram', icon: '📸', enabled: true },
  { id: 'twitter', name: 'Twitter / X', icon: '🐦', enabled: true },
  { id: 'reddit', name: 'Reddit', icon: '🤖', enabled: true },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', enabled: true },
  { id: 'facebook', name: 'Facebook', icon: '📘', enabled: true },
  { id: 'youtube', name: 'YouTube', icon: '▶️', enabled: true },
];

export const DEFAULT_URLS_TO_SCRAPE = [
  'https://www.instagram.com/explore/',
  'https://x.com/explore',
  'https://www.reddit.com/r/all/hot/',
  'https://www.tiktok.com/foryou',
  'https://www.facebook.com/',
];

export const STORAGE_KEYS = {
  BUNDLES: '@offlinenet_bundles',
  ACTIVE_BUNDLE: '@offlinenet_active_bundle',
  SETTINGS: '@offlinenet_settings',
};

export const STRINGS = {
  appName: 'OfflineNet',
  tagline: 'Browse the internet. No internet required.',
  downloadBundle: 'Download Bundle',
  browseOffline: 'Browse Offline',
  noBundle: 'No bundle loaded',
  connectToWifi: 'Connect to WiFi to download a bundle first',
  bundleReady: 'Bundle ready!',
  switchBundle: 'Switch Bundle',
  settings: 'Settings',
  offline: 'OFFLINE',
  online: 'ONLINE',
  localServer: 'Local Server',
  storageUsed: 'Storage Used',
};