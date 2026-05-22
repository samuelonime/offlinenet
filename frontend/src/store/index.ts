import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BundleManifest, BundleDownload, AppState } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import NetInfo from '@react-native-community/netinfo';

interface AppStore extends AppState {
  // Actions
  setBundles: (bundles: BundleManifest[]) => void;
  addBundle: (bundle: BundleManifest) => void;
  removeBundle: (bundleName: string) => void;
  setActiveBundle: (bundle: BundleManifest | null) => void;
  updateDownload: (bundleId: string, update: Partial<BundleDownload>) => void;
  removeDownload: (bundleId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setLocalServerPort: (port: number | null) => void;

  // Async actions
  loadPersistedState: () => Promise<void>;
  persistBundles: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  bundles: [],
  activeBundle: null,
  activeDownloads: {},
  isOnline: false,
  localServerPort: null,

  // Sync actions
  setBundles: (bundles) => {
    set({ bundles });
    get().persistBundles();
  },

  addBundle: (bundle) => {
    const bundles = [...get().bundles, bundle];
    set({ bundles });
    get().persistBundles();
  },

  removeBundle: (bundleName) => {
    const bundles = get().bundles.filter((b) => b.name !== bundleName);
    const activeBundle = get().activeBundle;
    set({
      bundles,
      activeBundle: activeBundle?.name === bundleName ? null : activeBundle,
    });
    get().persistBundles();
  },

  setActiveBundle: (bundle) => {
    set({ activeBundle: bundle });
    AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_BUNDLE, bundle ? JSON.stringify(bundle) : '');
  },

  updateDownload: (bundleId, update) => {
    const downloads = { ...get().activeDownloads };
    const existing = downloads[bundleId];
    if (existing) {
      downloads[bundleId] = { ...existing, ...update };
    } else {
      downloads[bundleId] = {
        bundleId,
        name: bundleId,
        progress: 0,
        status: 'downloading',
        downloadedBytes: 0,
        totalBytes: 0,
        ...update,
      };
    }
    set({ activeDownloads: downloads });
  },

  removeDownload: (bundleId) => {
    const downloads = { ...get().activeDownloads };
    delete downloads[bundleId];
    set({ activeDownloads: downloads });
  },

  setOnlineStatus: (isOnline) => set({ isOnline }),

  setLocalServerPort: (port) => set({ localServerPort: port }),

  // Async actions
  loadPersistedState: async () => {
    try {
      const bundlesJson = await AsyncStorage.getItem(STORAGE_KEYS.BUNDLES);
      const activeBundleJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_BUNDLE);

      if (bundlesJson) {
        const bundles = JSON.parse(bundlesJson) as BundleManifest[];
        set({ bundles });
      }

      if (activeBundleJson) {
        const activeBundle = JSON.parse(activeBundleJson) as BundleManifest;
        set({ activeBundle });
      }

      // Check network status
      const netState = await NetInfo.fetch();
      set({ isOnline: netState.isConnected ?? false });
    } catch (err) {
      console.error('Failed to load persisted state:', err);
    }
  },

  persistBundles: async () => {
    try {
      const { bundles } = get();
      await AsyncStorage.setItem(STORAGE_KEYS.BUNDLES, JSON.stringify(bundles));
    } catch (err) {
      console.error('Failed to persist bundles:', err);
    }
  },
}));