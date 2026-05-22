import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../store';
import { COLORS } from '../utils/constants';

const OfflineIndicator: React.FC = () => {
  const { isOnline, activeBundle, localServerPort } = useStore();

  const isReady = !!activeBundle && localServerPort !== null;
  const statusText = !isOnline && isReady
    ? 'Browsing Offline ✓'
    : isOnline
    ? 'Online — Bundle Ready'
    : 'No Bundle Loaded';

  const statusColor = !isOnline && isReady
    ? COLORS.primary
    : isOnline
    ? '#4a9eff'
    : COLORS.warning;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <View style={styles.textContainer}>
        <Text style={styles.statusText}>{statusText}</Text>
        {localServerPort && (
          <Text style={styles.portText}>
            localhost:{localServerPort}
          </Text>
        )}
      </View>
      {!isOnline && isReady && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📡 OFFLINE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  portText: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default OfflineIndicator;