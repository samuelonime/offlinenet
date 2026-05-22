import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { BundleManifest } from '../types';
import apiClient from '../services/api';
import bundleManagerService from '../services/bundleManager';

export function useBundles() {
  const {
    bundles,
    activeBundle,
    addBundle,
    removeBundle,
    setActiveBundle,
    setBundles,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load local bundles
  const refreshLocalBundles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const localBundles = await bundleManagerService.getLocalBundles();
      setBundles(localBundles);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setBundles]);

  // Load from server
  const refreshServerBundles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const serverBundles = await apiClient.getBundles();
      // Merge with local bundles
      const localBundles = await bundleManagerService.getLocalBundles();

      // Server bundles take priority, merge with local
      const merged = [...serverBundles];
      for (const local of localBundles) {
        if (!merged.find((s) => s.name === local.name)) {
          merged.push(local);
        }
      }

      setBundles(merged);
    } catch (err) {
      // Fall back to local bundles if server is unavailable
      await refreshLocalBundles();
    } finally {
      setLoading(false);
    }
  }, [setBundles, refreshLocalBundles]);

  // Load a bundle as active
  const loadBundle = useCallback(
    async (bundle: BundleManifest) => {
      try {
        setActiveBundle(bundle);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [setActiveBundle]
  );

  // Delete a bundle
  const deleteBundle = useCallback(
    async (bundle: BundleManifest) => {
      try {
        await bundleManagerService.deleteBundle(bundle.name);

        // Also delete from server if possible
        try {
          await apiClient.deleteBundle(bundle.name);
        } catch {
          // Server might be offline, that's okay
        }

        removeBundle(bundle.name);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [removeBundle]
  );

  // Initial load
  useEffect(() => {
    refreshLocalBundles();
  }, [refreshLocalBundles]);

  return {
    bundles,
    activeBundle,
    loading,
    error,
    refreshLocalBundles,
    refreshServerBundles,
    loadBundle,
    deleteBundle,
  };
}