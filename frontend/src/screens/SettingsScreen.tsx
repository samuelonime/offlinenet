import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useStore } from '../store';
import { COLORS } from '../utils/constants';
import bundleManagerService from '../services/bundleManager';
import apiClient from '../services/api';

const SettingsScreen: React.FC = () => {
  const { bundles, isOnline, localServerPort } = useStore();
  const [storageUsed, setStorageUsed] = useState(0);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const refreshStorage = useCallback(async () => {
    const size = await bundleManagerService.getTotalStorageUsed();
    setStorageUsed(size);
  }, []);

  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    const healthy = await apiClient.healthCheck();
    setServerStatus(healthy ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    refreshStorage();
    checkServer();
  }, [refreshStorage, checkServer]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearAllBundles = () => {
    Alert.alert(
      'Clear All Bundles',
      'This will delete all downloaded bundles. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            for (const bundle of bundles) {
              await bundleManagerService.deleteBundle(bundle.name);
            }
            useStore.getState().setBundles([]);
            useStore.getState().setActiveBundle(null);
            refreshStorage();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>WiFi / Data</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.dot, { backgroundColor: isOnline ? '#4a9eff' : COLORS.warning }]} />
              <Text style={styles.statusText}>{isOnline ? 'Connected' : 'Disconnected'}</Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Backend Server</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: serverStatus === 'online' ? COLORS.primary : serverStatus === 'checking' ? COLORS.warning : COLORS.danger },
                ]}
              />
              <Text style={styles.statusText}>
                {serverStatus === 'online' ? 'Online' : serverStatus === 'checking' ? 'Checking...' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Local Server Port</Text>
            <Text style={styles.settingValue}>
              {localServerPort ? `localhost:${localServerPort}` : 'Not running'}
            </Text>
          </View>
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Total Bundles</Text>
            <Text style={styles.settingValue}>{bundles.length}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Storage Used</Text>
            <Text style={styles.settingValue}>{formatBytes(storageUsed)}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Free Space</Text>
            <Text style={styles.settingValue}>N/A (device)</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={refreshStorage}>
            <Text style={styles.actionButtonText}>🔄 Refresh Storage Info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={checkServer}>
            <Text style={styles.actionButtonText}>🔍 Check Backend Connection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleClearAllBundles}>
            <Text style={styles.dangerButtonText}>🗑️ Clear All Bundles</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>React Native</Text>
            <Text style={styles.settingValue}>0.85.3</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Bundle Format</Text>
            <Text style={styles.settingValue}>OfflineNet v1</Text>
          </View>
          <Text style={styles.aboutText}>
            OfflineNet lets you pre-download internet content as bundles and browse them
            offline. No WiFi or cellular data needed once the bundle is loaded.
          </Text>
        </View>
      </ScrollView>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    marginTop: 8,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  settingValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 13,
  },
  actionButton: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8
    actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  aboutText: {
    color: COLORS.textTertiary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
});

export default SettingsScreen;