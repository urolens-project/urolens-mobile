import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSessionIdleTimer } from '../hooks/useSessionIdleTimer';
import { SessionExpiryWarningModal } from './SessionExpiryWarningModal';

export interface SessionActivityGateProps {
  children: ReactNode;
}

/**
 * @description Wraps the authenticated app so any tap anywhere resets the foreground
 * idle timer (RN has no mousemove/keydown to listen for), and renders the "session
 * expiring soon" warning on top of whatever screen is active. Mount once around the
 * medtech tab stack.
 * @param children - The authenticated app content to observe taps within.
 */
export function SessionActivityGate({ children }: SessionActivityGateProps): React.JSX.Element {
  const { isWarningVisible, notifyActivity, warningMinutes } = useSessionIdleTimer();

  return (
    <View
      style={styles.container}
      // Capture-phase "should" check runs on every touch start in the subtree; returning
      // false declines to claim the responder, so the touch still reaches its real
      // target normally — this view is purely an activity observer, not an interceptor.
      onStartShouldSetResponderCapture={() => {
        notifyActivity();
        return false;
      }}
    >
      {children}
      <SessionExpiryWarningModal
        visible={isWarningVisible}
        onStaySignedIn={notifyActivity}
        warningMinutes={warningMinutes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
