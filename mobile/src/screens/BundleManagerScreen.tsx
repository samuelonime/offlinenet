import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store';
import { useBundles } from '../hooks/useBundles';
import BundleCard from '../components/BundleCard';
import DownloadProgressComponent from '../components/DownloadProgress';
import { COLORS, DEFAULT_URLS_TO_SCRAPE, DEFAULT_BUNDLE_SIZE_GB } from '../utils/constants';
import { BundleManifest, BundleDownload } from '../types';
import apiClient from '../services/api';
import bundleManagerService from '../services/bundleManager';

const BundleManagerScreen: React.FC = () => {
  const { bundles, activeBundle, activeDownloads, setActiveBundle, addBundle, updateDownload, removeDownload } = useStore();
  const { loadBundle, deleteBundle } = useBundles();

  const [urlInput, setUrlInput] = useState(DEFAULT_URLS_TO_SCRAPE.join('\n'));
  const [sizeGB, setSizeGB] = useState(String(DEFAULT_BUNDLE_SIZE_GB));
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState('');

  const handleStartDownload = useCallback(async () => {
    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));

    if (urls.length === 0) {
      Alert.alert('Error', 'Please enter at least one valid URL');
      return;
    }

    const size = Math.max(1, Math.min(20, parseInt(sizeGB) || 5));

    Alert.alert(
      'Download Bundle',
      `This will download approximately ${size}GB of content from ${urls.length} URLs.\n\nMake sure you're on WiFi!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Download',
          onPress: async () => {
            try {
              setIsScraping(true);
              setScrapingStatus('Starting download...');

              // Try server-side scraping first
              const result = await apiClient.startScrape({
                urls,
                maxSizeGB: size,
              });

              if (result?.bundleId) {
                // Poll for progress
                const pollInterval = setInterval(async () => {
                  const progress = await apiClient.getScrapeProgress(result.bundleId);
                  if (progress) {
                    updateDownload(result.bundleId, {
                      progress: progress.progress,
                      status: progress.progress >= 1 ? 'extracting' : 'downloading',
                      downloadedBytes: progress.downloadedBytes,
                      totalBytes: size * 1024 * 1024 * 1024,
                    });

                    setScrapingStatus(
                      progress.progress >= 1
                        ? 'Building bundle...'
                        : `Downloading: ${(progress.progress * 100).toFixed(0)}%`
                    );

                    if (progress.progress >= 1) {
                      clearInterval(pollInterval);
                      setIsScraping(false);
                      setScrapingStatus('Bundle ready! Downloading to device...');

                      // Download the bundle zip to device
                      const downloadUrl = await apiClient.downloadBundleUrl(result.bundleId);
                      const manifest = await bundleManagerService.downloadBundle(
                        result.bundleId,
                        downloadUrl,
                        (downloaded, total) => {
                          updateDownload(result.bundleId, {
                            progress: downloaded / total,
                            status: 'downloading',
                            downloadedBytes: downloaded,
                            totalBytes: total,
                          });
                        }
                      );

                      if (manifest) {
                        addBundle(manifest);
                        updateDownload(result.bundleId, {
                          status: 'ready',
                          progress: 1,
                        });

                        setTimeout(() => removeDownload(result.bundleId), 3000);
                        Alert.alert('Done', `Bundle "${manifest.name}" is ready!`);
                      }
                    }
                  }
                }, 2000);
              } else {
                // Fallback: direct download from pre-built bundle URL
                Alert.alert('Info', 'Server scraping not available. Use a pre-built bundle instead.');
              }
            } catch (err) {
              setIsScraping(false);
              Alert.alert('Error', `Download failed: ${(err as Error).message}`);
            }
          },
        },
      ]
    );
  }, [urlInput, sizeGB, updateDownload, addBundle, removeDownload]);

  const handleLoadBundle = useCallback(
    async (bundle: BundleManifest) => {
      await loadBundle(bundle);
      Alert.alert('Bundle Loaded', `"${bundle.name}" is now active. Go back and start browsing!`);
    },
    [loadBundle]
  );

  const handleDeleteBundle = useCallback(
    (bundle: BundleManifest) => {
      Alert.alert('Delete Bundle', `Delete "${bundle.name}"? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBundle(bundle),
        },
      ]);
    },
    [deleteBundle]
  );

  const renderHeader = () => (
    <View>
      {/* New Download Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Bundle</Text>
        <Text style={styles.label}>Enter URLs to cache (one per line):</Text>
        <TextInput
          style={styles.urlInput}
          value={urlInput}
          onChangeText={setUrlInput}
          multiline
          placeholder="https://www.instagram.com/explore/&#10;https://x.com/explore&#10;https://www.reddit.com/r/all/hot/"
          placeholderTextColor={COLORS.textTertiary}
          editable={!isScraping}
        />
        <View style={styles.sizeRow}>
          <Text style={styles.label}>Target size:</Text>
          <TextInput
            style={styles.sizeInput}
            value={sizeGB}
            onChangeText={setSizeGB}
            keyboardType="numeric"
            editable={!isScraping}
          />
          <Text style={styles.label}>GB</Text>
        </View>

        {isScraping ? (
          <View style={styles.scrapingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.scrapingText}>{scrapingStatus}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartDownload}
          >
            <Text style={styles.startButtonText}>📥 Download Bundle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Downloads */}
      {Object.keys(activeDownloads).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Downloads</Text>
          {Object.values(activeDownloads).map((download) => (
            <DownloadProgressComponent key={download.bundleId} download={download} />
          ))}
        </View>
      )}

      {/* Bundles List Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Local Bundles ({bundles.length})
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={bundles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BundleCard
              bundle={item}
              onLoad={handleLoadBundle}
              onDelete={handleDeleteBundle}
              isActive={activeBundle?.id === item.id}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>
                No bundles yet. Use the form above to download one.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  urlInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 13,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sizeInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    padding: 8,
    color: COLORS.text,
    fontSize: 15,
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  scrapingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  scrapingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BundleManagerScreen;