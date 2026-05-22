import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BundleManifest } from '../types';
import { COLORS } from '../utils/constants';

interface BundleCardProps {
  bundle: BundleManifest;
  onLoad?: (bundle: BundleManifest) => void;
  onDelete?: (bundle: BundleManifest) => void;
  isActive?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const BundleCard: React.FC<BundleCardProps> = ({
  bundle,
  onLoad,
  onDelete,
  isActive = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.activeCard]}
      onPress={() => onLoad?.(bundle)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {bundle.name.replace('bundle_', 'Bundle ')}
        </Text>
        {isActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          📦 {formatBytes(bundle.sizeBytes)}
        </Text>
        <Text style={styles.metaText}>
          📄 {bundle.fileCount} files
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          📅 {formatDate(bundle.createdAt)}
        </Text>
        <View style={styles.platformBadges}>
          {bundle.platforms?.slice(0, 3).map((platform) => (
            <View key={platform} style={styles.platformBadge}>
              <Text style={styles.platformBadgeText}>{platform}</Text>
            </View>
          ))}
          {(bundle.platforms?.length || 0) > 3 && (
            <Text style={styles.moreText}>+{bundle.platforms.length - 3}</Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.loadButton}
          onPress={() => onLoad?.(bundle)}
        >
          <Text style={styles.loadButtonText}>
            {isActive ? 'Browse Offline' : 'Load Bundle'}
          </Text>
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete?.(bundle)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#0a1a10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activeBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  activeBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  platformBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  platformBadge: {
    backgroundColor: COLORS.surface2,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  platformBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  moreText: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  loadButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default BundleCard;