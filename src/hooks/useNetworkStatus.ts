import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface UseNetworkStatusResult {
  isOnline: boolean;
}

/**
 * @description Tracks device connectivity so screens can show an offline banner
 * or disable actions that require the network.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  return { isOnline };
}
