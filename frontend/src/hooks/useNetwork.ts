import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useStore } from '../store';

export function useNetwork() {
  const { isOnline, setOnlineStatus } = useStore();

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setOnlineStatus(online);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setOnlineStatus(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, [setOnlineStatus]);

  return { isOnline };
}2