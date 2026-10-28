import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import useStore, { flushPersistedStore } from './store/store';
import deviceSync from './utils/deviceSync';

try {
  deviceSync.setStoreAccessor(useStore);
} catch (error) {
  console.error('Device sync init failed:', error);
}

export default function App() {
  const appearanceMode = useStore((s) => s.appearanceMode);

  useEffect(() => {
    return () => {
      try {
        deviceSync.stop();
      } catch {
        // ignore shutdown errors
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        flushPersistedStore().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style={appearanceMode === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
