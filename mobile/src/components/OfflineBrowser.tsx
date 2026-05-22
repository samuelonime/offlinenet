import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useStore } from '../store';
import { COLORS } from '../utils/constants';
import bundleManager from '../services/bundleManager';

interface OfflineBrowserProps {
  onClose?: () => void;
}

const OfflineBrowser: React.FC<OfflineBrowserProps> = ({ onClose }) => {
  const webViewRef = useRef<WebView>(null);
  const { activeBundle, localServerPort } = useStore();
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('offline://bundle/index.html');
  const [error, setError] = useState<string | null>(null);

  const getBundleIndexUrl = useCallback(async (): Promise<string> => {
    if (!activeBundle) return 'about:blank';

    const bundlePath = `${bundleManager.getBundleDirectory()}/${activeBundle.name}`;
    const indexPath = `${bundlePath}/index.html`;

    const exists = await bundleManager.fileExists(activeBundle.name, 'index.html');
    if (exists) {
      return `file://${indexPath}`;
    }

    // If no index.html, generate a bundle listing page
    return `file://${bundlePath}/pages/`;
  }, [activeBundle]);

  React.useEffect(() => {
    (async () => {
      try {
        const url = await getBundleIndexUrl();
        setCurrentUrl(url);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    })();
  }, [getBundleIndexUrl]);

  // Intercept requests to serve from local bundle
  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      // Allow file:// and about:blank requests
      if (request.url.startsWith('file://') || request.url === 'about:blank') {
        return true;
      }
      // Block external requests (no internet!)
      return false;
    },
    []
  );

  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    setCurrentUrl(nav.url);
    setLoading(nav.loading);
  }, []);

  if (!activeBundle) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No Bundle Loaded</Text>
        <Text style={styles.emptyText}>
          Go back and load a bundle to start browsing offline.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Failed to Load</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={styles.statusDot} />
          <Text style={styles.statusLabel}>OFFLINE</Text>
        </View>
        <Text style={styles.urlText} numberOfLines={1}>
          {currentUrl.replace('file://', '').substring(0, 40)}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading from local bundle...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        mixedContentMode="always"
        scalesPageToFit={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  statusLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  urlText: {
    flex: 1,
    color: COLORS.textTertiary,
    fontSize: 11,
    textAlign: 'center',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default OfflineBrowser;