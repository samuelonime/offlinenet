import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../store';
import { useBundles } from '../hooks/useBundles';
import { useNetwork } from '../hooks/useNetwork';
import BundleCard from '../components/BundleCard';
import OfflineIndicator from '../components/OfflineIndicator';
import { COLORS, STRINGS } from '../utils/constants';
import { BundleManifest } from '../types';

type RootStackParamList = {
  Home: undefined;
  BundleManager: undefined;
  Browser: undefined;
  Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { activeBundle, setActiveBundle } = useStore();
  const {
    bundles,
    loading,
    refreshLocalBundles,
    loadBundle,
    deleteBundle,
  } = useBundles();
  const { isOnline } = useNetwork();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshLocalBundles();
    setRefreshing(false);
  }, [refreshLocalBundles]);

  const handleLoadBundle = useCallback(
    async (bundle: BundleManifest) => {
      await loadBundle(bundle);
    },
    [loadBundle]
  );

  const handleBrowseOffline = useCallback(() => {
    if (activeBundle) {
      navigation.navigate('Browser');
    }
  }, [activeBundle, navigation]);

  const recentBundles = bundles.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{STRINGS.appName}</Text>
            <Text style={styles.subtitle}>{STRINGS.tagline}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Network / Offline Status */}
          <OfflineIndicator />

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={() => navigation.navigate('BundleManager')}
            >
              <Text style={styles.actionIcon}>📥</Text>
              <Text style={styles.actionText}>{STRINGS.downloadBundle}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.browseButton,
                !activeBundle && styles.disabledButton,
              ]}
              onPress={handleBrowseOffline}
              disabled={!activeBundle}
            >
              <Text style={styles.actionIcon}>🌐</Text>
              <Text style={[styles.actionText, !activeBundle && styles.disabledText]}>
                {STRINGS.browseOffline}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Bundle */}
          {activeBundle && (
            <View style={styles.activeSection}>
              <Text style={styles.sectionTitle}>Active Bundle</Text>
              <BundleCard
                bundle={activeBundle}
                onLoad={handleLoadBundle}
                isActive={true}
              />
              <TouchableOpacity
                style={styles.startBrowsingButton}
                onPress={handleBrowseOffline}
              >
                <Text style={styles.startBrowsingText}>
                  🌐 Start Browsing Offline
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Bundles */}
          <View style={styles.bundlesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {bundles.length > 0 ? 'Recent Bundles' : 'No Bundles Yet'}
              </Text>
              {bundles.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('BundleManager')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentBundles.length > 0 ? (
              recentBundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onLoad={handleLoadBundle}
                  onDelete={deleteBundle}
                  isActive={activeBundle?.id === bundle.id}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>{STRINGS.noBundle}</Text>
                <Text style={styles.emptyText}>
                  {isOnline
                    ? 'Connect to WiFi and download a bundle to start browsing offline.'
                    : 'Connect to WiFi first, then download a bundle.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.surface2,
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  disabledText: {
    color: COLORS.textTertiary,
  },
  activeSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  startBrowsingButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  startBrowsingText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  bundlesSection: {
    paddingHorizontal: 16,
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default HomeScreen;