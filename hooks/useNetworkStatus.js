import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const update = () => setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });

    NetInfo.fetch().then((state) => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });

    return unsubscribe;
  }, []);

  return { isOffline };
}
