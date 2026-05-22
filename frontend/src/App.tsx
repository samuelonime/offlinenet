import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store';
import { useNetwork } from './src/hooks/useNetwork';
import { proxyServer } from './src/services/proxyServer';
import { COLORS } from './src/utils/constants';

// Suppress known warnings in dev
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'VirtualizedLists should never be nested',
  ]);
}

const App: React.FC = () => {
  const { loadPersistedState, setLocalServerPort } = useStore();

  // Initialize network monitoring
  useNetwork();

  useEffect(() => {
    const initialize = async () => {
      // Load persisted bundles and settings
      await loadPersistedState();

      // Start the local proxy server
      const started = await proxyServer.start();
      if (started) {
        setLocalServerPort(proxyServer.getPort());
      }
    };

    initialize();
  }, [loadPersistedState, setLocalServerPort]);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />
      <AppNavigator />
    </>
  );
};

export default App;