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
    let isMounted = true;
    // addEventListener's first callback can lag briefly after mount; fetch() gives the
    // current state immediately so a genuinely-offline device isn't treated as online
    // in that window (it gates Submit — see submitBlockingReason.ts).
    NetInfo.fetch().then((state) => {
      if (isMounted) setIsOnline(state.isConnected ?? false);
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { isOnline };
}
