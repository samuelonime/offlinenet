import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';
import { BundleDownload } from '../types';
import { COLORS } from '../utils/constants';

interface DownloadProgressProps {
  download: BundleDownload;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DownloadProgressComponent: React.FC<DownloadProgressProps> = ({ download }) => {
  const progress = download.totalBytes > 0 ? download.downloadedBytes / download.totalBytes : 0;
  const statusLabel = {
    downloading: 'Downloading...',
    extracting: 'Extracting...',
    ready: 'Ready!',
    failed: 'Failed',
  }[download.status];

  const isError = download.status === 'failed';
  const isComplete = download.status === 'ready';

  return (
    <View style={[styles.container, isComplete && styles.completeContainer]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {download.name.replace('bundle_', 'Bundle ')}
        </Text>
        <Text style={[styles.status, isError && styles.errorStatus, isComplete && styles.completeStatus]}>
          {statusLabel}
        </Text>
      </View>

      <Progress.Bar
        progress={isComplete ? 1 : progress}
        width={null}
        height={6}
        color={isError ? COLORS.danger : isComplete ? COLORS.primary : '#4a9eff'}
        unfilledColor={COLORS.surface2}
        borderWidth={0}
        borderRadius={3}
        style={styles.progressBar}
      />

      <View style={styles.footer}>
        <Text style={styles.sizeText}>
          {formatBytes(download.downloadedBytes)}
          {download.totalBytes > 0 ? ` / ${formatBytes(download.totalBytes)}` : ''}
        </Text>
        {!isComplete && !isError && (
          <Text style={styles.percentText}>
            {Math.round(progress * 100)}%
          </Text>
        )}
      </View>

      {download.error && (
        <Text style={styles.errorText}>{download.error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  completeContainer: {
    borderColor: COLORS.primary,
    backgroundColor: '#0a1a10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  status: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  errorStatus: {
    color: COLORS.danger,
  },
  completeStatus: {
    color: COLORS.primary,
  },
  progressBar: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeText: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  percentText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 8,
  },
});

export default DownloadProgressComponent;